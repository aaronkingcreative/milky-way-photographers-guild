"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { replyToThread, type ForumFormState } from "@/app/forum/actions";
import { FORUM_BODY_MAX, forumExcerpt, type ForumAuthor } from "@/lib/forum";
import { PhotoPicker, type OwnPhoto } from "@/components/forum/PhotoPicker";
import { AuthorPanel } from "@/components/forum/AuthorPanel";
import { ForumBody } from "@/components/forum/ForumBody";
import { useForumSubmit } from "@/components/forum/useForumSubmit";

export type QuoteDetail = { postId: string; author: string; excerpt: string };
export const QUOTE_EVENT = "mw:forum-quote";

/** Scrolls to the composer and focuses it. Called straight from the Quote button too, so it works whatever state the composer is in. */
export function focusComposer() {
  if (typeof document === "undefined") return;
  document.getElementById("reply")?.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => (document.getElementById("forum-reply-body") as HTMLTextAreaElement | null)?.focus({ preventScroll: true }), 350);
}

type Sending = { body: string; quote: QuoteDetail | null };
type ReplyAction = (prev: ForumFormState, formData: FormData) => Promise<ForumFormState>;

export function ReplyComposer({ threadId, photos, locked, initialQuote = null, viewer = null, nextIsA = true, action = replyToThread }: { threadId: string; photos: OwnPhoto[]; locked: boolean; initialQuote?: QuoteDetail | null; viewer?: ForumAuthor | null; nextIsA?: boolean; action?: ReplyAction }) {
  const router = useRouter();
  const { submit, pending, error, coolingDown, secondsLeft } = useForumSubmit(action);
  const [quote, setQuote] = useState<QuoteDetail | null>(initialQuote);
  const [text, setText] = useState("");
  const [sending, setSending] = useState<Sending | null>(null);
  const [savedId, setSavedId] = useState<{ id: string; href: string } | null>(null);
  const [pickerKey, setPickerKey] = useState(0);

  useEffect(() => {
    function onQuote(event: Event) {
      const detail = (event as CustomEvent<QuoteDetail>).detail;
      if (!detail) return;
      setQuote({ ...detail });
      focusComposer();
    }
    window.addEventListener(QUOTE_EVENT, onQuote);
    return () => window.removeEventListener(QUOTE_EVENT, onQuote);
  }, []);

  // After a save, keep the pending card up until the real post is on the page, then go to it.
  useEffect(() => {
    if (!savedId) return;
    let tries = 0;
    let frame = 0;
    const look = () => {
      const el = document.getElementById(`post-${savedId.id}`);
      if (el) {
        setSending(null);
        setSavedId(null);
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (++tries > 120) {
        setSending(null);
        setSavedId(null);
        router.push(savedId.href);
        return;
      }
      frame = window.requestAnimationFrame(look);
    };
    look();
    return () => window.cancelAnimationFrame(frame);
  }, [savedId, router]);

  if (locked) return <div id="reply" className="mw-forum-composer mw-forum-locked">This discussion is locked, so new replies are closed.</div>;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || coolingDown || sending) return;
    const formData = new FormData(event.currentTarget);
    const body = String(formData.get("body") || "").trim();
    if (body) setSending({ body, quote });
    submit(formData, (result) => {
      if (result.ok && result.postId) {
        setText("");
        setQuote(null);
        setPickerKey((k) => k + 1);
        setSavedId({ id: result.postId, href: result.href || `/forum/t/${threadId}` });
      } else {
        setSending(null);
      }
    });
  }

  const busy = pending || Boolean(sending);
  return (
    <>
      {sending ? (
        <article className={`mw-forum-post ${nextIsA ? "is-a" : "is-b"} is-sending`} aria-live="polite">
          {viewer ? <AuthorPanel author={viewer} viewerId={viewer.id} /> : <aside className="mw-forum-author" />}
          <div className="mw-forum-main">
            <p className="mw-forum-post-meta"><span className="mw-forum-sending">Posting</span></p>
            {sending.quote ? (
              <blockquote className="mw-forum-quote">
                <span className="mw-forum-quote-head">{sending.quote.author} wrote</span>
                <p className="mw-forum-quote-text">{forumExcerpt(sending.quote.excerpt, 420)}</p>
              </blockquote>
            ) : null}
            <ForumBody body={sending.body} />
          </div>
        </article>
      ) : null}
      <div id="reply" className="mw-forum-composer">
        <h2 className="mw-forum-composer-title">Reply</h2>
        <form onSubmit={onSubmit} className="mw-forum-form">
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
          <textarea id="forum-reply-body" name="body" className="mw-textarea mw-forum-textarea" rows={7} maxLength={FORUM_BODY_MAX} required readOnly={busy} value={text} onChange={(e) => setText(e.target.value)} placeholder="Share what you know. Plain text, and links work." />
          <PhotoPicker key={pickerKey} photos={photos} />
          {error ? <p className={`mw-forum-error${coolingDown ? " is-cooldown" : ""}`} role="alert">{error}</p> : null}
          <div className="mw-forum-form-foot">
            <span className="mw-forum-count">{text.length > FORUM_BODY_MAX - 800 ? `${FORUM_BODY_MAX - text.length} characters left` : ""}</span>
            <button type="submit" className="mw-btn-primary mw-forum-submit" disabled={busy || coolingDown} aria-busy={busy}>{busy ? "Posting..." : coolingDown ? `Post in ${secondsLeft}s` : "Post Reply"}</button>
          </div>
        </form>
      </div>
    </>
  );
}
