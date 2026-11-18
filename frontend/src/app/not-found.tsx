import Link from "next/link";
import { Brand } from "@/components/brand";

export default function NotFound() { return <main className="data-page"><Brand /><h1>This page<br />isn’t in the notes.</h1><p>Return to the assistant and pick up where you left off.</p><Link className="link" href="/">Go to the homepage</Link></main>; }
