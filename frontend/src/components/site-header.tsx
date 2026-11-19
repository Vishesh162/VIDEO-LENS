"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Arrow } from "./arrow";
import { Brand } from "./brand";

const links = [
  ["Product", "#product"],
  ["Capabilities", "#capabilities"],
  ["Workflow", "#workflow"],
  ["Questions", "#questions"],
  ["YouTube locally", "/youtube/"],
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const firstLink = panel.current?.querySelector<HTMLAnchorElement>("a[href]");
    firstLink?.focus();

    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        toggle.current?.focus();
      }
      if (event.key !== "Tab") return;
      const controls = [
        toggle.current,
        ...Array.from(panel.current?.querySelectorAll<HTMLElement>("a[href],button") || []),
      ].filter((element): element is HTMLElement => !!element && element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement as HTMLElement))) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement as HTMLElement))) {
        event.preventDefault();
        first?.focus();
      }
    }
    const desktop = window.matchMedia("(min-width:1024px)");
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keydown);
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [open]);

  return <header className="nav nav--centre site-header">
    <div className="wrap nav__bar">
      <a className="skip-link" href="#top">Skip to content</a>
      <Brand href="#top" />
      <nav className="site-desktop-links" aria-label="Main navigation">{links.map(([label, href]) => <Link className="nav__link" href={href} key={label}>{label}</Link>)}</nav>
      <div className="site-header-actions">
        <Link className="btn btn--primary site-header-workspace" href="/workspace/">Open the workspace<Arrow diagonal /></Link>
        <button ref={toggle} className="site-menu-toggle" type="button" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} aria-controls="site-navigation-panel" onClick={() => setOpen(!open)}><span className={open ? "site-menu-icon is-open" : "site-menu-icon"} aria-hidden="true"><i /><i /></span></button>
      </div>
    </div>
    <div ref={panel} id="site-navigation-panel" className="site-navigation-panel" hidden={!open}>
      <nav aria-label="Mobile navigation">{links.map(([label, href]) => <Link href={href} key={label} onClick={() => setOpen(false)}>{label}</Link>)}</nav>
      <Link className="btn btn--primary site-panel-workspace" href="/workspace/" onClick={() => setOpen(false)}>Open the workspace<Arrow diagonal /></Link>
    </div>
  </header>;
}
