import { fetchMembers, type MemberLite } from "@/lib/members";
import { fetchHonorCounts, rankLabelForCount } from "@/lib/ranks";
import { getIotwPeriod } from "@/lib/iotw";

export const FORUM_CATEGORIES = [
  { slug: "gear", label: "Gear", blurb: "Cameras, lenses, trackers, tripods and the bag you carry into the dark." },
  { slug: "techniques", label: "Techniques", blurb: "Focus, exposure, stacking, blending and processing." },
  { slug: "locations", label: "Locations", blurb: "Dark sites, scouting, light pollution and access." },
  { slug: "trips", label: "Trips and Meetups", blurb: "Plan a night out together or share where you are headed." },
  { slug: "critique", label: "Critique", blurb: "Ask for honest feedback on an image before you file it." },
  { slug: "general", label: "General", blurb: "Everything else under the night sky." },
] as const;

export type ForumCategorySlug = (typeof FORUM_CATEGORIES)[number]["slug"];
export const FORUM_PAGE_SIZE = 25;
export const FORUM_BODY_MAX = 8000;
export const FORUM_TITLE_MAX = 120;

export function forumCategory(slug: string | null | undefined) {
  return FORUM_CATEGORIES.find((c) => c.slug === slug) || null;
}

export type ForumTrophies = { first: number; second: number; third: number; phavorite: number };
export type ForumContender = { imageId: string; imageUrl: string | null; title: string };
export type ForumAuthor = MemberLite & { honors: number; rank: string; trophies: ForumTrophies; contender: ForumContender | null };

const DECIDED = ["voting_closed", "finalized"];

/** Image of the Week placements per member, counted from decided ballots only. Photog Phavorite counts wherever Aaron picked one. */
export async function fetchTrophies(supabase: any, userIds: string[]) {
  const out = new Map<string, ForumTrophies>();
  userIds.forEach((id) => out.set(id, { first: 0, second: 0, third: 0, phavorite: 0 }));
  if (!userIds.length) return out;
  const { data: ballots } = await supabase
    .from("iotw_ballots")
    .select("status,winner_field_report_id,second_place_field_report_id,third_place_field_report_id,photog_phavorite_field_report_id");
  const picks: { reportId: string; key: keyof ForumTrophies }[] = [];
  for (const b of ballots || []) {
    const decided = DECIDED.includes(b.status) && b.winner_field_report_id;
    if (decided) {
      if (b.winner_field_report_id) picks.push({ reportId: b.winner_field_report_id, key: "first" });
      if (b.second_place_field_report_id) picks.push({ reportId: b.second_place_field_report_id, key: "second" });
      if (b.third_place_field_report_id) picks.push({ reportId: b.third_place_field_report_id, key: "third" });
    }
    if (b.photog_phavorite_field_report_id) picks.push({ reportId: b.photog_phavorite_field_report_id, key: "phavorite" });
  }
  const reportIds = [...new Set(picks.map((p) => p.reportId))];
  if (!reportIds.length) return out;
  const { data: reports } = await supabase.from("field_reports").select("id,user_id").in("id", reportIds).in("user_id", userIds);
  const owner = new Map<string, string>((reports || []).map((r: any) => [r.id, r.user_id]));
  for (const p of picks) {
    const uid = owner.get(p.reportId);
    if (uid && out.has(uid)) out.get(uid)![p.key] += 1;
  }
  return out;
}

/** Each author's entry in the Image of the Week ballot that is open for voting right now, if any. */
export async function fetchCurrentContenders(supabase: any, userIds: string[]) {
  const out = new Map<string, ForumContender>();
  if (!userIds.length) return out;
  const period = getIotwPeriod();
  const { data: ballot } = await supabase.from("iotw_ballots").select("id").eq("period_start", period.period_start).eq("status", "voting_open").maybeSingle();
  if (!ballot) return out;
  const { data: rows } = await supabase
    .from("iotw_ballot_entries")
    .select("user_id,submitted_at,field_reports(title,guild_image_id,guild_images(id,image_url,title,hidden_at,deleted_at))")
    .eq("ballot_id", ballot.id)
    .in("user_id", userIds)
    .order("submitted_at", { ascending: false });
  for (const r of rows || []) {
    const report = Array.isArray(r.field_reports) ? r.field_reports[0] : r.field_reports;
    const image = Array.isArray(report?.guild_images) ? report.guild_images[0] : report?.guild_images;
    if (!image || image.hidden_at || image.deleted_at || out.has(r.user_id)) continue;
    out.set(r.user_id, { imageId: image.id, imageUrl: image.image_url || null, title: report?.title || image.title || "Untitled" });
  }
  return out;
}

export async function fetchForumAuthors(supabase: any, ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  const [members, honors, trophies, contenders] = await Promise.all([
    fetchMembers(supabase, unique),
    fetchHonorCounts(supabase, unique).catch(() => new Map<string, number>()),
    fetchTrophies(supabase, unique).catch(() => new Map<string, ForumTrophies>()),
    fetchCurrentContenders(supabase, unique).catch(() => new Map<string, ForumContender>()),
  ]);
  const out = new Map<string, ForumAuthor>();
  for (const id of unique) {
    const m = members.get(id)!;
    const count = honors.get(id) || 0;
    out.set(id, { ...m, honors: count, rank: rankLabelForCount(count), trophies: trophies.get(id) || { first: 0, second: 0, third: 0, phavorite: 0 }, contender: contenders.get(id) || null });
  }
  return out;
}

/** Short relative time for lists, Mountain dates after a week. */
export function forumAgo(value: string, now = Date.now()) {
  const diff = now - new Date(value).getTime();
  const minute = 60_000, hour = 60 * minute, day = 24 * hour;
  if (diff < minute) return "just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Denver" }).replace(/ (\d)/, "\u00A0$1");
}

/** Full Mountain timestamp for a post header. */
export function forumStamp(value: string) {
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Denver", timeZoneName: "short" }).replace(/^(\w{3}) (\d+)/, "$1\u00A0$2");
}

export type BodyPiece = { type: "text"; value: string } | { type: "link"; value: string; href: string } | { type: "br" };

const URL_RE = /\bhttps?:\/\/[^\s<>"']+/gi;

/** Plain text to paragraphs of text, links and line breaks. Never HTML, so nothing a member types can run. */
export function parseForumBody(body: string): BodyPiece[][] {
  const paragraphs = String(body || "").replace(/\r\n?/g, "\n").split(/\n{2,}/).map((p) => p.replace(/^\n+|\n+$/g, "")).filter((p) => p.trim());
  return paragraphs.map((para) => {
    const pieces: BodyPiece[] = [];
    para.split("\n").forEach((line, i) => {
      if (i > 0) pieces.push({ type: "br" });
      let last = 0;
      for (const match of line.matchAll(URL_RE)) {
        let url = match[0];
        const trail = url.match(/[.,;:!?)\]]+$/);
        if (trail) url = url.slice(0, -trail[0].length);
        const start = match.index ?? 0;
        if (start > last) pieces.push({ type: "text", value: line.slice(last, start) });
        pieces.push({ type: "link", value: url, href: url });
        last = start + url.length;
      }
      if (last < line.length) pieces.push({ type: "text", value: line.slice(last) });
    });
    return pieces;
  });
}

export function forumExcerpt(body: string, max = 320) {
  const clean = String(body || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export function forumPageCount(total: number) {
  return Math.max(1, Math.ceil(total / FORUM_PAGE_SIZE));
}

export function forumPageForIndex(index: number) {
  return Math.floor(Math.max(0, index) / FORUM_PAGE_SIZE) + 1;
}

export function forumPostHref(threadId: string, postId: string, index: number) {
  const page = forumPageForIndex(index);
  return `/forum/t/${threadId}${page > 1 ? `?page=${page}` : ""}#post-${postId}`;
}

export function forumErrorMessage(error: any) {
  const msg = String(error?.message || "");
  if (/[a-z]/i.test(msg) && msg.length < 160 && !/violates|relation|column|function|syntax|permission denied/i.test(msg)) return msg;
  return "Something went wrong. Please try again.";
}
