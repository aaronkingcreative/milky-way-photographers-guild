"use client";

import { useState, useTransition, type ReactNode } from "react";
import { adminAchievementClaimAction } from "@/app/actions";

export type DeskClaim = { id: string; label: string; notes: string | null; body: ReactNode };

const DONE: Record<string, string> = { verified: "Verified", rejected: "Rejected", revoked: "Revoked" };

/**
 * Pending claims on the Verification Desk.
 * Clicking a review button hides the card at once and shows a confirmation;
 * if the save fails the card comes back with the error.
 */
export function ClaimDesk({ claims, actions, emptyText }: { claims: DeskClaim[]; actions: string[]; emptyText: string }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ text: string; error?: boolean } | null>(null);
  const [, startTransition] = useTransition();

  const review = (claim: DeskClaim, action: string, form: HTMLFormElement) => {
    const fd = new FormData(form);
    fd.set("action", action);
    setBusy(claim.id);
    setHidden((h) => new Set(h).add(claim.id));
    setFlash({ text: `${DONE[action]}: ${claim.label}` });
    startTransition(async () => {
      const res = await adminAchievementClaimAction(fd).catch(() => ({ ok: false, error: "The review did not save. Please try again." }));
      setBusy(null);
      if (!res.ok) {
        setHidden((h) => { const n = new Set(h); n.delete(claim.id); return n; });
        setFlash({ text: `${res.error || "The review did not save."} (${claim.label})`, error: true });
      }
    });
  };

  const visible = claims.filter((c) => !hidden.has(c.id));
  return <div className="mt-6">
    {flash && <p role="status" className={`mw-desk-flash ${flash.error ? "is-error" : ""}`}>{flash.error ? "⚠ " : "✓ "}{flash.text}</p>}
    {visible.length === 0 && <p className="mt-4 rounded border border-white/10 bg-white/[.03] p-5 text-white/65">{emptyText}</p>}
    <div className="mt-4 grid gap-5">
      {visible.map((claim) => <article key={claim.id} className="mw-admin-card overflow-hidden p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div>{claim.body}</div>
          <form onSubmit={(e) => e.preventDefault()} className="space-y-3 self-start rounded border border-white/10 bg-white/[.03] p-4">
            <input type="hidden" name="claim_id" value={claim.id} />
            <label className="block text-sm font-bold text-white/80">Review notes <span className="font-normal text-white/45">(optional)</span><textarea name="review_notes" defaultValue={claim.notes || ""} className="mw-input mt-2 min-h-20" /></label>
            <div className="flex flex-wrap gap-2">{actions.map((action) => <button key={action} type="button" disabled={busy === claim.id} onClick={(e) => review(claim, action, e.currentTarget.form!)} className={`${action === "verified" ? "mw-btn-primary" : "mw-btn-ghost"} px-3 py-2 text-xs`}>{action === "verified" ? "Verify" : action === "rejected" ? "Reject" : "Revoke"}</button>)}</div>
          </form>
        </div>
      </article>)}
    </div>
  </div>;
}
