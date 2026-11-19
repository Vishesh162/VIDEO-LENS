import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export function Brand({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link className={`brand nav__logo${compact ? " brand--compact" : ""}`} href={href} aria-label={`${SITE_NAME} home`}>
      <span className="brand-symbol" aria-hidden="true"><span /><span /><span /></span>
      <span className="brand-name">{SITE_NAME.toLowerCase()}</span>
    </Link>
  );
}
