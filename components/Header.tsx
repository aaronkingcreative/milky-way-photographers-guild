import { getSessionState } from "@/lib/supabase/server";
import { getMemberStats } from "@/lib/member-stats";
import { HeaderClient } from "./HeaderClient";

export async function Header() {
  const { user, isAdmin } = await getSessionState();
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();
  const stats = user ? await getMemberStats(supabase, user) : null;
  const streakLabel = stats?.year_streak ? `${stats.year_streak} Year Streak` : undefined;
  return <HeaderClient user={Boolean(user)} isAdmin={isAdmin} name={stats?.display_name || "Guild Member"} rankLabel={stats?.rank_short} streakLabel={streakLabel} avatarUrl={stats?.avatar_url || null} />;
}
