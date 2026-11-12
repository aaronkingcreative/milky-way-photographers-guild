import { withReviewNotes } from "@/lib/review-notes";
import { getSessionState } from "@/lib/supabase/server";
import { getMemberStats } from "@/lib/member-stats";
import { HeaderClient } from "./HeaderClient";
import { getIotwPeriod, getIotwTargetPeriod, iotwVoteIsRequired } from "@/lib/iotw";
import { publicMemberName } from "@/lib/avatar";
import { fetchTripNotices } from "@/lib/forum-trips";

export async function Header() {
  const { user, isAdmin, hasAccess } = await getSessionState();
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();
  const stats = user ? await getMemberStats(supabase, user) : null;
  let iotw:any = null;
  if (user && (hasAccess || isAdmin)) {
    const period = getIotwPeriod();
    const { data: ballot } = await supabase.from("iotw_ballots").select("*").eq("period_start", period.period_start).eq("status", "voting_open").maybeSingle();
    if (ballot) {
      const [{ data: rows }, { data: vote }] = await Promise.all([
        supabase.from("iotw_ballot_entries").select("field_report_id,user_id,field_reports(title,capture_date,country,region,guild_image_id,guild_images(image_url),profiles:member_profiles(display_name,full_name))").eq("ballot_id", ballot.id),
        supabase.from("iotw_votes").select("first_place_field_report_id,second_place_field_report_id,third_place_field_report_id").eq("ballot_id", ballot.id).eq("voter_user_id", user.id).maybeSingle(),
      ]);
      const entries = (rows || []).map((r:any) => ({ field_report_id:r.field_report_id, user_id:r.user_id, title:r.field_reports?.title || "Untitled", image_url:r.field_reports?.guild_images?.image_url || null, photographer_name:publicMemberName(r.field_reports?.profiles?.display_name, r.field_reports?.profiles?.full_name), capture_date:r.field_reports?.capture_date, location:[r.field_reports?.region,r.field_reports?.country].filter(Boolean).join(", ") }));
      // Members never vote for their own image. If only their own images are in, there is nothing to vote on.
      const eligible = entries.filter((entry:any) => entry.user_id !== user.id);
      const entryPeriod = getIotwTargetPeriod();
      if (eligible.length) iotw = { ballot, entries: eligible, vote, entryWeek: { label: `Week ${entryPeriod.contest_week}`, closes: entryPeriod.submission_cutoff }, mustVote: !vote && iotwVoteIsRequired(ballot, eligible.length) };
    }
  }
  // Admins: pending Verification Desk claims. Members: unseen review results that carry a note or a reassignment.
  let pendingClaims = 0;
  let reviewNotice: { count: number; text: string } | null = null;
  if (user && isAdmin) {
    const { count } = await supabase.from("field_report_achievement_claims").select("id", { count: "exact", head: true }).eq("status", "auto_awarded_pending_review");
    pendingClaims = count || 0;
  }
  if (user) {
    const { data: noticeRows } = await supabase.from("field_report_achievement_claims").select("id,status,original_achievement_id,achievement_definitions(name)").eq("user_id", user.id).is("member_seen_at", null).neq("status", "auto_awarded_pending_review").limit(20);
    const notices = await withReviewNotes(supabase, noticeRows as any[]);
    const withNotes = notices.filter((n: any) => n.review_notes || n.original_achievement_id);
    if (withNotes.length) {
      const first: any = withNotes[0];
      const honor = (Array.isArray(first.achievement_definitions) ? first.achievement_definitions[0] : first.achievement_definitions)?.name || "Field Honor";
      reviewNotice = { count: withNotes.length, text: withNotes.length === 1 ? (first.original_achievement_id ? `The Guild verified your claim as ${honor} and left you a note` : `The Guild reviewed your ${honor} claim and left you a note`) : `The Guild left notes on ${withNotes.length} of your Field Honor claims` };
    }
  }
  const forumNotices = user && (hasAccess || isAdmin) ? await fetchTripNotices(supabase, user.id).catch(() => []) : [];
  const streakLabel = stats?.year_streak ? `${stats.year_streak} Year Streak` : undefined;
  return <HeaderClient pendingClaims={pendingClaims} reviewNotice={reviewNotice} forumNotices={forumNotices} user={Boolean(user)} isAdmin={isAdmin} name={publicMemberName(stats?.display_name)} needsProfile={Boolean(stats && (!stats.has_display_name || !stats.has_avatar))} missingName={Boolean(stats && !stats.has_display_name)} missingPhoto={Boolean(stats && !stats.has_avatar)} userId={user?.id || null} rankLabel={stats?.rank_short} streakLabel={streakLabel} avatarUrl={stats?.avatar_pill_url || stats?.avatar_url || null} iotw={iotw} />;
}
