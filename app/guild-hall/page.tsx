import Image from "next/image";
import Link from "next/link";
import { AccessNeededPanel } from "@/components/Cards";
import { requireLogin } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatStreakBadge, fullPhotographerRank } from "@/lib/display";
import { EARNED_ACHIEVEMENT_STATUSES } from "@/lib/member-stats";
import { getAvatarDisplay, MEMBER_NAME_FALLBACK, publicMemberName } from "@/lib/avatar";
import { ReactionBar } from "@/components/images/ReactionBar";
import { fetchMembers } from "@/lib/members";
import { RANKS, fetchHonorCounts, rankLabelForCount } from "@/lib/ranks";

const faviconUrl =
  "https://lzeljgbudkqpbmbbbsex.supabase.co/storage/v1/object/public/site-assets/logos/MWPG_Logo_FAVICON.png";

const sortChips = ["Most Recent", "Most Reactions", "IOTW Contenders", "Best Stories"];

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
  return publicMemberName(image?.profiles?.display_name, image?.profiles?.full_name, image?.display_name);
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "GM";
}

function achievementCount(image: any, counts: Map<string, number>) {
  return counts.get(image.user_id) || 0;
}


export default async function Page() {
  const { hasAccess, user } = await requireLogin();
  const supabase = await createServerSupabaseClient();
  let images: any[] = [];
  let reactions: any[] = [];
  const commentCounts = new Map<string, number>();

  if (hasAccess) {
    const [{ data: imgs }, { data: rx }] = await Promise.all([
      supabase.from("guild_images").select("*, profiles:member_profiles(display_name,full_name,avatar_url,avatar_path)").is("hidden_at", null).is("deleted_at", null).not("moderation_status", "in", '("hidden","deleted")').order("created_at", { ascending: false }).limit(12),
      supabase.from("image_reactions").select("image_id,user_id,reaction_type"),
    ]);
    images = imgs || [];
    reactions = rx || [];
    if (images.length) {
      const { data: cm } = await supabase.from("image_comments").select("image_id").in("image_id", images.map((i) => i.id)).is("deleted_at", null);
      (cm || []).forEach((c: any) => commentCounts.set(c.image_id, (commentCounts.get(c.image_id) || 0) + 1));
    }
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

  const ascent = new Map<string, { id: string; name: string; avatarUrl: string | null; initials: string; count: number }[]>();
  if (hasAccess) {
    const [{ data: posters }, allCounts] = await Promise.all([
      supabase.from("guild_images").select("user_id").is("deleted_at", null).is("hidden_at", null).limit(2000),
      fetchHonorCounts(supabase),
    ]);
    const climberIds = [...new Set([...(posters || []).map((row: any) => row.user_id), ...allCounts.keys()].filter(Boolean))] as string[];
    const climbers = await fetchMembers(supabase, climberIds);
    climberIds
      .map((id) => ({ ...(climbers.get(id) || { id, name: MEMBER_NAME_FALLBACK, avatarUrl: null, initials: "GM" }), count: allCounts.get(id) || 0 }))
      .sort((x, y) => Number(Boolean(y.avatarUrl)) - Number(Boolean(x.avatarUrl)) || y.count - x.count)
      .forEach((member) => {
        const label = rankLabelForCount(member.count);
        if (!ascent.has(label)) ascent.set(label, []);
        ascent.get(label)!.push(member);
      });
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
            <div className="mw-ascent-heading"><p className="mw-ascent-label">The Ascent</p><p className="mw-ascent-helper">Every guildie&apos;s climb toward Master. Tap a face to visit their profile.</p></div>
            <ol className="mw-ascent-track">
              {RANKS.map((rank) => {
                const climbers = ascent.get(rank.label) || [];
                const shown = climbers.slice(0, 6);
                return (
                  <li key={rank.label} className={`mw-ascent-step ${climbers.length ? "" : "is-empty"}`}>
                    <div className="mw-ascent-node"><span className="mw-ascent-dot" /><span className="mw-ascent-rank">{rank.label}</span><span className="mw-ascent-range">{rank.range}</span></div>
                    <div className="mw-ascent-faces">
                      {shown.map((member) => (
                        <Link key={member.id} href={`/members/${member.id}`} className="mw-ascent-face" title={`${member.name}, ${member.count} ${member.count === 1 ? "honor" : "honors"}`} aria-label={`${member.name}, ${rank.label}, ${member.count} honors`}>
                          {member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : <span>{member.initials}</span>}
                        </Link>
                      ))}
                      {climbers.length > shown.length && <span className="mw-ascent-more">+{climbers.length - shown.length}</span>}
                      {!climbers.length && <span className="mw-ascent-open">Open</span>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h2 className="mw-recent-activity-label">Recent Activity</h2>
            <div className="flex flex-wrap items-center gap-2"><span className="mw-sort-label">Sort</span>{sortChips.map((chip, i) => <button key={chip} className={`mw-sort-chip ${i === 0 ? "mw-sort-chip-selected" : ""}`}>{chip}</button>)}</div>
          </div>

          <div className="max-w-[1120px] space-y-8">
            {images.map((image, index) => {
              const name = authorName(image, index);
              const avatar = getAvatarDisplay({ avatarPath: image.profiles?.avatar_path, avatarUrl: image.profiles?.avatar_url, displayName: name });
              const total = reactions.filter((r) => r.image_id === image.id).length;
              const count = achievementCount(image, achievementCounts);
              const rank = rankLabelForCount(count);
              const streak = null;
              return <article key={image.id} className="mw-card-soft overflow-hidden"><div className="flex items-center gap-3 p-5"><Link href={`/members/${image.user_id}`} aria-label={`View ${name}'s profile`} className="grid h-12 w-12 place-items-center overflow-hidden rounded-full border border-[#e79f2b]/65 bg-[#e79f2b]/10 font-display text-[#f0bd66]">{avatar.avatarUrl ? <img src={avatar.avatarUrl} alt="" className="h-full w-full object-cover" /> : <span>{avatar.initials}</span>}</Link><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold text-white"><Link href={`/members/${image.user_id}`} className="mw-member-link">{name}</Link></h3>{streak && <span className="mw-streak-pill">{streak}</span>}</div><p className="text-sm font-semibold text-[#f0bd66]">{fullPhotographerRank(rank)}</p><p className="text-sm text-white/55">{postTime(image.created_at)} · {[image.specific_location_name, image.state_or_province, image.country].filter(Boolean).join(", ") || "Dark sky field report"}</p></div></div><Link href={`/images/${image.id}?from=guild-hall`}><img src={image.image_url} alt={image.title || "Guild image"} className="h-auto w-full object-contain" /></Link><div className="space-y-4 p-5"><h3 className="mw-post-title">{image.title}</h3><p className="mw-body mw-four-line-excerpt">{image.short_story || image.what_went_well || "A fresh field report from under the Milky Way, ready for thoughtful reactions and craft feedback."}</p><Link href={`/images/${image.id}?from=guild-hall`} className="font-display text-sm uppercase tracking-[.08em] text-[#f0bd66]">Continue →</Link><div className="rounded-md border border-white/7 bg-[#06101c]/35 p-4"><ReactionBar imageId={image.id} reactions={reactions.filter((r) => r.image_id === image.id)} currentUserId={user?.id} compact /></div><div className="flex items-center justify-between gap-4 border-t border-white/10 pt-4"><span className="text-sm text-white/55">{total} {total === 1 ? "reaction" : "reactions"} · {commentCounts.get(image.id) || 0} {(commentCounts.get(image.id) || 0) === 1 ? "comment" : "comments"}</span><Link href={`/images/${image.id}?from=guild-hall#feedback`} className="font-display text-sm uppercase tracking-[.08em] text-[#f0bd66]">Open &amp; Comment →</Link></div></div></article>;
            })}
            {images.length === 0 && <div className="mw-card-soft p-8 text-center text-white/60">The Hall is ready. Community field reports will appear here after members submit images.</div>}
          </div>
        </>
      ) : <div className="mt-8"><AccessNeededPanel /></div>}
    </section>
  );
}
