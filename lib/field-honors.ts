import { EARNED_ACHIEVEMENT_STATUSES } from "@/lib/member-stats";

export type FieldHonorOption = {
  id: string;
  name: string;
  category: string;
  glyph?: string;
  requirement?: string;
  allow_repeat?: boolean;
  is_manual_claimable?: boolean | null;
};

export type ExistingFieldHonor = { name: string; glyph: string | null; status: string };

/** Active manual honors plus locked specials, plus what this member has already earned. Same query the submit page uses. */
export async function loadFieldHonorOptions(supabase: any, userId: string) {
  const [{ data: achievements }, { data: earnedAchievements }] = await Promise.all([
    supabase
      .from("achievement_definitions")
      .select("id,name,category,glyph,requirement,allow_repeat,is_manual_claimable")
      .eq("is_active", true)
      .in("category", ["monthly", "seasonal", "foreground", "technique", "special"])
      .order("sort_order")
      .limit(60),
    supabase
      .from("user_achievements")
      .select("achievement_id,status")
      .eq("user_id", userId)
      .in("status", EARNED_ACHIEVEMENT_STATUSES),
  ]);
  const earned = earnedAchievements || [];
  const options = ((achievements || []) as FieldHonorOption[]).filter((item) => item.is_manual_claimable || item.category === "special");
  const earnedAchievementIds = earned.map((item: { achievement_id: string }) => item.achievement_id);
  const currentHonorCount = new Set(earnedAchievementIds.filter((id: string) => !String(id || "").startsWith("rank_"))).size;
  return { achievements: options, earnedAchievementIds, currentHonorCount };
}

function embedded<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] || null : value;
}

/** One claim per field report. A missing report cannot take a claim; an existing claim of any status blocks another. */
export async function loadFieldReportHonorState(supabase: any, userId: string, imageId: string): Promise<{ canClaim: boolean; existing: ExistingFieldHonor | null }> {
  const { data: report, error } = await supabase.from("field_reports").select("id").eq("guild_image_id", imageId).eq("user_id", userId).maybeSingle();
  if (error || !report?.id) return { canClaim: false, existing: null };
  const { data: claim, error: claimError } = await supabase.from("field_report_achievement_claims").select("status,achievement_definitions(name,glyph)").eq("field_report_id", report.id).maybeSingle();
  if (claimError) return { canClaim: false, existing: { name: "Field Honor", glyph: null, status: "" } };
  if (!claim) return { canClaim: true, existing: null };
  const def = embedded<{ name?: string; glyph?: string | null }>(claim.achievement_definitions);
  return { canClaim: false, existing: { name: def?.name || "Field Honor", glyph: def?.glyph || null, status: claim.status } };
}
