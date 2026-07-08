import Image from "next/image";
import { SubmitImageForm } from "@/components/images/SubmitImageForm";
import { requireAccess } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getIotwTargetPeriod } from "@/lib/iotw";

export default async function Page() {
  const { user } = await requireAccess();
  const supabase = await createServerSupabaseClient();
  const period = getIotwTargetPeriod();
  const [{ count: candidateCount }, { data: achievements }, { data: earnedAchievements }] = await Promise.all([
    supabase
      .from("field_reports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("iotw_week_start", period.period_start.slice(0,10))
      .eq("is_iotw_candidate", true)
      .neq("status", "removed"),
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
      .eq("user_id", user.id)
      .in("status", ["auto_awarded_pending_review", "verified"]),
  ]);

  return (
    <section className="mx-auto max-w-[1120px] px-5 py-[38px] pb-[90px] lg:px-10">
      <div className="mb-7">
        <div className="mw-prototype-eyebrow mb-2">
          <Image src="/launch/mwpg/MWPG_Logo_FAVICON.png" alt="" width={20} height={20} />
          <span>New Submission</span>
        </div>
        <h1 className="mw-submit-title">Share a night under the Milky Way</h1>
        <p className="mw-submit-intro">
          Tell the Guild where you went, how you captured it, what worked, and what you would refine next time.
        </p>
      </div>
      <div className="mw-submit-notice mb-7">
        <span aria-hidden="true" className="mw-submit-notice-icon">✪</span>
        <p>
          <strong>Submit as many field reports as you want.</strong> But only ONE IMAGE may be entered for Image of the Week each week. Choose your very best!
        </p>
      </div>
      <SubmitImageForm remaining={999} hasCandidate={(candidateCount || 0) > 0} achievements={(achievements || []).filter((item: any) => item.is_manual_claimable || item.category === "special")} earnedAchievementIds={(earnedAchievements || []).map((item: any) => item.achievement_id)} currentHonorCount={new Set((earnedAchievements || []).map((item: any) => item.achievement_id)).size} />
    </section>
  );
}
