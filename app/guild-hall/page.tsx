import Image from "next/image";
import Link from "next/link";
import { AccessNeededPanel } from "@/components/Cards";
import { requireLogin } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { REACTION_TYPES } from "@/lib/images";
import { formatStreakBadge, fullPhotographerRank } from "@/lib/display";
import { EARNED_ACHIEVEMENT_STATUSES } from "@/lib/member-stats";
import { getAvatarDisplay } from "@/lib/avatar";

const faviconUrl =
  "https://lzeljgbudkqpbmbbbsex.supabase.co/storage/v1/object/public/site-assets/logos/MWPG_Logo_FAVICON.png";

const ranks = [
  { label: "Unranked", count: 0, position: 6, range: "No Field Honors yet" },
  { label: "Beginner", count: 1, position: 24, range: "1–7 Field Honors" },
  { label: "Amateur", count: 8, position: 42, range: "8–17 Field Honors" },
  { label: "Novice", count: 18, position: 60, range: "18–24 Field Honors" },
  { label: "Veteran", count: 25, position: 78, range: "25–32 Field Honors" },
  { label: "Master", count: 33, position: 95, range: "33+ Field Honors" },
];
const sortChips = ["Most Recent", "Most Reactions", "IOTW Contenders", "Best Stories"];
const reactionIcons: Record<string, string> = { love: "♥", wow: "✺", envy: "◆", like: "•", beautiful_sky: "★", great_foreground: "▲", strong_composition: "◇", inspiring_adventure: "✦" };
const reactionGroups = [
  { title: "Quick Reactions", types: ["love", "wow", "envy", "like"] },
  { title: "Praise the Craft", types: ["beautiful_sky", "great_foreground", "strong_composition", "inspiring_adventure"] },
];
const reactionLabels = new Map(REACTION_TYPES.map(([type, label]) => [type, label]));

function reactionCounts(reactions: any[], imageId: string) {
  const counts = new Map<string, number>();
  reactions.filter((r) => r.image_id === imageId).forEach((r) => counts.set(r.reaction_type, (counts.get(r.reaction_type) || 0) + 1));
  return counts;
}

function postTime(value: string) {
  const created = new Date(value);
  const diff = Date.now() - created.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff >= 0 && diff < 7 * day) {
    const hours = Math.max(1, Math.floor(diff / (60 * 60 * 1000)));
    if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    const days = Math.floor(diff / day);
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  }
  return created.toLocaleDateString();
}

function authorName(image: any, index: number) {
  return image?.profiles?.display_name || image?.profiles?.full_name || image?.display_name || "Guild photographer";
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "GM";
}

function achievementCount(image: any, counts: Map<string, number>) {
  return counts.get(image.user_id) || 0;
}


function rankPosition(count: number) {
  if (count <= 0) return 12;
  if (count >= 33) return Math.min(98, 95 + Math.min(count - 33, 3));
  return 24 + ((count - 1) / 32) * (95 - 24);
}

function rankLabelForCount(count: number) {
  if (count >= 33) return "Master";
  if (count >= 25) return "Veteran";
  if (count >= 18) return "Novice";
  if (count >= 8) return "Amateur";
  if (count >= 1) return "Beginner";
  return "Unranked";
}

export default async function Page() {
  const { hasAccess } = await requireLogin();
  const supabase = await createServerSupabaseClient();
  let images: any[] = [];
  let reactions: any[] = [];

  if (hasAccess) {
    const [{ data: imgs }, { data: rx }] = await Promise.all([
      supabase.from("guild_images").select("*, profiles(display_name,full_name,email,avatar_url,avatar_path)").is("hidden_at", null).is("deleted_at", null).not("moderation_status", "in", '("hidden","deleted")').order("created_at", { ascending: false }).limit(12),
      supabase.from("image_reactions").select("image_id,reaction_type"),
    ]);
    images = imgs || [];
    reactions = rx || [];
  }
  const userIds = [...new Set(images.map((image) => image.user_id).filter(Boolean))];
  const achievementCounts = new Map<string, number>();
  if (userIds.length) {
    const { data: earnedRows } = await supabase.from("user_achievements").select("user_id,achievement_id,status").in("user_id", userIds).in("status", EARNED_ACHIEVEMENT_STATUSES);
    const earnedByUser = new Map<string, Set<string>>();
    (earnedRows || []).forEach((row: any) => {
      if (!earnedByUser.has(row.user_id)) earnedByUser.set(row.user_id, new Set());
      earnedByUser.get(row.user_id)?.add(row.achievement_id);
    });
    earnedByUser.forEach((ids, userId) => achievementCounts.set(userId, ids.size));
  }

  return (
    <section className="mw-page-wide">
      {hasAccess ? (
        <>
          <div className="mb-8">
            <p className="mw-guild-eyebrow"><Image src={faviconUrl} alt="" width={18} height={18} />The Guild Hall</p>
            <h1 className="mw-guild-page-title">The Hall is Open</h1>
            <p className="mw-guild-page-subtitle">Field reports from across the Guild. React with intent, leave feedback that teaches.</p>
          </div>

          <section className="mw-ascent-board mb-10">
            <div className="mw-ascent-heading"><p className="mw-ascent-label">The Ascent</p><p className="mw-ascent-helper">Every guildie's climb toward Master, hover a face to see their username &amp; progress.</p></div>
            <div className="mw-rank-map">
              <div className="mw-rank-line" />
              {ranks.map((rank) => (
                <div key={rank.label} className="mw-rank-marker" style={{ left: `${rank.position}%` }}>
                  <span className={`mw-rank-dot ${rank.count === 0 ? "mw-rank-dot-unranked" : ""}`} />
                  <span className={`mw-rank-label ${rank.count === 0 ? "mw-rank-label-unranked" : ""}`}>{rank.label}</span>
                  <span className="mw-rank-tooltip">{rank.range}</span>
                </div>
              ))}
              {images.slice(0, 10).map((image, index) => {
                const name = authorName(image, index);
                const avatar = getAvatarDisplay({ avatarPath: image.profiles?.avatar_path, avatarUrl: image.profiles?.avatar_url, displayName: name, email: image.profiles?.email });
                const count = achievementCount(image, achievementCounts);
                const rank = rankLabelForCount(count);
                const top = 34 + (index % 3) * 6;
                return (
                  <div key={image.id} className={`mw-rank-avatar ${count === 0 ? "mw-rank-avatar-unranked" : ""}`} style={{ left: `${rankPosition(count)}%`, top: `${top}px` }}>
                    {avatar.avatarUrl ? <img src={avatar.avatarUrl} alt="" /> : <span className="mw-rank-avatar-initials">{avatar.initials}</span>}
                    <span className="mw-rank-avatar-tooltip">{name} • {rank} • {count}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h2 className="mw-recent-activity-label">Recent Activity</h2>
            <div className="flex flex-wrap items-center gap-2"><span className="mw-sort-label">Sort</span>{sortChips.map((chip, i) => <button key={chip} className={`mw-sort-chip ${i === 0 ? "mw-sort-chip-selected" : ""}`}>{chip}</button>)}</div>
          </div>

          <div className="mx-auto max-w-[1120px] space-y-8">
            {images.map((image, index) => {
              const name = authorName(image, index);
              const avatar = getAvatarDisplay({ avatarPath: image.profiles?.avatar_path, avatarUrl: image.profiles?.avatar_url, displayName: name, email: image.profiles?.email });
              const counts = reactionCounts(reactions, image.id);
              const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
              const count = achievementCount(image, achievementCounts);
              const rank = rankLabelForCount(count);
              const streak = null;
              return <article key={image.id} className="mw-card-soft overflow-hidden"><div className="flex items-center gap-3 p-5"><div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full border border-[#e79f2b]/65 bg-[#e79f2b]/10 font-display text-[#f0bd66]">{avatar.avatarUrl ? <img src={avatar.avatarUrl} alt="" className="h-full w-full object-cover" /> : <span>{avatar.initials}</span>}</div><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold text-white">{name}</h3>{streak && <span className="mw-streak-pill">{streak}</span>}</div><p className="text-sm font-semibold text-[#f0bd66]">{fullPhotographerRank(rank)}</p><p className="text-sm text-white/55">{postTime(image.created_at)} · {[image.specific_location_name, image.state_or_province, image.country].filter(Boolean).join(", ") || "Dark sky field report"}</p></div></div><Link href={`/images/${image.id}?from=guild-hall`}><img src={image.image_url} alt={image.title || "Guild image"} className="h-auto w-full object-contain" /></Link><div className="space-y-4 p-5"><h3 className="mw-post-title">{image.title}</h3><p className="mw-body mw-four-line-excerpt">{image.short_story || image.what_went_well || "A fresh field report from under the Milky Way, ready for thoughtful reactions and craft feedback."}</p><Link href={`/images/${image.id}?from=guild-hall`} className="font-display text-sm uppercase tracking-[.08em] text-[#f0bd66]">Continue →</Link><div className="space-y-5 rounded-md border border-white/7 bg-[#06101c]/35 p-4">{reactionGroups.map((group) => <div key={group.title}><p className="mb-3 mw-section-label">{group.title}</p><div className="flex flex-wrap gap-2">{group.types.map((type) => <span key={type} className="mw-reaction-chip"><span className="text-[#f0bd66]">{reactionIcons[type]}</span>{reactionLabels.get(type as any) || type}<span className="opacity-70">{counts.get(type) || 0}</span></span>)}</div></div>)}</div><div className="flex items-center justify-between gap-4 border-t border-white/10 pt-4"><span className="text-sm text-white/55">{total} reactions · 0 comments</span><Link href={`/images/${image.id}?from=guild-hall`} className="font-display text-sm uppercase tracking-[.08em] text-[#f0bd66]">Open &amp; Comment →</Link></div></div></article>;
            })}
            {images.length === 0 && <div className="mw-card-soft p-8 text-center text-white/60">The Hall is ready. Community field reports will appear here after members submit images.</div>}
          </div>
        </>
      ) : <div className="mt-8"><AccessNeededPanel /></div>}
    </section>
  );
}
