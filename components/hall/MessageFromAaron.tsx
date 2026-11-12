"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { markGuildMessageRead } from "@/app/message-actions";
import { isLongMessage } from "@/lib/guild-message";

function ThumbsUp() {
  return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M2 21h3.5V9.5H2V21zm19.4-9.2c0-1.06-.86-1.92-1.92-1.92h-5.6l.86-4.08.03-.3c0-.4-.17-.77-.43-1.04L13.3 3.4 7.5 9.2c-.32.32-.5.75-.5 1.2V19c0 1.1.9 2 2 2h8.1c.8 0 1.48-.48 1.77-1.18l2.9-6.76c.08-.2.13-.42.13-.65v-.61z" /></svg>;
}

function Chevron({ open }: { open: boolean }) {
  return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s ease" }}><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function MessageFromAaron({ id, updatedAt, body, postedLabel, initiallyRead, canEdit = false }: { id: string; updatedAt: string; body: string; postedLabel: string; initiallyRead: boolean; canEdit?: boolean }) {
  const [read, setRead] = useState(initiallyRead);
  const [open, setOpen] = useState(!initiallyRead);
  const [, startTransition] = useTransition();

  const acknowledge = () => {
    setOpen(false);
    if (read) return;
    setRead(true);
    startTransition(async () => {
      const result = await markGuildMessageRead(id, updatedAt).catch(() => ({ ok: false }));
      if (!result.ok) setRead(false);
    });
  };

  if (!open) {
    return (
      <button type="button" className="mw-aaron-bar" onClick={() => setOpen(true)} aria-expanded="false" aria-controls={`aaron-msg-${id}`}>
        <span className="mw-aaron-bar-label">Message from Aaron</span>
        <span className="mw-aaron-bar-state">{read ? <><ThumbsUp /> Read</> : "Open"}</span>
        <Chevron open={false} />
      </button>
    );
  }

  return (
    <section id={`aaron-msg-${id}`} className={`mw-aaron-card ${isLongMessage(body) ? "is-long" : ""}`} aria-label="Message from Aaron">
      <div className="mw-aaron-head">
        <p className="mw-aaron-eyebrow">Message from Aaron</p>
        {read && <button type="button" className="mw-aaron-collapse" onClick={() => setOpen(false)} aria-label="Collapse message"><Chevron open /></button>}
      </div>
      <p className="mw-aaron-body">{body}</p>
      <div className="mw-aaron-foot">
        <span className="mw-aaron-date">{postedLabel}</span>
        <span className="flex items-center gap-3">
          {canEdit && <Link href="/admin/message" className="mw-aaron-edit">Edit</Link>}
          <button type="button" className="mw-aaron-ack" onClick={acknowledge} aria-pressed={read}><ThumbsUp />{read ? "Got it" : "I've read it"}</button>
        </span>
      </div>
    </section>
  );
}
