import os
import glob
import subprocess
from pathlib import Path
import yt_dlp

# Make deno + ffmpeg visible even if VS Code has a stale PATH
_winget = os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet")
extra = glob.glob(_winget + r"\Packages\Gyan.FFmpeg*\**\bin", recursive=True)
extra += [_winget + r"\Links"]
os.environ["PATH"] = os.pathsep.join(extra + [os.environ["PATH"]])


class AudioProcessingError(RuntimeError):
    """A safe, actionable audio extraction or conversion error."""


def download_youtube_audio(url, out_dir="downloads"):
    os.makedirs(out_dir, exist_ok=True)
    ydl_opts = {
        "format": "bestaudio/best",
        "noplaylist": True,
        "js_runtimes": {"node": {}},
        "socket_timeout": 20,
        "retries": 2,
        "extractor_retries": 2,
        "outtmpl": os.path.join(out_dir, "%(id)s.%(ext)s"),
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "wav",
            "preferredquality": "192",
        }],
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            return os.path.join(out_dir, f"{info['id']}.wav")
    except yt_dlp.utils.DownloadError as error:
        message = str(error).lower()
        if any(marker in message for marker in ("http error 429", "http error 403", "sign in to confirm", "confirm you're not a bot")):
            raise AudioProcessingError(
                "YouTube blocked the download from this cloud server. Try uploading the video or audio file instead."
            ) from error
        raise AudioProcessingError(
            "Couldn’t download audio from YouTube. Try uploading the video or audio file instead."
        ) from error
    except (OSError, TimeoutError) as error:
        raise AudioProcessingError(
            "YouTube couldn’t be reached from the server. Try uploading the video or audio file instead."
        ) from error


def convert_to_wav(input_path: str) -> str:
    """Decode on disk instead of holding the complete recording in memory."""
    output_path = os.path.splitext(input_path)[0] + "_converted.wav"
    try:
        subprocess.run(
            ["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
             "-i", input_path, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", output_path],
            check=True, capture_output=True, timeout=600,
        )
    except subprocess.TimeoutExpired as error:
        raise AudioProcessingError("Audio conversion took too long. Try a shorter recording.") from error
    except subprocess.CalledProcessError as error:
        raise AudioProcessingError("Couldn’t read audio from this file. Try another video or audio file.") from error
    return output_path 


def chunk_audio(wav_path:str,chunk_minutes:int=10)->list:
    # Ten minutes of mono 16 kHz PCM is ~19.2 MB, below Groq's 25 MB limit.
    if not 1 <= chunk_minutes <= 10:
        raise ValueError("Choose chunk_minutes between 1 and 10.")
    pattern = f"{wav_path}_chunk_%04d.wav"
    try:
        subprocess.run(
            ["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
             "-i", wav_path, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le",
             "-f", "segment", "-segment_time", str(chunk_minutes * 60), "-reset_timestamps", "1", pattern],
            check=True, capture_output=True, timeout=600,
        )
    except subprocess.TimeoutExpired as error:
        raise AudioProcessingError("Splitting the audio took too long. Try a shorter recording.") from error
    except subprocess.CalledProcessError as error:
        raise AudioProcessingError("Couldn’t extract audio from this recording. Try another file.") from error
    chunks = sorted(str(path) for path in Path(wav_path).parent.glob(Path(wav_path).name + "_chunk_*.wav"))
    if not chunks:
        raise ValueError("No audio was found in this recording.")
    return chunks


def process_input(source: str, download_directory: str = "downloads") -> list:
    if source.startswith("http://") or source.startswith("https://"):
        print("Detected YouTube URL. Downloading audio...")
        wav_path = download_youtube_audio(source, out_dir=download_directory)
    else:
        print("Detected local file. Converting to WAV...")
        wav_path = convert_to_wav(source)

    print("Chunking audio...")
    chunks = chunk_audio(wav_path)
    print(f"Audio ready — {len(chunks)} chunk(s) created.")
    return chunks





