import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

import requests

# Sarvam's sync REST API rejects audio of 30s or longer.
# We slice each chunk into 25s pieces (with a 5s safety margin) before sending.
SARVAM_PIECE_SECONDS = 25

WHISPER_MODEL = os.getenv("WHISPER_MODEL", "small")
WHISPER_PROVIDER = os.getenv("WHISPER_PROVIDER", "groq").lower()
GROQ_MODEL = os.getenv("GROQ_WHISPER_MODEL", "whisper-large-v3-turbo")
GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
GROQ_MAX_FILE_BYTES = 25 * 1024 * 1024

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text"
SARVAM_MODEL = os.getenv("SARVAM_STT_MODEL", "saaras:v3")

_model = None


class TranscriptionError(RuntimeError):
    """A safe, actionable message that can be returned to the browser."""


def load_model():
    global _model
    if _model is None:
        import whisper

        print(f"Loading Whisper model: {WHISPER_MODEL} ...")
        _model = whisper.load_model(WHISPER_MODEL)
        print("Whisper model loaded.")
    return _model


def transcribe_chunk_whisper(chunk_path: str) -> str:
    model = load_model()
    result = model.transcribe(chunk_path, task="transcribe", language="en", fp16=False)
    return result["text"]


def transcribe_chunk_groq(chunk_path: str) -> str:
    key = os.getenv("GROQ_API_KEY", "").strip()
    if not key:
        raise TranscriptionError("Whisper API is not configured. The server owner needs to set GROQ_API_KEY.")
    if Path(chunk_path).stat().st_size > GROQ_MAX_FILE_BYTES:
        raise TranscriptionError("This audio chunk exceeds the Whisper API upload limit. Try a shorter recording.")
    try:
        with open(chunk_path, "rb") as audio:
            response = requests.post(
                GROQ_TRANSCRIPTION_URL,
                headers={"Authorization": f"Bearer {key}"},
                files={"file": (Path(chunk_path).name, audio, "audio/wav")},
                data={"model": GROQ_MODEL, "language": "en", "response_format": "json", "temperature": "0"},
                timeout=(15, 180),
            )
    except requests.Timeout as error:
        raise TranscriptionError("Whisper API took too long to respond. Please try again.") from error
    except requests.RequestException as error:
        raise TranscriptionError("Whisper API is temporarily unavailable. Please try again.") from error
    if response.status_code == 429:
        raise TranscriptionError("The shared transcription quota is currently exhausted. Please try again later.")
    if response.status_code in (401, 403):
        raise TranscriptionError("Whisper API credentials were rejected. The server owner needs to check GROQ_API_KEY.")
    if not response.ok:
        raise TranscriptionError("Whisper API could not process this audio. Please try another recording.")
    try:
        text = response.json()["text"]
    except (ValueError, KeyError, TypeError) as error:
        raise TranscriptionError("Whisper API returned an invalid transcript. Please try again.") from error
    if not isinstance(text, str) or not text.strip():
        raise TranscriptionError("No speech was detected in this recording.")
    return text.strip()


def _send_to_sarvam(piece_path: str) -> str:
    """Send one <30s WAV file to Sarvam and return the English transcript."""
    headers = {"api-subscription-key": SARVAM_API_KEY}
    with open(piece_path, "rb") as f:
        files = {"file": (os.path.basename(piece_path), f, "audio/wav")}
        data = {"model": SARVAM_MODEL, "mode": "translate"}
        response = requests.post(
            SARVAM_STT_URL,
            headers=headers,
            files=files,
            data=data,
            timeout=120,
        )

    if not response.ok:
        print(f"\n❌ Sarvam returned {response.status_code}")
        print(f"Response body: {response.text}\n")
        response.raise_for_status()

    return response.json().get("transcript", "")


def transcribe_chunk_sarvam(chunk_path: str) -> str:
    """Split the chunk into 25s pieces, send each to Sarvam, join the transcripts."""
    if not SARVAM_API_KEY:
        raise RuntimeError("SARVAM_API_KEY is not set in environment / .env")
    from pydub import AudioSegment

    audio = AudioSegment.from_wav(chunk_path)
    piece_ms = SARVAM_PIECE_SECONDS * 1000

    full_text = ""
    total_pieces = (len(audio) + piece_ms - 1) // piece_ms

    for i, start in enumerate(range(0, len(audio), piece_ms)):
        piece = audio[start: start + piece_ms]
        piece_path = f"{chunk_path}_sv_{i}.wav"
        piece.export(piece_path, format="wav")
        try:
            print(f"  → Sarvam piece {i + 1}/{total_pieces} ...")
            full_text += _send_to_sarvam(piece_path) + " "
        finally:
            if os.path.exists(piece_path):
                os.remove(piece_path)

    return full_text.strip()


def transcribe_chunk(chunk_path: str, language: str = "english") -> str:
    """English uses hosted Whisper by default; Hinglish keeps Sarvam."""
    if language.lower() == "hinglish":
        return transcribe_chunk_sarvam(chunk_path)
    if WHISPER_PROVIDER == "local":
        return transcribe_chunk_whisper(chunk_path)
    if WHISPER_PROVIDER == "groq":
        return transcribe_chunk_groq(chunk_path)
    raise TranscriptionError("Invalid WHISPER_PROVIDER. The server owner must choose groq or local.")

def transcribe_all(chunks: list, language: str = "english") -> str:
    full_transcript = ""
    engine = "Sarvam AI" if language.lower() == "hinglish" else f"Whisper ({WHISPER_PROVIDER})"
    print(f"Using {engine} for transcription.")

    for i, chunk in enumerate(chunks):
        print(f"Transcribing chunk {i + 1}/{len(chunks)}...")
        text = transcribe_chunk(chunk, language=language)
        full_transcript += text + " "

    print("Transcription complete.")
    return full_transcript.strip()
