"use client";
import Link from "next/link";
import type { ForumContender } from "@/lib/forum";

/** "Image of the Week contender" thumbnail. The image opens the photo, the button opens the ballot. */
export function ContenderVote({ contender, own }: { contender: ForumContender; own: boolean }) {
  return (
    <div className="mw-forum-contender">
      <Link href={`/images/${contender.imageId}`} className="mw-forum-contender-thumb" aria-label={`Open ${contender.title}`}>
        {contender.imageUrl ? <img src={contender.imageUrl} alt="" loading="lazy" /> : null}
      </Link>
      <div className="mw-forum-contender-copy">
        <span className="mw-forum-contender-label">Image of the Week contender</span>
        {own ? (
          <Link href={`/images/${contender.imageId}`} className="mw-forum-contender-link">See your entry</Link>
        ) : (
          <button type="button" className="mw-forum-contender-link" onClick={() => window.dispatchEvent(new Event("mw:open-iotw"))}>Vote this week</button>
        )}
      </div>
    </div>
  );
}
