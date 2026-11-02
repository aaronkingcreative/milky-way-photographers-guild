"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Slim notice under the header. Dismiss hides it for this browser session;
 * the key includes the text, so a new count or a new notice shows again.
 */
export function HeaderNotice({ id, text, href, cta, hideOn }: { id: string; text: string; href: string; cta: string; hideOn?: string }) {
  const pathname = usePathname();
  const key = `mw-notice:${id}:${text}`;
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => { try { setDismissed(sessionStorage.getItem(key) === "1"); } catch { setDismissed(false); } }, [key]);
  if (dismissed || (hideOn && pathname.startsWith(hideOn))) return null;
  return <div className="mw-header-notice" role="status">
    <span className="mw-header-notice-dot" aria-hidden="true" />
    <span className="mw-header-notice-text">{text}</span>
    <Link href={href} className="mw-header-notice-link">{cta} →</Link>
    <button type="button" className="mw-header-notice-close" aria-label="Dismiss" onClick={() => { try { sessionStorage.setItem(key, "1"); } catch {} setDismissed(true); }}>×</button>
  </div>;
}
