"use client";

import Link from "next/link";
import { Download, FileVideo, Plus, Sparkles } from "lucide-react";
import { useRef } from "react";
import { walkthrough } from "@/lib/walkthrough";
import { downloadSessionPdf } from "@/lib/notes";
import { AssistantChat } from "./assistant-chat";
import { NotesPanel } from "./notes-panel";
import { VideoPlayer } from "./video-player";

export function ProductPreview() {
  const video = useRef<HTMLVideoElement | null>(null);
  return <div className="product-app app app-frame ui ui-video-assistant fill" aria-label="AI Video Assistant with a video, its summary, and transcript-based chat">
    <div className="app-topbar"><span className="app-topbar-title"><span className="app-mini-mark"><Sparkles size={15} /></span>Your workspace</span><span className="preview-badge">Walkthrough</span><button type="button" className="icon-button" aria-label="Download walkthrough notes as PDF" onClick={() => { void downloadSessionPdf(walkthrough, "field-notes.pdf"); }}><Download size={16} /></button></div>
    <div className="product-app-body">
      <div className="preview-library app__pane app__pane--list"><div className="preview-library-title"><FileVideo size={16} /><span>Current video</span></div><div className="preview-current-file"><span className="preview-file-icon"><FileVideo size={18} /></span><div><p>Field notes</p><span>Video · English</span></div><span className="file-ready-dot" /></div><div className="preview-video"><VideoPlayer compact onReady={(element) => { video.current = element; }} /></div><Link href="/workspace/" className="preview-add-file"><Plus size={15} /> Add your video</Link><p className="preview-library-note">Download your notes<br />before you leave.</p></div>
      <div className="preview-notes app__pane app__pane--open"><div className="preview-note-title"><p>Field notes: the art of noticing</p><span><Sparkles size={12} /> Video notes</span></div><NotesPanel session={walkthrough} preview onSeek={(seconds) => { if (video.current) video.current.currentTime = seconds; }} /></div>
      <AssistantChat session={walkthrough} small />
    </div>
  </div>;
}
