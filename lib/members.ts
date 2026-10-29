import { getAvatarDisplay, MEMBER_NAME_FALLBACK, publicMemberName } from "@/lib/avatar";
import { EARNED_ACHIEVEMENT_STATUSES } from "@/lib/member-stats";

type SupabaseClient = any;
export type MemberLite = { id: string; name: string; avatarUrl: string | null; initials: string };

export function memberFromProfile(id: string, profile: any, fallbackName?: string | null): MemberLite {
  const name = publicMemberName(profile?.display_name, profile?.full_name, fallbackName);
  const avatar = getAvatarDisplay({ avatarPath: profile?.avatar_path, avatarUrl: profile?.avatar_url, displayName: name });
  return { id, name: avatar.displayName, avatarUrl: avatar.avatarUrl, initials: avatar.initials };
}

export async function fetchMembers(supabase: SupabaseClient, ids: string[]): Promise<Map<string, MemberLite>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, MemberLite>();
  if (!unique.length) return map;
  const { data } = await supabase.from("member_profiles").select("id,display_name,full_name,avatar_url,avatar_path").in("id", unique);
  (data || []).forEach((p: any) => map.set(p.id, memberFromProfile(p.id, p)));
  unique.forEach((id) => { if (!map.has(id)) map.set(id, { id, name: MEMBER_NAME_FALLBACK, avatarUrl: null, initials: "GM" }); });
  return map;
}

/** Honors earned through the field report(s) attached to one image. */
export async function getImageHonors(supabase: SupabaseClient, imageId: string) {
  const { data: reports } = await supabase.from("field_reports").select("id").eq("guild_image_id", imageId);
  const reportIds = (reports || []).map((r: any) => r.id);
  if (!reportIds.length) return [];
  const [{ data: claims }, { data: earned }] = await Promise.all([
    supabase.from("field_report_achievement_claims").select("achievement_id,status,claimed_at,achievement_definitions(id,name,glyph,description)").in("field_report_id", reportIds),
    supabase.from("user_achievements").select("achievement_id,status,earned_at,achievement_definitions(id,name,glyph,description)").in("source_field_report_id", reportIds).in("status", EARNED_ACHIEVEMENT_STATUSES),
  ]);
  const byId = new Map<string, any>();
  for (const row of [...(earned || []), ...(claims || [])]) {
    const def = Array.isArray(row.achievement_definitions) ? row.achievement_definitions[0] : row.achievement_definitions;
    if (!def || byId.has(row.achievement_id)) continue;
    if (row.status && !EARNED_ACHIEVEMENT_STATUSES.includes(row.status)) continue;
    byId.set(row.achievement_id, { id: row.achievement_id, name: def.name, glyph: def.glyph, description: def.description, earned_at: row.earned_at || row.claimed_at || null, status: row.status });
  }
  return [...byId.values()];
}
