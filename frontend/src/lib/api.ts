import type { AnalysisJob, Language, VideoSession } from "./types";

const API_BASE = (process.env.NEXT_PUBLIC_ASSISTANT_API_URL ?? (process.env.NODE_ENV === "production" ? "" : "http://127.0.0.1:8001")).replace(/\/$/u, "");
export const MAX_UPLOAD_BYTES = 150 * 1024 * 1024;
export const ACCEPTED_EXTENSIONS = ["mp4", "mov", "webm", "mkv", "mp3", "wav", "m4a", "ogg"];

export function validateYoutube(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return null;
    const host = url.hostname.toLowerCase();
    const allowed = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"];
    if (!allowed.includes(host)) return null;
    const id = host === "youtu.be"
      ? url.pathname.split("/")[1]
      : url.searchParams.get("v") || url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/u)?.[1];
    if (!id || !/^[a-zA-Z0-9_-]{11}$/u.test(id)) return null;
    return `https://www.youtube.com/watch?v=${id}`;
  } catch {
    return null;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error("The assistant is unavailable. Please try again shortly, or explore the walkthrough.");
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "The assistant couldn’t complete that request. Please try again.");
  return body as T;
}

export async function startAnalysis(input: { file?: File; youtube?: string; language: Language }, signal: AbortSignal): Promise<AnalysisJob> {
  if (input.file) {
    const data = new FormData();
    data.set("file", input.file);
    data.set("language", input.language);
    return request<AnalysisJob>("/api/analyze", { method: "POST", body: data, signal });
  }
  return request<AnalysisJob>("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source: input.youtube, language: input.language }),
    signal,
  });
}

export async function awaitAnalysis(id: string, signal: AbortSignal, onStage: (stage: string) => void): Promise<VideoSession> {
  while (!signal.aborted) {
    const job = await request<AnalysisJob>(`/api/jobs/${encodeURIComponent(id)}`, { signal });
    onStage(job.stage);
    if (job.status === "complete" && job.result) return job.result;
    if (job.status === "failed") throw new Error(job.error || "This video couldn’t be processed. Check the file or link and try again.");
    if (job.status === "cancelled") throw new DOMException("Analysis cancelled", "AbortError");
    await new Promise<void>((resolve, reject) => {
      const abort = () => { clearTimeout(timer); reject(new DOMException("Analysis cancelled", "AbortError")); };
      const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, 1400);
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    });
  }
  throw new DOMException("Analysis cancelled", "AbortError");
}

export async function cancelAnalysis(id: string): Promise<void> {
  await request(`/api/jobs/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function askAssistant(sessionId: string, question: string, signal?: AbortSignal): Promise<string> {
  const data = await request<{ answer: string }>(`/api/sessions/${encodeURIComponent(sessionId)}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
    signal,
  });
  return data.answer;
}
