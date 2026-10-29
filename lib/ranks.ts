import { EARNED_ACHIEVEMENT_STATUSES } from "@/lib/member-stats";

export const RANKS = [
  { label: "Unranked", count: 0, range: "No Field Honors yet" },
  { label: "Beginner", count: 1, range: "1 to 7 Field Honors" },
  { label: "Amateur", count: 8, range: "8 to 17 Field Honors" },
  { label: "Novice", count: 18, range: "18 to 24 Field Honors" },
  { label: "Veteran", count: 25, range: "25 to 32 Field Honors" },
  { label: "Master", count: 33, range: "33+ Field Honors" },
] as const;

export function rankLabelForCount(count: number) {
  for (let i = RANKS.length - 1; i >= 0; i--) if (count >= RANKS[i].count) return RANKS[i].label;
  return "Unranked";
}

// Distinct earned Field Honors per member. Pass no ids to count every member.
export async function fetchHonorCounts(supabase: any, userIds?: string[]) {
  const counts = new Map<string, number>();
  if (userIds && !userIds.length) return counts;
  let query = supabase.from("user_achievements").select("user_id,achievement_id").in("status", EARNED_ACHIEVEMENT_STATUSES);
  if (userIds) query = query.in("user_id", userIds);
  const { data } = await query;
  const sets = new Map<string, Set<string>>();
  (data || []).forEach((row: any) => {
    if (!sets.has(row.user_id)) sets.set(row.user_id, new Set());
    sets.get(row.user_id)!.add(row.achievement_id);
  });
  sets.forEach((ids, userId) => counts.set(userId, ids.size));
  return counts;
}

// Guild image ids that won Image of the Week on a finalized ballot.
export async function fetchWinningImageIds(supabase: any) {
  const { data: ballots } = await supabase.from("iotw_ballots").select("winner_field_report_id").eq("status", "finalized").not("winner_field_report_id", "is", null);
  const reportIds = (ballots || []).map((b: any) => b.winner_field_report_id).filter(Boolean);
  if (!reportIds.length) return new Set<string>();
  const { data: reports } = await supabase.from("field_reports").select("guild_image_id").in("id", reportIds);
  return new Set<string>((reports || []).map((r: any) => r.guild_image_id).filter(Boolean));
}
