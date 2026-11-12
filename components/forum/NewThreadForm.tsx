"use client";
import { useState, type FormEvent } from "react";
import { createThread } from "@/app/forum/actions";
import { useForumSubmit } from "@/components/forum/useForumSubmit";
import { FORUM_BODY_MAX, FORUM_CATEGORIES, FORUM_TITLE_MAX } from "@/lib/forum";
import { PhotoPicker, type OwnPhoto } from "@/components/forum/PhotoPicker";

export function NewThreadForm({ category, photos }: { category: string; photos: OwnPhoto[] }) {
  // Submitted by hand, not as a form action, so a rejected post keeps everything typed. Success redirects to the new thread.
  const { submit, pending, error, coolingDown, secondsLeft } = useForumSubmit(createThread);
  const [length, setLength] = useState(0);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || coolingDown) return;
    submit(new FormData(event.currentTarget));
  }
  return (
    <form onSubmit={onSubmit} className="mw-forum-composer mw-forum-form">
      <div className="mw-forum-new-grid">
        <div>
          <label className="mw-field-label" htmlFor="forum-category">Category</label>
          <select id="forum-category" name="category" className="mw-select" defaultValue={category} required>
            {FORUM_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mw-field-label" htmlFor="forum-title">Title</label>
          <input id="forum-title" name="title" className="mw-input" minLength={4} maxLength={FORUM_TITLE_MAX} required placeholder="What do you want to talk about?" />
        </div>
      </div>
      <label className="mw-field-label" htmlFor="forum-body">Opening post</label>
      <textarea id="forum-body" name="body" className="mw-textarea mw-forum-textarea" rows={10} maxLength={FORUM_BODY_MAX} required readOnly={pending} onChange={(e) => setLength(e.target.value.length)} placeholder="Give the Guild the details. Plain text, and links work." />
      <PhotoPicker photos={photos} />
      {error ? <p className={`mw-forum-error${coolingDown ? " is-cooldown" : ""}`} role="alert">{error}</p> : null}
      <div className="mw-forum-form-foot">
        <span className="mw-forum-count">{length > FORUM_BODY_MAX - 800 ? `${FORUM_BODY_MAX - length} characters left` : ""}</span>
        <button type="submit" className="mw-btn-primary mw-forum-submit" disabled={pending || coolingDown} aria-busy={pending}>{pending ? "Posting..." : coolingDown ? `Post in ${secondsLeft}s` : "Start Discussion"}</button>
      </div>
    </form>
  );
}
