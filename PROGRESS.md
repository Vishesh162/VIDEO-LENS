# Project progress

## Done

- The CLI and Python pipeline handle audio preparation, English and Hinglish transcription, notes, and transcript-based chat.
- The HTTP adapter and Next.js workspace have code for uploads, YouTube analysis, job status, cancellation, and chat. The frontend also includes an offline walkthrough.
- The HTTP adapter has a test suite at `tests/test_api_server.py` with model calls replaced by fixtures.

## Broken or inconsistent

- The frontend README lists port 8000. The server default and the frontend example and client use 8001.
- The requested root-level pytest path does not exist. The suite is under `tests/`.
- The standalone `test.py` script starts processing a hardcoded YouTube link at module scope.

## Left to verify

- Run the API tests and the Next.js build and address any failures.
- Locate the reported sample video download and remove any automatic test download.
- Start the API and frontend and check requests from the frontend origin.

## Verification on 2026-11-18

- `python -m pytest test_api_server.py` could not run: pytest is not installed in the active .venv. Approval to install it is pending.
- `python -m unittest -v tests.test_api_server`: all 6 tests passed.
- `npm run build` in frontend: passed compilation, TypeScript, and static generation.
- Server, frontend example environment, and frontend client all use http://127.0.0.1:8001.
- No tracked file contains VUvk71bw-wU. The audio utility has no download at module scope; its import-side-effect regression test passed.
