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
- Actual recording output remains unverified without the source audio. Existing saved notes will not change automatically; they need a new analysis. The running API needs a restart to guarantee the code change is loaded; restart approval is pending because in-memory chat sessions would end.
- The earlier PDF export request remains pending approval to install jsPDF; no PDF changes or package installations have been made.

## Notes output language follow-up

- The reported Google Trends job completed with language="english", but its logged raw transcript is Indonesian-looking. The API process predates the Whisper language fix and has not been restarted.
- Summary (both passes), title, action items, decisions, and questions now explicitly request English output. Chat defaults to English while allowing an explicit request for another language.
- Added model-free prompt composition regression tests. `python -m pytest tests`: 13 passed. These checks verify request construction, not a real provider's output.
- Checked the affected video's metadata without downloading media; it advertises an original English audio track. No automatic dubbing change was made.
- Restarting the API and rerunning the affected recording are still required to validate the live correction. Existing saved notes have not been edited or removed.
