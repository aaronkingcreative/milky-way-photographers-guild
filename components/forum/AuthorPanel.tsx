import Link from "next/link";
import { forumNextRank, forumRankTier, type ForumAuthor } from "@/lib/forum";
import { StreakPill } from "@/components/StreakPill";
import { ContenderVote } from "@/components/forum/ContenderVote";

function TrophyCup() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 3h10v2h3v3a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 14.9V18h3v3H8v-3h3v-3.1A5 5 0 0 1 8.3 12H8a4 4 0 0 1-4-4V5h3zm0 4H6v1a2 2 0 0 0 1 1.7zm10 0v2.7A2 2 0 0 0 18 8V7z" /></svg>;
}

function Trophy({ tone, count, label }: { tone: string; count: number; label: string }) {
  if (!count) return null;
  return (
    <li className={`mw-forum-trophy ${tone}`} title={`${label}${count > 1 ? ` ×${count}` : ""}`}>
      <span className="mw-forum-trophy-mark">{tone === "is-phavorite" ? <span aria-hidden="true">♥</span> : <TrophyCup />}</span>
      <span className="sr-only">{label}</span>
      {count > 1 ? <b>×{count}</b> : null}
    </li>
  );
}

/**
 * The member's badge of honor. Rank sets the frame: higher ranks get a richer gold ring and glow.
 * Field Honors, Image of the Week trophies and this week's contender come from real records only.
 */
export function AuthorPanel({ author, viewerId, isStarter }: { author: ForumAuthor; viewerId: string | null; isStarter?: boolean }) {
  const t = author.trophies;
  const hasTrophies = t.first + t.second + t.third + t.phavorite > 0;
  const tier = forumRankTier(author.rank);
  const next = forumNextRank(author.honors);
  const ranked = tier !== "unranked";
  const stepStart = [0, 1, 8, 18, 25, 33][["unranked", "beginner", "amateur", "novice", "veteran", "master"].indexOf(tier)] ?? 0;
  const progress = next ? Math.round(((author.honors - stepStart) / Math.max(1, author.honors - stepStart + next.needed)) * 100) : 100;
  return (
    <aside className={`mw-forum-author tier-${tier}`} aria-label={`About ${author.name}`}>
      <Link href={`/members/${author.id}`} className="mw-forum-avatar" aria-label={`View ${author.name}'s profile`}>
        {author.avatarUrl ? <img src={author.avatarUrl} alt="" /> : <span>{author.initials}</span>}
      </Link>
      <div className="mw-forum-author-copy">
        <p className="mw-forum-author-name"><Link href={`/members/${author.id}`} className="mw-member-link">{author.name}</Link></p>
        {isStarter ? <p className="mw-forum-starter">Started this</p> : null}
        <p className="mw-forum-rank-badge"><span className="mw-forum-rank-word">{ranked ? author.rank : "Unranked"}</span>{ranked ? <span className="mw-forum-rank-title">Milky Way&nbsp;Photographer</span> : null}</p>
        <div className="mw-forum-honors">
          <b>{author.honors}</b>
          <span>Field Honor{author.honors === 1 ? "" : "s"}</span>
        </div>
        {next ? (
          <div className="mw-forum-next" title={`${next.needed} more Field Honor${next.needed === 1 ? "" : "s"} to ${next.label}`}>
            <span className="mw-forum-next-bar" aria-hidden="true"><span style={{ width: `${Math.max(4, Math.min(100, progress))}%` }} /></span>
            <span className="mw-forum-next-copy">{next.needed}&nbsp;to {next.label}</span>
          </div>
        ) : <p className="mw-forum-next-copy is-top">Top rank in the&nbsp;Guild</p>}
        {author.streak ? <StreakPill length={author.streak} short className="mw-forum-streak" /> : null}
        {hasTrophies ? (
          <ul className="mw-forum-trophies" aria-label="Image of the Week trophies">
            <Trophy tone="is-gold" count={t.first} label="Image of the Week" />
            <Trophy tone="is-silver" count={t.second} label="Image of the Week, 2nd" />
            <Trophy tone="is-bronze" count={t.third} label="Image of the Week, 3rd" />
            <Trophy tone="is-phavorite" count={t.phavorite} label="Photog Phavorite" />
          </ul>
        ) : null}
        {author.contender ? <ContenderVote contender={author.contender} own={viewerId === author.id} /> : null}
      </div>
    </aside>
  );
}
