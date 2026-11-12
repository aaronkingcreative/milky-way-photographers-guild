"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { replyToThread, type ForumFormState } from "@/app/forum/actions";
import { FORUM_BODY_MAX } from "@/lib/forum";
import { PhotoPicker, type OwnPhoto } from "@/components/forum/PhotoPicker";

export type QuoteDetail = { postId: string; author: string; excerpt: string };
export const QUOTE_EVENT = "mw:forum-quote";

export function ReplyComposer({ threadId, photos, locked, initialQuote = null }: { threadId: string; photos: OwnPhoto[]; locked: boolean; initialQuote?: QuoteDetail | null }) {
  const [state, action, pending] = useActionState<ForumFormState, FormData>(replyToThread, {});
  const [quote, setQuote] = useState<QuoteDetail | null>(initialQuote);
  const [length, setLength] = useState(0);
  const area = useRef<HTMLTextAreaElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onQuote(event: Event) {
      const detail = (event as CustomEvent<QuoteDetail>).detail;
      if (!detail) return;
      setQuote(detail);
      wrap.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => area.current?.focus({ preventScroll: true }), 350);
    }
    window.addEventListener(QUOTE_EVENT, onQuote);
    return () => window.removeEventListener(QUOTE_EVENT, onQuote);
  }, []);

  if (locked) return <div id="reply" className="mw-forum-composer mw-forum-locked">This discussion is locked, so new replies are closed.</div>;

  return (
    <div id="reply" ref={wrap} className="mw-forum-composer">
      <h2 className="mw-forum-composer-title">Reply</h2>
      <form action={action} className="mw-forum-form">
        <input type="hidden" name="thread_id" value={threadId} />
        {quote ? (
          <div className="mw-forum-quote is-draft">
            <input type="hidden" name="quote_post_id" value={quote.postId} />
            <p className="mw-forum-quote-head">Quoting {quote.author}</p>
            <p className="mw-forum-quote-text">{quote.excerpt}</p>
            <button type="button" className="mw-forum-quote-clear" onClick={() => setQuote(null)}>Remove quote</button>
          </div>
        ) : null}
        <label className="sr-only" htmlFor="forum-reply-body">Your reply</label>
        <textarea id="forum-reply-body" ref={area} name="body" className="mw-textarea mw-forum-textarea" rows={7} maxLength={FORUM_BODY_MAX} required readOnly={pending} onChange={(e) => setLength(e.target.value.length)} placeholder="Share what you know. Plain text, and links work." />
        <PhotoPicker photos={photos} />
        {state?.error ? <p className="mw-forum-error" role="alert">{state.error}</p> : null}
        <div className="mw-forum-form-foot">
          <span className="mw-forum-count">{length > FORUM_BODY_MAX - 800 ? `${FORUM_BODY_MAX - length} characters left` : ""}</span>
          <button type="submit" className="mw-btn-primary mw-forum-submit" disabled={pending} aria-busy={pending}>{pending ? "Posting..." : "Post Reply"}</button>
        </div>
      </form>
    </div>
  );
}
