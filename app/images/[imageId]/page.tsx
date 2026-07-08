import { notFound } from "next/navigation";
import { ImageDetail } from "@/components/images/ImageDetail";
import { requireAccess } from "@/lib/guards";
import { getMemberStats } from "@/lib/member-stats";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function Page({ params, searchParams }: { params: Promise<{ imageId: string }>, searchParams: Promise<{ from?: string; achievement?: string }> }) {
  const { user } = await requireAccess();
  const { imageId } = await params;
  const { from, achievement } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const [{ data: image }, { data: reactions }, { data: comments }, { data: claims }, { data: coverage }] = await Promise.all([
    supabase.from("guild_images").select("*, profiles(display_name,avatar_url,avatar_path,full_name,email)").eq("id", imageId).maybeSingle(),
    supabase.from("image_reactions").select("*").eq("image_id", imageId),
    supabase.from("image_comments").select("*").eq("image_id", imageId).is("deleted_at", null).order("created_at", { ascending: true }),
    supabase.from("field_report_achievement_claims").select("achievement_definitions(name,glyph),field_reports!inner(guild_image_id)").eq("user_id", user.id).eq("field_reports.guild_image_id", imageId),
    supabase.from("user_field_coverage").select("capture_year,capture_month,capture_season,field_reports!inner(guild_image_id)").eq("field_reports.guild_image_id", imageId).maybeSingle(),
  ]);
  if (!image || image.deleted_at || image.hidden_at) notFound();
  const claimedHonor = Array.isArray(claims?.[0]?.achievement_definitions) ? claims?.[0]?.achievement_definitions?.[0] : claims?.[0]?.achievement_definitions;
  const authorStats = await getMemberStats(supabase, { id: image.user_id, email: image.profiles?.email, user_metadata: { full_name: image.profiles?.full_name, name: image.profiles?.display_name } });
  return <>
    {achievement === "1" && <div className="fixed inset-0 z-50 grid place-items-center bg-[#020814]/82 p-5"><div className="mw-achievement-reveal max-w-lg rounded-lg border border-[#f0bd66]/60 bg-[#071321] p-6 text-center shadow-2xl"><img src={image.image_url} alt="Submitted field report" className="mx-auto h-44 w-full rounded object-cover" /><p className="mt-5 font-display text-sm uppercase tracking-[.18em] text-[#f0bd66]">Field Report Filed</p><h2 className="mt-2 font-display text-4xl uppercase text-white">Achievement Updated</h2><p className="mt-3 text-white/72">{claimedHonor?.name ? `${claimedHonor.glyph || "✦"} ${claimedHonor.name} earned pending Guild review.` : "No Field Honor was claimed for this image."}</p><p className="mt-2 text-white/62">Automatic coverage updated{coverage ? ` for ${coverage.capture_season} ${coverage.capture_year}, month ${coverage.capture_month}` : " for this capture date"}.</p><p className="mt-2 text-[#f0bd66]">Rank progress has been recalculated from rank-counting honors.</p><a href={`/images/${imageId}`} className="mw-btn-primary mt-5 inline-block rounded-sm">Continue</a></div></div>}
    <ImageDetail image={image} authorStats={authorStats} reactions={reactions || []} comments={comments || []} canEditCandidate={image.user_id === user.id} from={from} />
  </>;
}
