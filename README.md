# Video Lens

Turn recordings into transcripts, summaries, action items, decisions, and answers.
No sign-in or saved video library. Download the PDF before leaving the workspace.

## Run the full interface locally

Install Docker Desktop and Git, then open a terminal:

    git clone https://github.com/Vishesh162/VIDEO-LENS.git
    cd VIDEO-LENS

Copy the environment template in Windows PowerShell:

    Copy-Item .env.example .env

Or in a macOS / Linux shell:

    cp .env.example .env

Open .env in your editor and fill in:

- GROQ_API_KEY: hosted Whisper for English transcription.
- ROUTIX_API_KEY: the existing DeepSeek integration for notes and chat.
- SARVAM_API_KEY: optional, needed for Hinglish recordings.

Keep your keys private. They belong in .env, not the frontend or GitHub.
The Groq configuration does not require a local GPU. Provider quotas still apply.

With Docker Desktop running, build and launch:

    docker build -t video-lens .
    docker run --rm --env-file .env -p 127.0.0.1:8080:8080 video-lens

Open http://127.0.0.1:8080/workspace/. Upload a recording up to 150 MB,
or choose YouTube link, paste a public video URL, and click Analyze video.
Keep the terminal open; press Ctrl+C to stop. Relaunch with the same Docker run
command. Rebuild after pulling code updates.

The interactive setup guide is at /youtube/. It includes a source ZIP link
for users who prefer downloading the repository instead of cloning it.
After extracting the ZIP, open a terminal in VIDEO-LENS-main and start with
copying .env.example.

YouTube requests originate from your machine when running locally. This can help
when a shared cloud server is blocked, but local access is not guaranteed:
private, restricted, or blocked videos may still fail. Upload the recording
instead when needed.

## Development without Docker

See [frontend/README.md](frontend/README.md) for the Next.js development commands.
The Python API starts with python api_server.py after installing FFmpeg and
requirements-web.txt in a virtual environment.
The local API is at 127.0.0.1:8001 and frontend at 127.0.0.1:3000.

## Deploy

The root Dockerfile builds the static frontend and serves it alongside the Python
API through Nginx. The Render blueprint is in render.yaml; add provider keys
in Render's environment settings. The hosted app never needs visitors' GPUs.

## Verify

    python -m pytest tests -q
    cd frontend
    npm run build
    npm run check:interactions

Browser checks use Google Chrome; set CHROME_PATH if it is installed elsewhere.
