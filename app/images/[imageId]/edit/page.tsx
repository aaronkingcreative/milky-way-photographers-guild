import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccess } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loadFieldHonorOptions, loadFieldReportHonorState } from "@/lib/field-honors";
import { EditFieldReportForm } from "@/components/images/EditFieldReportForm";

export default async function EditFieldReportPage({ params }: { params: Promise<{ imageId: string }> }) {
  const { user } = await requireAccess();
  const { imageId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(imageId)) notFound();
  const supabase = await createServerSupabaseClient();
  const [{ data: image }, honors, honorState] = await Promise.all([
    supabase.from("guild_images").select("id,user_id,title,capture_date,country,state_or_province,specific_location_name,gear_settings,short_story,what_went_well,what_could_have_gone_better,image_url,deleted_at").eq("id", imageId).eq("user_id", user.id).maybeSingle(),
    loadFieldHonorOptions(supabase, user.id),
    loadFieldReportHonorState(supabase, user.id, imageId),
  ]);
  if (!image || image.deleted_at) notFound();
  return (
    <section className="mw-page py-8">
      <div className="mx-auto max-w-2xl">
        <Link href={`/images/${image.id}`} className="mw-nav-text text-sm text-[#f0bd66]">← Back to your field report</Link>
        <h1 className="mt-4 font-display text-3xl text-white">Edit field report</h1>
        <p className="mt-2 max-w-[60ch] text-white/70">Update the capture date, title, location, story, or gear. The photo itself stays the same.{honorState.canClaim ? " If you skipped a Field Honor when you filed this report, you can claim one here." : ""}</p>
        {image.image_url && <img src={image.image_url} alt="" className="mt-5 h-48 w-full rounded-md object-cover" />}
        <EditFieldReportForm image={image} achievements={honors.achievements} earnedAchievementIds={honors.earnedAchievementIds} currentHonorCount={honors.currentHonorCount} existingHonor={honorState.existing} canClaim={honorState.canClaim} />
      </div>
    </section>
  );
}
