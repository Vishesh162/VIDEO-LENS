"""Stream a browser's multipart recording to disk with bounded memory."""

from pathlib import Path
from python_multipart.multipart import MultipartParser, parse_options_header
from python_multipart.exceptions import MultipartParseError

READ_BYTES = 64 * 1024


class UploadError(ValueError):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def receive_recording(stream, content_type: str, length: int, folder: Path, max_bytes: int, extensions: set[str]):
    _, options = parse_options_header(content_type)
    boundary = options.get(b"boundary", b"")
    if not boundary or len(boundary) > 200:
        raise UploadError("The upload has an invalid multipart boundary.")
    if length <= 0 or length > max_bytes + 64 * 1024:
        raise UploadError("Choose a recording no larger than 150 MB.", 413)

    headers = {}
    header_name = bytearray()
    header_value = bytearray()
    field_data = bytearray()
    field = b""
    file_handle = None
    source = None
    name = ""
    language = "english"
    file_bytes = 0
    part_count = 0
    header_bytes = 0
    ended = False
    seen = set()

    def part_begin():
        nonlocal part_count, header_bytes
        part_count += 1
        if part_count > 4:
            raise UploadError("The upload contains too many fields.")
        headers.clear()
        field_data.clear()
        header_bytes = 0

    def header_data(target, data, start, end):
        nonlocal header_bytes
        header_bytes += end - start
        if header_bytes > 8192:
            raise UploadError("The upload headers are too large.")
        target.extend(data[start:end])

    def header_end():
        key = bytes(header_name).lower()
        if key in headers:
            raise UploadError("The upload contains duplicate headers.")
        headers[key] = bytes(header_value)
        header_name.clear()
        header_value.clear()

    def headers_finished():
        nonlocal field, file_handle, source, name
        disposition, params = parse_options_header(headers.get(b"content-disposition"))
        field = params.get(b"name", b"")
        if disposition != b"form-data" or field not in (b"file", b"language") or field in seen:
            raise UploadError("Send one recording and one optional recording language.")
        seen.add(field)
        if field == b"file":
            raw_name = params.get(b"filename", b"").decode("utf-8", errors="replace")
            name = Path(raw_name.replace("\\", "/")).name
            suffix = Path(name).suffix.lower()
            if suffix not in extensions:
                raise UploadError("Choose a supported video or audio recording.")
            folder.mkdir(parents=True, exist_ok=True)
            source = folder / f"recording{suffix}"
            file_handle = source.open("wb")

    def part_data(data, start, end):
        nonlocal file_bytes
        if field == b"file":
            file_bytes += end - start
            if file_bytes > max_bytes:
                raise UploadError("Choose a recording no larger than 150 MB.", 413)
            file_handle.write(memoryview(data)[start:end])
        else:
            if len(field_data) + end - start > 128:
                raise UploadError("The recording language field is too large.")
            field_data.extend(data[start:end])

    def part_end():
        nonlocal language, file_handle
        if field == b"file" and file_handle is not None:
            file_handle.close()
            file_handle = None
        elif field == b"language":
            language = field_data.decode("utf-8").strip()

    def end():
        nonlocal ended
        ended = True

    parser = MultipartParser(boundary, {
        "on_part_begin": part_begin,
        "on_header_field": lambda data, start, end: header_data(header_name, data, start, end),
        "on_header_value": lambda data, start, end: header_data(header_value, data, start, end),
        "on_header_end": header_end,
        "on_headers_finished": headers_finished,
        "on_part_data": part_data,
        "on_part_end": part_end,
        "on_end": end,
    })
    remaining = length
    try:
        while remaining:
            chunk = stream.read(min(READ_BYTES, remaining))
            if not chunk:
                raise UploadError("The upload was interrupted. Please try again.")
            remaining -= len(chunk)
            parser.write(chunk)
        parser.finalize()
        if not ended or not source or not file_bytes:
            raise UploadError("The recording upload is incomplete or empty.")
        if language not in {"english", "hinglish"}:
            raise UploadError("Choose English or Hinglish.")
        return str(source), name, language
    except MultipartParseError as error:
        raise UploadError("The recording upload is malformed. Please try again.") from error
    finally:
        if file_handle is not None:
            file_handle.close()
