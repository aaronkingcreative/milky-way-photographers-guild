"use client";

import { useState, useTransition, type ReactNode } from "react";
import { adminAchievementClaimAction, adminReassignClaimAction } from "@/app/actions";

export type ReassignOption = { id: string; name: string; glyph: string | null; category: string; held: boolean };
export type ReassignInfo = {
  claimedName: string;
  /** e.g. "October" from the capture date, when known. */
  captureMonth: string | null;
  captureSeason: string | null;
  suggestedId: string | null;
  mismatch: string | null;
  options: ReassignOption[];
};
export type DeskClaim = { id: string; label: string; notes: string | null; body: ReactNode; reassign?: ReassignInfo };

const DONE: Record<string, string> = { verified: "Verified", rejected: "Rejected", revoked: "Revoked" };
const CATEGORY_LABEL: Record<string, string> = { monthly: "Monthly", seasonal: "Seasonal", foreground: "Foreground", technique: "Technique" };

function reassignNote(info: ReassignInfo, target: ReassignOption | undefined) {
  if (!target) return "";
  const when = target.category === "monthly" && info.captureMonth ? `this was shot in ${info.captureMonth}` : target.category === "seasonal" && info.captureSeason ? `this was shot in ${info.captureSeason.toLowerCase()}` : `it fits ${target.name} better`;
  return `You requested ${info.claimedName}, but ${when}, so I applied it to your ${target.name} instead.`;
}
function alreadyHasNote(info: ReassignInfo, target: ReassignOption | undefined) {
  if (!target) return "";
  const when = target.category === "monthly" && info.captureMonth ? `this was shot in ${info.captureMonth}` : `this fits ${target.name}`;
  return `You requested ${info.claimedName}, but ${when}, and you already have ${target.name}, so this image can't add a new honor. Pick a different honor on your next field report.`;
}

/**
 * Claims on the Verification Desk.
 * A review hides the card at once and shows a confirmation; if the save fails the card returns with the error.
 * Pending claims can also be verified as a different achievement (reassign) with a note to the member.
 */
export function ClaimDesk({ claims, actions, emptyText }: { claims: DeskClaim[]; actions: string[]; emptyText: string }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ text: string; error?: boolean } | null>(null);
  const [, startTransition] = useTransition();

  const hide = (id: string) => setHidden((h) => new Set(h).add(id));
  const unhide = (id: string) => setHidden((h) => { const n = new Set(h); n.delete(id); return n; });

  const review = (claim: DeskClaim, action: string, fd: FormData) => {
    fd.set("claim_id", claim.id);
    fd.set("action", action);
    setBusy(claim.id); hide(claim.id); setFlash({ text: `${DONE[action]}: ${claim.label}` });
    startTransition(async () => {
      const res = await adminAchievementClaimAction(fd).catch(() => ({ ok: false, error: "The review did not save. Please try again." }));
      setBusy(null);
      if (!res.ok) { unhide(claim.id); setFlash({ text: `${res.error || "The review did not save."} (${claim.label})`, error: true }); }
    });
  };

  const reassign = (claim: DeskClaim, target: ReassignOption, note: string, onHeld: (msg: string) => void) => {
    const fd = new FormData();
    fd.set("claim_id", claim.id); fd.set("target_achievement_id", target.id); fd.set("reassign_note", note);
    setBusy(claim.id); hide(claim.id); setFlash({ text: `Verified as ${target.name}: ${claim.label}` });
    startTransition(async () => {
      const res = await adminReassignClaimAction(fd).catch(() => ({ ok: false, error: "The review did not save. Please try again.", code: undefined }));
      setBusy(null);
      if (!res.ok) {
        unhide(claim.id);
        if (res.code === "already_has") { setFlash(null); onHeld(target.name); }
        else setFlash({ text: `${res.error || "The review did not save."} (${claim.label})`, error: true });
      }
    });
  };

  const visible = claims.filter((c) => !hidden.has(c.id));
  return <div className="mt-6">
    {flash && <p role="status" className={`mw-desk-flash ${flash.error ? "is-error" : ""}`}>{flash.error ? "⚠ " : "✓ "}{flash.text}</p>}
    {visible.length === 0 && <p className="mt-4 rounded border border-white/10 bg-white/[.03] p-5 text-white/65">{emptyText}</p>}
    <div className="mt-4 grid gap-5">
      {visible.map((claim) => <article key={claim.id} className="mw-admin-card overflow-hidden p-5" data-claim={claim.id}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>{claim.body}</div>
          <div className="space-y-3 self-start">
            <form onSubmit={(e) => e.preventDefault()} className="space-y-3 rounded border border-white/10 bg-white/[.03] p-4">
              <label className="block text-sm font-bold text-white/80">Review notes <span className="font-normal text-white/45">(optional)</span><textarea name="review_notes" defaultValue={claim.notes || ""} className="mw-input mt-2 min-h-20" /></label>
              <div className="flex flex-wrap gap-2">{actions.map((action) => <button key={action} type="button" disabled={busy === claim.id} onClick={(e) => review(claim, action, new FormData(e.currentTarget.form!))} className={`${action === "verified" ? "mw-btn-primary" : "mw-btn-ghost"} px-3 py-2 text-xs`}>{action === "verified" ? "Verify" : action === "rejected" ? "Reject" : "Revoke"}</button>)}</div>
            </form>
            {claim.reassign && <ReassignPanel claim={claim} info={claim.reassign} busy={busy === claim.id} onReassign={reassign} onReject={(note) => { const fd = new FormData(); fd.set("review_notes", note); review(claim, "rejected", fd); }} />}
          </div>
        </div>
      </article>)}
    </div>
  </div>;
}

function ReassignPanel({ claim, info, busy, onReassign, onReject }: { claim: DeskClaim; info: ReassignInfo; busy: boolean; onReassign: (claim: DeskClaim, target: ReassignOption, note: string, onHeld: (name: string) => void) => void; onReject: (note: string) => void }) {
  const [targetId, setTargetId] = useState(info.suggestedId || "");
  const target = info.options.find((o) => o.id === targetId);
  const [note, setNote] = useState(() => reassignNote(info, info.options.find((o) => o.id === info.suggestedId)));
  const [edited, setEdited] = useState(false);
  const [heldName, setHeldName] = useState<string | null>(null);
  const choose = (id: string) => {
    setTargetId(id); setHeldName(null);
    const t = info.options.find((o) => o.id === id);
    if (!edited) setNote(t?.held ? alreadyHasNote(info, t) : reassignNote(info, t));
  };
  const held = Boolean(target?.held) || Boolean(heldName);
  const groups = ["monthly", "seasonal", "foreground", "technique"].map((cat) => ({ cat, items: info.options.filter((o) => o.category === cat) })).filter((g) => g.items.length);
  return <details className="mw-reassign rounded border border-[#e79f2b]/35 bg-[#e79f2b]/[.05] p-4" open={Boolean(info.mismatch)}>
    <summary className="cursor-pointer text-sm font-bold text-[#f0bd66]">Verify as a different achievement</summary>
    <label className="mt-3 block text-xs font-bold uppercase tracking-[.1em] text-white/60">Achievement
      <select value={targetId} onChange={(e) => choose(e.target.value)} className="mw-input mt-1 w-full text-sm normal-case tracking-normal">
        <option value="">Choose…</option>
        {groups.map((g) => <optgroup key={g.cat} label={CATEGORY_LABEL[g.cat] || g.cat}>{g.items.map((o) => <option key={o.id} value={o.id}>{o.glyph ? `${o.glyph} ` : ""}{o.name}{o.id === info.suggestedId ? " (matches capture date)" : ""}{o.held ? " · already earned" : ""}</option>)}</optgroup>)}
      </select>
    </label>
    <label className="mt-3 block text-xs font-bold uppercase tracking-[.1em] text-white/60">Note to the member
      <textarea value={note} onChange={(e) => { setNote(e.target.value); setEdited(true); }} className="mw-input mt-1 min-h-28 text-sm normal-case tracking-normal" />
    </label>
    {held && target && <p className="mt-2 text-sm text-[#fca5a5]">{claim.label.split(" · ")[0]} already has {heldName || target.name}. It can't be awarded twice, so reject with a note instead.</p>}
    <div className="mt-3 flex flex-wrap gap-2">
      {!held && <button type="button" disabled={busy || !target} onClick={() => target && onReassign(claim, target, note, (name) => { setHeldName(name); if (!edited) setNote(alreadyHasNote(info, target)); })} className="mw-btn-primary px-3 py-2 text-xs">{target ? `Verify as ${target.name}` : "Verify as…"}</button>}
      {held && <button type="button" disabled={busy} onClick={() => onReject(note)} className="mw-btn-ghost px-3 py-2 text-xs">Reject with this note</button>}
    </div>
  </details>;
}
