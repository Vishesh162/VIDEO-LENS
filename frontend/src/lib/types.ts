export type Language = "english" | "hinglish";
export type SourceKind = "file" | "youtube" | "walkthrough";

export interface VideoSession {
  id: string;
  title: string;
  transcript: string;
  summary: string;
  action_items: string;
  key_decisions: string;
  open_questions: string;
  language: Language;
  source_kind: SourceKind;
  source_name: string;
  source_url?: string;
  created_at: string;
  duration?: number;
}

export interface AssistantMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  citation?: string;
}

export type JobStatus = "queued" | "processing" | "complete" | "failed" | "cancelled";

export interface AnalysisJob {
  id: string;
  status: JobStatus;
  stage: string;
  result?: VideoSession;
  error?: string;
}
