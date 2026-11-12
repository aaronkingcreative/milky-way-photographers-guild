import { requireAccess } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchMembers } from "@/lib/members";
import { type ThreadRowData } from "@/components/forum/ThreadList";
import { ForumHomeView } from "@/components/forum/ForumViews";

export const metadata = { title: "Forum | Milky Way Photographers Guild" };
const THREAD_COLUMNS = "id,title,category,user_id,created_at,last_post_at,last_post_user_id,reply_count,pinned,locked";

export default async function ForumHome({ searchParams }: { searchParams: Promise<{ removed?: string }> }) {
  await requireAccess();
  const { removed } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const [{ data: all }, { data: recent }] = await Promise.all([
    supabase.from("forum_threads").select("category,last_post_at,reply_count").is("deleted_at", null),
    supabase.from("forum_threads").select(THREAD_COLUMNS).is("deleted_at", null).order("last_post_at", { ascending: false }).limit(20),
  ]);
  const stats = new Map<string, { threads: number; posts: number; last: string | null }>();
  for (const t of all || []) {
    const s = stats.get(t.category) || { threads: 0, posts: 0, last: null };
    s.threads += 1;
    s.posts += 1 + (t.reply_count || 0);
    if (!s.last || t.last_post_at > s.last) s.last = t.last_post_at;
    stats.set(t.category, s);
  }
  const threads = (recent || []) as ThreadRowData[];
  const people = await fetchMembers(supabase, threads.flatMap((t) => [t.user_id, t.last_post_user_id || ""]));

  return <ForumHomeView threads={threads} people={people} stats={stats} removed={Boolean(removed)} />;
}
