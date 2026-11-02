import Link from "next/link";
import { StreakPill } from "@/components/StreakPill";
import { STREAK_HOW_IT_WORKS, milkyWayStreak, streakTitle, type MilkyWayYear } from "@/lib/streak";

function chipTitle(y: MilkyWayYear) {
  if (y.source === "upload") {
    const n = `${y.reports} field ${y.reports === 1 ? "report" : "reports"} dated ${y.year}`;
    return y.status === "vetted" ? `${n}, date vetted by the Guild` : n;
  }
  return "Recorded by a Guild admin";
}

/**
 * Read-only view of a member's Milky Way years and streak. Years come from the capture
 * dates declared on uploaded field reports (plus any admin record); there is nothing to set here.
 */
export function MilkyWayYearsPanel({ years, isMe, headingId = "mw-years-heading" }: { years: MilkyWayYear[]; isMe: boolean; headingId?: string }) {
  const streak = milkyWayStreak(years.map((y) => y.year));
  const sorted = [...years].sort((a, b) => a.year - b.year);
  return (
    <section className="mw-card-soft mw-years-panel p-5" aria-labelledby={headingId}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p id={headingId} className="mw-section-label">Milky Way Year Streak</p>
        {streak.length > 0 && <span className="flex items-center gap-2"><StreakPill length={streak.length} title={streakTitle(streak)} /><span className="text-sm text-white/55">{streak.from === streak.to ? streak.from : `${streak.from} to ${streak.to}`}</span></span>}
      </div>
      <p className="mt-2 text-sm text-white/72">{STREAK_HOW_IT_WORKS}</p>
      <p className="mt-1 text-sm text-white/50">Any camera counts, phones included. Your streak runs through this year or last, so it holds until you get out in the new season.</p>
      {sorted.length ? (
        <ul className="mw-member-years" aria-label="Years with a Milky Way image">
          {sorted.map((y) => (
            <li key={y.year} className={`is-${y.source} is-${y.status}`} title={chipTitle(y)}>{y.year}{y.source === "upload" && y.status === "vetted" ? " ✓" : ""}</li>
          ))}
        </ul>
      ) : <p className="mt-3 text-sm text-white/60">{isMe ? "No Milky Way images yet. Your first upload starts your streak." : "No Milky Way images yet."}</p>}
      {sorted.some((y) => y.source === "upload" && y.status === "vetted") && <p className="mt-3 text-xs text-white/45">✓ capture date vetted by the Guild.</p>}
      {isMe && <p className="mt-4"><Link href="/submit" className="mw-btn-secondary inline-block">Upload a Milky Way image</Link></p>}
    </section>
  );
}
