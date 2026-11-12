import { cache } from "react";
import { notFound } from "next/navigation";
import { requireAccess } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { FORUM_PAGE_SIZE, fetchForumAuthors, forumCategory, forumPageCount } from "@/lib/forum";
import { fetchOwnPhotos } from "@/lib/forum-photos";
import { ThreadView } from "@/components/forum/ThreadView";
import { loadTripState } from "@/lib/forum-trips";
import { TripGateView } from "@/components/forum/TripViews";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// One read of the thread per request, shared by the metadata and the page.
const loadThread = cache(async (threadId: string) => {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("forum_threads").select("*").eq("id", threadId).maybeSingle();
  return data;
});

export async function generateMetadata({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  if (!UUID.test(threadId)) return { title: "Guild Forum" };
  const data = await loadThread(threadId);
  return { title: data?.title ? `${data.title} | Guild Forum` : "Guild Forum" };
}

export default async function ThreadPage({ params, searchParams }: { params: Promise<{ threadId: string }>; searchParams: Promise<{ page?: string; error?: string; trip?: string }> }) {
  const [{ user, isAdmin }, { threadId }, sp, supabase] = await Promise.all([requireAccess(), params, searchParams, createServerSupabaseClient()]);
  if (!UUID.test(threadId)) notFound();
  // The thread and the post order load together. Every visible post in order, ids only, so numbering, pages and quote links stay right across pages.
  const [thread, { data: order }] = await Promise.all([
    loadThread(threadId),
    supabase.from("forum_posts").select("id,is_opening").eq("thread_id", threadId).is("deleted_at", null).order("is_opening", { ascending: false }).order("created_at", { ascending: true }),
  ]);
  if (!thread || (thread.deleted_at && !isAdmin)) notFound();
  const category = forumCategory(thread.category);

  // Private trip. Without access, show only the title, organizer and teaser. The posts query never runs, and RLS would return nothing anyway.
  const trip = await loadTripState(supabase, thread, user?.id || null, isAdmin);
  if (!trip.canRead) {
    const organizer = (await fetchForumAuthors(supabase, [thread.user_id])).get(thread.user_id)!;
    return <TripGateView thread={thread} category={category} organizer={organizer} trip={trip} viewerId={user?.id || null} />;
  }
  if (trip.myRequest?.status === "approved") await supabase.rpc("forum_trip_mark_seen", { p_thread_id: threadId });

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
  // Authors (with the viewer, for the reply card that shows while a post saves) load alongside quotes, photos and attachments.
  const [{ data: quotedRows }, { data: imageRows }, photos, authors] = await Promise.all([
    quoteIds.length ? supabase.from("forum_posts").select("id,user_id,body").in("id", quoteIds).is("deleted_at", null) : Promise.resolve({ data: [] as any[] }),
    imageIds.length ? supabase.from("guild_images").select("id,title,image_url").in("id", imageIds) : Promise.resolve({ data: [] as any[] }),
    fetchOwnPhotos(supabase, user?.id),
    fetchForumAuthors(supabase, [...posts.map((p: any) => p.user_id), ...(user?.id ? [user.id] : [])]),
  ]);
  const quoted = new Map((quotedRows || []).map((q: any) => [q.id, q]));
  const images = new Map((imageRows || []).map((i: any) => [i.id, i]));
  // A quote from a member who has no post on this page needs their name too.
  const missing = [...new Set((quotedRows || []).map((q: any) => q.user_id as string))].filter((id) => !authors.has(id));
  if (missing.length) for (const [id, a] of await fetchForumAuthors(supabase, missing)) authors.set(id, a);

  return <ThreadView thread={thread} category={category} posts={posts} indexOf={indexOf} openingVisible={openingVisible} postCount={ids.length} page={page} pages={pages} quoted={quoted} images={images} authors={authors} photos={photos} viewerId={user?.id || null} isAdmin={isAdmin} error={sp.error || null} trip={trip} tripError={sp.trip === "error"} />;
}
