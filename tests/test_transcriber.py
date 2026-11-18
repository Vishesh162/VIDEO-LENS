import importlib.util
import sys
import types
import unittest
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch


class TranscriberTests(unittest.TestCase):
    def setUp(self):
        # Import without loading models, provider credentials, or audio packages.
        dependencies = {}
        for name, attribute in (
            ("dotenv", "load_dotenv"),
            ("whisper", "load_model"),
            ("pydub", "AudioSegment"),
        ):
            module = types.ModuleType(name)
            setattr(module, attribute, MagicMock())
            dependencies[name] = module
        requests = types.ModuleType("requests")
        requests.post = MagicMock()
        requests.Timeout = TimeoutError
        requests.RequestException = OSError
        dependencies["requests"] = requests
        source = Path(__file__).resolve().parents[1] / "core" / "transcriber.py"
        spec = importlib.util.spec_from_file_location("transcriber_under_test", source)
        self.transcriber = importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules, dependencies):
            spec.loader.exec_module(self.transcriber)
        dependencies["whisper"].load_model.assert_not_called()

    def test_english_explicitly_selects_language_and_disables_fp16(self):
        model = MagicMock()
        model.transcribe.return_value = {"text": "English transcript"}
        with patch.object(self.transcriber, "load_model", return_value=model):
            text = self.transcriber.transcribe_chunk_whisper("recording.wav")
        self.assertEqual(text, "English transcript")
        model.transcribe.assert_called_once_with(
            "recording.wav", task="transcribe", language="en", fp16=False
        )

    def test_hinglish_still_uses_sarvam(self):
        with (
            patch.object(self.transcriber, "transcribe_chunk_sarvam", return_value="Translated transcript") as sarvam,
            patch.object(self.transcriber, "transcribe_chunk_whisper") as whisper,
        ):
            text = self.transcriber.transcribe_chunk("recording.wav", language="hinglish")
        self.assertEqual(text, "Translated transcript")
        sarvam.assert_called_once_with("recording.wav")
        whisper.assert_not_called()

    def test_every_english_chunk_uses_explicit_language(self):
        model = MagicMock()
        model.transcribe.side_effect = [{"text": "First."}, {"text": "Second."}]
        with patch.object(self.transcriber, "load_model", return_value=model), patch.object(self.transcriber, "WHISPER_PROVIDER", "local"):
            text = self.transcriber.transcribe_all(["first.wav", "second.wav"], "english")
        self.assertEqual(text, "First. Second.")
        self.assertEqual(model.transcribe.call_count, 2)
        for call in model.transcribe.call_args_list:
            self.assertEqual(call.kwargs["language"], "en")
            self.assertIs(call.kwargs["fp16"], False)

    def test_english_defaults_to_hosted_groq_without_loading_local_whisper(self):
        response = MagicMock(ok=True, status_code=200)
        response.json.return_value = {"text": "Hosted transcript"}
        with tempfile.TemporaryDirectory() as folder:
            audio = Path(folder) / "chunk.wav"
            audio.write_bytes(b"small wav fixture")
            with (
                patch.dict("os.environ", {"GROQ_API_KEY": "fixture-key"}),
                patch.object(self.transcriber, "WHISPER_PROVIDER", "groq"),
                patch.object(self.transcriber.requests, "post", return_value=response) as post,
                patch.object(self.transcriber, "load_model") as local_model,
            ):
                text = self.transcriber.transcribe_chunk(str(audio), "english")
        self.assertEqual(text, "Hosted transcript")
        kwargs = post.call_args.kwargs
        self.assertEqual(kwargs["headers"]["Authorization"], "Bearer fixture-key")
        self.assertEqual(kwargs["data"]["model"], self.transcriber.GROQ_MODEL)
        self.assertEqual(kwargs["data"]["language"], "en")
        self.assertEqual(kwargs["timeout"], (15, 180))
        local_model.assert_not_called()

    def test_hosted_whisper_rejects_missing_key_without_sending_audio(self):
        with (
            patch.dict("os.environ", {"GROQ_API_KEY": ""}),
            patch.object(self.transcriber.requests, "post") as post,
            self.assertRaisesRegex(self.transcriber.TranscriptionError, "GROQ_API_KEY"),
        ):
            self.transcriber.transcribe_chunk_groq("recording.wav")
        post.assert_not_called()

    def test_hosted_whisper_turns_shared_quota_exhaustion_into_clear_error(self):
        response = MagicMock(ok=False, status_code=429)
        with tempfile.TemporaryDirectory() as folder:
            audio = Path(folder) / "chunk.wav"
            audio.write_bytes(b"small wav fixture")
            with (
                patch.dict("os.environ", {"GROQ_API_KEY": "fixture-key"}),
                patch.object(self.transcriber.requests, "post", return_value=response),
                self.assertRaisesRegex(self.transcriber.TranscriptionError, "quota"),
            ):
                self.transcriber.transcribe_chunk_groq(str(audio))

    def test_oversized_chunk_is_rejected_before_api_request(self):
        with tempfile.TemporaryDirectory() as folder:
            audio = Path(folder) / "chunk.wav"
            with audio.open("wb") as output:
                output.truncate(self.transcriber.GROQ_MAX_FILE_BYTES + 1)
            with (
                patch.dict("os.environ", {"GROQ_API_KEY": "fixture-key"}),
                patch.object(self.transcriber.requests, "post") as post,
                self.assertRaisesRegex(self.transcriber.TranscriptionError, "upload limit"),
            ):
                self.transcriber.transcribe_chunk_groq(str(audio))
        post.assert_not_called()


if __name__ == "__main__":
    unittest.main()
