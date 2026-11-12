import { FORUM_CATEGORIES, forumCategory, forumFirstWords } from "@/lib/forum";
import { fetchMembers, type MemberLite } from "@/lib/members";
import { MEMBER_NAME_FALLBACK } from "@/lib/avatar";
import { fetchHonorCounts, rankLabelForCount } from "@/lib/ranks";

export const FORUM_THREAD_COLUMNS = "id,title,category,user_id,created_at,last_post_at,last_post_user_id,reply_count,pinned,locked,is_private,teaser";

export type ForumLatest = {
  threadId: string;
  title: string;
  category: string;
  categoryLabel: string;
  isPrivate: boolean;
  at: string;
  author: MemberLite;
  words: string;
};
export type ForumCategorySummary = { slug: string; label: string; blurb: string; isPrivate: boolean; topics: number; posts: number; latest: ForumLatest | null };
export type ForumTopMember = MemberLite & { honors: number; rank: string };
export type ForumIndexData = { categories: ForumCategorySummary[]; latest: ForumLatest | null; totals: { topics: number; posts: number }; recent: any[]; people: Map<string, MemberLite>; top: ForumTopMember[] };

/** The five members with the most Field Honors. Ties go to the name, A to Z. Members with none are left out. */
export async function loadTopOfGuild(supabase: any, limit = 5): Promise<ForumTopMember[]> {
  const counts = await fetchHonorCounts(supabase).catch(() => new Map<string, number>());
  const ids = [...counts].filter(([, n]) => n > 0).map(([id]) => id);
  if (!ids.length) return [];
  const members = await fetchMembers(supabase, ids);
  return ids
    .map((id) => ({ ...members.get(id)!, honors: counts.get(id) || 0, rank: rankLabelForCount(counts.get(id) || 0) }))
    .filter((m) => m.name && m.name !== MEMBER_NAME_FALLBACK)
    .sort((a, b) => b.honors - a.honors || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/**
 * Everything the Forum index shows. Counts come from thread rows every member can see.
 * Previews read the newest post through RLS, so a private trip never shows its posts. It shows its teaser and organizer instead.
 */
export async function loadForumIndex(supabase: any): Promise<ForumIndexData> {
  const [{ data: rows }, top] = await Promise.all([
    supabase.from("forum_threads").select(FORUM_THREAD_COLUMNS).is("deleted_at", null).order("last_post_at", { ascending: false }).limit(5000),
    loadTopOfGuild(supabase),
  ]);
  const threads = (rows || []) as any[];
  const newestByCat = new Map<string, any>();
  const counts = new Map<string, { topics: number; posts: number }>();
  for (const t of threads) {
    if (!forumCategory(t.category)) continue;
    const c = counts.get(t.category) || { topics: 0, posts: 0 };
    c.topics += 1;
    c.posts += 1 + (t.reply_count || 0);
    counts.set(t.category, c);
    if (!newestByCat.has(t.category)) newestByCat.set(t.category, t);
  }
  const previewThreads = [...newestByCat.values()];
  const openIds = previewThreads.filter((t) => !t.is_private).map((t) => t.id);
  // One small read per category preview (five at most), so a busy thread never hides another one's newest post.
  const postRows = await Promise.all(openIds.map((id) => supabase.from("forum_posts").select("id,thread_id,user_id,body,created_at").eq("thread_id", id).is("deleted_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle().then((r: any) => r.data)));
  const newestPost = new Map<string, any>();
  for (const p of postRows) if (p) newestPost.set(p.thread_id, p);

  const recent = threads.slice(0, 6);
  const people = await fetchMembers(supabase, [
    ...previewThreads.map((t) => (t.is_private ? t.user_id : newestPost.get(t.id)?.user_id || t.last_post_user_id || t.user_id)),
    ...recent.flatMap((t) => [t.user_id, t.last_post_user_id || ""]),
  ]);

  const latestFor = (t: any): ForumLatest => {
    const post = t.is_private ? null : newestPost.get(t.id);
    const authorId = t.is_private ? t.user_id : post?.user_id || t.last_post_user_id || t.user_id;
    return {
      threadId: t.id,
      title: t.title,
      category: t.category,
      categoryLabel: forumCategory(t.category)?.label || "Forum",
      isPrivate: Boolean(t.is_private),
      at: t.is_private ? t.created_at : post?.created_at || t.last_post_at,
      author: people.get(authorId)!,
      words: forumFirstWords(t.is_private ? t.teaser || "" : post?.body || "", 12),
    };
  };

  const categories = FORUM_CATEGORIES.map((c) => {
    const n = counts.get(c.slug) || { topics: 0, posts: 0 };
    const newest = newestByCat.get(c.slug);
    return { slug: c.slug, label: c.label, blurb: c.blurb, isPrivate: c.private, topics: n.topics, posts: n.posts, latest: newest ? latestFor(newest) : null };
  });
  const overall = threads.find((t) => forumCategory(t.category));
  const totals = categories.reduce((a, c) => ({ topics: a.topics + c.topics, posts: a.posts + c.posts }), { topics: 0, posts: 0 });
  return { categories, latest: overall ? latestFor(overall) : null, totals, recent, people, top };
}
