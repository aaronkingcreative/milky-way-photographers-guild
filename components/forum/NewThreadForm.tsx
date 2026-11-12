"use client";
import { useActionState, useState } from "react";
import { createThread, type ForumFormState } from "@/app/forum/actions";
import { FORUM_BODY_MAX, FORUM_CATEGORIES, FORUM_TITLE_MAX } from "@/lib/forum";
import { PhotoPicker, type OwnPhoto } from "@/components/forum/PhotoPicker";

export function NewThreadForm({ category, photos }: { category: string; photos: OwnPhoto[] }) {
  const [state, action, pending] = useActionState<ForumFormState, FormData>(createThread, {});
  const [length, setLength] = useState(0);
  return (
    <form action={action} className="mw-forum-composer mw-forum-form">
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
      {state?.error ? <p className="mw-forum-error" role="alert">{state.error}</p> : null}
      <div className="mw-forum-form-foot">
        <span className="mw-forum-count">{length > FORUM_BODY_MAX - 800 ? `${FORUM_BODY_MAX - length} characters left` : ""}</span>
        <button type="submit" className="mw-btn-primary mw-forum-submit" disabled={pending} aria-busy={pending}>{pending ? "Posting..." : "Start Discussion"}</button>
      </div>
    </form>
  );
}
