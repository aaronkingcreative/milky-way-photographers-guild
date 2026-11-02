/**
 * The Milky Way year streak: consecutive calendar years, ending this year or last year,
 * with at least one Milky Way image uploaded to the Guild and dated to that year.
 *
 * Source of truth is member_milky_way_years. Rows with source='upload' are kept in sync by
 * database triggers from each field report's declared capture date (admins can vet or
 * correct that date); rows with source='admin_record' are entered by an admin. Members
 * never set years directly. Ending "this year or last year" means a streak is not lost
 * before someone gets out in the new season.
 */
export const STREAK_HOW_IT_WORKS = "Upload a Milky Way image from a year and declare when you shot it. Each consecutive year adds to your streak.";

export type MilkyWayYear = { year: number; status: "declared" | "vetted"; source: "upload" | "admin_record"; reports: number };
export type MilkyWayStreak = { length: number; from: number | null; to: number | null };

type SupabaseClient = any;

export function currentMountainYear(now = new Date()) {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", year: "numeric" }).format(now));
}

export function milkyWayStreak(years: Iterable<number>, thisYear = currentMountainYear()): MilkyWayStreak {
  const set = new Set([...years].map(Number).filter((y) => Number.isInteger(y)));
  const end = set.has(thisYear) ? thisYear : set.has(thisYear - 1) ? thisYear - 1 : null;
  if (end === null) return { length: 0, from: null, to: null };
  let start = end;
  while (set.has(start - 1)) start -= 1;
  return { length: end - start + 1, from: start, to: end };
}

/** "12-yr Milky Way streak" next to member names; "12-yr streak" where space is tight. */
export function streakLabel(length?: number | null, short = false) {
  if (!length || length < 1) return null;
  return short ? `${length}-yr streak` : `${length}-yr Milky Way streak`;
}

export function streakTitle(streak: MilkyWayStreak) {
  if (!streak.length || streak.from === null) return "";
  const span = streak.from === streak.to ? `${streak.from}` : `${streak.from} to ${streak.to}`;
  return `Out under the Milky Way every year, ${span}`;
}

/** Every Milky Way year per member, one entry per year (an upload year wins over an admin record; vetted beats declared). */
export async function fetchMilkyWayYears(supabase: SupabaseClient, ids: string[]): Promise<Map<string, MilkyWayYear[]>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const out = new Map<string, MilkyWayYear[]>();
  unique.forEach((id) => out.set(id, []));
  if (!unique.length) return out;
  const { data } = await supabase.from("member_milky_way_years").select("user_id,year,status,source,report_count").in("user_id", unique);
  const byUser = new Map<string, Map<number, MilkyWayYear>>();
  (data || []).forEach((r: any) => {
    const year = Number(r.year);
    if (!Number.isInteger(year)) return;
    const row: MilkyWayYear = { year, status: r.status === "vetted" ? "vetted" : "declared", source: r.source === "upload" ? "upload" : "admin_record", reports: Number(r.report_count) || 0 };
    if (!byUser.has(r.user_id)) byUser.set(r.user_id, new Map());
    const years = byUser.get(r.user_id)!;
    const existing = years.get(year);
    if (!existing) { years.set(year, row); return; }
    years.set(year, {
      year,
      source: existing.source === "upload" || row.source === "upload" ? "upload" : "admin_record",
      status: existing.status === "vetted" || row.status === "vetted" ? "vetted" : "declared",
      reports: existing.reports + row.reports,
    });
  });
  byUser.forEach((years, userId) => out.set(userId, [...years.values()].sort((a, b) => b.year - a.year)));
  return out;
}

export async function fetchStreaks(supabase: SupabaseClient, ids: string[]): Promise<Map<string, MilkyWayStreak>> {
  const years = await fetchMilkyWayYears(supabase, ids);
  const thisYear = currentMountainYear();
  const out = new Map<string, MilkyWayStreak>();
  years.forEach((rows, id) => out.set(id, milkyWayStreak(rows.map((r) => r.year), thisYear)));
  return out;
}
