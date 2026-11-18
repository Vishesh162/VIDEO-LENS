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

export async function downloadSessionPdf(session: VideoSession, filename: string): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  for (const [weight, style] of [["400", "normal"], ["500", "bold"]] as const) {
    const response = await fetch(`/media/onest-${weight}.ttf`);
    if (!response.ok) throw new Error("Could not load PDF font.");
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    const fontFile = `onest-${weight}.ttf`;
    pdf.addFileToVFS(fontFile, btoa(binary));
    pdf.addFont(fontFile, "Onest", style);
  }
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 18;
  const lineWidth = pageWidth - margin * 2;
  let y = margin;

  function printable(value: string): string {
    return value
      .replace(/[\u2018\u2019]/gu, "'")
      .replace(/[\u201c\u201d]/gu, '"')
      .replace(/[\u2013\u2014]/gu, "-")
      .replace(/\u2022/gu, "-")
      .replace(/\u2192/gu, "->");
  }

  function ensureSpace(height: number): void {
    if (y + height <= pageHeight - margin) return;
    pdf.addPage();
    y = margin;
  }

  pdf.setTextColor(47, 75, 50);
  pdf.setFont("Onest", "bold");
  pdf.setFontSize(21);
  const titleLines = pdf.splitTextToSize(printable(session.title), lineWidth) as string[];
  for (const line of titleLines) {
    ensureSpace(9);
    pdf.text(line, margin, y);
    y += 9;
  }
  y += 3;

  pdf.setFont("Onest", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(104, 119, 101);
  const metadata = `${session.source_kind === "youtube" ? "YouTube video" : "Video notes"} | ${session.language === "hinglish" ? "Hinglish" : "English"}`;
  ensureSpace(11);
  pdf.text(printable(metadata), margin, y);
  y += 11;

  const sections = [
    ["Summary", session.summary],
    ["Action items", session.action_items],
    ["Key decisions", session.key_decisions],
    ["Open questions", session.open_questions],
    ["Transcript", session.transcript],
  ];

  for (const [heading, content] of sections) {
    ensureSpace(15);
    pdf.setFont("Onest", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(47, 75, 50);
    pdf.text(heading, margin, y);
    y += 7;

    pdf.setFont("Onest", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(45, 51, 45);
    const paragraphs = printable(content || "None").split(/\n+/u);
    for (const paragraph of paragraphs) {
      const lines = pdf.splitTextToSize(paragraph || " ", lineWidth) as string[];
      for (const line of lines) {
        ensureSpace(5);
        pdf.text(line, margin, y);
        y += 5;
      }
      y += 1;
    }
    y += 4;
  }

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page);
    pdf.setFont("Onest", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(125, 134, 122);
    pdf.text(`Page ${page} of ${pages}`, pageWidth - margin, pageHeight - 9, { align: "right" });
  }

  pdf.save(filename);
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
