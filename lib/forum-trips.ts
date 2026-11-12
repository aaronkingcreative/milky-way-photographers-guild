import { fetchForumAuthors, type ForumAuthor } from "@/lib/forum";
import { keepLastTwo } from "@/lib/keep-last-two";

export type TripRequest = { id: string; userId: string; message: string; createdAt: string; author: ForumAuthor };
export type TripMember = { userId: string; via: "starter" | "code" | "approved"; addedAt: string; author: ForumAuthor };
export type TripState = {
  canRead: boolean;
  canManage: boolean;
  myRequest: { status: "pending" | "approved" | "declined"; decidedAt: string | null } | null;
  pending: TripRequest[];
  members: TripMember[];
};

/** Who can read a private trip, and what the organizer needs for the manage panel. RLS decides the rows, this only shapes them. */
export async function loadTripState(supabase: any, thread: { id: string; user_id: string; is_private?: boolean }, viewerId: string | null, isAdmin: boolean): Promise<TripState> {
  if (!thread.is_private) return { canRead: true, canManage: false, myRequest: null, pending: [], members: [] };
  const canManage = Boolean(viewerId && (thread.user_id === viewerId || isAdmin));
  const [{ data: mine }, { data: reqRow }] = await Promise.all([
    viewerId ? supabase.from("forum_trip_members").select("user_id").eq("thread_id", thread.id).eq("user_id", viewerId).maybeSingle() : Promise.resolve({ data: null }),
    viewerId ? supabase.from("forum_trip_requests").select("status,decided_at").eq("thread_id", thread.id).eq("user_id", viewerId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const canRead = isAdmin || thread.user_id === viewerId || Boolean(mine);
  let pending: TripRequest[] = [];
  let members: TripMember[] = [];
  if (canManage) {
    const [{ data: reqs }, { data: mems }] = await Promise.all([
      supabase.from("forum_trip_requests").select("id,user_id,message,created_at").eq("thread_id", thread.id).eq("status", "pending").order("created_at", { ascending: true }),
      supabase.from("forum_trip_members").select("user_id,via,added_at").eq("thread_id", thread.id).order("added_at", { ascending: true }),
    ]);
    const authors = await fetchForumAuthors(supabase, [...(reqs || []).map((r: any) => r.user_id), ...(mems || []).map((m: any) => m.user_id)]);
    pending = (reqs || []).map((r: any) => ({ id: r.id, userId: r.user_id, message: r.message, createdAt: r.created_at, author: authors.get(r.user_id)! }));
    members = (mems || []).map((m: any) => ({ userId: m.user_id, via: m.via, addedAt: m.added_at, author: authors.get(m.user_id)! }));
  }
  return { canRead, canManage, myRequest: reqRow ? { status: reqRow.status, decidedAt: reqRow.decided_at } : null, pending, members };
}

/** Header notices. Organizers see new requests, requesters see that they were let in. */
export async function fetchTripNotices(supabase: any, userId: string) {
  const [{ data: waiting }, { data: approved }] = await Promise.all([
    supabase.from("forum_trip_requests").select("id,thread_id,forum_threads!inner(user_id,title)").eq("status", "pending").eq("forum_threads.user_id", userId).limit(50),
    supabase.from("forum_trip_requests").select("id,thread_id,forum_threads!inner(title)").eq("user_id", userId).eq("status", "approved").is("requester_seen_at", null).limit(10),
  ]);
  const notices: { id: string; text: string; href: string; cta: string }[] = [];
  const rows = (waiting || []) as any[];
  if (rows.length) {
    const first = rows[0];
    const title = (Array.isArray(first.forum_threads) ? first.forum_threads[0] : first.forum_threads)?.title || "your trip";
    const sameThread = rows.every((r) => r.thread_id === first.thread_id);
    notices.push({
      id: `trip-requests-${rows.length}`,
      text: rows.length === 1 ? keepLastTwo(`A member asked to join ${title}`) : sameThread ? keepLastTwo(`${rows.length} members asked to join ${title}`) : keepLastTwo(`${rows.length} members asked to join your trips`),
      href: `/forum/t/${first.thread_id}#trip-manage`,
      cta: "Review",
    });
  }
  for (const a of (approved || []) as any[]) {
    const title = (Array.isArray(a.forum_threads) ? a.forum_threads[0] : a.forum_threads)?.title || "the trip";
    notices.push({ id: `trip-approved-${a.id}`, text: keepLastTwo(`You are in. The organizer approved your request for ${title}`), href: `/forum/t/${a.thread_id}`, cta: "Open the trip" });
  }
  return notices;
}
