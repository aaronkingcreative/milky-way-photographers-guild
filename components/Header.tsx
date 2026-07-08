import { getSessionState } from "@/lib/supabase/server";
import { getMemberStats } from "@/lib/member-stats";
import { HeaderClient } from "./HeaderClient";
import { getIotwPeriod } from "@/lib/iotw";

export async function Header() {
  const { user, isAdmin } = await getSessionState();
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();
  const stats = user ? await getMemberStats(supabase, user) : null;
  let iotw:any = null;
  if (user) {
    const period = getIotwPeriod();
    const { data: ballot } = await supabase.from("iotw_ballots").select("*").eq("period_start", period.period_start).eq("status", "voting_open").maybeSingle();
    if (ballot) {
      const [{ data: rows }, { data: vote }] = await Promise.all([
        supabase.from("iotw_ballot_entries").select("field_report_id,user_id,field_reports(title,capture_date,country,region,guild_image_id,guild_images(image_url),profiles(display_name,full_name,email))").eq("ballot_id", ballot.id),
        supabase.from("iotw_votes").select("first_place_field_report_id,second_place_field_report_id,third_place_field_report_id").eq("ballot_id", ballot.id).eq("voter_user_id", user.id).maybeSingle(),
      ]);
      const entries = (rows || []).map((r:any) => ({ field_report_id:r.field_report_id, user_id:r.user_id, title:r.field_reports?.title || "Untitled", image_url:r.field_reports?.guild_images?.image_url || null, photographer_name:r.field_reports?.profiles?.display_name || r.field_reports?.profiles?.full_name || "Guild photographer", capture_date:r.field_reports?.capture_date, location:[r.field_reports?.region,r.field_reports?.country].filter(Boolean).join(", ") }));
      if (entries.length) iotw = { ballot, entries, vote };
    }
  }
  const streakLabel = stats?.year_streak ? `${stats.year_streak} Year Streak` : undefined;
  return <HeaderClient user={Boolean(user)} isAdmin={isAdmin} name={stats?.display_name || "Guild Member"} rankLabel={stats?.rank_short} streakLabel={streakLabel} avatarUrl={stats?.avatar_url || null} iotw={iotw} />;
}
