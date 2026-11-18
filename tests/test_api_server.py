import importlib
import json
import sys
import threading
import time
import types
import unittest
import uuid
from http.server import ThreadingHTTPServer
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import api_server


class AdapterTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), api_server.Handler)
        cls.server.daemon_threads = True
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def request(self, path, data=None, method=None, headers=None):
        request = Request(self.base + path, data=data, method=method, headers=headers or {})
        try:
            with urlopen(request, timeout=5) as response:
                return response.status, json.loads(response.read()), dict(response.headers)
        except HTTPError as error:
            return error.code, json.loads(error.read()), dict(error.headers)

    def wait_job(self, job_id):
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            _, job, _ = self.request(f"/api/jobs/{job_id}")
            if job["status"] in {"complete", "failed", "cancelled"}:
                return job
            time.sleep(0.025)
        self.fail("Fixture analysis did not finish")

    @staticmethod
    def pipeline(source, language, **options):
        options["on_stage"]("Reading the fixture")
        return {
            "title": "Fixture recording", "transcript": "The first observation is the light.",
            "summary": "Observe the light.", "action_items": "1. Record one observation.",
            "key_decisions": "1. Observe before interpreting.", "open_questions": "1. What changed?",
            "rag_chain": options["collection_name"],
        }

    def test_health_and_local_origin(self):
        code, body, headers = self.request("/api/health", headers={"Origin": "http://127.0.0.1:3000"})
        self.assertEqual(code, 200)
        self.assertEqual(body["status"], "ready")
        self.assertEqual(headers["Access-Control-Allow-Origin"], "http://127.0.0.1:3000")
        self.assertEqual(self.request("/api/health", headers={"Origin": "https://unrelated.example"})[0], 403)

    def test_youtube_validation(self):
        self.assertEqual(api_server.youtube_url("https://youtu.be/abcdefghijk?t=5"), "https://www.youtube.com/watch?v=abcdefghijk")
        self.assertEqual(api_server.youtube_url("https://www.youtube.com/shorts/abcdefghijk"), "https://www.youtube.com/watch?v=abcdefghijk")
        for invalid in ("http://youtube.com/watch?v=abcdefghijk", "https://youtube.com.evil.example/watch?v=abcdefghijk", "https://youtube.com@evil.example/watch?v=abcdefghijk", "https://www.youtube.com/playlist?list=abc", "file:///C:/private.mp4"):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                api_server.youtube_url(invalid)

    def test_json_analysis_and_isolated_chat_sessions(self):
        module = types.ModuleType("main")
        module.run_pipeline = MagicMock(side_effect=self.pipeline)
        rag = types.ModuleType("core.rag_engine")
        rag.ask_question = lambda chain, question: f"{chain}: {question}"
        with patch.dict(sys.modules, {"main": module, "core.rag_engine": rag}):
            ids = []
            for _ in range(2):
                code, job, _ = self.request("/api/analyze", json.dumps({"source": "https://youtu.be/abcdefghijk", "language": "english"}).encode(), headers={"Content-Type": "application/json"})
                self.assertEqual(code, 202)
                result = self.wait_job(job["id"])
                self.assertEqual(result["status"], "complete")
                self.assertNotIn("_finished_at", result)
                self.assertNotIn("rag_chain", result["result"])
                ids.append(job["id"])
            self.assertNotEqual(ids[0], ids[1])
            for session_id in ids:
                code, reply, _ = self.request(f"/api/sessions/{session_id}/chat", b'{"question":"What changed?"}', headers={"Content-Type": "application/json"})
                self.assertEqual(code, 200)
                self.assertIn(f"video-{session_id}", reply["answer"])
            collections = [call.kwargs["collection_name"] for call in module.run_pipeline.call_args_list]
            self.assertEqual(len(set(collections)), 2)

    def test_file_upload_and_cleanup(self):
        boundary = "assistant-test-boundary"
        body = (
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"language\"\r\n\r\nhinglish\r\n"
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"../field-notes.mp4\"\r\nContent-Type: video/mp4\r\n\r\n"
        ).encode() + b"fixture-video\r\n" + f"--{boundary}--\r\n".encode()
        module = types.ModuleType("main")
        module.run_pipeline = MagicMock(side_effect=self.pipeline)
        with patch.dict(sys.modules, {"main": module}):
            code, job, _ = self.request("/api/analyze", body, headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
            self.assertEqual(code, 202)
            result = self.wait_job(job["id"])
            self.assertEqual(result["status"], "complete")
            self.assertEqual(result["result"]["source_name"], "field-notes.mp4")
            self.assertEqual(result["result"]["language"], "hinglish")
            deadline = time.monotonic() + 2
            folder = api_server.UPLOAD_ROOT / job["id"]
            while folder.exists() and time.monotonic() < deadline:
                time.sleep(.02)
            self.assertFalse(folder.exists())

    def test_invalid_input_expired_session_and_cancellation(self):
        code, _, _ = self.request("/api/analyze", b'{"source":"https://unrelated.example/video"}', headers={"Content-Type": "application/json"})
        self.assertEqual(code, 400)
        missing = uuid.uuid4().hex
        self.assertEqual(self.request(f"/api/sessions/{missing}/chat", b'{"question":"Why?"}', headers={"Content-Type": "application/json"})[0], 410)
        with api_server.state_lock:
            api_server.jobs[missing] = {"id": missing, "status": "queued", "stage": "Waiting"}
        self.assertEqual(self.request(f"/api/jobs/{missing}", method="DELETE")[1]["status"], "cancelled")

    def test_completed_sessions_expire_and_are_removed_from_public_status(self):
        job_id = uuid.uuid4().hex
        with api_server.state_lock:
            api_server.jobs[job_id] = {
                "id": job_id,
                "status": "complete",
                "stage": "Done",
                "result": {"id": job_id},
                "_finished_at": time.monotonic() - 2,
            }
            api_server.sessions[job_id] = {"record": {"id": job_id}, "rag_chain": object()}
        with patch.object(api_server, "SESSION_TTL_SECONDS", 1):
            self.assertEqual(self.request(f"/api/jobs/{job_id}")[0], 404)
            self.assertNotIn(job_id, api_server.sessions)

    def test_completed_job_response_never_exposes_private_cleanup_state(self):
        job_id = uuid.uuid4().hex
        with api_server.state_lock:
            api_server.jobs[job_id] = {
                "id": job_id,
                "status": "complete",
                "stage": "Done",
                "_finished_at": time.monotonic(),
            }
        _, body, _ = self.request(f"/api/jobs/{job_id}")
        self.assertNotIn("_finished_at", body)

    def test_importing_audio_does_not_download_a_video(self):
        downloader = types.ModuleType("yt_dlp")
        downloader.YoutubeDL = MagicMock(side_effect=AssertionError("Unexpected download on import"))
        audio = types.ModuleType("pydub")
        audio.AudioSegment = MagicMock()
        previous = sys.modules.pop("utils.audio_processor", None)
        try:
            with patch.dict(sys.modules, {"yt_dlp": downloader, "pydub": audio}):
                importlib.import_module("utils.audio_processor")
                downloader.YoutubeDL.assert_not_called()
                audio.AudioSegment.from_file.assert_not_called()
        finally:
            sys.modules.pop("utils.audio_processor", None)
            if previous is not None:
                sys.modules["utils.audio_processor"] = previous


if __name__ == "__main__":
    unittest.main()
