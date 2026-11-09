import { seededAchievementDefinitions } from "@/lib/achievements";

/** Display strings and counts for Field Desk and Progress. No data access. */

/** Same rule member stats use for the earned count. Rank milestones are not Field Honors. */
export function countsAsFieldHonor(achievementId: string | null | undefined, countsTowardRank: boolean | null | undefined) {
  if (String(achievementId || "").startsWith("rank_")) return false;
  return countsTowardRank !== false;
}

export type HonorBadgeModel = { id: string; name: string; glyph: string; earned: boolean };

/** Real honors a member can still earn, in catalog order. Not a second set of names. */
export function fieldDeskHonorCatalog() {
  return seededAchievementDefinitions
    .filter((item) => item.isActive && item.category !== "rank" && item.countsTowardRank !== false)
    .map((item) => ({ id: item.id, name: item.name, glyph: item.glyph }));
}

/**
 * Gold only for honors this member was actually awarded.
 * Locked previews fill out a short row when fewer than six are earned, and they are never marked earned.
 */
export function fieldDeskHonorBadges(
  earned: { id: string; name: string; glyph?: string | null }[],
  catalog: { id: string; name: string; glyph?: string | null }[],
): HonorBadgeModel[] {
  const seen = new Set<string>();
  const earnedBadges: HonorBadgeModel[] = [];
  for (const honor of earned) {
    if (!honor?.id || seen.has(honor.id)) continue;
    seen.add(honor.id);
    earnedBadges.push({ id: honor.id, name: honor.name, glyph: honor.glyph || "✦", earned: true });
  }
  const locked: HonorBadgeModel[] = [];
  if (earnedBadges.length < 6) {
    for (const honor of catalog) {
      if (!honor?.id || seen.has(honor.id)) continue;
      seen.add(honor.id);
      locked.push({ id: honor.id, name: honor.name, glyph: honor.glyph || "✦", earned: false });
      if (earnedBadges.length + locked.length >= 6) break;
    }
  }
  return [...earnedBadges, ...locked];
}

export function honorsToGo(count: number): string {
  const n = Math.max(0, Math.trunc(count));
  return n === 1 ? "1 honor to go" : `${n} honors to go`;
}

export function moreHonorsToRank(count: number): string {
  const n = Math.max(0, Math.trunc(count));
  return n === 1 ? "1 more honor to rank up" : `${n} more honors to rank up`;
}

/** Reactions on this member's own reports. Reactions on other reports do not count. */
export function countReactionsOnReports(reportIds: Iterable<string>, reactions: { image_id?: string | null }[]): number {
  const ids = new Set(reportIds);
  return reactions.reduce((total, row) => total + (row.image_id && ids.has(row.image_id) ? 1 : 0), 0);
}

/**
 * Fill of the current rank span. Zero honors is a real zero, not a minimum sliver.
 * At the top rank the bar is full.
 */
export function rankProgressPercent(earnedCount: number, honorsToNext: number, hasNextRank: boolean): number {
  if (!hasNextRank) return 100;
  const earned = Math.max(0, earnedCount);
  const remaining = Math.max(0, honorsToNext);
  const step = Math.max(1, remaining || 1);
  const base = Math.max(0, earned - (earned % step));
  const target = earned + remaining;
  const span = Math.max(1, target - base);
  return Math.min(100, Math.max(0, ((earned - base) / span) * 100));
}

/**
 * Name first, then a short stable ending. A long surname at the end of
 * "Welcome back to the field, Name" drops onto its own line at 360px.
 */
export function fieldDeskGreeting(name: string): string {
  const who = name.trim() || "Guild member";
  return `${who}, welcome back to the field.`;
}
