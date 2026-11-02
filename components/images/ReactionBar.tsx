"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { ReactionBurst, useBurst, type Reactor } from "./ReactionBurst";
import { setReaction } from "@/app/actions";
import { REACTION_TYPES } from "@/lib/images";

export const REACTION_ICONS: Record<string, string> = { love: "♥", wow: "✺", envy: "◆", like: "•", beautiful_sky: "★", great_foreground: "▲", strong_composition: "◇", inspiring_adventure: "✦", helpful_story: "☄" };
export const REACTION_GROUPS = [
  { title: "Quick Reactions", types: ["love", "wow", "envy", "like"] },
  { title: "Praise the Craft", types: ["beautiful_sky", "great_foreground", "strong_composition", "inspiring_adventure"] },
];
const labels = new Map<string, string>(REACTION_TYPES.map(([type, label]) => [type, label]));

type ReactionRow = { reaction_type: string; user_id?: string | null };
type Toggle = { type: string; active: boolean };

/**
 * Reactions for one image. Clicks update instantly (optimistic), save in the background,
 * and roll back with a visible message if the save fails.
 */
export function ReactionBar({ imageId, reactions, currentUserId, people = {}, compact = false }: { imageId: string; reactions: ReactionRow[]; currentUserId?: string | null; people?: Record<string, Reactor>; compact?: boolean }) {
  const base = summarize(reactions, currentUserId);
  const [state, applyOptimistic] = useOptimistic(base, (current, toggle: Toggle) => {
    const mine = new Set(current.mine);
    const counts = new Map(current.counts);
    const had = mine.has(toggle.type);
    if (toggle.active && !had) { mine.add(toggle.type); counts.set(toggle.type, (counts.get(toggle.type) || 0) + 1); }
    if (!toggle.active && had) { mine.delete(toggle.type); counts.set(toggle.type, Math.max(0, (counts.get(toggle.type) || 0) - 1)); }
    return { mine, counts };
  });
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const burst = useBurst();
  const countRefs = useRef(new Map<string, HTMLButtonElement>());

  /** Who gave a reaction, newest first, with the signed-in member following their optimistic toggle. */
  function reactorsFor(type: string): Reactor[] {
    const ids = (reactions || []).filter((r) => r.reaction_type === type && r.user_id).map((r) => r.user_id as string).reverse();
    let list = [...new Set(ids)].filter((id) => id !== currentUserId);
    if (currentUserId && state.mine.has(type)) list = [currentUserId, ...list];
    return list.map((id) => people[id] || { id, name: "Guild Member", avatarUrl: null, initials: "GM" });
  }

  function toggle(type: string) {
    if (busy.has(type)) return;
    const active = !state.mine.has(type);
    const label = labels.get(type) || type;
    setBusy((prev) => new Set(prev).add(type));
    startTransition(async () => {
      applyOptimistic({ type, active });
      const result = await setReaction(imageId, type, active).catch(() => ({ ok: false as const, error: "That reaction did not save. Check your connection and try again." }));
      setBusy((prev) => { const next = new Set(prev); next.delete(type); return next; });
      setMessage(result.ok ? { tone: "ok", text: active ? `${label} added` : `${label} removed` } : { tone: "error", text: result.error });
    });
  }

  return (
    <div className={compact ? "space-y-4" : "space-y-5"}>
      {REACTION_GROUPS.map((group) => (
        <div key={group.title}>
          <p className="mb-3 mw-section-label">{group.title}</p>
          <div className="flex flex-wrap gap-2">
            {group.types.map((type) => {
              const selected = state.mine.has(type);
              const count = state.counts.get(type) || 0;
              const label = labels.get(type) || type;
              return (
                <span key={type} className="mw-reaction-pill" data-burst-type={type}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    aria-label={`${label}, ${count}${selected ? ", selected" : ""}`}
                    disabled={busy.has(type)}
                    aria-busy={busy.has(type)}
                    onClick={() => toggle(type)}
                    className={`mw-reaction-chip ${selected ? "mw-reaction-chip-active" : ""}`}
                    title={selected ? `You reacted ${label}. Click to remove.` : `React ${label}`}
                  >
                    <span className="text-[#f0bd66]">{REACTION_ICONS[type]}</span>
                    {label}
                    <span className="mw-reaction-count-space" aria-hidden="true">{count}</span>
                  </button>
                  <button
                    type="button"
                    ref={(el) => { if (el) countRefs.current.set(type, el); else countRefs.current.delete(type); }}
                    className={`mw-reaction-count ${burst.open === type ? "is-open" : ""}`}
                    disabled={!count}
                    aria-expanded={burst.open === type}
                    aria-label={count ? `See who reacted ${label}` : `No ${label} reactions yet`}
                    title={count ? `See who reacted ${label}` : undefined}
                    onPointerEnter={(e) => { if (count && e.pointerType === "mouse") burst.show(type); }}
                    onPointerLeave={(e) => { if (e.pointerType === "mouse") burst.hide(); }}
                    onClick={() => { burst.cancel(); burst.setOpen((o) => (o === type ? null : count ? type : null)); }}
                  >{count}</button>
                  {burst.open === type && count > 0 && countRefs.current.get(type) && (
                    <ReactionBurst anchor={countRefs.current.get(type)!} people={reactorsFor(type)} total={count} label={label} icon={REACTION_ICONS[type]} onEnter={burst.cancel} onLeave={() => burst.hide()} />
                  )}
                </span>
              );
            })}
          </div>
        </div>
      ))}
      <p aria-live="polite" role="status" className={`mw-reaction-status ${message?.tone === "error" ? "is-error" : ""}`}>{message ? (message.tone === "ok" ? `✓ ${message.text}` : message.text) : ""}</p>
    </div>
  );
}

function summarize(reactions: ReactionRow[], currentUserId?: string | null) {
  const counts = new Map<string, number>();
  const mine = new Set<string>();
  (reactions || []).forEach((r) => {
    counts.set(r.reaction_type, (counts.get(r.reaction_type) || 0) + 1);
    if (currentUserId && r.user_id === currentUserId) mine.add(r.reaction_type);
  });
  return { counts, mine };
}
