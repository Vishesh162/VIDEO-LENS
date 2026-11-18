import Link from "next/link";
import Script from "next/script";
import { Arrow } from "@/components/arrow";
import { Brand } from "@/components/brand";
import { HeroCollage, Waveform } from "@/components/hero-collage";
import { ProductPreview } from "@/components/product-preview";
import { Check, FileVideo, Headphones, MessageSquare, ShieldCheck, Sparkles, Upload, Youtube } from "lucide-react";

const questions = [
  ["What video can I upload?", "Bring an MP4, MOV, WebM, or MKV video, or an MP3, WAV, M4A, or OGG recording. Files can be up to 200 MB."],
  ["Can I use a YouTube link?", "Yes. Paste a link to a public YouTube video. The assistant works with the audio to prepare your transcript and notes."],
  ["Does it understand Hinglish?", "Choose English or Hinglish before you start. Hinglish recordings are translated into English for the transcript and notes."],
  ["Where do video answers come from?", "The assistant uses the video’s transcript. If the recording doesn’t contain the information, it tells you instead of filling in the gaps."],
  ["Can I keep my video notes?", "Your library stays in this browser. Download notes as Markdown or copy the transcript to keep a separate record."],
];

export default function Home() {
  return <>
    <header className="nav nav--centre">
      <div className="wrap nav__bar">
        <a className="skip-link" href="#top">Skip to content</a>
        <Brand href="#top" />
        <nav className="nav__links" aria-label="Main navigation">
          <div className="nav__item"><a className="nav__link" href="#product">Product</a></div>
          <div className="nav__item"><a className="nav__link" href="#capabilities">Capabilities</a></div>
          <div className="nav__item"><a className="nav__link" href="#workflow">Workflow</a></div>
          <div className="nav__item"><a className="nav__link" href="#questions">Questions</a></div>
        </nav>
        <div className="nav__actions"><Link className="btn btn--primary" href="/workspace/">Open the workspace<Arrow diagonal /></Link></div>
        <button className="nav__toggle" type="button" aria-expanded="false" aria-label="Open navigation menu"><span /><span /></button>
      </div>
    </header>

    <main id="top">
      <section className="hero hero--triptych" data-enter aria-labelledby="hero-h">
        <div className="wrap"><div className="hero-text grid hero__grid">
          <div className="span-3 hero__text">
            <p className="hero__kicker">Built around your video <Sparkles className="small-star" size={16} aria-hidden="true" /></p>
            <h1 id="hero-h">AI video notes for busy minds.</h1>
            <p className="hero__lead">Turn recordings into transcripts, summaries, and answers. For meetings, lectures, and everything worth remembering.</p>
            <Link className="link hero-walkthrough" href="/workspace/?walkthrough=1"><span className="outline-play"><span /></span> Watch the walkthrough</Link>
          </div>
          <HeroCollage />
          <div className="span-3 start-10 hero__cta">
            <span className="hero-side-index">01 / Your video assistant</span>
            <p className="hero-side-title">Less replay.<br />More room<br />for thought.</p>
            <Link className="btn btn--primary" href="/workspace/">Open the workspace<Arrow diagonal /></Link>
            <p className="hero-side-note">YouTube links or your own files.<br />2 languages: English + Hinglish.</p>
            <div className="hero-source-row"><span><FileVideo size={14} /> Your recordings</span><span><Youtube size={16} /> YouTube</span></div>
          </div>
        </div></div>
      </section>

      <section className="section product-section" id="product" aria-labelledby="product-h">
        <div className="wrap">
          <div className="grid section-head preview-section-head"><div className="span-5"><h2 id="product-h">Your video,<br />ready for questions.</h2></div><div className="span-6 start-7 section-intro"><p>Read the short version, find a sentence in the transcript, or ask a follow-up. Everything starts with the same recording.</p><Link className="link" href="/workspace/?walkthrough=1">Try the walkthrough<Arrow diagonal /></Link></div></div>
          <ProductPreview />
        </div>
      </section>

      <section className="section capabilities-section" id="capabilities" aria-labelledby="capabilities-h">
        <div className="wrap">
          <div className="section-head"><h2 id="capabilities-h">Notes that turn<br />into next steps.</h2></div>
          <div className="grid feature-grid">
            <Link href="/workspace/?walkthrough=1" className="card card--row span-6 feature-card"><div className="feature-card-copy"><h3>Read the video summary</h3><Arrow diagonal /><p>Pull the main ideas out of a lecture or the decisions out of a meeting.</p></div><div className="panel panel--flush feature-panel frame" data-visual><div className="frame__fx" data-fx="fluted-glass" data-fx-seed="29" data-fx-palette='{"bg":"#cdd6c6","surface":"#dce3d6","ink":"#262d24","muted":"#535b51","accent":"#6c8e63"}' data-fx-params='{"speed":0,"ribWidth":30,"distortion":0.3,"calm":0.7}' /><div className="feature-document ui ui-summary"><div className="feature-document-head"><Sparkles size={15} /><span>From your video</span><span className="tiny-tag">Summary</span></div><p className="feature-document-title">The details make<br />the difference.</p><p className="feature-document-text">Observe before interpreting. Choose one detail, describe it precisely, and compare your notes over time.</p><div className="document-line" /><div className="document-line short" /><span className="feature-document-footer"><Check size={13} /> The context stays with you</span></div></div></Link>
            <Link href="/workspace/?walkthrough=1" className="card card--row span-6 feature-card"><div className="feature-card-copy"><h3>Keep the next steps</h3><Arrow diagonal /><p>Turn action items and open questions into a list you can come back to.</p></div><div className="panel panel--flush feature-panel feature-panel--tasks frame"><div className="feature-tasks ui ui-actions"><div className="feature-document-head"><span>Action items</span><span className="tiny-tag">3 tasks</span></div><div className="feature-task"><span className="drawn-check"><Check size={13} /></span><div><p>Choose a scene to observe</p><span>Start with one detail</span></div></div><div className="feature-task"><span className="drawn-check empty" /><div><p>Write three observations</p><span>Keep assumptions separate</span></div></div><div className="feature-task"><span className="drawn-check empty" /><div><p>Compare your field notes</p><span>Return for a second look</span></div></div><div className="feature-task-foot"><span className="task-progress"><i /></span><span>1 of 3 complete</span></div></div></div></Link>
          </div>
        </div>
      </section>

      <section className="section workflow-section" id="workflow" aria-labelledby="workflow-h">
        <div className="wrap">
          <div className="grid section-head"><div className="span-5"><h2 id="workflow-h">From video<br />to useful notes.</h2></div><div className="span-6 start-7 section-intro"><p>Bring the video. Let the assistant listen. Then pick up the conversation wherever your curiosity takes you.</p><Link className="link" href="/workspace/">Add your video<Arrow diagonal /></Link></div></div>
          <div className="workflow-visual frame ui ui-pipeline" role="img" aria-label="A recording becomes a transcript, a summary, action items, and answers"><div className="workflow-source"><span className="workflow-file"><FileVideo size={35} strokeWidth={1.2} /></span><div><p>Your recording</p><span>Video or audio</span></div><span className="workflow-flow-arrow" aria-hidden="true">→</span></div><div className="workflow-processor"><span className="workflow-process-mark"><Headphones size={25} strokeWidth={1.2} /></span><p>A little listening.<br />A lot to keep.</p><Waveform small /></div><div className="workflow-results"><div><span>01</span><p>Full transcript</p><Check size={15} /></div><div><span>02</span><p>Summary & next steps</p><Check size={15} /></div><div><span>03</span><p>Answers in context</p><MessageSquare size={15} /></div></div></div>
          <div className="grid workflow-steps"><div className="span-4"><span>01</span><h3>Add the video</h3><p>Upload a recording or paste a YouTube link.</p></div><div className="span-4"><span>02</span><h3>Prepare video notes</h3><p>Get the transcript, summary, and next steps.</p></div><div className="span-4"><span>03</span><h3>Ask your questions</h3><p>Follow a thought back to the recording.</p></div></div>
        </div>
      </section>

      <section className="section statement-section" id="context" data-moment="letters-assemble" data-moment-opts='{"spread":0.55}' aria-labelledby="context-h">
        <div className="wrap"><h2 className="mo-la__type" id="context-h">Search your<br />video transcript.</h2><p className="mo-la__sub">You don’t have to remember where it was said. Your transcript keeps the context, and your assistant helps you find your way back.</p><div className="statement-bottom"><p>Search when you need the exact phrase. Ask when you need the explanation. Decisions and action items stay beside the summary.</p><span><ShieldCheck size={18} /> Your recording is the source.</span></div></div>
      </section>

      <section className="section questions-section" id="questions" aria-labelledby="questions-h">
        <div className="wrap grid"><div className="span-5 faq-intro"><h2 id="questions-h">Questions,<br />before you begin.</h2><p>A few details about the recordings, the notes, and what happens next.</p><span className="faq-glyph" aria-hidden="true"><MessageSquare size={68} strokeWidth={0.8} /></span></div><div className="span-6 start-7 faq">{questions.map(([question, answer]) => <div className="faq__item" key={question}><h3>{question}</h3><p>{answer}</p></div>)}</div></div>
      </section>
    </main>

    <footer className="footer closing" id="contact" aria-labelledby="close-h"><div className="wrap">
      <div className="closing__cta close--type"><div className="section-head"><h2 id="close-h">Give your next video<br />a second thought.</h2><p className="t-lead">Start with the recording. Keep the notes you need.</p></div><Link className="btn btn--primary btn--xl" href="/workspace/">Open the workspace<Arrow diagonal /></Link></div>
      <div className="closing__links"><div className="grid"><div className="span-6 footer-brand"><Brand href="#top" /><p className="footer__lede">For everything worth remembering.</p></div><div className="span-3 footer__col"><h3>The assistant</h3><ul><li><a href="#product">Product</a></li><li><a href="#capabilities">Capabilities</a></li><li><a href="#workflow">Workflow</a></li></ul></div><div className="span-3 footer__col"><h3>Take a look</h3><ul><li><a href="#questions">Questions</a></li><li><Link href="/workspace/?walkthrough=1">Walkthrough</Link></li><li><Link href="/privacy/">Your data</Link></li></ul></div></div><div className="footer__legal"><span>© 2026 AI Video Assistant</span><span>Made for your next thought.</span><details className="credits"><summary>Video via MDN Web Docs</summary><p>The flower video and its poster use MDN’s CC0 demonstration footage. The walkthrough notes are authored for this interface.</p></details></div></div>
    </div></footer>
    <Script src="/assets/system.js" type="module" strategy="afterInteractive" />
    <Script src="/assets/motion/motion.js" type="module" strategy="afterInteractive" />
    <Script src="/assets/layout/layout.js" type="module" strategy="afterInteractive" />
  </>;
}
