import { FORUM_CATEGORIES, forumCategory, forumFirstWords } from "@/lib/forum";
import { fetchMembers, type MemberLite } from "@/lib/members";

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
export type ForumIndexData = { categories: ForumCategorySummary[]; latest: ForumLatest | null; totals: { topics: number; posts: number }; recent: any[]; people: Map<string, MemberLite> };

/**
 * Everything the Forum index shows. Counts come from thread rows every member can see.
 * Previews read the newest post through RLS, so a private trip never shows its posts. It shows its teaser and organizer instead.
 */
export async function loadForumIndex(supabase: any): Promise<ForumIndexData> {
  const { data: rows } = await supabase.from("forum_threads").select(FORUM_THREAD_COLUMNS).is("deleted_at", null).order("last_post_at", { ascending: false }).limit(5000);
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
  return { categories, latest: overall ? latestFor(overall) : null, totals, recent, people };
}
