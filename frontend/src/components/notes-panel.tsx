"use client";

import { useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, CheckCheck, CircleHelp, FileText, ListTodo, Search, Text, X } from "lucide-react";
import clsx from "clsx";
import { listItems, transcriptSegments } from "@/lib/notes";
import type { VideoSession } from "@/lib/types";

type Tab = "summary" | "transcript" | "actions" | "decisions" | "questions";
const tabs = [
  { id: "summary" as const, label: "Summary", icon: FileText },
  { id: "transcript" as const, label: "Transcript", icon: Text },
  { id: "actions" as const, label: "Actions", icon: ListTodo },
  { id: "decisions" as const, label: "Decisions", icon: CheckCheck },
  { id: "questions" as const, label: "Questions", icon: CircleHelp },
];

export function NotesPanel({ session, preview = false, onSeek }: { session: VideoSession; preview?: boolean; onSeek?: (seconds: number) => void }) {
  const [tab, setTab] = useState<Tab>("summary");
  const [query, setQuery] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const id = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const actions = listItems(session.action_items);
  const segments = transcriptSegments(session.transcript).filter((segment) => segment.text.toLowerCase().includes(query.toLowerCase()));

  function changeTab(index: number) { const next = (index + tabs.length) % tabs.length; setTab(tabs[next].id); tabRefs.current[next]?.focus(); }

  const content = (() => {
    if (tab === "summary") return <>
      <div className="notes-section-label"><span>Overview</span><span className="notes-status"><Check size={13} /> Ready to read</span></div>
      <h3 className="notes-heading">Your video summary.</h3>
      {session.summary.split(/\n\s*\n/u).filter(Boolean).map((paragraph, i) => <p className="notes-paragraph" key={i}>{paragraph}</p>)}
      <div className="summary-takeaways">
        <p className="notes-section-label">Key takeaways</p>
        {listItems(session.key_decisions).map((decision, i) => <div className="takeaway-line" key={i}><span className="takeaway-number">{String(i + 1).padStart(2, "0")}</span><p>{decision}</p></div>)}
      </div>
      {!preview && <div className="summary-takeaways"><p className="notes-section-label">Questions to return to</p>{listItems(session.open_questions).map((question, i) => <p className="notes-paragraph" key={i}>{question}</p>)}</div>}
    </>;
    if (tab === "transcript") return <>
      <div className="transcript-search"><Search size={16} /><label className="sr-only" htmlFor={`${id}-search`}>Search transcript</label><input id={`${id}-search`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a word or a thought…" />{query && <button type="button" className="icon-button" aria-label="Clear transcript search" onClick={() => setQuery("")}><X size={15} /></button>}</div>
      <p className="notes-section-label">{query ? `${segments.length} ${segments.length === 1 ? "match" : "matches"}` : "Full transcript"}</p>
      {segments.length ? segments.map((segment, i) => <div className="transcript-segment" key={`${segment.time}-${i}`}>
        {segment.time && <button type="button" className="timestamp" onClick={() => onSeek?.(segment.seconds)} aria-label={`Seek video to ${segment.time}`}>{segment.time}</button>}
        <p>{segment.text}</p>
      </div>) : <p className="notes-paragraph">No words match “{query}”. Try another search.</p>}
    </>;
    const items = tab === "actions" ? actions : listItems(tab === "decisions" ? session.key_decisions : session.open_questions);
    return <>
      <div className="notes-section-label"><span>{tab === "actions" ? "Your next steps" : tab === "decisions" ? "What was decided" : "Worth following up"}</span>{tab === "actions" && <span>{actions.filter((_, i) => checked[String(i)]).length} / {actions.length} complete</span>}</div>
      <h3 className="notes-heading">{tab === "actions" ? "Put the notes to work." : tab === "decisions" ? "A record of the decisions." : "Keep the questions open."}</h3>
      <div className="notes-items">{items.map((item, i) => tab === "actions" ? <label className={clsx("action-item", checked[String(i)] && "is-complete")} key={i}><input type="checkbox" checked={!!checked[String(i)]} onChange={(event) => setChecked((previous) => ({ ...previous, [i]: event.target.checked }))} /><span className="action-checkbox" aria-hidden="true">{checked[String(i)] && <Check size={13} />}</span><span>{item}</span></label> : <div className="takeaway-line" key={i}><span className="takeaway-number">{String(i + 1).padStart(2, "0")}</span><p>{item}</p></div>)}</div>
    </>;
  })();

  return (
    <div className={clsx("notes-panel", preview && "notes-panel--preview")}>
      <div className="notes-tabs" role="tablist" aria-label="Video notes">
        {tabs.map(({ id: value, label, icon: Icon }, index) => <button
          key={value}
          ref={(element) => { tabRefs.current[index] = element; }}
          className={clsx("notes-tab", tab === value && "is-active")}
          type="button"
          role="tab"
          id={`${id}-tab-${value}`}
          aria-selected={tab === value}
          aria-controls={`${id}-panel-${value}`}
          tabIndex={tab === value ? 0 : -1}
          onClick={() => setTab(value)}
          onKeyDown={(event) => { if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); changeTab(index + 1); } if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); changeTab(index - 1); } if (event.key === "Home") { event.preventDefault(); changeTab(0); } if (event.key === "End") { event.preventDefault(); changeTab(tabs.length - 1); } }}
        ><Icon size={15} /><span>{label}</span>{tab === value && <motion.span className="notes-tab-indicator" layoutId={`${id}-tab-indicator`} transition={{ type: "spring", bounce: 0, visualDuration: 0.22 }} />}</button>)}
      </div>
      <label className="notes-mobile-select"><span className="sr-only">Choose notes view</span><select value={tab} onChange={(event) => setTab(event.target.value as Tab)}>{tabs.map(({ id: value, label }) => <option value={value} key={value}>{label}</option>)}</select></label>
      {tabs.filter(({ id: value }) => value !== tab).map(({ id: value }) => <div key={value} role="tabpanel" id={`${id}-panel-${value}`} aria-labelledby={`${id}-tab-${value}`} hidden />)}
      <div key={tab} className="notes-scroll" role="tabpanel" id={`${id}-panel-${tab}`} aria-labelledby={`${id}-tab-${tab}`} tabIndex={0}>
        <AnimatePresence initial={false} mode="wait"><motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>{content}</motion.div></AnimatePresence>
      </div>
    </div>
  );
}
