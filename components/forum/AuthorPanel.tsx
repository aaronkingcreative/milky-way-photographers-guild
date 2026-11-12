import Link from "next/link";
import type { ForumAuthor } from "@/lib/forum";
import { fullPhotographerRank } from "@/lib/display";
import { StreakPill } from "@/components/StreakPill";
import { ContenderVote } from "@/components/forum/ContenderVote";

function Trophy({ tone, count, label }: { tone: string; count: number; label: string }) {
  if (!count) return null;
  return (
    <li className={`mw-forum-trophy ${tone}`} title={`${label}${count > 1 ? ` ×${count}` : ""}`}>
      <span className="mw-forum-trophy-mark" aria-hidden="true">{tone === "is-phavorite" ? "♥" : "★"}</span>
      <span>{label}{count > 1 ? <b> ×{count}</b> : null}</span>
    </li>
  );
}

export function AuthorPanel({ author, viewerId, isStarter }: { author: ForumAuthor; viewerId: string | null; isStarter?: boolean }) {
  const t = author.trophies;
  const hasTrophies = t.first + t.second + t.third + t.phavorite > 0;
  return (
    <aside className="mw-forum-author" aria-label={`About ${author.name}`}>
      <Link href={`/members/${author.id}`} className="mw-forum-avatar" aria-label={`View ${author.name}'s profile`}>
        {author.avatarUrl ? <img src={author.avatarUrl} alt="" /> : <span>{author.initials}</span>}
      </Link>
      <div className="mw-forum-author-copy">
        <p className="mw-forum-author-name"><Link href={`/members/${author.id}`} className="mw-member-link">{author.name}</Link></p>
        {isStarter ? <p className="mw-forum-starter">Started this</p> : null}
        <p className="mw-forum-rank">{author.rank === "Unranked" ? "Unranked" : fullPhotographerRank(author.rank)}</p>
        <p className="mw-forum-honors">{author.honors} Field Honor{author.honors === 1 ? "" : "s"}</p>
        {author.streak ? <StreakPill length={author.streak} short className="mw-forum-streak" /> : null}
        {hasTrophies ? (
          <ul className="mw-forum-trophies" aria-label="Image of the Week trophies">
            <Trophy tone="is-gold" count={t.first} label="Image of the Week" />
            <Trophy tone="is-silver" count={t.second} label="IOTW 2nd" />
            <Trophy tone="is-bronze" count={t.third} label="IOTW 3rd" />
            <Trophy tone="is-phavorite" count={t.phavorite} label="Photog Phavorite" />
          </ul>
        ) : null}
        {author.contender ? <ContenderVote contender={author.contender} own={viewerId === author.id} /> : null}
      </div>
    </aside>
  );
}
