"""Local HTTP adapter for the existing assistant. Run: python api_server.py."""

from __future__ import annotations

import json
import logging
import os
import re
import shutil
import threading
import uuid
import time
from concurrent.futures import CancelledError, ThreadPoolExecutor
from datetime import datetime, timezone
from email import policy
from email.parser import BytesParser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from core.transcriber import TranscriptionError

PROJECT_ROOT = Path(__file__).resolve().parent
UPLOAD_ROOT = PROJECT_ROOT / ".web_uploads"
MAX_FILE_BYTES = 50 * 1024 * 1024
EXTENSIONS = {".mp4", ".mov", ".webm", ".mkv", ".mp3", ".wav", ".m4a", ".ogg"}
jobs: dict[str, dict] = {}
sessions: dict[str, dict] = {}
state_lock = threading.RLock()
executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="video-analysis")
logger = logging.getLogger("video-assistant")
SESSION_TTL_SECONDS = int(os.getenv("SESSION_TTL_SECONDS", "3600"))
MAX_FINISHED_JOBS = 32
ALLOWED_ORIGINS = {value.strip().rstrip("/") for value in os.getenv("ALLOWED_ORIGINS", "").split(",") if value.strip()}


def expire_sessions() -> None:
    """Bound temporary public-demo state; never persist a video library."""
    with state_lock:
        now = time.monotonic()
        terminal = [
            key for key, job in jobs.items()
            if job["status"] in {"complete", "failed", "cancelled"} and "_finished_at" in job
        ]
        terminal.sort(key=lambda key: jobs[key]["_finished_at"])
        for index, key in enumerate(terminal):
            if now - jobs[key]["_finished_at"] >= SESSION_TTL_SECONDS or index < len(terminal) - MAX_FINISHED_JOBS:
                jobs.pop(key, None)
                sessions.pop(key, None)


def public_job(job: dict) -> dict:
    return {key: value for key, value in job.items() if not key.startswith("_")}


def youtube_url(value: str) -> str:
    parsed = urlparse(value.strip())
    host = (parsed.hostname or "").lower()
    if parsed.scheme != "https" or parsed.username or parsed.password or parsed.port not in (None, 443):
        raise ValueError("Paste a valid HTTPS YouTube video link.")
    if host not in {"youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"}:
        raise ValueError("Use a YouTube video link.")
    if host == "youtu.be":
        video_id = parsed.path.strip("/").split("/")[0]
    else:
        video_id = parse_qs(parsed.query).get("v", [""])[0]
        if not video_id:
            match = re.match(r"^/(?:shorts|embed|live)/([^/]+)", parsed.path)
            video_id = match.group(1) if match else ""
    if not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
        raise ValueError("This link doesn’t contain a valid YouTube video ID.")
    return f"https://www.youtube.com/watch?v={video_id}"


def cleanup_upload(folder: Path) -> None:
    resolved = folder.resolve()
    if resolved.parent == UPLOAD_ROOT.resolve() and re.fullmatch(r"[a-f0-9]{32}", resolved.name):
        shutil.rmtree(resolved, ignore_errors=True)


def analyze_job(job_id: str, source: str, language: str, kind: str, name: str, folder: Path) -> None:
    def stage(message: str) -> None:
        with state_lock:
            if jobs[job_id]["status"] == "cancelled":
                raise CancelledError()
            jobs[job_id].update(status="processing", stage=message)

    try:
        stage("Preparing the recording")
        # Heavy models and configured providers load only after a real analysis request.
        from main import run_pipeline

        result = run_pipeline(
            source,
            language,
            collection_name=f"video-{job_id}",
            download_directory=str(folder),
            on_stage=stage,
        )
        record = {key: str(result.get(key, "")) for key in ("title", "transcript", "summary", "action_items", "key_decisions", "open_questions")}
        record.update(id=job_id, language=language, source_kind=kind, source_name=name, created_at=datetime.now(timezone.utc).isoformat())
        if kind == "youtube":
            record["source_url"] = source
        with state_lock:
            if jobs[job_id]["status"] == "cancelled":
                raise CancelledError()
            sessions[job_id] = {"record": record, "rag_chain": result["rag_chain"]}
            jobs[job_id].update(status="complete", stage="Your notes are ready", result=record)
    except CancelledError:
        with state_lock:
            jobs[job_id].update(status="cancelled", stage="Analysis cancelled")
    except Exception as error:
        logger.exception("Analysis failed for job %s", job_id)
        with state_lock:
            if jobs[job_id]["status"] != "cancelled":
                message = str(error) if isinstance(error, TranscriptionError) else "This recording couldn’t be processed. Please try again or contact the server owner."
                jobs[job_id].update(status="failed", stage="Unable to complete analysis", error=message)
    finally:
        with state_lock:
            jobs[job_id]["_finished_at"] = time.monotonic()
        cleanup_upload(folder)


class Handler(BaseHTTPRequestHandler):
    server_version = "VideoAssistant/1.0"

    def origin_allowed(self) -> bool:
        origin = self.headers.get("Origin")
        if not origin:
            return True
        if origin.rstrip("/") in ALLOWED_ORIGINS:
            return True
        parsed = urlparse(origin)
        # The reverse proxy preserves the public host for same-origin API calls.
        if parsed.netloc == self.headers.get("Host") and parsed.scheme in {"http", "https"} and not parsed.username and not parsed.password:
            return True
        return parsed.scheme in {"http", "https"} and parsed.hostname in {"localhost", "127.0.0.1", "::1"} and not parsed.username and not parsed.password

    def reply(self, code: int, body: dict) -> None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        origin = self.headers.get("Origin")
        if origin and self.origin_allowed():
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.end_headers()
        try:
            self.wfile.write(data)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def read_body(self, limit: int) -> bytes:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as error:
            raise ValueError("The request has an invalid size.") from error
        if length <= 0 or length > limit:
            raise ValueError("Choose a recording smaller than 50 MB.")
        body = self.rfile.read(length)
        if len(body) != length:
            raise ValueError("The upload was interrupted. Please try again.")
        return body

    def do_OPTIONS(self) -> None:
        if not self.origin_allowed():
            self.reply(403, {"error": "This origin is not allowed."})
            return
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", self.headers.get("Origin", "http://127.0.0.1:3000"))
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Vary", "Origin")
        self.end_headers()

    def do_GET(self) -> None:
        expire_sessions()
        if not self.origin_allowed():
            self.reply(403, {"error": "This origin is not allowed."})
            return
        path = urlparse(self.path).path
        if path == "/api/health":
            self.reply(200, {"status": "ready", "service": "AI Video Assistant"})
        elif match := re.fullmatch(r"/api/jobs/([a-f0-9]{32})", path):
            with state_lock:
                job = jobs.get(match.group(1))
                self.reply(200 if job else 404, public_job(job) if job else {"error": "This analysis could not be found."})
        else:
            self.reply(404, {"error": "This endpoint could not be found."})

    def do_DELETE(self) -> None:
        expire_sessions()
        if not self.origin_allowed():
            self.reply(403, {"error": "This origin is not allowed."})
            return
        match = re.fullmatch(r"/api/jobs/([a-f0-9]{32})", urlparse(self.path).path)
        with state_lock:
            if not match or match.group(1) not in jobs:
                self.reply(404, {"error": "This analysis could not be found."})
                return
            job = jobs[match.group(1)]
            if job["status"] in {"queued", "processing"}:
                job.update(status="cancelled", stage="Analysis cancelled")
            self.reply(200, {"status": job["status"]})

    def do_POST(self) -> None:
        expire_sessions()
        if not self.origin_allowed():
            self.reply(403, {"error": "This origin is not allowed."})
            return
        path = urlparse(self.path).path
        try:
            if path == "/api/analyze":
                self.create_analysis()
            elif match := re.fullmatch(r"/api/sessions/([a-f0-9]{32})/chat", path):
                data = json.loads(self.read_body(16_384))
                question = data.get("question", "")
                if not isinstance(question, str) or not 1 <= len(question.strip()) <= 2000:
                    raise ValueError("Write a question of 1 to 2000 characters.")
                with state_lock:
                    session = sessions.get(match.group(1))
                if not session:
                    self.reply(410, {"error": "This temporary assistant session has ended. Analyze the recording again. Download a PDF before leaving the page to keep your notes."})
                    return
                from core.rag_engine import ask_question

                self.reply(200, {"answer": ask_question(session["rag_chain"], question.strip())})
            else:
                self.reply(404, {"error": "This endpoint could not be found."})
        except (ValueError, TypeError, json.JSONDecodeError):
            self.reply(400, {"error": "Check the recording, YouTube link, language, or question and try again."})
        except Exception:
            logger.exception("Assistant request failed")
            self.reply(500, {"error": "The assistant couldn’t complete this request. Please try again."})

    def create_analysis(self) -> None:
        with state_lock:
            max_active = int(os.getenv("MAX_ACTIVE_JOBS", "1"))
            if sum(job["status"] in {"queued", "processing"} for job in jobs.values()) >= max_active:
                self.reply(429, {"error": "The assistant is working through the current recordings. Please try again shortly."})
                return
        job_id = uuid.uuid4().hex
        folder = UPLOAD_ROOT / job_id
        kind = "youtube"
        content_type = self.headers.get("Content-Type", "")
        if content_type.startswith("application/json"):
            data = json.loads(self.read_body(16_384))
            if not isinstance(data, dict) or not isinstance(data.get("source"), str):
                raise ValueError("Paste a YouTube video link.")
            source = youtube_url(data["source"])
            language = data.get("language", "english")
            name = "YouTube recording"
        elif content_type.startswith("multipart/form-data"):
            raw = self.read_body(MAX_FILE_BYTES + 1024 * 1024)
            message = BytesParser(policy=policy.default).parsebytes(f"Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n".encode() + raw)
            if not message.is_multipart():
                raise ValueError("Upload a video or audio recording.")
            language = "english"
            upload = None
            name = "Recording"
            for part in message.iter_parts():
                field = part.get_param("name", header="content-disposition")
                if field == "language":
                    language = part.get_content().strip()
                elif field == "file":
                    name = Path((part.get_filename() or "recording").replace("\\", "/")).name
                    upload = part.get_payload(decode=True)
            suffix = Path(name).suffix.lower()
            if suffix not in EXTENSIONS or not upload or len(upload) > MAX_FILE_BYTES:
                raise ValueError("Choose a supported recording smaller than 50 MB.")
            kind = "file"
            source = str(folder / f"recording{suffix}")
        else:
            raise ValueError("Send a recording or a YouTube video link.")
        if language not in {"english", "hinglish"}:
            raise ValueError("Choose English or Hinglish.")
        folder.mkdir(parents=True, exist_ok=True)
        if kind == "file":
            Path(source).write_bytes(upload)
        job = {"id": job_id, "status": "queued", "stage": "Waiting for the assistant"}
        with state_lock:
            jobs[job_id] = job
        executor.submit(analyze_job, job_id, source, language, kind, name, folder)
        self.reply(202, public_job(job))


def serve(host: str = "127.0.0.1", port: int = 8001) -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    server = ThreadingHTTPServer((host, port), Handler)
    server.daemon_threads = True
    stop_cleanup = threading.Event()

    def housekeeping():
        while not stop_cleanup.wait(60):
            expire_sessions()

    threading.Thread(target=housekeeping, daemon=True, name="session-cleanup").start()
    logger.info("AI Video Assistant API: http://%s:%s", host, port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        stop_cleanup.set()
        server.server_close()
        executor.shutdown(wait=False, cancel_futures=True)


if __name__ == "__main__":
    serve(os.getenv("HOST", "127.0.0.1"), int(os.getenv("PORT", "8001")))
