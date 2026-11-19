# Project progress

Updated 2026-11-18 from local source inspection and executed checks.

## Done

- Created Git checkpoint `bbb7351` before resuming. Required private and generated paths are ignored.
- Added the root AGENTS.md with project structure, run commands, and hardware and approval rules.
- Existing code implements video/audio preparation, Whisper English and Sarvam Hinglish transcription, summary, actions, decisions, questions, and Chroma-backed RAG chat.
- The HTTP adapter and Next.js workspace implement uploads, YouTube inputs, jobs, cancellation, notes, and chat. The frontend also has an offline walkthrough.
- Confirmed api_server.py, frontend/.env.example, and frontend/src/lib/api.ts all use http://127.0.0.1:8001. Corrected the stale frontend README from 8000 to 8001.
- Removed the hardcoded sample URL from test.py. It now requires an explicit source and optional --language; importing it performs no processing. No file was deleted.
- No tracked file contains VUvk71bw-wU. The audio utility has no automatic download at import; its regression test passed.

## Verified results

- Installed pytest into the existing .venv with user approval using uv, since the environment has no pip module.
- `python -m pytest tests/test_api_server.py`: 6 passed.
- `python -m pytest`: 6 passed; discovery performed no video download.
- `python -m unittest -v tests.test_api_server`: 6 passed.
- `npm run build` in frontend: passed compilation, TypeScript, and static generation.
- `python test.py --help` and `python -c "import test"`: passed without processing a recording.
- Started the Python API at http://127.0.0.1:8001 and Next.js dev server at http://127.0.0.1:3000.
- Headless Chrome loaded /workspace/ from port 3000, fetched API health (200, ready), and used the actual api.ts client for a cross-origin JSON POST. The API returned the expected 410 for an expired chat session, confirming browser connectivity and CORS.
- Startup logs, process IDs, and the browser connectivity check are in ignored .web_uploads/. Next.js generated frontend/AGENTS.md and updated next-env.d.ts during startup.

## Known issues and remaining work

- The literal command `python -m pytest test_api_server.py` fails because there is no root-level test file. Use the verified tests/ path above.
- There is no root README.md; current usage documentation is frontend/README.md and AGENTS.md.
- Source inspection found load_rag_chain() calls get_retriever() without its required vector-store argument. This separate saved-store loader is not used by the tested API path and has not been exercised or repaired.
- requirements.txt does not explicitly list langchain-openai, langchain-chroma, or langchain-text-splitters, although all three are installed in the current .venv. A fresh-environment installation has not been verified.
- Real English/Hinglish transcription, provider credentials, model downloads, and a complete live video-to-chat run remain unverified; API tests use fixtures and connectivity checks make no model calls.
- API chat sessions are held in memory and end on server restart. Production deployment configuration and persistent session recovery remain future work.

## Transcription language correction

- Investigated a user-reported Indonesian-looking transcript. English selection was not forwarded to Whisper, leaving language detection automatic; the installed Whisper source confirms this behavior when language is omitted.
- English transcription now explicitly passes language="en" and fp16=False. Removed the duplicate Whisper wrapper so only one definition remains; Hinglish still routes to Sarvam.
- Added three model-free regression tests for English language selection, FP16 safety, Hinglish routing, and per-chunk behavior. Combined API and transcription tests: 9 passed.
- Actual recording output remains unverified without a fresh analysis. Existing saved notes will not change automatically. The API was subsequently restarted with user approval; see the restart verification below.
- The earlier PDF export request has now been implemented with jsPDF; see PDF notes downloads below.

## Notes output language follow-up

- The reported Google Trends job completed with language="english", but its logged raw transcript is Indonesian-looking. At diagnosis time, the API process predated the Whisper language fix.
- Summary (both passes), title, action items, decisions, and questions now explicitly request English output. Chat defaults to English while allowing an explicit request for another language.
- Added model-free prompt composition regression tests. `python -m pytest tests`: 13 passed. These checks verify request construction, not a real provider's output.
- Checked the affected video's metadata without downloading media; it advertises an original English audio track. No automatic dubbing change was made.
- The affected recording still needs a fresh analysis to validate the live correction. Existing saved notes have not been edited or removed.

## API restart verification

- Restarted only the project Python API on 2026-11-18 at 18:57 local time, with explicit user approval, so subsequent analysis requests use the latest transcription and output-language code.
- API health at http://127.0.0.1:8001/api/health returned 200 with status ready. The workspace at http://127.0.0.1:3000/workspace/ returned 200.
- Headless Chrome confirmed browser-to-API health and JSON POST connectivity through the actual frontend client after restart. The frontend server was left running.
- Current API launcher PID: 25948; listener PID: 20240. Timestamped logs and updated process metadata are in ignored .web_uploads/.
- Old in-memory chat sessions ended as expected. Browser-saved notes were not changed.

## PDF notes downloads

- Replaced Markdown downloads with actual PDF generation in the workspace and landing-page walkthrough. Existing saved videos use the same PDF export without another analysis.
- Added jsPDF with user authorization. PDFs include summary, action items, decisions, open questions, and transcript, with embedded local Onest fonts, line wrapping, automatic page breaks, and page numbers.
- Updated the download button, FAQ, privacy copy, and frontend documentation.
- Verified production build and headless Chrome download of a file with a real PDF header.

## Public deployment and hosted Whisper

- English transcription now defaults to the server-side Groq Whisper API; local Whisper remains an opt-in fallback. Hinglish remains on Sarvam. DeepSeek integration is unchanged.
- Removed the browser video-library UI, clear its old saved history on workspace entry, and keep new notes in the active page only. Users can download PDFs before leaving.
- Added memory-only transcript search, FFmpeg disk-based conversion and chunking, 50 MB uploads, one active analysis at a time, and one-hour session expiry.
- Added a Render free Docker service blueprint. One container serves the static frontend and Python API through Nginx; production API requests use same-origin routes. Provider keys remain server-side.
- Python tests: 23 passed plus 5 subtests. Browser checks: 15/15 passed. Production build passed. Docker image build and running-container checks passed for the homepage, workspace, and API health.
- A real Groq transcription + DeepSeek notes and grounded-chat test passed using generated speech.
- Investigated the first Render YouTube failure: logs showed YouTube 429/403 responses and yt-dlp lacked a JavaScript challenge runtime. Added Node 24, the yt-dlp EJS dependency group, and explicit Node runtime configuration. The updated container successfully downloaded audio from the exact YouTube URL shown in the Render logs; full notes/chat already passed separately.
- yt-dlp’s cloud-access failures now return a clear message with video/audio upload as the fallback. Render auto-deploys this fix when it is pushed to main.

## 150 MB recording uploads

- Raised frontend, API, and reverse-proxy recording limits to 150 MiB (shown as 150 MB). Multipart uploads now stream to disk in 64 KiB reads instead of buffering the entire file. Added bounded metadata, incomplete-upload cleanup, explicit size errors, and a lock covering upload admission.
- Added the already-installed python-multipart parser to local and deployment requirements. Nginx request buffering is disabled for the API; provider keys and the DeepSeek model configuration are unchanged.
- Full-size generated 150 MiB upload parser test passed with under 4 MiB measured Python peak allocation. Regressions: 34 tests and 7 subtests passed; browser checks 15/15 passed; frontend and Docker builds passed.
- Real 150 MiB multipart request through the Docker/Nginx API passed under a 512 MiB container memory cap, followed by FFmpeg decoding, Groq Whisper, DeepSeek notes, and chat. The file contained short generated speech with valid media-container padding: this validates file-size handling, not long-duration performance. Container memory after analysis was 154 MiB.
- Whisper still receives sequential mono 16 kHz audio chunks below its 25 MiB upload limit. Long recordings still take longer and remain subject to provider rate limits.
