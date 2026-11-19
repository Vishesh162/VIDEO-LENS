import io
import tempfile
import tracemalloc
import unittest
from pathlib import Path

from utils.upload_stream import READ_BYTES, UploadError, receive_recording


BOUNDARY = "video-assistant-stream-test"
CONTENT_TYPE = f"multipart/form-data; boundary={BOUNDARY}"
PREFIX = (
    f"--{BOUNDARY}\r\nContent-Disposition: form-data; name=\"file\"; "
    'filename="../meeting.mp4"\r\nContent-Type: video/mp4\r\n\r\n'
).encode()
SUFFIX = (
    f"\r\n--{BOUNDARY}\r\nContent-Disposition: form-data; name=\"language\"\r\n\r\n"
    f"english\r\n--{BOUNDARY}--\r\n"
).encode()
LIMIT = 150 * 1024 * 1024


class GeneratedUpload:
    """Generate a large recording without keeping it in test-process memory."""

    def __init__(self, size):
        self.size = size
        self.length = len(PREFIX) + size + len(SUFFIX)
        self.position = 0
        self.largest_read = 0

    def read(self, size):
        assert 0 < size <= READ_BYTES, "Upload attempted an unbounded read"
        self.largest_read = max(size, self.largest_read)
        pieces = []
        while size and self.position < self.length:
            if self.position < len(PREFIX):
                chunk = PREFIX[self.position:self.position + size]
            elif self.position < len(PREFIX) + self.size:
                chunk = b"x" * min(size, len(PREFIX) + self.size - self.position)
            else:
                start = self.position - len(PREFIX) - self.size
                chunk = SUFFIX[start:start + size]
            pieces.append(chunk)
            size -= len(chunk)
            self.position += len(chunk)
        return b"".join(pieces)


class StreamingUploadTests(unittest.TestCase):
    def test_full_150_mb_recording_is_written_with_bounded_memory(self):
        upload = GeneratedUpload(LIMIT)
        with tempfile.TemporaryDirectory() as folder:
            tracemalloc.start()
            try:
                source, name, language = receive_recording(
                    upload, CONTENT_TYPE, upload.length, Path(folder), LIMIT, {".mp4"},
                )
                _, peak = tracemalloc.get_traced_memory()
            finally:
                tracemalloc.stop()
            self.assertEqual(Path(source).stat().st_size, LIMIT)
            self.assertEqual(name, "meeting.mp4")
            self.assertEqual(language, "english")
        self.assertLess(peak, 4 * 1024 * 1024, "Parser buffered a large fraction of the recording")
        self.assertLessEqual(upload.largest_read, READ_BYTES)

    def test_oversized_file_is_rejected_while_streaming(self):
        upload = GeneratedUpload(1025)
        with tempfile.TemporaryDirectory() as folder, self.assertRaises(UploadError) as caught:
            receive_recording(upload, CONTENT_TYPE, upload.length, Path(folder), 1024, {".mp4"})
        self.assertEqual(caught.exception.status, 413)

    def test_oversized_content_length_is_rejected_before_reading(self):
        upload = GeneratedUpload(LIMIT + READ_BYTES)
        with tempfile.TemporaryDirectory() as folder, self.assertRaises(UploadError) as caught:
            receive_recording(upload, CONTENT_TYPE, upload.length, Path(folder), LIMIT, {".mp4"})
        self.assertEqual(caught.exception.status, 413)
        self.assertEqual(upload.position, 0)

    def test_truncated_or_missing_ending_boundary_is_rejected(self):
        for body, length in (
            (PREFIX + b"audio", len(PREFIX) + 999),
            (PREFIX + b"audio", len(PREFIX) + 5),
        ):
            with self.subTest(length=length), tempfile.TemporaryDirectory() as folder:
                with self.assertRaises(UploadError):
                    receive_recording(io.BytesIO(body), CONTENT_TYPE, length, Path(folder), LIMIT, {".mp4"})

    def test_duplicate_recording_fields_are_rejected(self):
        body = PREFIX + b"first" + b"\r\n" + PREFIX + b"second" + SUFFIX
        with tempfile.TemporaryDirectory() as folder, self.assertRaisesRegex(UploadError, "one recording"):
            receive_recording(io.BytesIO(body), CONTENT_TYPE, len(body), Path(folder), LIMIT, {".mp4"})

    def test_file_content_with_boundary_prefix_is_preserved(self):
        content = b"before\r\n--video-assistant-stream-test-not-a-boundary\x00after"
        body = PREFIX + content + SUFFIX
        with tempfile.TemporaryDirectory() as folder:
            source, _, _ = receive_recording(io.BytesIO(body), CONTENT_TYPE, len(body), Path(folder), LIMIT, {".mp4"})
            self.assertEqual(Path(source).read_bytes(), content)


if __name__ == "__main__":
    unittest.main()
