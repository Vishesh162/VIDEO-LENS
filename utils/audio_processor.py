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

def download_youtube_audio(url, out_dir="downloads"):
    os.makedirs(out_dir, exist_ok=True)
    ydl_opts = {
        "format": "bestaudio/best",
        "noplaylist": True,
        "outtmpl": os.path.join(out_dir, "%(id)s.%(ext)s"),
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "wav",
            "preferredquality": "192",
        }],
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        return os.path.join(out_dir, f"{info['id']}.wav")


def convert_to_wav(input_path: str) -> str:
    """Decode on disk instead of holding the complete recording in memory."""
    output_path = os.path.splitext(input_path)[0] + "_converted.wav"
    subprocess.run(
        ["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
         "-i", input_path, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", output_path],
        check=True, capture_output=True, timeout=600,
    )
    return output_path 


def chunk_audio(wav_path:str,chunk_minutes:int=10)->list:
    # Ten minutes of mono 16 kHz PCM is ~19.2 MB, below Groq's 25 MB limit.
    if not 1 <= chunk_minutes <= 10:
        raise ValueError("Choose chunk_minutes between 1 and 10.")
    pattern = f"{wav_path}_chunk_%04d.wav"
    subprocess.run(
        ["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
         "-i", wav_path, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le",
         "-f", "segment", "-segment_time", str(chunk_minutes * 60), "-reset_timestamps", "1", pattern],
        check=True, capture_output=True, timeout=600,
    )
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





