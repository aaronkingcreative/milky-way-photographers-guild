"use client";
import { useActionState, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { submitIotwVote } from "@/app/actions";
import { formatMountainDeadline, formatMountainShort, iotwWeekLabel, voteLockConfirmation, type IotwEntry } from "@/lib/iotw";

function voteLaterKey(ballotId: string) {
  return `mw-vote-later:${ballotId}`;
}

export function IotwVotingModal({ ballot, entries, existingVote, required = false, entryWeek }: { ballot: any; entries: IotwEntry[]; existingVote: any; required?: boolean; entryWeek?: { label: string; closes: string } | null }) {
  const [open, setOpen] = useState(Boolean(ballot && entries.length && required));
  const [voted, setVoted] = useState(Boolean(existingVote));
  const [skipped, setSkipped] = useState(false);
  const blocking = required && !voted && !skipped;
  const [preview, setPreview] = useState<IotwEntry | null>(null);
  const [picks, setPicks] = useState<(string | null)[]>([existingVote?.first_place_field_report_id || null, existingVote?.second_place_field_report_id || null, existingVote?.third_place_field_report_id || null]);
  const [state, action] = useActionState<any, FormData>(submitIotwVote, {});
  useEffect(() => {
    if (!ballot?.id) return;
    try {
      if (sessionStorage.getItem(voteLaterKey(ballot.id)) === "1") {
        setSkipped(true);
        setOpen(false);
      }
    } catch {}
  }, [ballot?.id]);
  useEffect(() => { if (state?.ok) { setVoted(true); window.dispatchEvent(new Event("mw:iotw-voted")); } }, [state]);
  useEffect(() => { if (blocking) setOpen(true); }, [blocking]);
  useEffect(() => { const openVote = () => setOpen(true); window.addEventListener("mw:open-iotw", openVote); return () => window.removeEventListener("mw:open-iotw", openVote); }, []);
  // Rendered into <body>: the sticky header uses backdrop-filter, which turns any position:fixed child into a box the size of the header.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => { if (!open) return; const prev = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = prev; }; }, [open]);
  const needed = Math.min(3, entries.length);
  const byId = useMemo(() => new Map(entries.map((entry) => [entry.field_report_id, entry])), [entries]);
  if (!ballot || !entries.length) return null;
  function choose(id: string) { setPicks((current) => current.includes(id) ? current : current.map((value, index) => index === current.findIndex((item) => !item) && index < needed ? id : value)); }
  function move(index: number, delta: number) { setPicks((current) => { const next = [...current]; const target = index + delta; if (target < 0 || target > 2) return current; [next[index], next[target]] = [next[target], next[index]]; return next; }); }
  const canSubmit = picks.slice(0, needed).every(Boolean);
  const confirmation = state?.ok ? voteLockConfirmation(needed, ballot.voting_closes_at) : "";
  function voteLater() {
    try { if (ballot?.id) sessionStorage.setItem(voteLaterKey(ballot.id), "1"); } catch {}
    setSkipped(true);
    setOpen(false);
  }
  return <>
    {open && mounted && createPortal(<div className="mw-iotw-overlay" role="dialog" aria-modal="true"><div className="mw-iotw-modal">
      {!blocking && <button type="button" className="mw-iotw-close" onClick={() => setOpen(false)}>Close</button>}
      <p className="mw-eyebrow text-[#f0bd66]">✪ Vote for Image of the Week {iotwWeekLabel(ballot)}</p><h2 className="mw-iotw-title">Lock in your Top {needed}</h2>{blocking && !state?.ok && <p className="mt-2 text-[#f0bd66]">Vote before you move on. Pick your favorites from the {iotwWeekLabel(ballot)} entries to keep exploring the Guild.</p>}{!state?.ok && <p className="mw-muted">Image of the Week {iotwWeekLabel(ballot)} voting closes {formatMountainDeadline(ballot.voting_closes_at)}, and the winner is announced&nbsp;then. You can revise your vote until then.</p>}{!state?.ok && entryWeek && <p className="mw-muted text-sm">Meanwhile Image of the Week {entryWeek.label} is open for entries until {formatMountainShort(entryWeek.closes)}.</p>}
      {state?.ok ? <p className="mw-vote-confirm" role="status" aria-live="polite">{confirmation}</p> : <form action={action} className="mt-6 grid gap-6 lg:grid-cols-[.78fr_1.22fr]"><input type="hidden" name="ballot_id" value={ballot.id}/>{["first","second","third"].map((name,index)=><input key={name} type="hidden" name={name} value={picks[index] || ""}/>) }
        <div className="space-y-3">{[0,1,2].slice(0, needed).map((index) => { const entry = picks[index] ? byId.get(picks[index]!) : null; return <div key={index} className="mw-iotw-slot"><strong>#{index + 1}</strong>{entry ? <><img src={entry.image_url || ""} alt=""/><span>{entry.title}</span><button type="button" onClick={() => setPicks((current) => current.map((value, slot) => slot === index ? null : value))}>Remove</button><button type="button" onClick={() => move(index, -1)}>↑</button><button type="button" onClick={() => move(index, 1)}>↓</button></> : <span>Tap an image for this slot</span>}</div>; })}<button className="mw-btn-primary w-full" disabled={!canSubmit}>Lock In My Top {needed}</button><button type="button" className="mw-btn-ghost w-full" onClick={voteLater}>Vote later</button>{state?.error && <p className="mw-error">{state.error}</p>}</div>
        <div className="mw-iotw-grid">{entries.map((entry) => { const rank = picks.indexOf(entry.field_report_id) + 1; return <button type="button" key={entry.field_report_id} onClick={() => choose(entry.field_report_id)} className={`mw-iotw-card ${rank ? "is-selected" : ""}`}><img src={entry.image_url || ""} alt={entry.title}/>{rank > 0 && <b>#{rank}</b>}<span>{entry.title}</span><small>{entry.photographer_name}</small><em onClick={(event) => { event.stopPropagation(); setPreview(entry); }}>Preview</em></button>; })}</div>
      </form>}{preview && !state?.ok && <div className="mw-iotw-preview" onClick={() => setPreview(null)}><div><img src={preview.image_url || ""} alt={preview.title}/><h3>{preview.title}</h3><p>{preview.photographer_name}</p><p>{[preview.location, preview.capture_date].filter(Boolean).join(" · ")}</p></div></div>}
    </div></div>, document.body)}
    <button type="button" className="mw-vote-chip" onClick={() => setOpen(true)}>{voted ? "✪ Edit Vote" : "✪ Vote"}</button>
  </>;
}
