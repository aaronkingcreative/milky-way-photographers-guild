import Link from "next/link";
import type { ReactNode } from "react";

export function ForumCrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="mw-forum-crumbs" aria-label="Forum location">
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 ? <span aria-hidden="true" className="mw-forum-crumb-sep">/</span> : null}
          {item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function ForumHead({ eyebrow, title, subtitle, action }: { eyebrow: string; title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mw-forum-head">
      <div className="mw-forum-head-copy">
        <p className="mw-guild-eyebrow">{eyebrow}</p>
        <h1 className="mw-guild-page-title">{title}</h1>
        {subtitle ? <p className="mw-forum-subtitle">{subtitle}</p> : null}
      </div>
      {action ? <div className="mw-forum-head-action">{action}</div> : null}
    </header>
  );
}
