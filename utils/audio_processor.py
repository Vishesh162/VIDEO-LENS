import os
import glob
import yt_dlp

# Make deno + ffmpeg visible even if VS Code has a stale PATH
_winget = os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet")
extra = glob.glob(_winget + r"\Packages\Gyan.FFmpeg*\**\bin", recursive=True)
extra += [_winget + r"\Links"]
os.environ["PATH"] = os.pathsep.join(extra + [os.environ["PATH"]])

from pydub import AudioSegment  # import after PATH fix


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
    """Convert any audio/video file to WAV format using pydub."""
    output_path = os.path.splitext(input_path)[0] + "_converted.wav"
    audio = AudioSegment.from_file(input_path)
    audio = audio.set_channels(1).set_frame_rate(16000) #for mono audio and 16khz
    audio.export(output_path, format="wav")
    return output_path 


def chunk_audio(wav_path:str,chunk_minutes:int=10)->list:
    audio=AudioSegment.from_wav(wav_path)
    chunk_ms=chunk_minutes*60*1000

    chunks=[]

    for i, start in enumerate(range(0,len(audio),chunk_ms)):

        chunk= audio[start:start+chunk_ms]
        chunk_path=f"{wav_path}_chunk_{i}.wav"
        chunk.export(chunk_path,format="wav")

        chunks.append(chunk_path)

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





