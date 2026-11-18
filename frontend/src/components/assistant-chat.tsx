"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, Check, Copy, MessageSquare, Sparkles } from "lucide-react";
import { askAssistant } from "@/lib/api";
import { answerWalkthrough, suggestedQuestions } from "@/lib/walkthrough";
import type { AssistantMessage, VideoSession } from "@/lib/types";

export function AssistantChat({ session, small = false }: { session: VideoSession; small?: boolean }) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { setMessages([]); setQuestion(""); setError(""); setPending(false); abortRef.current?.abort(); return () => abortRef.current?.abort(); }, [session.id]);
  useEffect(() => { if (messages.length) bottom.current?.scrollIntoView({ block: "nearest", behavior: "instant" }); }, [messages, pending]);

  async function ask(value: string) {
    const trimmed = value.trim();
    if (!trimmed || pending) return;
    setQuestion(""); setError(""); setPending(true);
    const controller = new AbortController();
    abortRef.current = controller;
    setMessages((previous) => [...previous, { id: crypto.randomUUID(), role: "user", text: trimmed }]);
    try {
      const response = session.source_kind === "walkthrough" ? answerWalkthrough(trimmed) : { answer: await askAssistant(session.id, trimmed, controller.signal), citation: "" };
      if (controller.signal.aborted) return;
      setMessages((previous) => [...previous, { id: crypto.randomUUID(), role: "assistant", text: response.answer, citation: response.citation }]);
    } catch (caught) {
      if (controller.signal.aborted) return;
      setError(caught instanceof Error ? caught.message : "Your question couldn’t be answered. Please try again.");
      setQuestion(trimmed);
    } finally { if (!controller.signal.aborted) setPending(false); }
  }

  async function copy(message: AssistantMessage) {
    try { await navigator.clipboard.writeText(message.text); setCopied(message.id); setTimeout(() => setCopied(""), 1800); }
    catch { setError("Copy is unavailable in this browser. Select the answer to copy it."); }
  }

  return <aside className={`assistant-chat${small ? " assistant-chat--small" : ""}`} aria-label="Video assistant">
    <div className="chat-header"><span className="assistant-glyph"><Sparkles size={17} /></span><div><p>Ask your video</p><span>Answers from the transcript</span></div><span className="chat-ready"><span /> Ready</span></div>
    <div className="chat-messages" aria-live="polite" aria-relevant="additions">
      {!messages.length && <div className="chat-intro"><div className="chat-intro-icon"><MessageSquare size={23} strokeWidth={1.3} /></div><h3>There’s more in the video.</h3><p>Ask a question, follow a thought, or find the part you missed.</p><div className="chat-suggestions">{suggestedQuestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => void ask(suggestion)}>{suggestion}<ArrowUp size={14} /></button>)}</div>{session.source_kind === "walkthrough" && !small && <p className="walkthrough-explanation">You’re trying the field-notes walkthrough. Upload a video to ask about your own recording.</p>}</div>}
      <AnimatePresence initial={false}>{messages.map((message) => <motion.div className={`chat-message chat-message--${message.role}`} key={message.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}><span className="chat-message-who">{message.role === "user" ? "You" : "Video assistant"}</span><p>{message.text}</p>{message.role === "assistant" && <div className="chat-message-footer"><span>{message.citation || "Based on this transcript"}</span><button className="icon-button" type="button" aria-label={copied === message.id ? "Answer copied" : "Copy answer"} onClick={() => void copy(message)}>{copied === message.id ? <Check size={14} /> : <Copy size={14} />}</button></div>}</motion.div>)}</AnimatePresence>
      {pending && <p className="chat-thinking" role="status"><span className="loading-ring" /> Reading the transcript…</p>}
      <div ref={bottom} />
    </div>
    <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); void ask(question); }}>
      <label className="chat-question-label" htmlFor={`chat-question-${small ? "preview" : "workspace"}`}>Ask about this video</label>
      <textarea id={`chat-question-${small ? "preview" : "workspace"}`} rows={2} maxLength={2000} value={question} placeholder="What would you like to know?" onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void ask(question); } }} />
      <div className="chat-composer-bottom"><span>Grounded in your video</span><button type="submit" disabled={!question.trim() || pending} className="chat-send" aria-label="Send question"><ArrowUp size={19} /></button></div>
      {error && <p className="field-error" role="alert">{error}</p>}
    </form>
  </aside>;
}
