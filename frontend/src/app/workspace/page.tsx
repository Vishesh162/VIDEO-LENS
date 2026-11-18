import type { Metadata } from "next";
import { Workspace } from "@/components/workspace";

export const metadata: Metadata = { title: "Your video workspace", description: "Upload a recording, paste a YouTube link, and turn your video into notes and answers." };

export default function WorkspacePage() { return <Workspace />; }
