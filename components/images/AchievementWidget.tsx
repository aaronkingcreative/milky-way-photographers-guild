"use client";

import { coverageFromCaptureDate } from "@/lib/coverage";
import { rankForCount } from "@/lib/achievements";

export type AchievementOption = { id: string; name: string; category: string; glyph?: string; requirement?: string; allow_repeat?: boolean; is_manual_claimable?: boolean | null };

export function AchievementWidget({ achievements, earnedIds, selectedId, setSelectedId, captureDate, currentHonorCount }: { achievements: AchievementOption[]; earnedIds: string[]; selectedId: string; setSelectedId: (id: string) => void; captureDate: string; currentHonorCount: number }) {
  const coverage = captureDate ? coverageFromCaptureDate(captureDate) : null;
  const grouped = ["monthly", "seasonal", "foreground", "technique", "special"].map((category) => ({ category, items: achievements.filter((item) => item.category === category) }));
  const perfectYearCount = coverage ? Math.min(12, 1) : 0;
  return <aside className="mw-submit-achievement-widget">
    <h2>Claim One Field Honor</h2>
    <p>Pick the one Field Honor this image earns. Month, season, year, and streak coverage are tracked automatically.</p>
    <input type="hidden" name="achievement_id" value={selectedId} />
    <div className="mt-5 space-y-5">
      {grouped.map((group) => group.items.length > 0 && <section key={group.category}>
        <h3>{group.category}</h3>
        <div className="mt-2 grid gap-2">
          {group.items.map((achievement) => {
            const earned = earnedIds.includes(achievement.id) && !achievement.allow_repeat;
            const selected = selectedId === achievement.id;
            const locked = achievement.category === "special" || achievement.is_manual_claimable === false;
            return <button key={achievement.id} type="button" disabled={earned || locked} onClick={() => setSelectedId(selected ? "" : achievement.id)} className={`mw-achievement-choice ${selected ? "is-selected" : ""} ${earned ? "is-earned" : ""} ${locked ? "is-locked" : ""}`}>
              <span className="glyph">{selected ? "✓" : achievement.glyph || "✦"}</span>
              <span className="min-w-0 flex-1"><span className="block truncate">{achievement.name}</span><span className="state">{selected ? "Selected" : earned ? "Already earned" : locked ? (achievement.category === "seasonal" ? "Earned from its 3 months" : "Locked") : "Available"}</span></span>
            </button>;
          })}
        </div>
      </section>)}
    </div>
    <section className="mw-auto-tracking mt-5">
      <h3>Automatic Tracking</h3>
      {coverage ? <div className="mt-3 space-y-2 text-sm text-white/72">
        <p>This image will fill {coverage.monthLabel} in your calendar coverage.</p>
        <p>It will also update {coverage.seasonLabel} and {coverage.yearLabel} year coverage.</p>
        <p>Month streak and year streak progress will update from this capture date.</p>
        <p>Perfect Year progress for {coverage.year}: {perfectYearCount} of 12 months after this image, plus your existing coverage.</p>
        <p className="font-bold text-[#f0bd66]">This does not use your one Field Honor claim.</p>
      </div> : <p className="mt-3 text-sm text-white/62">Add a capture date to preview month, season, year, and streak progress.</p>}
    </section>
    <section className="mt-5 rounded border border-white/10 bg-white/[.03] p-3 text-sm text-white/70">
      <strong className="font-display uppercase tracking-[.12em] text-[#f0bd66]">Rank Preview</strong>
      <p className="mt-2">Current rank-counting Field Honors: {currentHonorCount}</p>
      <p>With this claim: {rankForCount(currentHonorCount + (selectedId ? 1 : 0)).short}</p>
    </section>
  </aside>;
}
