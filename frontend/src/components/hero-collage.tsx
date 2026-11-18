"use client";

import Link from "next/link";
import { Check, FileText, Play, Sparkles, Text } from "lucide-react";
import { VideoPlayer } from "./video-player";

const heights = [14, 24, 34, 18, 42, 28, 52, 32, 20, 48, 60, 38, 22, 44, 30, 54, 38, 18, 28, 48, 34, 16, 40, 24, 54, 36, 22, 46, 32, 18, 28, 14];

export function Waveform({ small = false }: { small?: boolean }) {
  return <div className={`waveform${small ? " waveform--small" : ""}`} aria-hidden="true">{heights.map((height, index) => <span key={index} style={{ height: `${height}%`, opacity: 0.38 + (height / 60) * 0.62 }} />)}</div>;
}

export function HeroCollage() {
  return <div className="ly-collage hero-collage span-6 start-4 ui ui-video-collage" aria-label="A video, its transcript, and the useful notes" data-enter-media>
    <div className="ly-collage__set is-on">
      <div className="ly-piece hero-transcript">
        <div className="mini-window-bar"><span><Text size={15} /> Transcript</span><span className="tiny-tag">English</span></div>
        <div className="hero-transcript-body"><p className="mini-label">Speaker · 00:00</p><p className="transcript-quote">“Before you describe what a scene means, write down what you can actually see.”</p><Waveform /><div className="mini-transcript-foot"><span><Check size={13} /> Every word, in writing</span><span className="mini-label">00:05</span></div></div>
      </div>
      <div className="ly-piece hero-video"><div className="mini-window-bar"><span><Play size={14} /> Field notes</span><span className="window-dots"><i /><i /><i /></span></div><VideoPlayer compact /></div>
      <Link href="/workspace/?walkthrough=1" className="ly-piece hero-takeaways card">
        <div className="takeaways-card-head"><span className="mini-assistant"><Sparkles size={18} /></span><span className="mini-label">Your notes</span></div>
        <p className="takeaways-big">Keep the<br />useful parts.</p>
        <div className="mini-note-line"><Check size={14} /><span>Observe the details</span></div><div className="mini-note-line"><Check size={14} /><span>Question assumptions</span></div><div className="mini-note-line"><Check size={14} /><span>Compare your notes</span></div>
        <div className="takeaways-card-foot"><FileText size={15} /><span>Open the walkthrough</span><span aria-hidden="true">↗</span></div>
      </Link>
    </div>
  </div>;
}
