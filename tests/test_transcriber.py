import importlib.util
import sys
import types
import unittest
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
        dependencies["requests"] = types.ModuleType("requests")
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
            text = self.transcriber.transcribe_chunk("recording.wav", language="english")
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
        with patch.object(self.transcriber, "load_model", return_value=model):
            text = self.transcriber.transcribe_all(["first.wav", "second.wav"], "english")
        self.assertEqual(text, "First. Second.")
        self.assertEqual(model.transcribe.call_count, 2)
        for call in model.transcribe.call_args_list:
            self.assertEqual(call.kwargs["language"], "en")
            self.assertIs(call.kwargs["fp16"], False)


if __name__ == "__main__":
    unittest.main()
