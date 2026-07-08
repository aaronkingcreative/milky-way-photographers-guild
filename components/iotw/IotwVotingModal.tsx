"use client";
import { useActionState, useEffect, useMemo, useState } from "react";
import { submitIotwVote } from "@/app/actions";
import { formatMountainDeadline, type IotwEntry } from "@/lib/iotw";

export function IotwVotingModal({ ballot, entries, existingVote }: { ballot: any; entries: IotwEntry[]; existingVote: any }) {
  const [open, setOpen] = useState(Boolean(ballot && !existingVote && entries.length));
  const [preview, setPreview] = useState<IotwEntry | null>(null);
  const [picks, setPicks] = useState<(string | null)[]>([existingVote?.first_place_field_report_id || null, existingVote?.second_place_field_report_id || null, existingVote?.third_place_field_report_id || null]);
  const [state, action] = useActionState<any, FormData>(submitIotwVote, {});
  useEffect(() => { if (state?.ok) setOpen(false); }, [state]);
  const needed = Math.min(3, entries.length);
  const byId = useMemo(() => new Map(entries.map((entry) => [entry.field_report_id, entry])), [entries]);
  if (!ballot || !entries.length) return null;
  function choose(id: string) { setPicks((current) => current.includes(id) ? current : current.map((value, index) => index === current.findIndex((item) => !item) && index < needed ? id : value)); }
  function move(index: number, delta: number) { setPicks((current) => { const next = [...current]; const target = index + delta; if (target < 0 || target > 2) return current; [next[index], next[target]] = [next[target], next[index]]; return next; }); }
  const canSubmit = picks.slice(0, needed).every(Boolean);
  return <>
    {open && <div className="mw-iotw-overlay"><div className="mw-iotw-modal">
      <button type="button" className="mw-iotw-close" onClick={() => setOpen(false)}>Close</button>
      <p className="mw-eyebrow text-[#f0bd66]">✪ Image of the Week</p><h2 className="mw-iotw-title">Lock in your Top {needed}</h2><p className="mw-muted">Voting closes {formatMountainDeadline(ballot.voting_closes_at)}. You can revise your vote until then.</p>
      <form action={action} className="mt-6 grid gap-6 lg:grid-cols-[.78fr_1.22fr]"><input type="hidden" name="ballot_id" value={ballot.id}/>{["first","second","third"].map((name,index)=><input key={name} type="hidden" name={name} value={picks[index] || ""}/>) }
        <div className="space-y-3">{[0,1,2].slice(0, needed).map((index) => { const entry = picks[index] ? byId.get(picks[index]!) : null; return <div key={index} className="mw-iotw-slot"><strong>#{index + 1}</strong>{entry ? <><img src={entry.image_url || ""} alt=""/><span>{entry.title}</span><button type="button" onClick={() => setPicks((current) => current.map((value, slot) => slot === index ? null : value))}>Remove</button><button type="button" onClick={() => move(index, -1)}>↑</button><button type="button" onClick={() => move(index, 1)}>↓</button></> : <span>Tap an image for this slot</span>}</div>; })}<button className="mw-btn-primary w-full" disabled={!canSubmit}>Lock In My Top 3</button>{state?.ok && <p className="text-[#f0bd66]">Your Image of the Week vote is locked in. You can revise it until Sunday at noon Mountain Time.</p>}{state?.error && <p className="mw-error">{state.error}</p>}</div>
        <div className="mw-iotw-grid">{entries.map((entry) => { const rank = picks.indexOf(entry.field_report_id) + 1; return <button type="button" key={entry.field_report_id} onClick={() => choose(entry.field_report_id)} className={`mw-iotw-card ${rank ? "is-selected" : ""}`}><img src={entry.image_url || ""} alt={entry.title}/>{rank > 0 && <b>#{rank}</b>}<span>{entry.title}</span><small>{entry.photographer_name}</small><em onClick={(event) => { event.stopPropagation(); setPreview(entry); }}>Preview</em></button>; })}</div>
      </form>{preview && <div className="mw-iotw-preview" onClick={() => setPreview(null)}><div><img src={preview.image_url || ""} alt={preview.title}/><h3>{preview.title}</h3><p>{preview.photographer_name}</p><p>{[preview.location, preview.capture_date].filter(Boolean).join(" · ")}</p></div></div>}
    </div></div>}
    <button type="button" className="mw-vote-chip" onClick={() => setOpen(true)}>{existingVote ? "✪ Edit Vote" : "✪ Vote"}</button>
  </>;
}
