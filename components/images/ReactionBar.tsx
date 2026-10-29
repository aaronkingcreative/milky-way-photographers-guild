"use client";

import { useOptimistic, useState, useTransition } from "react";
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
export function ReactionBar({ imageId, reactions, currentUserId, compact = false }: { imageId: string; reactions: ReactionRow[]; currentUserId?: string | null; compact?: boolean }) {
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
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${labels.get(type) || type}, ${state.counts.get(type) || 0}${selected ? ", selected" : ""}`}
                  disabled={busy.has(type)}
                  aria-busy={busy.has(type)}
                  onClick={() => toggle(type)}
                  className={`mw-reaction-chip ${selected ? "mw-reaction-chip-active" : ""}`}
                  title={selected ? `You reacted ${labels.get(type)}. Click to remove.` : `React ${labels.get(type)}`}
                >
                  <span className="text-[#f0bd66]">{REACTION_ICONS[type]}</span>
                  {labels.get(type) || type}
                  <span className="opacity-70">{state.counts.get(type) || 0}</span>
                </button>
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
