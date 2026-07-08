import { nextRankForCount, rankForCount } from "@/lib/achievements";
import { storagePublicUrl, PROFILE_AVATAR_BUCKET } from "@/lib/storage";

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
};

function titleCaseFallback(value: string) {
  return value
    .replace(/[._-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function displayNameFromSources(profile: any, user?: AuthUser | null) {
  const metadata = user?.user_metadata || {};
  const profileName = String(profile?.display_name || "").trim();
  if (profileName) return profileName;
  const metadataName = String(metadata.full_name || metadata.name || metadata.display_name || "").trim();
  if (metadataName) return metadataName;
  const emailLocal = String(user?.email || profile?.email || "").split("@")[0];
  return emailLocal ? titleCaseFallback(emailLocal) : "Guild Member";
}

export function initialsForName(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("") || "GM";
}

function firstNameFor(displayName: string) {
  return displayName.split(/\s+/).filter(Boolean)[0] || displayName;
}

function consecutiveMonthStreak(dates: string[]) {
  const months = [...new Set(dates.map((value) => {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date.getUTCFullYear() * 12 + date.getUTCMonth();
  }).filter((value): value is number => value !== null))].sort((a, b) => b - a);
  if (!months.length) return 0;
  let streak = 1;
  for (let index = 1; index < months.length; index += 1) {
    if (months[index] === months[index - 1] - 1) streak += 1;
    else break;
  }
  return streak;
}

export async function getMemberStats(supabase: SupabaseClient, user: AuthUser): Promise<MemberStats> {
  const [{ data: profile }, { data: achievements }, { data: reports }] = await Promise.all([
    supabase.from("profiles").select("display_name,full_name,email,avatar_url,avatar_path,country,region,state_or_province,specific_location,specific_location_name").eq("id", user.id).maybeSingle(),
    supabase.from("user_achievements").select("achievement_id,status").eq("user_id", user.id).in("status", EARNED_ACHIEVEMENT_STATUSES),
    supabase.from("field_reports").select("capture_date").eq("user_id", user.id).eq("status", "published").not("capture_date", "is", null),
  ]);
  const earned = new Set((achievements || []).map((row: any) => row.achievement_id)).size;
  const rank = rankForCount(earned);
  const nextRank = nextRankForCount(earned);
  const dates = (reports || []).map((row: any) => row.capture_date).filter(Boolean);
  const years = new Set(dates.map((value: string) => new Date(`${value}T00:00:00`).getUTCFullYear()).filter((year: number) => !Number.isNaN(year)));
  const display_name = displayNameFromSources(profile, user);
  const avatar_path = profile?.avatar_path || null;
  return {
    user_id: user.id,
    display_name,
    first_name: firstNameFor(display_name),
    avatar_url: profile?.avatar_url || (avatar_path ? storagePublicUrl(PROFILE_AVATAR_BUCKET, avatar_path) : null),
    avatar_path,
    earned_honor_count: earned,
    rank: rank.full,
    rank_short: rank.short,
    next_rank: nextRank?.short || null,
    honors_to_next_rank: nextRank ? Math.max(0, nextRank.min - earned) : 0,
    year_streak: years.size,
    month_streak: consecutiveMonthStreak(dates),
    country: profile?.country || null,
    region: profile?.region || null,
    state_or_province: profile?.state_or_province || null,
    specific_location: profile?.specific_location || null,
    specific_location_name: profile?.specific_location_name || null,
  };
}
