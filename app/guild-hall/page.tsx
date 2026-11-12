import Image from "next/image";
import Link from "next/link";
import { AccessNeededPanel } from "@/components/Cards";
import { requireLogin } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fullPhotographerRank } from "@/lib/display";
import { StreakPill } from "@/components/StreakPill";
import { AscentBoard } from "@/components/hall/AscentBoard";
import { type CloudHonor } from "@/components/hall/AscentFace";
import { compareAscentClimbers } from "@/lib/ascent-order";
import { fetchStreaks, type MilkyWayStreak } from "@/lib/streak";
import { EARNED_ACHIEVEMENT_STATUSES } from "@/lib/member-stats";
import { getAvatarDisplay, MEMBER_NAME_FALLBACK, publicMemberName } from "@/lib/avatar";
import { ReactionBar } from "@/components/images/ReactionBar";
import { fetchMembers, type MemberLite } from "@/lib/members";
import { fetchHonorCounts, rankLabelForCount } from "@/lib/ranks";
import { MessageFromAaron } from "@/components/hall/MessageFromAaron";
import { isGuildMessageAcknowledged } from "@/lib/guild-message";
import { formatMountainShort, getIotwSchedule, imageOfTheWeekName, type IotwScheduleWeek } from "@/lib/iotw";
import { badgeTone, fetchAllEnteredImageIds, fetchBallotImageIds, fetchIotwBadges, type IotwBadge } from "@/lib/iotw-badges";

const faviconUrl =
  "https://lzeljgbudkqpbmbbbsex.supabase.co/storage/v1/object/public/site-assets/logos/MWPG_Logo_FAVICON.png";

const SORTS = [
  { key: "recent", label: "Most Recent" },
  { key: "reactions", label: "Most Reactions" },
  { key: "contenders", label: "Image of the Week ballot" },
  { key: "entries", label: "Image of the Week entries" },
  { key: "stories", label: "Best Stories" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];
const FEED_SIZE = 12;
const POOL_SIZE = 80;
const IMAGE_SELECT = "*, profiles:member_profiles(display_name,full_name,avatar_url,avatar_path)";

function storyWeight(image: any) {
  return [image.short_story, image.what_went_well, image.what_could_have_gone_better].map((t) => String(t || "").trim().length).reduce((a, b) => a + b, 0);
}

function snippet(text: string, max = 110) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

function shortAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minute = 60 * 1000, hour = 60 * minute, day = 24 * hour;
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}m`;
  if (diff < day) return `${Math.floor(diff / hour)}h`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d`;
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Denver" });
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
  return publicMemberName(image?.profiles?.display_name, image?.profiles?.full_name, image?.display_name);
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "GM";
}

function achievementCount(image: any, counts: Map<string, number>) {
  return counts.get(image.user_id) || 0;
}


export default async function Page({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const { hasAccess, user, isAdmin } = await requireLogin();
  const { sort: sortParam } = await searchParams;
  const sort: SortKey = (SORTS.find((s) => s.key === sortParam)?.key || "recent") as SortKey;
  const supabase = await createServerSupabaseClient();
  const iotwSchedule: { entry: IotwScheduleWeek; voting: IotwScheduleWeek | null } | null = sort === "contenders" ? await getIotwSchedule(supabase).catch(() => null) : null;
  const iotwEntry = iotwSchedule?.entry || null;
  const iotwVoting = iotwSchedule?.voting || null;
  let badges = new Map<string, IotwBadge>();
  let images: any[] = [];
  let reactions: any[] = [];
  let reactors: Record<string, MemberLite> = {};
  const commentCounts = new Map<string, number>();
  let message: { id: string; body: string; created_at: string; updated_at: string } | null = null;
  let messageRead = false;
  let recentComments: any[] = [];
  let forumThreads: any[] = [];
  const commenters = new Map<string, { name: string; streak?: number }>();

  if (hasAccess) {
    const visible = () => supabase.from("guild_images").select(IMAGE_SELECT).is("hidden_at", null).is("deleted_at", null).not("moderation_status", "in", '("hidden","deleted")');
    // IOTW Contenders: only the week being voted on right now. IOTW Entries: everything ever entered, newest entry first.
    const entered = sort === "contenders" ? (iotwVoting?.id ? await fetchBallotImageIds(supabase, iotwVoting.id) : []) : sort === "entries" ? await fetchAllEnteredImageIds(supabase) : null;
    if (sort === "entries") {
      // Images flagged as contenders before weekly ballots existed still count as entries.
      const { data: legacy } = await supabase.from("guild_images").select("id,created_at").eq("is_weekly_candidate", true).is("deleted_at", null);
      (legacy || []).forEach((l: any) => { if (!entered!.some((e) => e.imageId === l.id)) entered!.push({ imageId: l.id, submittedAt: l.created_at }); });
      entered!.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
    }
    const enteredOrder = new Map((entered || []).map((e, i) => [e.imageId, i]));
    const poolQuery = entered
      ? (entered.length ? visible().in("id", entered.slice(0, FEED_SIZE).map((e) => e.imageId)).limit(FEED_SIZE) : Promise.resolve({ data: [] as any[] }))
      : visible().order("created_at", { ascending: false }).limit(sort === "recent" ? FEED_SIZE : POOL_SIZE);
    const [{ data: pool }, { data: msg }, { data: cmts }] = await Promise.all([
      poolQuery,
      supabase.from("guild_messages").select("id,body,created_at,updated_at").is("archived_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("image_comments").select("id,body,created_at,user_id,image_id,section,guild_images!inner(id,title,image_url,hidden_at,deleted_at,moderation_status,moderation_blur_required)").is("deleted_at", null).is("guild_images.hidden_at", null).is("guild_images.deleted_at", null).order("created_at", { ascending: false }).limit(18),
    ]);
    const poolImages = (pool || []) as any[];
    if (entered) poolImages.sort((a: any, b: any) => (enteredOrder.get(a.id) ?? 0) - (enteredOrder.get(b.id) ?? 0));
    const poolIds = poolImages.map((i: any) => i.id);
    if (poolIds.length) {
      const [{ data: rx }, { data: cm }] = await Promise.all([
        supabase.from("image_reactions").select("image_id,user_id,reaction_type,created_at").in("image_id", poolIds).order("created_at", { ascending: true }),
        supabase.from("image_comments").select("image_id").in("image_id", poolIds).is("deleted_at", null),
      ]);
      reactions = rx || [];
      (cm || []).forEach((c: any) => commentCounts.set(c.image_id, (commentCounts.get(c.image_id) || 0) + 1));
    }
    const reactionTotals = new Map<string, number>();
    reactions.forEach((r) => reactionTotals.set(r.image_id, (reactionTotals.get(r.image_id) || 0) + 1));
    const byRecent = (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sort === "reactions") poolImages.sort((a: any, b: any) => (reactionTotals.get(b.id) || 0) - (reactionTotals.get(a.id) || 0) || byRecent(a, b));
    if (sort === "stories") poolImages.sort((a: any, b: any) => storyWeight(b) - storyWeight(a) || byRecent(a, b));
    images = poolImages.slice(0, FEED_SIZE);
    const shownIds = new Set(images.map((i: any) => i.id));
    reactors = Object.fromEntries(await fetchMembers(supabase, [...reactions.filter((r) => shownIds.has(r.image_id)).map((r) => r.user_id), user?.id || ""]));
    badges = await fetchIotwBadges(supabase, images.map((i: any) => i.id), images.filter((i: any) => i.is_weekly_candidate).map((i: any) => i.id)).catch(() => new Map());

    message = msg || null;
    if (message && user) {
      const { data: mark } = await supabase.from("guild_message_reads").select("message_id,message_updated_at").eq("message_id", message.id).eq("user_id", user.id).maybeSingle();
      messageRead = isGuildMessageAcknowledged(message, mark);
    }
    const { data: forumRows } = await supabase.from("forum_threads").select("id,title,category,reply_count,last_post_at,last_post_user_id,user_id,is_private").is("deleted_at", null).order("last_post_at", { ascending: false }).limit(4);
    forumThreads = forumRows || [];
    recentComments = (cmts || []).filter((c: any) => c.guild_images && !["hidden", "deleted"].includes(c.guild_images.moderation_status));
    const people = await fetchMembers(supabase, [...recentComments.map((c: any) => c.user_id), ...forumThreads.map((t: any) => (t.is_private ? t.user_id : t.last_post_user_id || t.user_id))]);
    people.forEach((m, id) => commenters.set(id, { name: m.name, streak: m.streak }));
  }
  const userIds = [...new Set(images.map((image) => image.user_id).filter(Boolean))];
  const achievementCounts = new Map<string, number>();
  const posterStreaks: Map<string, MilkyWayStreak> = userIds.length ? await fetchStreaks(supabase, userIds as string[]).catch(() => new Map()) : new Map();
  if (userIds.length) {
    const { data: earnedRows } = await supabase.from("user_achievements").select("user_id,achievement_id,status").in("user_id", userIds).in("status", EARNED_ACHIEVEMENT_STATUSES);
    const earnedByUser = new Map<string, Set<string>>();
    (earnedRows || []).forEach((row: any) => {
      if (!earnedByUser.has(row.user_id)) earnedByUser.set(row.user_id, new Set());
      earnedByUser.get(row.user_id)?.add(row.achievement_id);
    });
    earnedByUser.forEach((ids, userId) => achievementCounts.set(userId, ids.size));
  }

  const ascent = new Map<string, { id: string; name: string; avatarUrl: string | null; initials: string; streak?: number; count: number }[]>();
  const cloudHonors = new Map<string, CloudHonor[]>();
  if (hasAccess) {
    const [{ data: posters }, allCounts] = await Promise.all([
      supabase.from("guild_images").select("user_id").is("deleted_at", null).is("hidden_at", null).limit(2000),
      fetchHonorCounts(supabase),
    ]);
    const climberIds = [...new Set([...(posters || []).map((row: any) => row.user_id), ...allCounts.keys()].filter(Boolean))] as string[];
    const [climbers, { data: climberHonors }, { data: honorDefs }] = await Promise.all([
      fetchMembers(supabase, climberIds),
      climberIds.length ? supabase.from("user_achievements").select("user_id,achievement_id,earned_at").in("user_id", climberIds).in("status", EARNED_ACHIEVEMENT_STATUSES).order("earned_at", { ascending: false }) : Promise.resolve({ data: [] as any[] }),
      supabase.from("achievement_definitions").select("id,name,glyph"),
    ]);
    // Earned honors for the hover cloud around each Ascent portrait, newest first. Rank markers are not honors.
    const defById = new Map((honorDefs || []).map((d: any) => [d.id, d]));
    (climberHonors || []).forEach((row: any) => {
      const def: any = defById.get(row.achievement_id);
      if (!def || String(row.achievement_id).startsWith("rank_")) return;
      if (!cloudHonors.has(row.user_id)) cloudHonors.set(row.user_id, []);
      const list = cloudHonors.get(row.user_id)!;
      if (!list.some((h) => h.id === row.achievement_id)) list.push({ id: row.achievement_id, name: def.name, glyph: def.glyph || "✦" });
    });
    climberIds
      .map((id) => ({ ...(climbers.get(id) || { id, name: MEMBER_NAME_FALLBACK, avatarUrl: null, initials: "GM" }), count: allCounts.get(id) || 0 }))
      .toSorted(compareAscentClimbers)
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
            <p className="mw-guild-page-subtitle">Field reports from across the Guild. React with intent, leave feedback that&nbsp;teaches.</p>
          </div>

          <AscentBoard ascent={ascent} cloudHonors={cloudHonors} />

          <div className="mw-hall-layout">
            <div className="mw-hall-feed">
              <h2 className="mw-recent-activity-label mb-5">Recent Activity{sort !== "recent" && <span className="mw-feed-sort-note">{SORTS.find((s) => s.key === sort)?.label}</span>}</h2>
              <div className="space-y-6 mw-sort-list">
                {images.map((image, index) => {
                  const name = authorName(image, index);
                  const avatar = getAvatarDisplay({ avatarPath: image.profiles?.avatar_path, avatarUrl: image.profiles?.avatar_url, displayName: name });
                  const imageReactions = reactions.filter((r) => r.image_id === image.id);
                  const total = imageReactions.length;
                  const comments = commentCounts.get(image.id) || 0;
                  const rank = rankLabelForCount(achievementCount(image, achievementCounts));
                  const href = `/images/${image.id}?from=guild-hall`;
                  const badge = badges.get(image.id);
                  const place = [image.specific_location_name, image.state_or_province, image.country].filter(Boolean).join(", ") || "Dark sky field report";
                  return (
                    <article key={image.id} className="mw-feed-card">
                      <header className="mw-feed-card-head">
                        <Link href={`/members/${image.user_id}`} aria-label={`View ${name}'s profile`} className="mw-feed-avatar">{avatar.avatarUrl ? <img src={avatar.avatarUrl} alt="" /> : <span>{avatar.initials}</span>}</Link>
                        <div className="min-w-0">
                          <h3 className="mw-feed-name"><Link href={`/members/${image.user_id}`} className="mw-member-link">{name}</Link><StreakPill length={posterStreaks.get(image.user_id)?.length} /></h3>
                          <p className="mw-feed-rank">{fullPhotographerRank(rank)}</p>
                          <p className="mw-feed-meta">{postTime(image.created_at)} · {place}</p>
                        </div>
                      </header>
                      <Link href={href} className="mw-feed-media" aria-label={`Open ${image.title || "this field report"}`}>
                        <img src={image.image_url} alt={image.title || "Guild image"} loading={index < 2 ? "eager" : "lazy"} decoding="async" width={Number(image.image_width) || undefined} height={Number(image.image_height) || undefined} className={image.moderation_blur_required ? "blur-2xl" : undefined} />
                        {badge && <span className={`mw-iotw-badge mw-feed-badge ${badgeTone(badge)}`}>{badge.label}</span>}
                      </Link>
                      <div className="mw-feed-body">
                        <h3 className="mw-feed-title"><Link href={href}>{image.title}</Link></h3>
                        {(image.short_story || image.what_went_well) && <p className="mw-feed-excerpt">{image.short_story || image.what_went_well}</p>}
                        <div className="mw-feed-reactions"><ReactionBar imageId={image.id} reactions={imageReactions} currentUserId={user?.id} people={pick(reactors, [...imageReactions.map((r) => r.user_id), user?.id])} compact /></div>
                        <div className="mw-feed-foot">
                          <span>{total} {total === 1 ? "reaction" : "reactions"} · {comments} {comments === 1 ? "comment" : "comments"}</span>
                          <Link href={`${href}#feedback`} className="mw-feed-open">Open &amp; Comment →</Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
                {images.length === 0 && <div className="mw-card-soft p-8 text-center text-white/60">{sort === "contenders" ? (iotwVoting ? `No contenders on the ${imageOfTheWeekName(iotwVoting.label)} ballot.` : iotwEntry ? <>No Image of the Week is open for voting yet. {imageOfTheWeekName(iotwEntry.label)} voting opens {formatMountainShort(iotwEntry.voting_opens_at)}, and its contenders will show here then. <Link href="/guild-hall?sort=entries" className="mw-member-link">See every Image of the Week entry</Link>.</> : "No Image of the Week is open for voting yet.") : sort === "entries" ? "No images have been entered in Image of the Week yet." : "The Hall is ready. Community field reports will appear here after members submit images."}</div>}
              </div>
            </div>

            <aside className="mw-hall-rail" aria-label="Guild Hall side column">
              <nav className="mw-rail-sort" aria-label="Sort the feed">
                <span className="mw-sort-label">Sort</span>
                <div className="mw-rail-sort-chips">{SORTS.map((s) => <Link key={s.key} href={s.key === "recent" ? "/guild-hall" : `/guild-hall?sort=${s.key}`} scroll={false} data-list-sort aria-current={s.key === sort ? "page" : undefined} className={`mw-sort-chip ${s.key === sort ? "mw-sort-chip-selected" : ""}`}>{s.label}</Link>)}</div>
              </nav>
              {message && <MessageFromAaron id={message.id} updatedAt={message.updated_at} body={message.body} postedLabel={new Date(message.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "America/Denver" })} initiallyRead={messageRead} canEdit={isAdmin} />}
              <section className="mw-rail-comments mw-rail-forum" aria-labelledby="forum-latest-heading">
                <h2 id="forum-latest-heading" className="mw-rail-heading"><Link href="/forum" className="mw-rail-heading-link">Latest in the Forum</Link></h2>
                {forumThreads.length ? (
                  <ol className="mw-rail-comment-list">
                    {forumThreads.map((t: any) => {
                      // Private trips name the organizer, never who posted inside.
                      const who = commenters.get(t.is_private ? t.user_id : t.last_post_user_id || t.user_id)?.name || MEMBER_NAME_FALLBACK;
                      return (
                        <li key={t.id}>
                          <Link href={`/forum/t/${t.id}`} className="mw-rail-comment">
                            <span className="mw-rail-comment-text">
                              <span className="mw-rail-comment-body mw-rail-forum-title">{t.is_private ? <span className="mw-rail-forum-private">Private trip · </span> : null}{t.title}</span>
                              <span className="mw-rail-comment-who"><b>{who}</b><time dateTime={t.last_post_at}>{shortAgo(t.last_post_at)}</time><span className="mw-rail-forum-count">{t.reply_count} {t.reply_count === 1 ? "reply" : "replies"}</span></span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                ) : <p className="mw-rail-empty">No discussions yet. <Link href="/forum/new" className="mw-member-link">Start the first&nbsp;one</Link>.</p>}
              </section>
              <section className="mw-rail-comments" aria-labelledby="recent-comments-heading">
                <h2 id="recent-comments-heading" className="mw-rail-heading">Recent Comments</h2>
                {recentComments.length ? (
                  <ol className="mw-rail-comment-list">
                    {recentComments.map((c: any) => {
                      const who = commenters.get(c.user_id)?.name || MEMBER_NAME_FALLBACK;
                      const whoStreak = commenters.get(c.user_id)?.streak || 0;
                      return (
                        <li key={c.id}>
                          <Link href={`/images/${c.image_id}?from=guild-hall#comment-${c.id}`} className="mw-rail-comment" title={`${who} on ${c.guild_images?.title || "a field report"}`}>
                            <span className="mw-rail-comment-text">
                              <span className="mw-rail-comment-who"><b>{who}</b>{whoStreak > 0 && <span className="mw-rail-streak" title={`${whoStreak}-yr Milky Way streak`}>☄ {whoStreak}-yr</span>}<time dateTime={c.created_at}>{shortAgo(c.created_at)}</time></span>
                              {c.section === "went_well" && <span className="mw-rail-comment-tag is-good">On what went well</span>}
                              {c.section === "could_be_better" && <span className="mw-rail-comment-tag is-better">On what could have gone better</span>}
                              <span className="mw-rail-comment-body">{snippet(c.body)}</span>
                            </span>
                            <img src={c.guild_images?.image_url} alt="" loading="lazy" decoding="async" className={`mw-rail-thumb ${c.guild_images?.moderation_blur_required ? "blur-sm" : ""}`} />
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                ) : <p className="mw-rail-empty">No comments yet. Be the first to leave one.</p>}
              </section>
            </aside>
          </div>
        </>
      ) : <div className="mt-8"><AccessNeededPanel /></div>}
    </section>
  );
}

function pick<T>(all: Record<string, T>, ids: (string | null | undefined)[]) {
  const out: Record<string, T> = {};
  ids.forEach((id) => { if (id && all[id]) out[id] = all[id]; });
  return out;
}
