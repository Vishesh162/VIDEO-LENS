import Link from "next/link";
import type { Metadata } from "next";
import { Brand } from "@/components/brand";
import { Arrow } from "@/components/arrow";

export const metadata: Metadata = { title: "Your data", description: "How the AI Video Assistant stores recordings, notes, and conversations." };

export default function PrivacyPage() { return <main className="data-page"><Brand /><h1>Your recordings.<br />Your notes.</h1><p>This page describes how this hosted version of AI Video Assistant handles your information.</p><h2>Your notes</h2><p>Notes exist only in the current page. They disappear when you leave or reload; use Download PDF to keep a copy.</p><h2>Processing a recording</h2><p>Your upload or YouTube link is sent to the hosted assistant. English audio is transcribed with Groq Whisper. Hinglish audio is processed by Sarvam. Summaries and answers use the language model and provider configured by the project owner, so transcript content is also sent to that provider.</p><h2>Recordings and conversations</h2><p>The server removes temporary uploads after processing. Active notes and chat sessions are held in server memory temporarily and expire; they are not saved as an account library. Chat messages stay in the open page and are cleared when you leave or switch videos.</p><h2>The walkthrough</h2><p>The field-notes walkthrough uses prepared notes and local answers. It does not upload a recording or call an AI provider. Its video is CC0 footage from MDN Web Docs.</p><Link className="link" href="/workspace/">Open the workspace<Arrow diagonal /></Link></main>; }
