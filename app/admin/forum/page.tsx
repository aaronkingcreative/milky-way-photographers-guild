import Link from "next/link";
import { requireAdmin } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchMembers } from "@/lib/members";
import { forumExcerpt, forumStamp } from "@/lib/forum";
import { resolveFlag } from "@/app/forum/actions";

export default async function AdminForumPage() {
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const { data: flags } = await supabase.from("forum_flags").select("id,post_id,reporter_id,reason,created_at,forum_posts(id,thread_id,user_id,body,deleted_at,forum_threads(title))").is("resolved_at", null).order("created_at", { ascending: false }).limit(100);
  const rows = (flags || []) as any[];
  const people = await fetchMembers(supabase, rows.flatMap((f) => [f.reporter_id, f.forum_posts?.user_id || ""]));
  return (
    <section className="mw-forum-shell">
      <p className="mw-guild-eyebrow">Admin</p>
      <h1 className="mw-guild-page-title">Forum reports</h1>
      <p className="mw-forum-subtitle">Posts members reported. Open the post to delete it or lock the discussion, then mark the report handled.</p>
      {rows.length ? (
        <ol className="mw-forum-threads" style={{ marginTop: "1.5rem" }}>
          {rows.map((f) => {
            const post = f.forum_posts;
            return (
              <li key={f.id} className="mw-forum-thread" style={{ padding: "1rem .9rem" }}>
                <p className="mw-forum-post-meta" style={{ marginBottom: ".4rem" }}>{forumStamp(f.created_at)} · reported by {people.get(f.reporter_id)?.name || "Guild Member"}</p>
                <p style={{ margin: 0, fontWeight: 800 }}>{post?.forum_threads?.title || "Discussion"} · {people.get(post?.user_id)?.name || "Guild Member"}{post?.deleted_at ? " (already deleted)" : ""}</p>
                <p style={{ margin: ".35rem 0", color: "rgba(255,255,255,.7)" }}>{forumExcerpt(post?.body || "", 240)}</p>
                {f.reason ? <p style={{ margin: ".35rem 0", color: "#f0bd66" }}>Why they reported it. {f.reason}</p> : null}
                <div className="mw-forum-tools" style={{ paddingTop: ".5rem" }}>
                  {post ? <Link className="mw-forum-tool is-quote" href={`/forum/t/${post.thread_id}#post-${post.id}`}>Open post</Link> : null}
                  <form action={resolveFlag}><input type="hidden" name="flag_id" value={f.id} /><button className="mw-forum-tool">Mark handled</button></form>
                </div>
              </li>
            );
          })}
        </ol>
      ) : <p className="mw-forum-empty" style={{ marginTop: "1.5rem" }}>No open reports.</p>}
    </section>
  );
}
