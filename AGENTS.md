# AI Video Assistant

Turn a video into a transcript (Whisper for English, Sarvam for Hinglish), then
produce a summary, action items, decisions, and open questions. RAG chat answers
questions using the transcript.

- `main.py` runs the pipeline and CLI. `api_server.py` serves the local HTTP API.
- `core/` handles transcription, notes, embeddings, and RAG. `utils/` prepares audio.
- `tests/` covers the HTTP adapter. `frontend/` contains the Next.js app.

From the project root, use `.\.venv\Scripts\python.exe main.py` for the CLI or
`.\.venv\Scripts\python.exe api_server.py` for the API on `127.0.0.1:8001`.
Live analysis needs FFmpeg and the relevant provider credentials in `.env`.
From `frontend/`, run `npm run dev` and open `http://127.0.0.1:3000`.

- Always use `fp16=False` with Whisper. The Quadro T2000 produces NaN with FP16.
- Auto-detect the embedding device as `cuda` or `cpu`. Never hardcode `"gpu"`.
- Never commit `.env`, `.venv/`, `downloads/`, or `vector_db/`.
- Ask the user before installing packages or deleting files.

Read PROGRESS.md for current status
