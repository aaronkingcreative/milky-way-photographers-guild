import Link from "next/link";
import { adminSaveGuildMessage } from "@/app/message-actions";
import { requireAdmin } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MessageEditor } from "@/components/hall/MessageEditor";
import { MESSAGE_MAX, isLongMessage } from "@/lib/guild-message";

const notices: Record<string, string> = {
  posted: "Posted. Every member sees it open again in the Guild Hall.",
  edited: "Wording updated. Every member sees it open again until they click Got it on this version.",
  removed: "Taken down. The Guild Hall shows no message until you post one.",
  empty: "Write something first.",
  long: `Keep it to ${MESSAGE_MAX} characters or fewer.`,
  error: "That did not save. Try again in a moment.",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const { data: current } = await supabase.from("guild_messages").select("id,body,created_at,updated_at").is("archived_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
  let reads = 0;
  if (current) {
    const { count } = await supabase.from("guild_message_reads").select("user_id", { count: "exact", head: true }).eq("message_id", current.id).eq("message_updated_at", current.updated_at);
    reads = count || 0;
  }
  return (
    <section className="mx-auto max-w-3xl px-5 py-14">
      <Link href="/admin" className="mw-nav-text text-sm text-[#f0bd66]">← Admin</Link>
      <h1 className="mt-4 font-display text-4xl uppercase">Message from Aaron</h1>
      <p className="mt-3 mw-help">The gold card at the top of the Guild Hall&apos;s right column. It stays until you change it. Posting a new one opens it again for every member.</p>
      {status && notices[status] && <p role="status" className="mw-comment-notice mt-5">{notices[status]}</p>}
      {current ? (
        <div className={`mw-aaron-card mt-6 ${isLongMessage(current.body) ? "is-long" : ""}`} aria-label="Current message preview">
          <p className="mw-aaron-eyebrow">Live now</p>
          <p className="mw-aaron-body">{current.body}</p>
          <p className="mw-aaron-date mt-3">Posted {new Date(current.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Denver" })}. Read by {reads} {reads === 1 ? "member" : "members"}.</p>
        </div>
      ) : <p className="mt-6 mw-muted">No message is live right now.</p>}
      <form action={adminSaveGuildMessage} className="mw-admin-card mt-6 space-y-4 p-5">
        <input type="hidden" name="current_id" value={current?.id || ""} />
        <MessageEditor initial={current?.body || ""} />
        <div className="flex flex-wrap gap-3">
          <button className="mw-btn-primary" name="mode" value="new">Post as new message</button>
          {current && <button className="mw-btn-ghost" name="mode" value="edit">Fix wording only</button>}
          {current && <button className="mw-btn-danger" name="mode" value="archive" formNoValidate>Take it down</button>}
        </div>
        <p className="mw-help">Post as new message when you have a new note. Fix wording to change this one. Either way, members who already clicked Got it will see it open again until they click Got it on this version.</p>
      </form>
    </section>
  );
}
