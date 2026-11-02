import { streakLabel } from "@/lib/streak";

/** "☄ 12-yr Milky Way streak" next to a member's name. Renders nothing for no streak. */
export function StreakPill({ length, short = false, title, className = "" }: { length?: number | null; short?: boolean; title?: string; className?: string }) {
  const label = streakLabel(length, short);
  if (!label) return null;
  return <span className={`mw-streak-pill ${className}`} title={title || `${length} years in a row with a Milky Way image in the Guild`}><span aria-hidden="true">☄</span> {label}</span>;
}
