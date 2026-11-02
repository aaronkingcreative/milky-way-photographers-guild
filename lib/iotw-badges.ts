import { iotwWeekLabel } from "@/lib/iotw";

/**
 * Permanent IOTW badges. Every image entered in an IOTW week keeps "IOTW Week N Contender" forever,
 * unless the week was decided (voting closed and tallied, or finalized) and it placed in the top three,
 * in which case the badge becomes "IOTW Week N #1/#2/#3".
 */
export type IotwBadge = { label: string; week: string; year: number | null; place: 1 | 2 | 3 | null; ballotId: string | null; legacy?: boolean };

const DECIDED = new Set(["voting_closed", "finalized"]);

function decided(b: any) {
  return DECIDED.has(b?.status) && Boolean(b?.winner_field_report_id);
}

export function placeOf(ballot: any, fieldReportId: string): 1 | 2 | 3 | null {
  if (!decided(ballot)) return null;
  if (ballot.winner_field_report_id === fieldReportId) return 1;
  if (ballot.second_place_field_report_id === fieldReportId) return 2;
  if (ballot.third_place_field_report_id === fieldReportId) return 3;
  return null;
}

export function badgeLabel(week: string, place: 1 | 2 | 3 | null) {
  return place ? `IOTW ${week} #${place}` : `IOTW ${week} Contender`;
}

/** CSS modifier for a badge: gold, silver, bronze, or the plain contender look. */
export function badgeTone(badge: IotwBadge | null | undefined) {
  return badge?.place === 1 ? "is-gold" : badge?.place === 2 ? "is-silver" : badge?.place === 3 ? "is-bronze" : "is-contender";
}

/**
 * Badges for the given images, keyed by guild_images.id. `legacyFlagged` lists images that carry the old
 * is_weekly_candidate flag; if one has no ballot entry it keeps the plain "IOTW Contender" badge it always had.
 */
export async function fetchIotwBadges(supabase: any, imageIds: string[], legacyFlagged: string[] = []): Promise<Map<string, IotwBadge>> {
  const out = new Map<string, IotwBadge>();
  const ids = [...new Set(imageIds.filter(Boolean))];
  if (ids.length) {
    const { data: reports } = await supabase.from("field_reports").select("id,guild_image_id").in("guild_image_id", ids);
    const reportImage = new Map<string, string>((reports || []).map((r: any) => [r.id, r.guild_image_id]));
    const reportIds = [...reportImage.keys()];
    if (reportIds.length) {
      const { data: entries } = await supabase.from("iotw_ballot_entries").select("ballot_id,field_report_id,submitted_at").in("field_report_id", reportIds);
      const ballotIds = [...new Set((entries || []).map((e: any) => e.ballot_id))];
      const { data: ballots } = ballotIds.length
        ? await supabase.from("iotw_ballots").select("id,status,contest_week,contest_year,period_start,tallied_at,winner_field_report_id,second_place_field_report_id,third_place_field_report_id").in("id", ballotIds)
        : { data: [] };
      const ballotMap = new Map<string, any>((ballots || []).map((b: any) => [b.id, b]));
      for (const e of entries || []) {
        const ballot = ballotMap.get(e.ballot_id);
        const imageId = reportImage.get(e.field_report_id);
        if (!ballot || !imageId) continue;
        const place = placeOf(ballot, e.field_report_id);
        const week = iotwWeekLabel(ballot);
        const badge: IotwBadge = { label: badgeLabel(week, place), week, year: ballot.contest_year ?? null, place, ballotId: ballot.id };
        const prev = out.get(imageId);
        // An image should only ever be in one week, but if not, the best placement wins, then the latest week.
        const better = !prev || (place && (!prev.place || place < prev.place)) || (!place && !prev.place && (ballot.period_start || "") > (ballotMap.get(prev.ballotId || "")?.period_start || ""));
        if (better) out.set(imageId, badge);
      }
    }
  }
  for (const id of legacyFlagged) if (id && !out.has(id)) out.set(id, { label: "IOTW Contender", week: "", year: null, place: null, ballotId: null, legacy: true });
  return out;
}

/** guild_images ids entered in one ballot (the week being voted on), newest entry first. */
export async function fetchBallotImageIds(supabase: any, ballotId: string) {
  const { data: entries } = await supabase.from("iotw_ballot_entries").select("field_report_id,submitted_at").eq("ballot_id", ballotId).order("submitted_at", { ascending: false });
  return imageIdsForEntries(supabase, entries || []);
}

/** guild_images ids entered in any IOTW week, newest entry first. */
export async function fetchAllEnteredImageIds(supabase: any, limit = 200) {
  const { data: entries } = await supabase.from("iotw_ballot_entries").select("field_report_id,submitted_at").order("submitted_at", { ascending: false }).limit(limit);
  return imageIdsForEntries(supabase, entries || []);
}

async function imageIdsForEntries(supabase: any, entries: any[]) {
  const reportIds = entries.map((e) => e.field_report_id).filter(Boolean);
  if (!reportIds.length) return [] as { imageId: string; submittedAt: string | null }[];
  const { data: reports } = await supabase.from("field_reports").select("id,guild_image_id").in("id", reportIds);
  const map = new Map<string, string>((reports || []).map((r: any) => [r.id, r.guild_image_id]));
  const seen = new Set<string>();
  const out: { imageId: string; submittedAt: string | null }[] = [];
  for (const e of entries) {
    const imageId = map.get(e.field_report_id);
    if (imageId && !seen.has(imageId)) { seen.add(imageId); out.push({ imageId, submittedAt: e.submitted_at || null }); }
  }
  return out;
}
