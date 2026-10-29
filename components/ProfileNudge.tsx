"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const storageKey = (userId: string) => `mwpg-profile-nudge-dismissed:${userId}`;

/**
 * A one-time, dismissible card for members who have not added a display name or profile photo.
 * It never blocks the page and only appears once the Image of the Week vote gate is out of the way.
 */
export function ProfileNudge({ userId, missingName, missingPhoto }: { userId: string; missingName: boolean; missingPhoto: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try { dismissed = window.localStorage.getItem(storageKey(userId)) === "1"; } catch { dismissed = false; }
    if (dismissed) return;
    const timer = window.setTimeout(() => setVisible(true), 1200);
    return () => window.clearTimeout(timer);
  }, [userId]);

  function dismiss() {
    try { window.localStorage.setItem(storageKey(userId), "1"); } catch { /* private mode, hide for this visit only */ }
    setVisible(false);
  }

  if (!visible) return null;
  const body = missingName && missingPhoto
    ? "Add your name and a profile photo so members know whose night sky they are admiring."
    : missingName
      ? "Add the name you want members to see beside your field reports and feedback."
      : "Add a profile photo so the Guild can put a face to your field reports.";

  return (
    <aside className="mw-profile-nudge" role="status" aria-live="polite">
      <p className="mw-profile-nudge-eyebrow">✦ Your Guild identity</p>
      <p className="mw-profile-nudge-title">{missingName ? "Put your name on your work" : "Put a face to your name"}</p>
      <p className="mw-profile-nudge-body">{body}</p>
      <div className="mw-profile-nudge-actions">
        <Link href="/profile" className="mw-btn-primary px-4 py-2 text-xs" onClick={dismiss}>Update my profile</Link>
        <button type="button" className="mw-profile-nudge-later" onClick={dismiss}>Not now</button>
      </div>
    </aside>
  );
}
