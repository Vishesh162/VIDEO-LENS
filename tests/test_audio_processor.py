import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from utils.audio_processor import chunk_audio, convert_to_wav


class AudioProcessorTests(unittest.TestCase):
    def test_convert_uses_ffmpeg_to_make_mono_16khz_audio(self):
        with tempfile.TemporaryDirectory() as folder:
            source = str(Path(folder) / "meeting.mp4")
            with patch("utils.audio_processor.subprocess.run") as run:
                output = convert_to_wav(source)
        self.assertEqual(output, str(Path(folder) / "meeting_converted.wav"))
        args = run.call_args.args[0]
        self.assertIn("ffmpeg", args[0])
        self.assertIn("-ac", args)
        self.assertEqual(args[args.index("-ac") + 1], "1")
        self.assertIn("-ar", args)
        self.assertEqual(args[args.index("-ar") + 1], "16000")
        self.assertTrue(run.call_args.kwargs["check"])

    def test_chunk_audio_uses_numbered_wav_segments(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "audio.wav"

            def write_chunks(args, **_):
                Path(str(args[-1]).replace("%04d", "0001")).touch()
                Path(str(args[-1]).replace("%04d", "0000")).touch()

            with patch("utils.audio_processor.subprocess.run", side_effect=write_chunks) as run:
                chunks = chunk_audio(str(source))

        self.assertEqual(chunks, [
            str(Path(folder) / "audio.wav_chunk_0000.wav"),
            str(Path(folder) / "audio.wav_chunk_0001.wav"),
        ])
        args = run.call_args.args[0]
        self.assertIn("-segment_time", args)
        self.assertEqual(args[args.index("-segment_time") + 1], "600")

    def test_chunk_audio_rejects_more_than_ten_minutes(self):
        with patch("utils.audio_processor.subprocess.run") as run:
            with self.assertRaisesRegex(ValueError, "between 1 and 10"):
                chunk_audio("audio.wav", chunk_minutes=11)
        run.assert_not_called()

    def test_chunk_audio_reports_empty_recordings(self):
        with tempfile.TemporaryDirectory() as folder:
            with patch("utils.audio_processor.subprocess.run"):
                with self.assertRaisesRegex(ValueError, "No audio"):
                    chunk_audio(str(Path(folder) / "audio.wav"))


if __name__ == "__main__":
    unittest.main()
