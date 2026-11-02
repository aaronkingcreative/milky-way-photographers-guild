import { iotwWeekLabel } from "@/lib/iotw";

/** One placed image in a decided IOTW week. `image` is the guild_images row (with profiles) the field report was filed from. */
export type IotwPlacement = { place: 1 | 2 | 3; fieldReportId: string; title: string; image: any | null; votes: number; points: number; firstPlaceVotes: number; totalBallots: number };
export type IotwDecidedWeek = { ballot: any; label: string; year: number; placements: IotwPlacement[]; winner: IotwPlacement | null };

const PROFILE_COLUMNS = "display_name,full_name,avatar_url,avatar_path";

/**
 * Weeks whose winners are decided, newest first. A week counts once voting has closed and the tally picked a winner
 * (the cron tallies at Sunday 12:00 PM MT) or once an admin finalized it.
 */
export async function fetchDecidedIotwWeeks(supabase: any, limit?: number): Promise<IotwDecidedWeek[]> {
  let q = supabase.from("iotw_ballots").select("*").in("status", ["finalized", "voting_closed"]).not("winner_field_report_id", "is", null).order("period_start", { ascending: false });
  if (limit) q = q.limit(limit);
  const { data: ballots } = await q;
  if (!ballots?.length) return [];
  const ballotIds = ballots.map((b: any) => b.id);
  const reportIds = ballots.flatMap((b: any) => [b.winner_field_report_id, b.second_place_field_report_id, b.third_place_field_report_id]).filter(Boolean);
  const [{ data: reports }, { data: results }] = await Promise.all([
    supabase.from("field_reports").select("id,title,guild_image_id").in("id", reportIds),
    supabase.from("iotw_ballot_results").select("ballot_id,field_report_id,total_points,first_place_count,second_place_count,third_place_count,total_ballots").in("ballot_id", ballotIds),
  ]);
  const imageIds = (reports || []).map((r: any) => r.guild_image_id).filter(Boolean);
  const { data: images } = imageIds.length ? await supabase.from("guild_images").select(`id,title,image_url,user_id,profiles:member_profiles(${PROFILE_COLUMNS})`).in("id", imageIds) : { data: [] };
  const reportMap = new Map<string, any>((reports || []).map((r: any) => [r.id, r]));
  const imageMap = new Map<string, any>((images || []).map((i: any) => [i.id, i]));
  const resultMap = new Map<string, any>((results || []).map((r: any) => [`${r.ballot_id}:${r.field_report_id}`, r]));
  return ballots.map((b: any) => {
    const placements = ([[1, b.winner_field_report_id], [2, b.second_place_field_report_id], [3, b.third_place_field_report_id]] as const)
      .filter(([, id]) => id)
      .map(([place, id]) => {
        const report = reportMap.get(id as string);
        const image = report?.guild_image_id ? imageMap.get(report.guild_image_id) || null : null;
        const r = resultMap.get(`${b.id}:${id}`);
        return { place, fieldReportId: id as string, title: report?.title || image?.title || "Untitled", image, votes: r?.total_ballots || 0, points: r?.total_points || 0, firstPlaceVotes: r?.first_place_count || 0, totalBallots: r?.total_ballots || 0 } as IotwPlacement;
      });
    const year = b.contest_year || new Date(b.period_start).getUTCFullYear();
    return { ballot: b, label: iotwWeekLabel(b), year, placements, winner: placements.find((p) => p.place === 1) || null };
  });
}
