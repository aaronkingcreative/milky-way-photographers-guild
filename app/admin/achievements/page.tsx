import Image from "next/image";
import Link from "next/link";
import { adminAchievementClaimAction } from "@/app/actions";
import { requireAdmin } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function Page() {
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const { data: claims } = await supabase
    .from("field_report_achievement_claims")
    .select("id,status,claimed_at,review_notes,user_id,achievement_id,achievement_definitions(name,glyph),profiles(display_name,avatar_url),field_reports(id,title,capture_date,gear,story,went_well,could_have_gone_better,guild_image_id,guild_images(image_url,image_original_path,country,state_or_province,specific_location_name),user_field_coverage(capture_year,capture_month,capture_season))")
    .order("claimed_at", { ascending: false })
    .limit(100);
  return <section className="mx-auto max-w-7xl px-5 py-14">
    <Link href="/admin" className="font-display uppercase tracking-[.16em] text-[#f0bd66]">← Admin</Link>
    <p className="eyebrow mt-6">Verification Desk</p>
    <h1 className="mt-2 font-display text-5xl uppercase">Achievement Claims</h1>
    <p className="mt-3 max-w-3xl text-white/68">Review the one Field Honor selected for each field report. Coverage details are shown for context and do not count as extra manual honors.</p>
    <div className="mt-8 grid gap-5">
      {(claims || []).map((claim: any) => {
        const report = claim.field_reports;
        const image = report?.guild_images;
        const coverage = Array.isArray(report?.user_field_coverage) ? report.user_field_coverage[0] : report?.user_field_coverage;
        return <article key={claim.id} className="mw-admin-card overflow-hidden p-5">
          <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)_280px]">
            <div>{image?.image_url && <Image src={image.image_url} alt={report?.title || "Field report image"} width={440} height={280} className="h-44 w-full rounded object-cover" />}</div>
            <div>
              <div className="flex items-center gap-3"><img src={claim.profiles?.avatar_url || "/launch/mwpg/MWPG_Logo_FAVICON.png"} alt="" className="h-10 w-10 rounded-full object-cover" /><div><p className="font-bold text-white">{claim.profiles?.display_name || "Guild Member"}</p><p className="text-sm text-white/50">{claim.status}</p></div></div>
              <h2 className="mt-4 font-display text-3xl uppercase text-white">{report?.title}</h2>
              <p className="mt-1 text-sm text-white/58">Captured {report?.capture_date} · {image?.country}, {image?.state_or_province} {image?.specific_location_name ? `· ${image.specific_location_name}` : ""}</p>
              <p className="mt-4 font-display uppercase tracking-[.12em] text-[#f0bd66]">{claim.achievement_definitions?.glyph} {claim.achievement_definitions?.name}</p>
              <div className="mt-4 grid gap-3 text-sm text-white/70 md:grid-cols-2"><p><strong>Automatic coverage:</strong> {coverage ? `${coverage.capture_season} ${coverage.capture_year}, month ${coverage.capture_month}` : "No coverage row found"}</p><p><strong>Gear:</strong> {report?.gear}</p></div>
              {report?.story && <p className="mt-4 text-white/72">{report.story}</p>}
              <Link href={report?.guild_image_id ? `/images/${report.guild_image_id}` : "#"} className="mt-4 inline-block font-display uppercase tracking-[.12em] text-[#f0bd66]">Open field report</Link>
            </div>
            <form action={adminAchievementClaimAction} className="space-y-3 rounded border border-white/10 bg-white/[.03] p-4">
              <input type="hidden" name="claim_id" value={claim.id} />
              <label className="block text-sm font-bold text-white/80">Review notes<textarea name="review_notes" defaultValue={claim.review_notes || ""} className="mw-input mt-2 min-h-28" /></label>
              <div className="flex flex-wrap gap-2">{["verified", "rejected", "revoked"].map((action) => <button key={action} name="action" value={action} className="mw-btn-ghost px-3 py-2 text-xs">{action}</button>)}</div>
            </form>
          </div>
        </article>;
      })}
    </div>
  </section>;
}
