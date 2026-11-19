"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUpRight, Check, ChevronRight, Copy, ExternalLink, FileText, Github, Laptop, Play, Terminal, Upload, Youtube } from "lucide-react";
import { Brand } from "./brand";
import { validateYoutube } from "@/lib/api";

const REPO = "https://github.com/Vishesh162/VIDEO-LENS";
const steps = [
  { title: "Get your copy", description: "Install Docker Desktop and Git first. Open a terminal, then clone the project.", command: "git clone https://github.com/Vishesh162/VIDEO-LENS.git\ncd VIDEO-LENS" },
  { title: "Choose your AI model", description: "Copy the example, then open .env in your editor. Use any open model served through an OpenAI-compatible API: set LLM_API_KEY, LLM_MODEL, and LLM_BASE_URL from your provider. Add GROQ_API_KEY for Whisper and SARVAM_API_KEY only for Hinglish.", command: "Copy-Item .env.example .env" },
  { title: "Build your workspace", description: "Keep Docker Desktop running. The first build downloads the tools the app needs; later launches reuse them.", command: "docker build -t video-lens ." },
  { title: "Start it on your computer", description: "Run this from the project folder. Leave the terminal open while you work. Press Ctrl+C to stop.", command: "docker run --rm --env-file .env -p 127.0.0.1:8080:8080 video-lens" },
];

function CommandBlock({ command, label }: { command: string; label: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setStatus("copied");
    } catch { setStatus("failed"); }
  }
  return <div className="local-command">
    <div className="local-command-bar"><span><Terminal size={13} />{label}</span><button type="button" onClick={() => { void copy(); }} aria-label={`Copy ${label} command`}>{status === "copied" ? <Check size={14} /> : <Copy size={14} />}<span>{status === "copied" ? "Copied" : "Copy"}</span></button></div>
    <pre><code>{command}</code></pre>
    <span className="sr-only" role="status">{status === "copied" ? "Command copied." : status === "failed" ? "Copy unavailable. Select and copy the command manually." : ""}</span>
  </div>;
}

export function YoutubeLocalGuide() {
  const [platform, setPlatform] = useState<"windows" | "unix">("windows");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const valid = validateYoutube(url);
  const localUrl = valid ? `http://127.0.0.1:8080/workspace/?source=youtube&url=${encodeURIComponent(valid)}` : "http://127.0.0.1:8080/workspace/";

  return <div className="local-guide">
    <header className="local-nav"><Brand /><Link className="local-button local-button-quiet" href="/workspace/"><ArrowLeft size={15} /><span>Back to workspace</span></Link></header>
    <main>
      <section className="local-hero">
        <div className="local-hero-copy"><p className="local-eyebrow"><span />THE LOCAL WORKSPACE</p>
          <h1>Your links.<br />Your computer.<br /><em>Same good notes.</em></h1>
          <p className="local-lead">Give YouTube links a workspace on your own machine. The same transcripts, notes, and answers—with requests starting from your connection.</p>
          <div className="local-hero-actions"><a className="local-button local-button-primary" href="#local-setup">Set up locally<ArrowDown size={17} /></a><a className="local-button local-button-outline" href={REPO} target="_blank" rel="noopener noreferrer"><Github size={17} />View on GitHub<ArrowUpRight size={16} /></a></div>
          <div className="local-hero-detail"><Laptop size={14} /><span>Windows, macOS & Linux</span><span className="local-detail-dot" /><span>No GPU required with Groq</span></div>
        </div>
        <div className="local-stage" aria-label="YouTube audio becomes a transcript and notes in your local workspace" role="img">
          <div className="local-stage-grid" />
          <div className="local-card-stack">
            <div className="local-sheet local-sheet-back"><FileText size={18} /><span>THE THOUGHTS WORTH KEEPING</span><i /><i /><i /></div>
            <div className="local-sheet local-sheet-middle"><span className="local-mini-label">TRANSCRIPT / 01</span><p>Listen closely.<br />Keep the context.</p><div className="local-wave">{Array.from({ length: 28 }, (_, index) => <i key={index} style={{ height: 8 + (index * 17 % 35) }} />)}</div></div>
            <div className="local-sheet local-sheet-front"><div className="local-demo-bar"><span><i /><i /><i /></span><span>127.0.0.1:8080</span><Laptop size={13} /></div><div className="local-demo-body"><span className="local-play"><Play size={26} fill="currentColor" /></span><span className="local-mini-label">A VIDEO. A FEW GOOD IDEAS.</span><p>From a link<br />to a little clarity.</p><div className="local-demo-ready"><Check size={13} />Your notes, ready to keep<ArrowUpRight size={15} /></div></div></div>
          </div>
          <span className="local-floating-tag"><Youtube size={17} />YouTube → your workspace</span>
        </div>
      </section>
      <section className="local-context" aria-label="Choose how to use Video Lens">
        <div><span className="local-section-index">WHY LOCAL?</span><h2>A different route<br />for your links.</h2></div>
        <p>YouTube sometimes refuses downloads from shared cloud servers. Running locally uses your computer’s internet connection instead. It can help, but private, restricted, or blocked videos may still fail.</p>
        <Link href="/workspace/" className="local-context-link"><Upload size={20} /><span>Have the file already?<small>Upload up to 150 MB online.</small></span><ArrowUpRight size={20} /></Link>
      </section>
      <section id="local-setup" className="local-setup">
        <div className="local-setup-intro"><p className="local-eyebrow">01 / MAKE IT YOURS</p><h2>Four steps.<br />One familiar<br /><em>workspace.</em></h2><p>Docker keeps Python, FFmpeg, and the frontend together. Groq handles Whisper transcription; choose your own OpenAI-compatible model API for the notes and answers.</p>
          <div className="local-platform" role="group" aria-label="Setup operating system"><button type="button" aria-pressed={platform === "windows"} onClick={() => setPlatform("windows")}>Windows</button><button type="button" aria-pressed={platform === "unix"} onClick={() => setPlatform("unix")}>macOS / Linux</button></div>
          <div className="local-prerequisites"><a href="https://docs.docker.com/get-started/get-docker/" target="_blank" rel="noopener noreferrer">Get Docker Desktop<ExternalLink size={13} /></a><a href="https://git-scm.com/downloads" target="_blank" rel="noopener noreferrer">Get Git<ExternalLink size={13} /></a><a href={REPO + "/archive/refs/heads/main.zip"}>Download source ZIP<ArrowDown size={13} /></a></div>
          <p className="local-note">Using the ZIP? Extract it and open a terminal in its VIDEO-LENS-main folder, then start at step 02.</p>
        </div>
        <ol className="local-step-list">{steps.map((step, index) => <li className="local-step" key={step.title}><span className="local-step-number">0{index + 1}</span><div><h3>{step.title}</h3><p>{step.description}</p><CommandBlock label={`Step 0${index + 1}`} command={index === 1 && platform === "unix" ? "cp .env.example .env" : step.command} />{index === 1 && <p className="local-secret-note">Keep .env on your computer. Never put API keys in a YouTube URL, a screenshot, or your GitHub commits. Provider quotas still apply.</p>}</div></li>)}</ol>
      </section>
      <section className="local-launch" id="local-launch"><div><p className="local-eyebrow">02 / PRESS PLAY</p><h2>All set? Bring a link.</h2><p>Once the Docker terminal shows the server is running, open your local workspace. Add a YouTube link below to carry it across.</p></div>
        <div className="local-launch-form"><label htmlFor="local-youtube">YouTube video link <span>(optional)</span></label><div className="local-url-field"><Youtube size={19} /><input id="local-youtube" value={url} onChange={(event) => { setUrl(event.target.value); setError(""); }} placeholder="https://www.youtube.com/watch?v=…" type="url" aria-invalid={!!error} aria-describedby={error ? "local-link-error" : "local-link-help"} /></div>
          {error && <p role="alert" id="local-link-error">{error}</p>}
          <a className="local-button local-button-primary local-open-workspace" href={localUrl} target="_blank" rel="noopener noreferrer" onClick={(event) => { if (url.trim() && !valid) { event.preventDefault(); setError("Paste a valid public YouTube video link, or leave this blank."); } }}>Open local workspace<ArrowUpRight size={17} /></a>
          <p id="local-link-help">Opens on this computer at 127.0.0.1:8080. It works after you complete the setup above. Then click Analyze video.</p>
        </div>
      </section>
      <div className="local-bottom"><span>Keep a PDF before closing your workspace.</span><Link href="/workspace/?walkthrough=1">Try the walkthrough first<ChevronRight size={15} /></Link></div>
    </main>
  </div>;
}
