import Image from "next/image";
import { SubmitImageForm } from "@/components/images/SubmitImageForm";
import { requireAccess } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loadFieldHonorOptions } from "@/lib/field-honors";
import { formatMountainShort, getIotwSchedule } from "@/lib/iotw";
import { WEEKLY_SUBMISSION_LIMIT, weeklySubmissionsUnlimited } from "@/lib/images";

export default async function Page() {
  const { user } = await requireAccess();
  const supabase = await createServerSupabaseClient();
  const schedule = await getIotwSchedule(supabase);
  const period = { period_start: schedule.entry.voting_opens_at };
  const [{ count: candidateCount }, honors] = await Promise.all([
    supabase
      .from("field_reports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("iotw_week_start", period.period_start.slice(0,10))
      .eq("is_iotw_candidate", true)
      .neq("status", "removed"),
    loadFieldHonorOptions(supabase, user.id),
  ]);

  return (
    <section className="mx-auto max-w-[760px] px-5 py-[38px] pb-[90px]">
      <div className="mb-7">
        <div className="mw-prototype-eyebrow mb-2">
          <Image src="/launch/mwpg/MWPG_Logo_FAVICON.png" alt="" width={20} height={20} />
          <span>New Submission</span>
        </div>
        <h1 className="mw-submit-title">Share a night under the Milky Way</h1>
        <p className="mw-submit-intro">
          Where you went, how you shot it, and what you would refine next time.
        </p>
      </div>
      <div className="mw-submit-notice mb-7">
        <span aria-hidden="true" className="mw-submit-notice-icon">✪</span>
        <p>
          {weeklySubmissionsUnlimited()
            ? `Unlimited field reports this week. One can enter Image of the Week ${schedule.entry.label}, open for entries until ${formatMountainShort(schedule.entry.entries_close_at)}.`
            : `Up to ${WEEKLY_SUBMISSION_LIMIT} field reports a week. One of them can enter Image of the Week ${schedule.entry.label}, open for entries until ${formatMountainShort(schedule.entry.entries_close_at)}.`}
        </p>
      </div>
      <SubmitImageForm iotwEntry={{ label: schedule.entry.label, closes: formatMountainShort(schedule.entry.entries_close_at), votingCloses: formatMountainShort(schedule.entry.voting_closes_at), votingNow: schedule.voting ? `Image of the Week ${schedule.voting.label}` : null }} hasCandidate={(candidateCount || 0) > 0} achievements={honors.achievements} earnedAchievementIds={honors.earnedAchievementIds} currentHonorCount={honors.currentHonorCount} />
    </section>
  );
}
