import { notFound } from "next/navigation";
import { requireAccess } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { forumCategory } from "@/lib/forum";
import { fetchMembers } from "@/lib/members";
import { FORUM_THREAD_COLUMNS as THREAD_COLUMNS } from "@/lib/forum-index";
import { type ThreadRowData } from "@/components/forum/ThreadList";
import { ForumCategoryView } from "@/components/forum/ForumViews";

const PER_PAGE = 30;

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const c = forumCategory((await params).category);
  return { title: `${c?.label || "Forum"} | Guild Forum` };
}

export default async function ForumCategoryPage({ params, searchParams }: { params: Promise<{ category: string }>; searchParams: Promise<{ page?: string }> }) {
  await requireAccess();
  const category = forumCategory((await params).category);
  if (!category) notFound();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const supabase = await createServerSupabaseClient();
  const { data, count } = await supabase
    .from("forum_threads")
    .select(THREAD_COLUMNS, { count: "exact" })
    .eq("category", category.slug)
    .is("deleted_at", null)
    .order("pinned", { ascending: false })
    .order("last_post_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  const threads = (data || []) as ThreadRowData[];
  const people = await fetchMembers(supabase, threads.flatMap((t) => [t.user_id, t.last_post_user_id || ""]));
  const pages = Math.max(1, Math.ceil((count || 0) / PER_PAGE));

  return <ForumCategoryView category={category} threads={threads} people={people} page={page} pages={pages} />;
}
