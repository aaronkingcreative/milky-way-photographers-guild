import { nextRankForCount, rankForCount } from "@/lib/achievements";
import { consecutiveMonthStreakFromCoverage } from "@/lib/coverage";
import { isPublicName, publicMemberName, resolveAvatarUrl } from "@/lib/avatar";

export const EARNED_ACHIEVEMENT_STATUSES = ["auto_awarded_pending_review", "verified"];

type SupabaseClient = any;

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, any> | null;
};

export type MemberStats = {
  user_id: string;
  display_name: string;
  first_name: string;
  avatar_url: string | null;
  avatar_path: string | null;
  earned_honor_count: number;
  rank: string;
  rank_short: string;
  next_rank: string | null;
  honors_to_next_rank: number;
  year_streak: number;
  month_streak: number;
  country: string | null;
  region: string | null;
  state_or_province: string | null;
  specific_location: string | null;
  specific_location_name: string | null;
  /** True when the member has chosen a display name and a profile photo. Drives the gentle profile prompt. */
  has_display_name: boolean;
  has_avatar: boolean;
};

export function displayNameFromSources(profile: any, user?: AuthUser | null) {
  const metadata = user?.user_metadata || {};
  return publicMemberName(profile?.display_name, metadata.full_name, metadata.name, metadata.display_name, profile?.full_name);
}

export function initialsForName(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("") || "GM";
}

function firstNameFor(displayName: string) {
  return displayName.split(/\s+/).filter(Boolean)[0] || displayName;
}

/** Own row (or any row for admins) from profiles; otherwise the public member_profiles view, which has no email or exact location. */
async function loadProfile(supabase: SupabaseClient, id: string) {
  const own = await supabase.from("profiles").select("display_name,full_name,email,avatar_url,avatar_path,country,region,state_or_province,specific_location,specific_location_name").eq("id", id).maybeSingle();
  if (own.data) return own;
  return supabase.from("member_profiles").select("display_name,full_name,avatar_url,avatar_path,country,region,state_or_province").eq("id", id).maybeSingle();
}

export async function getMemberStats(supabase: SupabaseClient, user: AuthUser): Promise<MemberStats> {
  const [{ data: profile }, { data: achievements }, { data: coverage }] = await Promise.all([
    loadProfile(supabase, user.id),
    supabase.from("user_achievements").select("achievement_id,status,achievement_definitions(counts_toward_rank)").eq("user_id", user.id).in("status", EARNED_ACHIEVEMENT_STATUSES),
    supabase.from("user_field_coverage").select("capture_year,capture_month").eq("user_id", user.id),
  ]);
  const earned = new Set((achievements || []).filter((row: any) => row.achievement_definitions?.counts_toward_rank !== false).map((row: any) => row.achievement_id)).size;
  const rank = rankForCount(earned);
  const nextRank = nextRankForCount(earned);
  const years = new Set((coverage || []).map((row: any) => row.capture_year).filter((year: number) => !Number.isNaN(year)));
  const display_name = displayNameFromSources(profile, user);
  const avatar_path = profile?.avatar_path || null;
  return {
    user_id: user.id,
    display_name,
    first_name: firstNameFor(display_name),
    avatar_url: resolveAvatarUrl(avatar_path || profile?.avatar_url),
    avatar_path,
    earned_honor_count: earned,
    rank: rank.full,
    rank_short: rank.short,
    next_rank: nextRank?.short || null,
    honors_to_next_rank: nextRank ? Math.max(0, nextRank.min - earned) : 0,
    year_streak: years.size,
    month_streak: consecutiveMonthStreakFromCoverage(coverage || []),
    country: profile?.country || null,
    region: profile?.region || null,
    state_or_province: profile?.state_or_province || null,
    specific_location: profile?.specific_location || null,
    specific_location_name: profile?.specific_location_name || null,
    has_display_name: isPublicName(profile?.display_name),
    has_avatar: Boolean(avatar_path || profile?.avatar_url),
  };
}
