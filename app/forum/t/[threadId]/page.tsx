import { notFound } from "next/navigation";
import { requireAccess } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { FORUM_PAGE_SIZE, fetchForumAuthors, forumCategory, forumPageCount } from "@/lib/forum";
import { fetchOwnPhotos } from "@/lib/forum-photos";
import { ThreadView } from "@/components/forum/ThreadView";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  if (!UUID.test(threadId)) return { title: "Guild Forum" };
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("forum_threads").select("title").eq("id", threadId).maybeSingle();
  return { title: data?.title ? `${data.title} | Guild Forum` : "Guild Forum" };
}

export default async function ThreadPage({ params, searchParams }: { params: Promise<{ threadId: string }>; searchParams: Promise<{ page?: string; error?: string }> }) {
  const { user, isAdmin } = await requireAccess();
  const { threadId } = await params;
  if (!UUID.test(threadId)) notFound();
  const sp = await searchParams;
  const supabase = await createServerSupabaseClient();
  const { data: thread } = await supabase.from("forum_threads").select("*").eq("id", threadId).maybeSingle();
  if (!thread || (thread.deleted_at && !isAdmin)) notFound();
  const category = forumCategory(thread.category);

  // Every visible post in order, ids only, so numbering, pages and quote links stay right across pages.
  const { data: order } = await supabase.from("forum_posts").select("id,is_opening").eq("thread_id", threadId).is("deleted_at", null).order("is_opening", { ascending: false }).order("created_at", { ascending: true });
  const ids = (order || []).map((p: any) => p.id as string);
  const indexOf = new Map(ids.map((id, i) => [id, i]));
  const openingVisible = Boolean(order?.[0]?.is_opening);
  const pages = forumPageCount(ids.length);
  const page = Math.min(pages, Math.max(1, Number(sp.page) || 1));
  const pageIds = ids.slice((page - 1) * FORUM_PAGE_SIZE, page * FORUM_PAGE_SIZE);

  const { data: rows } = pageIds.length
    ? await supabase.from("forum_posts").select("id,thread_id,user_id,body,is_opening,quote_post_id,image_id,created_at,edited_at").in("id", pageIds)
    : { data: [] as any[] };
  const posts = (rows || []).sort((a: any, b: any) => (indexOf.get(a.id) ?? 0) - (indexOf.get(b.id) ?? 0));

  const quoteIds = [...new Set(posts.map((p: any) => p.quote_post_id).filter(Boolean))] as string[];
  const imageIds = [...new Set(posts.map((p: any) => p.image_id).filter(Boolean))] as string[];
  const [{ data: quotedRows }, { data: imageRows }, photos] = await Promise.all([
    quoteIds.length ? supabase.from("forum_posts").select("id,user_id,body").in("id", quoteIds).is("deleted_at", null) : Promise.resolve({ data: [] as any[] }),
    imageIds.length ? supabase.from("guild_images").select("id,title,image_url").in("id", imageIds) : Promise.resolve({ data: [] as any[] }),
    fetchOwnPhotos(supabase, user?.id),
  ]);
  const quoted = new Map((quotedRows || []).map((q: any) => [q.id, q]));
  const images = new Map((imageRows || []).map((i: any) => [i.id, i]));
  const authors = await fetchForumAuthors(supabase, [...posts.map((p: any) => p.user_id), ...(quotedRows || []).map((q: any) => q.user_id)]);

  return <ThreadView thread={thread} category={category} posts={posts} indexOf={indexOf} openingVisible={openingVisible} postCount={ids.length} page={page} pages={pages} quoted={quoted} images={images} authors={authors} photos={photos} viewerId={user?.id || null} isAdmin={isAdmin} error={sp.error || null} />;
}
