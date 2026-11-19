import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { SITE_NAME } from "@/lib/site";
import "./globals.css";
import "./youtube-local.css";
import "./site-header.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: `${SITE_NAME} turns videos into transcripts, summaries, decisions, and answers for meetings, lectures, and everything worth remembering.`,
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: SITE_NAME,
    siteName: SITE_NAME,
    description: "Your recordings, transcribed, summarized, and ready for questions.",
    type: "website",
    images: [{ url: "/share.jpg", width: 1440, height: 900, alt: `${SITE_NAME} workspace` }],
  },
  twitter: { card: "summary_large_image", title: SITE_NAME },
  other: { "page-type": "software", "site-kind": "software" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#161c1a" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-type="software" data-radius="soft" data-ground="sage" data-buttons="pill" data-motion="live" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/assets/system.css" />
        <link rel="stylesheet" href="/assets/ui/cards.css" />
        <link rel="stylesheet" href="/assets/motion/motion.css" />
        <link rel="stylesheet" href="/assets/backgrounds/backgrounds.css" />
        <link rel="stylesheet" href="/assets/layout/layout.css" />
        <link rel="modulepreload" href="/assets/moments/moments.js" />
        <link rel="modulepreload" href="/assets/moments/lib.js" />
        <link rel="modulepreload" href="/assets/moments/letters-assemble/moment.js" />
        <link rel="preload" href="/media/onest-400.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" href="/media/onest-500.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('m-enter');setTimeout(()=>document.documentElement.classList.add('m-enter-done'),700);document.documentElement.classList.add('mo-js');setTimeout(()=>document.documentElement.classList.add('mo-safe'),2500)" }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
