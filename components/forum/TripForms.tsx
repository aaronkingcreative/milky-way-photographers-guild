"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { enterTripCode, requestTripAccess, setTripCode, setTripTeaser, type ForumFormState } from "@/app/forum/actions";
import { useForumSubmit } from "@/components/forum/useForumSubmit";
import { FORUM_CODE_MAX, FORUM_REQUEST_MAX, FORUM_REQUEST_MIN, FORUM_REQUEST_QUESTION, FORUM_TEASER_MAX, FORUM_TEASER_MIN } from "@/lib/forum";

type Action = (prev: ForumFormState, formData: FormData) => Promise<ForumFormState>;

function useFormSubmit(action: Action, onOk?: () => void) {
  const s = useForumSubmit(action);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (s.pending) return;
    s.submit(new FormData(event.currentTarget), (r) => { if (r.ok) onOk?.(); });
  };
  return { ...s, onSubmit };
}

/** Enter the organizer's code. Right code opens the thread for good. */
export function TripCodeForm({ threadId }: { threadId: string }) {
  const { onSubmit, pending, error } = useFormSubmit(enterTripCode);
  return (
    <form onSubmit={onSubmit} className="mw-forum-gate-form">
      <input type="hidden" name="thread_id" value={threadId} />
      <label className="sr-only" htmlFor="trip-code">Access code</label>
      <div className="mw-forum-gate-row">
        <input id="trip-code" name="access_code" className="mw-input mw-forum-code-input" maxLength={FORUM_CODE_MAX} required autoComplete="off" spellCheck={false} readOnly={pending} placeholder="Access code" />
        <button type="submit" className="mw-btn-primary mw-forum-submit" disabled={pending} aria-busy={pending}>{pending ? "Checking..." : "Enter"}</button>
      </div>
      {error ? <p className="mw-forum-error" role="alert">{error}</p> : null}
    </form>
  );
}

/** Request Access opens a short form in a dialog. The organizer sees the answer with the member's profile. */
export function TripRequestButton({ threadId, organizer, again = false }: { threadId: string; organizer: string; again?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [sent, setSent] = useState(false);
  const [text, setText] = useState("");
  const { onSubmit, pending, error } = useFormSubmit(requestTripAccess, () => { setSent(true); setText(""); });
  useEffect(() => { if (sent) dialog.current?.close(); }, [sent]);
  if (sent) return <p className="mw-forum-gate-sent" role="status">Request sent. {organizer} will see it, and you will get a note at the top of the Guild when you are&nbsp;in.</p>;
  return (
    <>
      <button type="button" className="mw-btn-secondary mw-forum-submit" onClick={() => dialog.current?.showModal()}>{again ? "Ask Again" : "Request access"}</button>
      <dialog ref={dialog} className="mw-forum-dialog" aria-labelledby="trip-request-title">
        <form onSubmit={onSubmit} className="mw-forum-form">
          <input type="hidden" name="thread_id" value={threadId} />
          <h2 id="trip-request-title" className="mw-forum-composer-title">Request Access</h2>
          <label className="mw-forum-dialog-q" htmlFor="trip-request-message">{FORUM_REQUEST_QUESTION}</label>
          <textarea id="trip-request-message" name="message" className="mw-textarea mw-forum-textarea" rows={6} minLength={FORUM_REQUEST_MIN} maxLength={FORUM_REQUEST_MAX} required value={text} onChange={(e) => setText(e.target.value)} readOnly={pending} autoFocus />
          <p className="mw-forum-trip-note">{organizer} sees this with your profile, rank and Field&nbsp;Honors.</p>
          {error ? <p className="mw-forum-error" role="alert">{error}</p> : null}
          <div className="mw-forum-form-foot">
            <span className="mw-forum-count">{text.length ? `${text.length} of ${FORUM_REQUEST_MAX}` : ""}</span>
            <button type="button" className="mw-forum-tool" onClick={() => dialog.current?.close()}>Cancel</button>
            <button type="submit" className="mw-btn-primary mw-forum-submit" disabled={pending} aria-busy={pending}>{pending ? "Sending..." : "Send Request"}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function TripSetCodeForm({ threadId }: { threadId: string }) {
  const [done, setDone] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const { onSubmit, pending, error } = useFormSubmit(setTripCode, () => { setDone(true); form.current?.reset(); });
  return (
    <form ref={form} onSubmit={(e) => { setDone(false); onSubmit(e); }} className="mw-forum-gate-form">
      <input type="hidden" name="thread_id" value={threadId} />
      <label className="mw-field-label" htmlFor="trip-new-code">New access code</label>
      <div className="mw-forum-gate-row">
        <input id="trip-new-code" name="access_code" className="mw-input mw-forum-code-input" maxLength={FORUM_CODE_MAX} required autoComplete="off" spellCheck={false} readOnly={pending} />
        <button type="submit" className="mw-btn-secondary mw-forum-submit" disabled={pending}>{pending ? "Saving..." : "Change Code"}</button>
      </div>
      {done ? <p className="mw-forum-gate-sent" role="status">Code changed. Members already in keep their&nbsp;access.</p> : null}
      {error ? <p className="mw-forum-error" role="alert">{error}</p> : null}
    </form>
  );
}

export function TripTeaserForm({ threadId, teaser }: { threadId: string; teaser: string }) {
  const [done, setDone] = useState(false);
  const { onSubmit, pending, error } = useFormSubmit(setTripTeaser, () => setDone(true));
  return (
    <form onSubmit={(e) => { setDone(false); onSubmit(e); }} className="mw-forum-gate-form">
      <input type="hidden" name="thread_id" value={threadId} />
      <label className="mw-field-label" htmlFor="trip-teaser-edit">Public teaser</label>
      <textarea id="trip-teaser-edit" name="teaser" className="mw-textarea mw-forum-teaser-input" rows={3} minLength={FORUM_TEASER_MIN} maxLength={FORUM_TEASER_MAX} defaultValue={teaser} required readOnly={pending} />
      <div className="mw-forum-form-foot">
        {done ? <span className="mw-forum-gate-sent" role="status">Teaser saved.</span> : null}
        <button type="submit" className="mw-btn-secondary mw-forum-submit" disabled={pending}>{pending ? "Saving..." : "Save Teaser"}</button>
      </div>
      {error ? <p className="mw-forum-error" role="alert">{error}</p> : null}
    </form>
  );
}
