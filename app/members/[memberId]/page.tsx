import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAccess } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { EARNED_ACHIEVEMENT_STATUSES, getMemberStats } from "@/lib/member-stats";
import { fullPhotographerRank, formatStreakBadge } from "@/lib/display";
import { getAvatarDisplay } from "@/lib/avatar";
import { ImageGrid } from "@/components/images/ImageGrid";
import { HonorBadge } from "@/components/HonorBadge";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fmt = (v?: string | null) => (v ? new Date(v).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Denver" }) : "");
const AWARD_LABELS: Record<string, string> = { winner_field_report_id: "Image of the Week", second_place_field_report_id: "Image of the Week, second place", third_place_field_report_id: "Image of the Week, third place", photog_phavorite_field_report_id: "Photog Phavorite" };

export default async function Page({ params }: { params: Promise<{ memberId: string }> }) {
  const { user } = await requireAccess();
  const { memberId } = await params;
  if (!UUID.test(memberId)) notFound();
  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase.from("member_profiles").select("id,display_name,full_name,avatar_url,avatar_path,country,state_or_province,region,created_at").eq("id", memberId).maybeSingle();
  if (!profile) notFound();

  const [stats, { data: earned }, { data: images }, { data: reports }] = await Promise.all([
    getMemberStats(supabase, { id: memberId, user_metadata: { full_name: profile.full_name, name: profile.display_name } }),
    supabase.from("user_achievements").select("achievement_id,status,earned_at,achievement_definitions(id,name,glyph,description,category,sort_order)").eq("user_id", memberId).in("status", EARNED_ACHIEVEMENT_STATUSES).order("earned_at", { ascending: false }),
    supabase.from("guild_images").select("*, profiles:member_profiles(display_name,full_name,avatar_url,avatar_path)").eq("user_id", memberId).is("hidden_at", null).is("deleted_at", null).not("moderation_status", "in", '("hidden","deleted")').order("created_at", { ascending: false }).limit(48),
    supabase.from("field_reports").select("id,guild_image_id,title").eq("user_id", memberId),
  ]);
  const reportIds = (reports || []).map((r: any) => r.id);
  const imageIds = (images || []).map((i: any) => i.id);
  const [{ data: ballots }, { data: reactions }] = await Promise.all([
    reportIds.length
      ? supabase.from("iotw_ballots").select("id,period_start,period_end,status,winner_field_report_id,second_place_field_report_id,third_place_field_report_id,photog_phavorite_field_report_id").eq("status", "finalized").or(Object.keys(AWARD_LABELS).map((k) => `${k}.in.(${reportIds.join(",")})`).join(","))
      : Promise.resolve({ data: [] as any[] }),
    imageIds.length ? supabase.from("image_reactions").select("image_id,reaction_type").in("image_id", imageIds) : Promise.resolve({ data: [] as any[] }),
  ]);

  const honors = new Map<string, any>();
  (earned || []).forEach((row: any) => {
    const def = Array.isArray(row.achievement_definitions) ? row.achievement_definitions[0] : row.achievement_definitions;
    if (def && !honors.has(row.achievement_id)) honors.set(row.achievement_id, { id: row.achievement_id, name: def.name, glyph: def.glyph, description: def.description, earned_at: row.earned_at, status: row.status });
  });
  const reportById = new Map((reports || []).map((r: any) => [r.id, r]));
  const awards = (ballots || []).flatMap((b: any) => Object.entries(AWARD_LABELS).filter(([k]) => b[k] && reportById.has(b[k])).map(([k, label]) => ({ key: `${b.id}-${k}`, label, week: b.period_start, report: reportById.get(b[k]) as any })));

  const avatar = getAvatarDisplay({ avatarPath: profile.avatar_path, avatarUrl: profile.avatar_url, displayName: stats.display_name });
  const place = [profile.state_or_province || profile.region, profile.country].filter(Boolean).join(", ");
  const isMe = user.id === memberId;
  const honorList = [...honors.values()];

  return (
    <section className="mw-page-wide">
      <div className="mw-prototype-eyebrow mb-4"><Image src="/launch/mwpg/MWPG_Logo_FAVICON.png" alt="" width={20} height={20} /><span>Guild Member</span></div>
      <div className="mw-member-hero">
        <span className="mw-member-profile-avatar">{avatar.avatarUrl ? <img src={avatar.avatarUrl} alt="" /> : avatar.initials}</span>
        <div className="min-w-0">
          <h1 className="mw-prototype-title">{stats.display_name}</h1>
          <p className="mt-1 text-lg font-semibold text-[#f0bd66]">{fullPhotographerRank(stats.rank_short)}</p>
          <p className="mt-1 text-sm text-white/60">{[place, profile.created_at ? `Member since ${new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}` : ""].filter(Boolean).join(" · ")}</p>
          {stats.year_streak > 0 && <p className="mt-3"><span className="mw-streak-pill">{formatStreakBadge(`${stats.year_streak} Year Streak`)}</span></p>}
          {isMe && <Link href="/profile" className="mt-4 inline-block text-sm text-[#f0bd66] hover:underline">Edit your profile →</Link>}
        </div>
      </div>

      <div className="mw-member-stats">
        <div className="mw-card-soft p-4"><p className="mw-section-label">Field Reports</p><p className="mw-member-stat">{images?.length || 0}</p></div>
        <div className="mw-card-soft p-4"><p className="mw-section-label">Field Honors</p><p className="mw-member-stat">{stats.earned_honor_count}</p></div>
        <div className="mw-card-soft p-4"><p className="mw-section-label">Year Streak</p><p className="mw-member-stat">{stats.year_streak}</p></div>
        <div className="mw-card-soft p-4"><p className="mw-section-label">Awards</p><p className="mw-member-stat">{awards.length}</p></div>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <section className="mw-card-gold rounded-lg p-5">
          <p className="mw-eyebrow">Badges and Achievements</p>
          {honorList.length ? (
            <ul className="mt-4 space-y-3">
              {honorList.map((h) => (
                <li key={h.id} className="flex items-center gap-3">
                  <HonorBadge honor={h} size="sm" />
                  <div className="min-w-0"><p className="font-bold text-white">{h.name}</p><p className="text-sm text-white/60">{h.earned_at ? `Earned ${fmt(h.earned_at)}` : "Earned"}{h.status === "auto_awarded_pending_review" ? " · pending Guild review" : ""}</p></div>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm text-white/60">{isMe ? "Your first Field Honor is one field report away." : "No Field Honors yet. Every climb starts somewhere."}</p>}
        </section>
        <section className="mw-card-soft p-5">
          <p className="mw-section-label">Awards</p>
          {awards.length ? (
            <ul className="mt-4 space-y-3">
              {awards.map((a) => (
                <li key={a.key} className="flex items-start gap-3"><span className="text-xl text-[#f0bd66]" aria-hidden="true">✪</span><div><p className="font-bold text-white">{a.label}</p><p className="text-sm text-white/60">{a.report?.guild_image_id ? <Link href={`/images/${a.report.guild_image_id}`} className="hover:underline">{a.report.title || "Field report"}</Link> : a.report?.title} · week of {fmt(a.week)}</p></div></li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm text-white/60">No Image of the Week awards yet.</p>}
        </section>
      </div>

      <section className="mt-10">
        <h2 className="mw-recent-activity-label mb-5">Field Reports</h2>
        {images?.length ? <ImageGrid images={images} reactions={reactions || []} /> : <div className="mw-card-soft p-8 text-center text-white/60">No field reports shared yet.</div>}
      </section>
    </section>
  );
}
