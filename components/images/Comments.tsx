"use client";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { addComment, type CommentState } from "@/app/actions";

export type CommentAuthor = { id: string; name: string; avatarUrl: string | null; initials: string };
export type CommentView = { id: string; body: string; created_at: string; user_id: string; author: CommentAuthor };

export function MemberAvatar({ author, size = "h-9 w-9" }: { author: CommentAuthor; size?: string }) {
  return (
    <span className={`grid ${size} shrink-0 place-items-center overflow-hidden rounded-full border border-[#e79f2b]/50 bg-[#06101c] font-display text-[#f0bd66]`}>
      {author.avatarUrl ? <img src={author.avatarUrl} alt="" className="h-full w-full object-cover" /> : author.initials || "GM"}
    </span>
  );
}

function CommentItem({ c, fresh }: { c: CommentView; fresh?: boolean }) {
  return (
    <div id={`comment-${c.id}`} className={`mw-card-soft p-4 ${fresh ? "mw-comment-fresh" : ""}`}>
      <div className="flex gap-3">
        <Link href={`/members/${c.user_id}`} aria-label={`View ${c.author.name}'s profile`}><MemberAvatar author={c.author} /></Link>
        <div className="min-w-0">
          <p className="mw-comment-author"><Link href={`/members/${c.user_id}`} className="mw-member-link">{c.author.name}</Link></p>
          <p className="mt-1 whitespace-pre-wrap text-white/86">{c.body}</p>
          <p className="mt-2 mw-meta">{new Date(c.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p>
        </div>
      </div>
    </div>
  );
}

export function CommentsSection({ imageId, comments, currentAuthor }: { imageId: string; comments: CommentView[]; currentAuthor: CommentAuthor }) {
  const [list, setList] = useState<CommentView[]>(comments);
  const [open, setOpen] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<CommentState, FormData>(addComment, {});

  useEffect(() => { setList((prev) => { const ids = new Set(prev.map((c) => c.id)); const merged = [...prev, ...comments.filter((c) => !ids.has(c.id))]; return merged; }); }, [comments]);

  useEffect(() => {
    if (!state?.ok || !state.comment) return;
    const c = state.comment;
    setList((prev) => (prev.some((p) => p.id === c.id) ? prev : [...prev, { ...c, author: currentAuthor }]));
    formRef.current?.reset();
    setOpen(false);
    setFreshId(c.id);
    setNotice("Your feedback is posted. Thank you for helping a fellow photographer grow.");
    setTimeout(() => document.getElementById(`comment-${c.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  }, [state?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="space-y-3">
        {list.length ? list.map((c) => <CommentItem key={c.id} c={c} fresh={c.id === freshId} />) : <p className="mw-muted">No Guild feedback yet. Be the first to leave a specific, kind note.</p>}
      </div>
      {notice && <p className="mw-comment-notice" role="status">{notice}</p>}
      {open ? (
        <form ref={formRef} action={formAction} className="mt-5 space-y-3 rounded-lg border border-[#e79f2b]/20 bg-[#06101c]/45 p-4">
          <input type="hidden" name="image_id" value={imageId} />
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="mw-filter-chip px-3 py-1">What stands out?</span>
            <span className="mw-filter-chip px-3 py-1">What did they do well?</span>
            <span className="mw-filter-chip px-3 py-1">What would you try differently?</span>
          </div>
          <textarea className="mw-textarea" name="body" rows={4} required placeholder="Leave feedback that helps them grow. Be specific and kind." aria-label="Your feedback" readOnly={pending} />
          {state?.error && <p className="mw-comment-error" role="alert">{state.error}</p>}
          <div className="flex justify-end">
            <button className="mw-btn-primary rounded-sm disabled:cursor-wait disabled:opacity-60" type="submit" disabled={pending} aria-busy={pending}>{pending ? "Posting..." : "Post Feedback"}</button>
          </div>
        </form>
      ) : (
        <div className="mt-4 flex justify-end">
          <button type="button" className="mw-btn-ghost rounded-sm px-4 py-2" onClick={() => { setOpen(true); setNotice(null); }}>Add more feedback</button>
        </div>
      )}
    </div>
  );
}
