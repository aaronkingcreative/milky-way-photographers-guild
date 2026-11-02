"use client";

import { useState } from "react";
import { MESSAGE_LARGE_FONT_MAX, MESSAGE_MAX } from "@/lib/guild-message";

/** Message textarea with a live character counter and a preview that switches to the small font past the threshold. */
export function MessageEditor({ initial }: { initial: string }) {
  const [body, setBody] = useState(initial);
  const count = body.trim().length;
  const long = count > MESSAGE_LARGE_FONT_MAX;
  const atMax = body.length >= MESSAGE_MAX;
  return (
    <div className="space-y-3">
      <label className="mw-field-label" htmlFor="guild-message-body">Your message</label>
      <textarea id="guild-message-body" name="body" rows={6} maxLength={MESSAGE_MAX} value={body} onChange={(e) => setBody(e.target.value)} className="mw-textarea text-lg" aria-describedby="guild-message-count guild-message-rule" />
      <div className="mw-msg-meter" aria-live="polite">
        <p id="guild-message-count" className={`mw-msg-count ${atMax ? "is-max" : long ? "is-long" : ""}`}>Characters: <strong>{count}</strong> / max {MESSAGE_MAX}</p>
        <div className="mw-msg-bar" aria-hidden="true"><span style={{ width: `${Math.min(100, (count / MESSAGE_MAX) * 100)}%` }} className={long ? "is-long" : ""} /><i style={{ left: `${(MESSAGE_LARGE_FONT_MAX / MESSAGE_MAX) * 100}%` }} /></div>
        <p id="guild-message-rule" className="mw-help">Large font up to {MESSAGE_LARGE_FONT_MAX} characters.</p>
        {long && <p className="mw-msg-notice" role="status">Over {MESSAGE_LARGE_FONT_MAX}: displays in smaller font. {count - MESSAGE_LARGE_FONT_MAX} characters past the large-font limit.</p>}
        {atMax && <p className="mw-msg-notice is-max" role="status">That is the {MESSAGE_MAX} character max.</p>}
      </div>
      <div className={`mw-aaron-card ${long ? "is-long" : ""}`} aria-label="Preview">
        <p className="mw-aaron-eyebrow">Preview, {long ? "smaller font" : "large font"}</p>
        <p className="mw-aaron-body">{body || "Your message shows here."}</p>
      </div>
    </div>
  );
}
