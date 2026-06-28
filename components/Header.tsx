import { getSessionState } from "@/lib/supabase/server";
import { HeaderClient } from "./HeaderClient";

export async function Header() {
  const { user, isAdmin } = await getSessionState();
  const metadata = user?.user_metadata;
  const name = metadata?.display_name || metadata?.full_name || metadata?.name || "Guild Member";
  const rankLabel = metadata?.rank_label || metadata?.rankLabel || metadata?.member_rank || metadata?.memberRank || undefined;
  const streakLabel = metadata?.streak_label || metadata?.streakLabel || metadata?.year_streak_label || metadata?.yearStreakLabel || undefined;
  return <HeaderClient user={Boolean(user)} isAdmin={isAdmin} name={name} rankLabel={rankLabel} streakLabel={streakLabel} />;
}
