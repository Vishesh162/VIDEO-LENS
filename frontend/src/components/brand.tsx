import Link from "next/link";

export function Brand({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link className={`brand nav__logo${compact ? " brand--compact" : ""}`} href={href} aria-label="AI Video Assistant home">
      <span className="brand-symbol" aria-hidden="true"><span /><span /><span /></span>
      <span className="brand-name">video assistant<span className="brand-ai">ai</span></span>
    </Link>
  );
}
