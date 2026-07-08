import { getSessionState } from "@/lib/supabase/server";
import { HeaderClient } from "./HeaderClient";

export async function Header() {
  const { user, isAdmin } = await getSessionState();
  const metadata = user?.user_metadata;
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();
  const { data: profile } = user ? await supabase.from("profiles").select("display_name,full_name,avatar_url").eq("id", user.id).maybeSingle() : { data: null };
  const name = profile?.display_name || profile?.full_name || metadata?.display_name || metadata?.full_name || metadata?.name || "Guild Member";
  const rankLabel = metadata?.rank_label || metadata?.rankLabel || metadata?.member_rank || metadata?.memberRank || undefined;
  const streakLabel = metadata?.streak_label || metadata?.streakLabel || metadata?.year_streak_label || metadata?.yearStreakLabel || undefined;
  return <HeaderClient user={Boolean(user)} isAdmin={isAdmin} name={name} rankLabel={rankLabel} streakLabel={streakLabel} avatarUrl={profile?.avatar_url || null} />;
}
