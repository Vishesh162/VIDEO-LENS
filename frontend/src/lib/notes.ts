import type { VideoSession } from "./types";

export function listItems(text: string): string[] {
  return text
    .split(/\n(?=\s*(?:\d+[.)]|[-*•])\s)/u)
    .map((item) => item.replace(/^\s*(?:\d+[.)]|[-*•])\s*/u, "").trim())
    .filter(Boolean);
}

export function formatTime(seconds: number): string {
  const rounded = Math.max(0, Math.floor(seconds));
  return `${Math.floor(rounded / 60).toString().padStart(2, "0")}:${(rounded % 60).toString().padStart(2, "0")}`;
}

export function transcriptSegments(transcript: string): { time: string; seconds: number; text: string }[] {
  const parts = transcript.split(/\n\s*\n/u).filter(Boolean);
  return parts.map((part) => {
    const match = part.match(/^\[(\d{1,2}):(\d{2})\]\s*/u);
    return {
      time: match ? `${match[1].padStart(2, "0")}:${match[2]}` : "",
      seconds: match ? Number(match[1]) * 60 + Number(match[2]) : 0,
      text: match ? part.slice(match[0].length) : part,
    };
  });
}

export function sessionMarkdown(session: VideoSession): string {
  return `# ${session.title}\n\n## Summary\n\n${session.summary}\n\n## Action items\n\n${session.action_items}\n\n## Key decisions\n\n${session.key_decisions}\n\n## Open questions\n\n${session.open_questions}\n\n## Transcript\n\n${session.transcript}\n`;
}

export function downloadText(text: string, filename: string, mime = "text/markdown;charset=utf-8"): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function safeFilename(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 72) || "video-notes";
}
