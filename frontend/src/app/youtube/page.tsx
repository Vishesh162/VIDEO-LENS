import type { Metadata } from "next";
import { YoutubeLocalGuide } from "@/components/youtube-local-guide";

export const metadata: Metadata = {
  title: "YouTube on your computer",
  description: "Run Video Lens locally for YouTube links. Get the source, follow the Docker setup, and open your own workspace.",
};

export default function YoutubePage() {
  return <YoutubeLocalGuide />;
}
