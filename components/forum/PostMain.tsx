"use client";
import { useActionState, useEffect, useState, type ReactNode } from "react";
import { deletePost, editPost, flagPost, type ForumFormState } from "@/app/forum/actions";
import { FORUM_BODY_MAX, FORUM_TITLE_MAX } from "@/lib/forum";
import { PhotoPicker, type OwnPhoto } from "@/components/forum/PhotoPicker";
import { QUOTE_EVENT, focusComposer, type QuoteDetail } from "@/components/forum/ReplyComposer";

type Props = {
  children: ReactNode;
  postId: string;
  threadId: string;
  body: string;
  title?: string | null;
  imageId: string | null;
  quote: QuoteDetail;
  canEdit: boolean;
  canDelete: boolean;
  canReport: boolean;
  canQuote: boolean;
  photos: OwnPhoto[];
};

export function PostMain({ children, postId, threadId, body, title = null, imageId, quote, canEdit, canDelete, canReport, canQuote, photos }: Props) {
  const [editing, setEditing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [editState, editAction, editPending] = useActionState<ForumFormState, FormData>(editPost, {});
  const [flagState, flagAction, flagPending] = useActionState<ForumFormState, FormData>(flagPost, {});

  useEffect(() => { if (editState?.ok) setEditing(false); }, [editState?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (flagState?.ok) setReporting(false); }, [flagState?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mw-forum-main">
      {editing ? (
        <form action={editAction} className="mw-forum-form mw-forum-edit">
          <input type="hidden" name="post_id" value={postId} />
          {title !== null ? (
            <>
              <label className="mw-field-label" htmlFor={`title-${postId}`}>Title</label>
              <input id={`title-${postId}`} name="title" className="mw-input" defaultValue={title} minLength={4} maxLength={FORUM_TITLE_MAX} required />
            </>
          ) : null}
          <label className="sr-only" htmlFor={`edit-${postId}`}>Edit your post</label>
          <textarea id={`edit-${postId}`} name="body" className="mw-textarea mw-forum-textarea" rows={8} maxLength={FORUM_BODY_MAX} defaultValue={body} required readOnly={editPending} />
          <PhotoPicker photos={photos} initial={imageId} />
          {editState?.error ? <p className="mw-forum-error" role="alert">{editState.error}</p> : null}
          <div className="mw-forum-form-foot">
            <button type="button" className="mw-forum-tool" onClick={() => setEditing(false)}>Cancel</button>
            <button type="submit" className="mw-btn-primary mw-forum-submit" disabled={editPending}>{editPending ? "Saving..." : "Save"}</button>
          </div>
        </form>
      ) : children}

      {!editing ? (
        <div className="mw-forum-tools">
          {canQuote ? <button type="button" className="mw-forum-tool is-quote" onClick={() => { window.dispatchEvent(new CustomEvent(QUOTE_EVENT, { detail: quote })); focusComposer(); }}>❝ Quote</button> : null}
          {canEdit ? <button type="button" className="mw-forum-tool" onClick={() => setEditing(true)}>Edit</button> : null}
          {canDelete ? (
            <form action={deletePost} onSubmit={(e) => { if (!window.confirm("Delete this post? This cannot be undone.")) e.preventDefault(); }}>
              <input type="hidden" name="post_id" value={postId} />
              <input type="hidden" name="thread_id" value={threadId} />
              <button type="submit" className="mw-forum-tool">Delete</button>
            </form>
          ) : null}
          {canReport ? (flagState?.ok ? <span className="mw-forum-tool is-done">Reported to the Guild</span> : <button type="button" className="mw-forum-tool is-report" onClick={() => setReporting((v) => !v)} aria-expanded={reporting}>Report</button>) : null}
        </div>
      ) : null}
      {reporting && !flagState?.ok ? (
        <form action={flagAction} className="mw-forum-report">
          <input type="hidden" name="post_id" value={postId} />
          <label className="mw-field-label" htmlFor={`reason-${postId}`}>What is wrong with this post? <span className="mw-forum-optional">(optional)</span></label>
          <input id={`reason-${postId}`} name="reason" className="mw-input" maxLength={500} />
          {flagState?.error ? <p className="mw-forum-error" role="alert">{flagState.error}</p> : null}
          <div className="mw-forum-form-foot">
            <button type="button" className="mw-forum-tool" onClick={() => setReporting(false)}>Cancel</button>
            <button type="submit" className="mw-btn-secondary mw-forum-submit" disabled={flagPending}>Send to admins</button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
