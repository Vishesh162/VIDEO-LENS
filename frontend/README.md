# AI Video Assistant frontend

An original Next.js interface for the existing Python video assistant. It uses Onest, a dark green and bone palette, Motion for React, and Taste Skill’s entrance, hover, and letters-assemble motion. The Onda reference informed animation pacing; its website content and source were not copied.

## Run

From this directory:

```powershell
npm install
npm run dev
```

Open http://127.0.0.1:3000. The landing page links to `/workspace/`; **Try the walkthrough** works without the Python server or model credentials.

For real video analysis, open a second terminal in the project root:

```powershell
.\.venv\Scripts\python.exe api_server.py
```

The adapter uses the project’s existing dependencies, FFmpeg, Whisper, and configured provider credentials. Model calls happen only when you analyze a recording or ask about a real analyzed video. The server listens on 127.0.0.1:8001. For a different server address, copy `.env.example` to `.env.local`, change `NEXT_PUBLIC_ASSISTANT_API_URL`, and restart Next.js.

## Included interactions

- File picker and drag-and-drop, supported-format and 200 MB validation.
- YouTube link validation; English and Hinglish selection.
- Actual job stages, cancellation, and errors that preserve the input.
- Summary, searchable transcript, action items, decisions, and open questions.
- Keyboard-accessible notes tabs and mobile view selection.
- Transcript-based chat; prepared local answers in the walkthrough.
- Markdown downloads, transcript copy, and an eight-item browser library.
- Video playback, scrubbing, audio control, and fullscreen.
- Responsive workspace with a mobile notes/chat switch.
- Reduced-motion support throughout.

## Build and verify

```powershell
npm run build
npm run typecheck
npm run check:interactions
```

Next.js exports the frontend to `out/`. The interaction check launches headless Chrome, serves that export locally, and tests the actual controls. The Python adapter can be tested without model calls using `python -m unittest tests.test_api_server` from the project root.

## Design tools and assets

`uipro init --ai codex` was run through `uipro-cli`; its design-system search is saved in `design-system/ai-video-assistant/`. `npx motion-ai` installed the project Motion skill and MCP configuration. `motion` is used for tabs, view changes, and chat messages; its animation guidance was read locally. Motion+ is not required.

The CC0 flower footage comes from MDN Web Docs. The poster was extracted from that footage. The walkthrough’s lesson, transcript, notes, and answers are authored fixtures for trying the interface; they are not a claimed live transcription of the flower clip. Onest and JetBrains Mono are locally hosted Google Fonts. No customer names, prices, testimonials, or usage figures were invented.

The canonical domain and a production hosting/API configuration are still yours to set. This local build deliberately exposes no provider keys to the browser. The browser library stores completed notes, not the original video bytes. Reloading a saved uploaded session preserves notes; replay requires reselecting the source recording. Live chat sessions end when the Python server restarts.
