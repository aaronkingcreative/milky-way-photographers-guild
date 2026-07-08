import Image from "next/image";
import { SubmitImageForm } from "@/components/images/SubmitImageForm";
import { requireAccess } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getWeekStart } from "@/lib/images";

export default async function Page() {
  const { user } = await requireAccess();
  const supabase = await createServerSupabaseClient();
  const week = getWeekStart();
  const [{ count: candidateCount }, { data: achievements }] = await Promise.all([
    supabase
      .from("field_reports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("iotw_week_start", week)
      .eq("is_iotw_candidate", true)
      .neq("status", "removed"),
    supabase
      .from("achievement_definitions")
      .select("id,name,category")
      .eq("is_active", true)
      .neq("category", "rank")
      .order("sort_order")
      .limit(24),
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
      <SubmitImageForm remaining={999} hasCandidate={(candidateCount || 0) > 0} achievements={achievements || []} />
    </section>
  );
}
