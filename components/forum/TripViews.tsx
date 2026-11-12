import Link from "next/link";
import { forumAgo, forumRankTier, type ForumAuthor } from "@/lib/forum";
import { keepLastTwo } from "@/lib/keep-last-two";
import type { TripState } from "@/lib/forum-trips";
import { decideTripRequest, removeTripMember } from "@/app/forum/actions";
import { ForumCrumbs } from "@/components/forum/ForumHead";
import { ForumBody } from "@/components/forum/ForumBody";
import { AuthorPanel } from "@/components/forum/AuthorPanel";
import { LockIcon } from "@/components/forum/ForumIcons";
import { TripCodeForm, TripRequestButton, TripSetCodeForm, TripTeaserForm } from "@/components/forum/TripForms";

/** A member in one line: tiered avatar ring, name, rank and honors. Used in the organizer's panel. */
export function MemberBadge({ author }: { author: ForumAuthor }) {
  const tier = forumRankTier(author.rank);
  return (
    <span className={`mw-forum-member-badge tier-${tier}`}>
      <span className="mw-forum-mini-avatar is-ringed" aria-hidden="true">{author.avatarUrl ? <img src={author.avatarUrl} alt="" /> : <span>{author.initials}</span>}</span>
      <span className="mw-forum-member-badge-copy">
        <Link href={`/members/${author.id}`} className="mw-member-link mw-forum-member-badge-name">{author.name}</Link>
        <span className="mw-forum-member-badge-meta"><span className={`mw-forum-rank-chip tier-${tier}`}>{author.rank}</span><span>{author.honors}&nbsp;Field Honor{author.honors === 1 ? "" : "s"}</span></span>
      </span>
    </span>
  );
}

function TripHead({ thread, category }: { thread: any; category: { slug: string; label: string } | null }) {
  return (
    <>
      <ForumCrumbs items={[{ label: "Forum", href: "/forum" }, ...(category ? [{ label: category.label, href: `/forum/${category.slug}` }] : [])]} />
      <header className="mw-forum-thread-head">
        <h1 className="mw-guild-page-title mw-forum-thread-h1">{keepLastTwo(thread.title)}</h1>
        <p className="mw-forum-thread-sub"><span className="mw-forum-flag is-private"><LockIcon size={10} /> Private trip</span><span>Planned {forumAgo(thread.created_at)}</span></p>
      </header>
    </>
  );
}

/** What a member without access sees. The title, the organizer and the public teaser, then two ways in. No posts are read. */
export function TripGateView({ thread, category, organizer, trip, viewerId }: { thread: any; category: { slug: string; label: string } | null; organizer: ForumAuthor; trip: TripState; viewerId: string | null }) {
  const req = trip.myRequest;
  return (
    <section className="mw-forum-shell">
      <TripHead thread={thread} category={category} />
      <div className="mw-forum-posts">
        <article className="mw-forum-post is-a is-opening">
          <AuthorPanel author={organizer} viewerId={viewerId} />
          <div className="mw-forum-main">
            <p className="mw-forum-post-meta"><span className="mw-forum-teaser-label">The trip, in the organizer&rsquo;s words</span></p>
            <ForumBody body={thread.teaser || ""} className="mw-forum-teaser-body" />
          </div>
        </article>
      </div>
      <div className="mw-forum-gate" id="trip-gate">
        <div className="mw-forum-gate-intro">
          <span className="mw-forum-gate-lock"><LockIcon size={22} /></span>
          <div>
            <h2 className="mw-forum-composer-title">The plans are private</h2>
            <p className="mw-forum-trip-note">{thread.reply_count + 1} {thread.reply_count === 0 ? "post" : "posts"} inside. {organizer.name} shares the details with the members going on this&nbsp;trip.</p>
          </div>
        </div>
        <div className="mw-forum-gate-ways">
          <div className="mw-forum-gate-way">
            <h3 className="mw-forum-gate-h">Have the code?</h3>
            <TripCodeForm threadId={thread.id} />
          </div>
          <div className="mw-forum-gate-way">
            <h3 className="mw-forum-gate-h">Want to go?</h3>
            {req?.status === "pending" ? (
              <p className="mw-forum-gate-sent" role="status">Your request is with {organizer.name}. You will get a note at the top of the Guild when you are&nbsp;in.</p>
            ) : (
              <>
                <p className="mw-forum-trip-note">{req?.status === "declined" ? <>{organizer.name} declined your last request. You can ask again a day after it was&nbsp;declined.</> : <>Ask {organizer.name} to let you in. Say why you want to go and how serious you&nbsp;are.</>}</p>
                <TripRequestButton threadId={thread.id} organizer={organizer.name} again={req?.status === "declined"} />
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Shown to members inside the trip, above the posts. */
export function TripTeaserNote({ thread }: { thread: any }) {
  return (
    <div className="mw-forum-trip-banner">
      <span className="mw-forum-gate-lock"><LockIcon size={16} /></span>
      <p><b>Private trip.</b> Only members the organizer let in can read these posts. Other members see the title and this teaser. <span className="mw-forum-trip-banner-teaser">&ldquo;{thread.teaser}&rdquo;</span></p>
    </div>
  );
}

const VIA: Record<string, string> = { starter: "Organizer", code: "Used the code", approved: "Approved" };

/** The organizer's panel. Requests with each member's profile and answer, everyone who is in, the code and the teaser. */
export function TripManagePanel({ thread, trip, error }: { thread: any; trip: TripState; error?: boolean }) {
  return (
    <section className="mw-forum-manage" id="trip-manage" aria-labelledby="trip-manage-heading">
      <h2 id="trip-manage-heading" className="mw-forum-composer-title">Manage this trip</h2>
      {error ? <p className="mw-forum-error" role="alert">That did not go through. Please try again.</p> : null}
      <div className="mw-forum-manage-grid">
        <div className="mw-forum-manage-col">
          <h3 className="mw-forum-gate-h">Requests <span className="mw-forum-manage-count">{trip.pending.length}</span></h3>
          {trip.pending.length ? (
            <ul className="mw-forum-requests">
              {trip.pending.map((r) => (
                <li key={r.id} className="mw-forum-request">
                  <MemberBadge author={r.author} />
                  <p className="mw-forum-request-msg">{r.message}</p>
                  <div className="mw-forum-request-foot">
                    <time dateTime={r.createdAt}>{forumAgo(r.createdAt)}</time>
                    <form action={decideTripRequest} className="mw-forum-request-actions">
                      <input type="hidden" name="request_id" value={r.id} />
                      <input type="hidden" name="thread_id" value={thread.id} />
                      <button name="decision" value="decline" className="mw-forum-tool">Decline</button>
                      <button name="decision" value="approve" className="mw-btn-primary mw-forum-submit mw-forum-approve">Approve</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="mw-forum-trip-note">No requests waiting. New ones show here and in a note at the top of the&nbsp;Guild.</p>}
        </div>
        <div className="mw-forum-manage-col">
          <h3 className="mw-forum-gate-h">Going <span className="mw-forum-manage-count">{trip.members.length}</span></h3>
          <ul className="mw-forum-going">
            {trip.members.map((m) => (
              <li key={m.userId}>
                <MemberBadge author={m.author} />
                <span className="mw-forum-going-via">{VIA[m.via] || ""}</span>
                {m.via !== "starter" ? (
                  <form action={removeTripMember}>
                    <input type="hidden" name="thread_id" value={thread.id} />
                    <input type="hidden" name="user_id" value={m.userId} />
                    <button className="mw-forum-tool is-report">Remove</button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="mw-forum-manage-forms">
            <TripSetCodeForm threadId={thread.id} />
            <TripTeaserForm threadId={thread.id} teaser={thread.teaser || ""} />
          </div>
        </div>
      </div>
    </section>
  );
}
