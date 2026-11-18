"use client";

import { useRef, useState } from "react";
import { Maximize2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { formatTime } from "@/lib/notes";

export function VideoPlayer({ src, compact = false, onReady }: { src?: string; compact?: boolean; onReady?: (video: HTMLVideoElement) => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(5);
  const [error, setError] = useState("");

  async function togglePlay() {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      try { await video.play(); setError(""); } catch { setError("This video couldn’t be played. Try opening it again."); }
    } else video.pause();
  }

  return (
    <div className={`video-player${compact ? " video-player--compact" : ""}`}>
      <div className="video-picture">
        <video
          ref={ref}
          src={src || "/media/field-notes.mp4"}
          poster="/media/field-notes.jpg"
          preload="metadata"
          muted={muted}
          playsInline
          aria-label="Video preview"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
          onLoadedMetadata={(event) => { setDuration(event.currentTarget.duration || 5); onReady?.(event.currentTarget); }}
          onError={() => setError("The video preview is unavailable. Your notes are still ready to read.")}
        />
        {!playing && <button className="video-play-disc" type="button" onClick={togglePlay} aria-label="Play video"><Play size={23} fill="currentColor" strokeWidth={0} /></button>}
      </div>
      <div className="video-controls">
        <button type="button" className="icon-button" onClick={togglePlay} aria-label={playing ? "Pause video" : "Play video"}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
        <span className="video-time">{formatTime(time)} <span>/ {formatTime(duration)}</span></span>
        <input type="range" min="0" max={duration} step="0.05" value={time} aria-label="Video playback position" onChange={(event) => { const next = Number(event.target.value); if (ref.current) ref.current.currentTime = next; setTime(next); }} style={{ "--progress": `${duration ? (time / duration) * 100 : 0}%` } as React.CSSProperties} />
        <button type="button" className="icon-button" onClick={() => setMuted(!muted)} aria-label={muted ? "Unmute video" : "Mute video"}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
        {!compact && <button type="button" className="icon-button" aria-label="Enter fullscreen" onClick={() => { void ref.current?.requestFullscreen?.().catch(() => setError("Fullscreen is unavailable in this browser.")); }}><Maximize2 size={16} /></button>}
      </div>
      {error && <p className="player-error" role="status">{error}</p>}
    </div>
  );
}
