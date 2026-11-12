"use client";

import { useMemo, useState } from "react";
import { coverageFromCaptureDate } from "@/lib/coverage";
import { rankForCount } from "@/lib/achievements";

export type AchievementOption = { id: string; name: string; category: string; glyph?: string; requirement?: string; allow_repeat?: boolean; is_manual_claimable?: boolean | null };

const GROUP_LABELS: Record<string, string> = {
  monthly: "Months",
  seasonal: "Seasons",
  foreground: "Places",
  technique: "Craft",
  special: "Special",
};

function groupTitle(category: string) {
  return GROUP_LABELS[category] || category;
}

export function AchievementWidget({ achievements, earnedIds, selectedId, setSelectedId, captureDate, currentHonorCount }: { achievements: AchievementOption[]; earnedIds: string[]; selectedId: string; setSelectedId: (id: string) => void; captureDate: string; currentHonorCount: number }) {
  const coverage = captureDate ? coverageFromCaptureDate(captureDate) : null;
  const grouped = ["monthly", "seasonal", "foreground", "technique", "special"].map((category) => ({ category, items: achievements.filter((item) => item.category === category) }));
  const perfectYearCount = coverage ? Math.min(12, 1) : 0;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({ monthly: true });
  const needle = query.trim().toLowerCase();
  const selected = achievements.find((item) => item.id === selectedId) || null;

  const visible = useMemo(() => grouped.map((group) => ({
    ...group,
    items: needle
      ? group.items.filter((item) => `${item.name} ${item.requirement || ""} ${groupTitle(group.category)}`.toLowerCase().includes(needle))
      : group.items,
  })), [grouped, needle]);

  return (
    <aside className="mw-submit-achievement-widget">
      <h2>Claim One Field Honor</h2>
      <p>Pick the one Field Honor this image earns. Month, season, year, and streak coverage are tracked automatically.</p>
      <input type="hidden" name="achievement_id" value={selectedId} />
      <label className="mw-honor-search">
        <span className="sr-only">Search Field Honors</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search honors"
          autoComplete="off"
        />
      </label>
      <div className="mw-honor-groups">
        {visible.map((group) => group.items.length > 0 && (
          <section key={group.category} className={`mw-honor-group ${open[group.category] || needle ? "is-open" : ""}`}>
            <button
              type="button"
              className="mw-honor-group-toggle"
              aria-expanded={open[group.category] || Boolean(needle)}
              onClick={() => setOpen((current) => ({ ...current, [group.category]: !current[group.category] }))}
            >
              <span>{groupTitle(group.category)}</span>
              <small>{group.items.length}</small>
            </button>
            {(open[group.category] || needle) && (
              <div className="mw-honor-chip-grid">
                {group.items.map((achievement) => {
                  const earned = earnedIds.includes(achievement.id) && !achievement.allow_repeat;
                  const isSelected = selectedId === achievement.id;
                  const locked = achievement.category === "special" || achievement.is_manual_claimable === false;
                  return (
                    <button
                      key={achievement.id}
                      type="button"
                      disabled={earned || locked}
                      onClick={() => setSelectedId(isSelected ? "" : achievement.id)}
                      className={`mw-achievement-choice ${isSelected ? "is-selected" : ""} ${earned ? "is-earned" : ""} ${locked ? "is-locked" : ""}`}
                      title={achievement.requirement || achievement.name}
                    >
                      <span className="glyph">{isSelected ? "✓" : achievement.glyph || "✦"}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{achievement.name}</span>
                        <span className="state">{isSelected ? "Selected" : earned ? "Already earned" : locked ? (achievement.category === "seasonal" ? "Earned from its 3 months" : "Locked") : "Available"}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>
      <div className="mw-honor-selected" aria-live="polite">
        {selected ? `1 selected, ${selected.name}` : "No honor selected yet"}
      </div>
      <section className="mw-auto-tracking mt-5">
        <h3>Automatic Tracking</h3>
        {coverage ? (
          <div className="mt-3 space-y-2">
            <p>This image will fill {coverage.monthLabel} in your calendar coverage.</p>
            <p>It will also update {coverage.seasonLabel} and {coverage.yearLabel} year coverage.</p>
            <p>Month streak and year streak progress will update from this capture date.</p>
            <p>Perfect Year progress for {coverage.year}: {perfectYearCount} of 12 months after this image, plus your existing coverage.</p>
            <p className="font-bold text-[#f0bd66]">This does not use your one Field Honor claim.</p>
          </div>
        ) : (
          <p className="mt-3">Add a capture date to preview month, season, year, and streak progress.</p>
        )}
      </section>
      <section className="mt-5 rounded border border-white/10 bg-white/[.03] p-3">
        <strong className="font-display uppercase tracking-[.12em] text-[#f0bd66]">Rank Preview</strong>
        <p className="mt-2">Current rank-counting Field Honors: {currentHonorCount}</p>
        <p>With this claim: {rankForCount(currentHonorCount + (selectedId ? 1 : 0)).short}</p>
      </section>
    </aside>
  );
}
