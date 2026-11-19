"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, ArrowRight, ArrowUpRight, Check, Copy, Download, FileVideo, Headphones, Link2, ListTodo, MessageSquare, Plus, Sparkles, Upload, X, Youtube } from "lucide-react";
import clsx from "clsx";
import { ACCEPTED_EXTENSIONS, MAX_UPLOAD_BYTES, awaitAnalysis, cancelAnalysis, startAnalysis, validateYoutube } from "@/lib/api";
import { downloadSessionPdf, downloadText, safeFilename } from "@/lib/notes";
import { walkthrough } from "@/lib/walkthrough";
import type { Language, VideoSession } from "@/lib/types";
import { AssistantChat } from "./assistant-chat";
import { Brand } from "./brand";
import { NotesPanel } from "./notes-panel";
import { VideoPlayer } from "./video-player";

export function Workspace() {
  const [session, setSession] = useState<VideoSession | null>(null);
  const [source, setSource] = useState<"file" | "youtube">("file");
  const [file, setFile] = useState<File | null>(null);
  const [youtube, setYoutube] = useState("");
  const [language, setLanguage] = useState<Language>("english");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("Preparing your recording");
  const [chatActive, setChatActive] = useState(false);
  const [media, setMedia] = useState("");
  const [toast, setToast] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const urlInput = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const abort = useRef<AbortController | null>(null);
  const jobId = useRef("");
  const objectUrl = useRef("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Remove storage left by the retired browser library. Notes now stay in this tab only.
    try { localStorage.removeItem("ai-video-assistant:library:v1"); } catch { /* Storage may be disabled. */ }
    const params = new URLSearchParams(window.location.search);
    if (params.get("source") === "youtube") {
      setSource("youtube");
      const link = validateYoutube(params.get("url") || "");
      if (link) setYoutube(link);
    }
    if (new URLSearchParams(window.location.search).has("walkthrough")) { setSession(walkthrough); setMedia("/media/field-notes.mp4"); }
    return () => { abort.current?.abort(); if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, []);

  function notify(message: string) { setToast(message); if (toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(""), 3000); }
  function newVideo() { if (busy) return; setSession(null); setChatActive(false); setError(""); video.current = null; setMedia(""); }
  function openWalkthrough() { if (busy) return; setSession(walkthrough); setMedia("/media/field-notes.mp4"); setChatActive(false); setError(""); }
  function selectFile(candidate?: File) {
    if (!candidate) return;
    const extension = candidate.name.split(".").pop()?.toLowerCase() || "";
    if (!ACCEPTED_EXTENSIONS.includes(extension)) { setError("Choose an MP4, MOV, WebM, MKV, MP3, WAV, M4A, or OGG recording."); return; }
    if (!candidate.size) { setError("This file is empty. Choose a recording with audio or video."); return; }
    if (candidate.size > MAX_UPLOAD_BYTES) { setError("Choose a recording smaller than 150 MB."); return; }
    setFile(candidate); setError("");
  }

  async function analyze() {
    if (busy) return;
    const url = source === "youtube" ? validateYoutube(youtube) : null;
    if (source === "file" && !file) { setError("Choose a recording before starting the analysis."); fileInput.current?.focus(); return; }
    if (source === "youtube" && !url) { setError("Paste a valid HTTPS YouTube video link, such as https://www.youtube.com/watch?v=VIDEO_ID."); urlInput.current?.focus(); return; }
    const controller = new AbortController(); abort.current = controller; jobId.current = "";
    setBusy(true); setError(""); setStage(source === "file" ? "Sending your recording" : "Opening the YouTube video");
    try {
      const job = await startAnalysis({ file: source === "file" ? file || undefined : undefined, youtube: url || undefined, language }, controller.signal);
      jobId.current = job.id;
      const result = await awaitAnalysis(job.id, controller.signal, setStage);
      if (controller.signal.aborted) return;
      if (objectUrl.current) { URL.revokeObjectURL(objectUrl.current); objectUrl.current = ""; }
      if (source === "file" && file) { objectUrl.current = URL.createObjectURL(file); setMedia(objectUrl.current); } else setMedia("");
      setSession(result); setChatActive(false);
    } catch (caught) { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "The recording couldn’t be analyzed. Please try again."); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }

  function cancel() { abort.current?.abort(); if (jobId.current) void cancelAnalysis(jobId.current).catch(() => undefined); setBusy(false); setStage(""); notify("Analysis cancelled."); }
  async function copyTranscript() { if (!session) return; try { await navigator.clipboard.writeText(session.transcript); notify("Transcript copied."); } catch { downloadText(session.transcript, `${safeFilename(session.title)}-transcript.txt`, "text/plain;charset=utf-8"); notify("Transcript downloaded."); } }
  function downloadNotes() {
    if (!session) return;
    void downloadSessionPdf(session, `${safeFilename(session.title)}.pdf`)
      .then(() => notify("PDF downloaded."))
      .catch(() => notify("Couldn’t create the PDF. Please try again."));
  }
  const youtubeId = session?.source_kind === "youtube" && session.source_url ? new URL(session.source_url).searchParams.get("v") : null;

  return <div className="workspace-shell">
    <header className="studio-nav"><a className="skip-link" href="#workspace-main">Skip to workspace</a><Brand /><span className="studio-breadcrumb">Workspace</span><div className="studio-nav-actions">
      <Link className="studio-text-button studio-youtube-guide" href="/youtube/"><Youtube size={15} /><span>YouTube · Local setup</span></Link>
      <button type="button" className="studio-text-button" onClick={openWalkthrough} disabled={busy}><Sparkles size={14} />Try the walkthrough</button>{session && <button type="button" className="studio-text-button" onClick={newVideo} disabled={busy} aria-label="Add a new video"><Plus size={15} /><span>Add a video</span></button>}</div></header>
    <div className="studio-layout">
      <main id="workspace-main" className="studio-main">
        <AnimatePresence initial={false} mode="wait">
          {busy ? <motion.div className="processing-view" key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .15 }}><div className="processing-orbit"><Headphones size={36} strokeWidth={1.2} /></div><h1>A little listening.<br />Something worth keeping.</h1><p>Your assistant is working through the recording. Longer videos take more time; your notes appear here when they’re ready.</p><div className="processing-stage" role="status"><span className="loading-ring" />{stage}</div><button type="button" className="studio-text-button" onClick={cancel}><X size={14} />Cancel analysis</button></motion.div>
          : session ? <motion.div className="session-workspace" key={session.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .15 }}>
            <div className="session-toolbar"><div className="session-toolbar-title"><h1>{session.title}</h1><div className="session-meta"><span>{session.source_kind === "walkthrough" ? "Walkthrough" : session.source_kind === "youtube" ? "YouTube video" : "Your recording"}</span><span aria-hidden="true">·</span><span>{session.language === "hinglish" ? "Hinglish → English" : "English"}</span><span aria-hidden="true">·</span><span><Check size={11} /> Notes ready</span></div></div><div className="session-toolbar-actions"><button type="button" className="studio-text-button" onClick={copyTranscript} aria-label="Copy transcript"><Copy size={14} /><span>Copy transcript</span></button><button type="button" className="studio-text-button" onClick={downloadNotes} aria-label="Download notes as PDF"><Download size={14} /><span>Download PDF</span></button></div></div>
            <div className="session-mobile-tabs"><button type="button" className={!chatActive ? "is-active" : ""} aria-pressed={!chatActive} onClick={() => setChatActive(false)}><ListTodo size={15} />Video notes</button><button type="button" className={chatActive ? "is-active" : ""} aria-pressed={chatActive} onClick={() => setChatActive(true)}><MessageSquare size={15} />Ask the assistant</button></div>
            <div className={clsx("session-columns", chatActive && "chat-is-active")}><div className="session-document"><div className="session-video">{session.source_kind === "walkthrough" || media ? <VideoPlayer src={session.source_kind === "walkthrough" ? "/media/field-notes.mp4" : media} compact onReady={(element) => { video.current = element; }} /> : youtubeId ? <iframe className="session-youtube" title="Your YouTube recording" src={`https://www.youtube-nocookie.com/embed/${youtubeId}`} allow="fullscreen; picture-in-picture" allowFullScreen /> : <div className="session-audio-placeholder"><FileVideo size={32} strokeWidth={1.3} /></div>}<div className="session-video-info"><p>{session.source_kind === "walkthrough" ? "The art of noticing" : session.source_name}</p><span>{session.source_kind === "walkthrough" ? "Look closely. Keep the details." : media || youtubeId ? "Read along with your recording." : "Download your PDF before leaving this page."}</span></div></div><NotesPanel key={session.id} session={session} onSeek={(seconds) => { if (video.current) video.current.currentTime = seconds; }} /></div><AssistantChat session={session} /></div>
          </motion.div>
          : <motion.div className="upload-workspace" key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .15 }}><p className="workspace-kicker"><Sparkles size={15} />A place for your next thought</p><h1>Start with a video.<br />Keep the good parts.</h1><p className="workspace-intro">Drop in a recording or a YouTube link. Get the transcript, the key points, and answers. Download a PDF to keep them.</p>
            <form className="upload-box" onSubmit={(event) => { event.preventDefault(); void analyze(); }} noValidate>
              <div className="source-tabs" aria-label="Recording source">{([{ id: "file", label: "Upload a file", icon: Upload }, { id: "youtube", label: "YouTube link", icon: Link2 }] as const).map(({ id, label, icon: Icon }) => <button key={id} type="button" className={source === id ? "is-active" : ""} aria-pressed={source === id} onClick={() => { setSource(id); setError(""); }}>{source === id && <motion.span className="source-tab-ground" layoutId="source-tab-ground" />}<Icon size={15} /><span>{label}</span></button>)}</div>
              {source === "file" ? <div className={clsx("drop-area", dragging && "is-dragging")} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); selectFile(event.dataTransfer.files[0]); }}><input id="video-file" ref={fileInput} type="file" className="sr-only" accept={ACCEPTED_EXTENSIONS.map((extension) => `.${extension}`).join(",")} onChange={(event) => { selectFile(event.target.files?.[0]); event.target.value = ""; }} aria-describedby={error ? "upload-error" : "file-formats"} /><label className="sr-only" htmlFor="video-file">Choose a video or audio recording</label>{file ? <div className="file-selected"><FileVideo size={38} strokeWidth={1.3} /><div className="selected-file-meta"><p>{file.name}</p><span>{(file.size / 1024 / 1024).toFixed(1)} MB · Ready to analyze</span></div><button type="button" className="icon-button" aria-label="Remove selected file" onClick={() => setFile(null)}><X size={16} /></button></div> : <><span className="drop-icon"><Upload size={24} strokeWidth={1.3} /></span><p>Drop your recording here, or <button type="button" className="choose-file" onClick={() => fileInput.current?.click()}>choose a file</button></p><span id="file-formats">MP4, MOV, WebM, MKV, MP3, WAV, M4A, OGG<br />Up to 150 MB</span></>}</div>
              : <div className="youtube-field"><label htmlFor="youtube-url">YouTube video link</label><div className="youtube-input"><Youtube size={20} /><input id="youtube-url" ref={urlInput} type="url" value={youtube} autoComplete="off" placeholder="https://www.youtube.com/watch?v=…" onChange={(event) => setYoutube(event.target.value)} aria-invalid={!!error} aria-describedby={error ? "upload-error" : "youtube-help"} /></div><p id="youtube-help">Paste a public video link. If YouTube blocks the download, upload the video or audio file instead.</p></div>}
              <div className="upload-settings"><label className="language-field" htmlFor="video-language"><span>Recording language</span><select id="video-language" value={language} onChange={(event) => setLanguage(event.target.value as Language)}><option value="english">English</option><option value="hinglish">Hinglish</option></select></label><button type="submit" className="analyze-button">Analyze video<ArrowUpRight size={17} /></button></div>
              {source === "youtube" && <Link className="youtube-local-shortcut" href={`/youtube/`}><span><Youtube size={17} /><span>Prefer running YouTube links locally?<small>Get the code and follow the setup guide.</small></span></span><ArrowUpRight size={18} /></Link>}
              {error && <p className="upload-error" id="upload-error" role="alert"><AlertCircle size={16} /><span>{error}</span></p>}
            </form><div className="walkthrough-prompt"><Sparkles size={15} /><span>Curious how it feels? Take the field-notes walkthrough.</span><button type="button" onClick={openWalkthrough}>Open walkthrough<ArrowRight size={14} /></button></div>
          </motion.div>}
        </AnimatePresence>
      </main>
    </div>
    <AnimatePresence>{toast && <motion.div className="studio-toast" key="toast" role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .15 }}><Check size={15} />{toast}</motion.div>}</AnimatePresence>
  </div>;
}
