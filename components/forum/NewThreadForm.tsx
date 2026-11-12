"use client";
import { useState, type FormEvent } from "react";
import { createThread } from "@/app/forum/actions";
import { useForumSubmit } from "@/components/forum/useForumSubmit";
import { FORUM_BODY_MAX, FORUM_CATEGORIES, FORUM_CODE_MAX, FORUM_CODE_MIN, FORUM_TEASER_MAX, FORUM_TEASER_MIN, FORUM_TITLE_MAX, forumCategoryIsPrivate } from "@/lib/forum";
import { PhotoPicker, type OwnPhoto } from "@/components/forum/PhotoPicker";
import { LockIcon } from "@/components/forum/ForumIcons";

export function NewThreadForm({ category, photos }: { category: string; photos: OwnPhoto[] }) {
  // Submitted by hand, not as a form action, so a rejected post keeps everything typed. Success redirects to the new thread.
  const { submit, pending, error, coolingDown, secondsLeft } = useForumSubmit(createThread);
  const [length, setLength] = useState(0);
  const [picked, setPicked] = useState(category);
  const [teaserLength, setTeaserLength] = useState(0);
  const trip = forumCategoryIsPrivate(picked);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || coolingDown) return;
    submit(new FormData(event.currentTarget));
  }
  return (
    <form onSubmit={onSubmit} className="mw-forum-composer mw-forum-form mw-forum-new">
      <div className="mw-forum-new-grid">
        <div>
          <label className="mw-field-label" htmlFor="forum-category">Category</label>
          <select id="forum-category" name="category" className="mw-select" value={picked} onChange={(e) => setPicked(e.target.value)} required>
            {FORUM_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="mw-field-label" htmlFor="forum-title">{trip ? "Trip name" : "Title"}</label>
          <input id="forum-title" name="title" className="mw-input" minLength={4} maxLength={FORUM_TITLE_MAX} required placeholder={trip ? "Utah, October 2027" : "What do you want to talk about?"} />
        </div>
      </div>
      {trip ? (
        <fieldset className="mw-forum-trip-setup">
          <legend><LockIcon size={13} /> Private trip</legend>
          <p className="mw-forum-trip-note">Members see the trip name, this teaser and your name. Everything else stays inside the thread for the people you let&nbsp;in.</p>
          <label className="mw-field-label" htmlFor="forum-teaser">Public teaser</label>
          <textarea id="forum-teaser" name="teaser" className="mw-textarea mw-forum-teaser-input" rows={3} minLength={FORUM_TEASER_MIN} maxLength={FORUM_TEASER_MAX} required readOnly={pending} onChange={(e) => setTeaserLength(e.target.value.length)} placeholder="A few sentences on where, when and what kind of night it is." />
          <span className="mw-forum-count">{teaserLength ? `${teaserLength} of ${FORUM_TEASER_MAX}` : ""}</span>
          <label className="mw-field-label" htmlFor="forum-code">Access code</label>
          <input id="forum-code" name="access_code" className="mw-input mw-forum-code-input" minLength={FORUM_CODE_MIN} maxLength={FORUM_CODE_MAX} required autoComplete="off" spellCheck={false} placeholder="Something easy to share" />
          <p className="mw-forum-trip-note">Give this code to the people you want in. Others can ask you for access. The code is stored scrambled, so not even the Guild can read&nbsp;it.</p>
        </fieldset>
      ) : null}
      <label className="mw-field-label" htmlFor="forum-body">{trip ? "Trip details, only for members you let in" : "Opening post"}</label>
      <textarea id="forum-body" name="body" className="mw-textarea mw-forum-textarea mw-forum-textarea-lg" rows={14} maxLength={FORUM_BODY_MAX} required readOnly={pending} onChange={(e) => setLength(e.target.value.length)} placeholder={trip ? "Dates, meeting point, what to bring, who is driving." : "Give the Guild the details. Plain text, and links work."} />
      <PhotoPicker photos={photos} />
      {error ? <p className={`mw-forum-error${coolingDown ? " is-cooldown" : ""}`} role="alert">{error}</p> : null}
      <div className="mw-forum-form-foot">
        <span className="mw-forum-count">{length > FORUM_BODY_MAX - 800 ? `${FORUM_BODY_MAX - length} characters left` : ""}</span>
        <button type="submit" className="mw-btn-primary mw-forum-submit" disabled={pending || coolingDown} aria-busy={pending}>{pending ? "Posting..." : coolingDown ? `Post in ${secondsLeft}s` : trip ? "Start the Trip" : "Start Discussion"}</button>
      </div>
    </form>
  );
}
