# Video Lens

Video Lens is a full-stack generative AI assistant that turns meetings, lectures,
interviews, and other recordings into useful notes. Upload a video or audio file,
or try a public YouTube link, to get a transcript, summary, action items, key
decisions, and open questions. Ask follow-up questions using transcript-based
retrieval, then download everything as a PDF.

The app opens without sign-in and keeps no browser video library. Notes live in
the current tab; save your PDF before leaving. Temporary source uploads are
removed after processing, and server-side sessions expire.

**[Live app](https://video-lens.onrender.com)** ·
**[Local YouTube setup guide](https://video-lens.onrender.com/youtube/)** ·
**[Source code](https://github.com/Vishesh162/VIDEO-LENS)**

## Features

- Stream video/audio uploads up to 150 MB to disk without loading the whole file into RAM.
- English transcription with Groq Whisper; optional Sarvam processing for Hinglish.
- Configurable model provider for summaries, action items, decisions, questions, and chat.
- Searchable transcript and answers grounded in retrieved transcript passages.
- PDF export, video playback, analysis progress, and cancellation.
- Responsive Next.js interface with a local setup guide and copyable Docker commands.
- A prepared walkthrough that works without provider keys.

## How it works

    Recording -> FFmpeg audio chunks -> Whisper/Sarvam transcript
        -> Your configured language model -> Notes + transcript-grounded chat -> PDF

The frontend uses Next.js, React, TypeScript, and Motion. A Python HTTP API
handles uploads and background jobs. FFmpeg prepares audio, Groq hosts Whisper,
and an OpenAI-compatible chat API provides notes and answers. The default hosted
configuration uses lightweight in-memory transcript search; optional vector search
is available with the full local dependencies. Docker serves the frontend and API
together through Nginx.

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
- LLM_API_KEY: your chosen model provider's API key.
- LLM_MODEL: the exact model ID offered by that provider.
- LLM_BASE_URL: that provider's OpenAI-compatible API base URL.
- SARVAM_API_KEY: optional, needed for Hinglish recordings.

Keep your keys private. They belong in .env, not the frontend or GitHub.
The Groq configuration does not require a local GPU. Provider quotas still apply.

### Choose your language model

Use any open model offered through a provider's **OpenAI-compatible chat
completions API**. All three LLM settings must come from the same provider:

    LLM_API_KEY=your-provider-api-key
    LLM_MODEL=your-provider-model-id
    LLM_BASE_URL=https://your-provider.example/v1

The URL above is a placeholder: replace it with your provider's documented base
URL and use its exact model ID. An API key by itself does not select the model.
The same configuration is used for every note section and chat. Providers with
only a different, native API format need a separate adapter.

Existing deployments retain their previous DeepSeek configuration when these
three generic settings are left unset. Transcription credentials are separate
from your notes/chat model credentials.

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
For a new deployment, configure GROQ_API_KEY plus LLM_API_KEY, LLM_MODEL, and
LLM_BASE_URL. SARVAM_API_KEY is required only for Hinglish. Rebuild your Docker
image after source updates; provider settings are read from the server environment.

## Verify

    python -m pytest tests -q
    cd frontend
    npm run build
    npm run check:interactions

Browser checks use Google Chrome; set CHROME_PATH if it is installed elsewhere.
