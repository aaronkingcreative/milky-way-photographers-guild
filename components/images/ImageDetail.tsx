import { formatMountainShort, iotwWeekLabel, type IotwScheduleWeek } from "@/lib/iotw";
import { IotwSchedule } from "@/components/iotw/IotwSchedule";
import type React from "react";
import Link from "next/link";
import { getAvatarDisplay, MEMBER_NAME_FALLBACK, publicMemberName } from "@/lib/avatar";
import { toggleWeeklyCandidate } from "@/app/actions";
import { adminReviewCaptureDate } from "@/app/streak-actions";
import { formatStreakBadge, fullPhotographerRank } from "@/lib/display";
import { ReactionBar } from "./ReactionBar";
import { CommentsSection, SectionReplyTray, type CommentAuthor, type CommentView } from "./Comments";
import { ImageViewer } from "./ImageViewer";
import { OpenVoteButton } from "./OpenVoteButton";
import { HonorBadge, type HonorView } from "@/components/HonorBadge";
import { badgeTone, type IotwBadge } from "@/lib/iotw-badges";

// capture_date is a plain calendar date; format it in UTC so it never slips a day.
const formatDate = (v: string) => new Date(v).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const loc = (image: any) => ({ primary: [image.specific_location_name, image.state_or_province].filter(Boolean).join(", ") || image.state_or_province || "Location pending", country: image.country });

export type DateReview = { status: string; declared: string | null; reviewedAt: string | null; hasCoverage: boolean };

export function ImageDetail({ dateReview, image, authorStats, reactions, comments, canEditCandidate, from, currentUserId, currentAuthor, honors, edited, iotwBallot, iotwSchedule, iotwBadge, people }: { dateReview?: DateReview | null; people?: Record<string, CommentAuthor>; edited?: boolean; iotwBallot?: any; iotwBadge?: IotwBadge | null; iotwSchedule?: { entry: IotwScheduleWeek; voting: IotwScheduleWeek | null }; image: any; authorStats?: any; reactions: any[]; comments: CommentView[]; canEditCandidate: boolean; from?: string; currentUserId: string; currentAuthor: CommentAuthor; honors: HonorView[] }) {
  const location = loc(image);
  const badge: IotwBadge | null = iotwBadge || (image.is_weekly_candidate ? { label: iotwBallot ? `IOTW ${iotwWeekLabel(iotwBallot)} Contender` : "IOTW Contender", week: iotwBallot ? iotwWeekLabel(iotwBallot) : "", year: null, place: null, ballotId: iotwBallot?.id || null } : null);
  const placeWord = badge?.place === 1 ? "first" : badge?.place === 2 ? "second" : badge?.place === 3 ? "third" : "";
  const name = publicMemberName(authorStats?.display_name, image.profiles?.display_name, image.profiles?.full_name, image.display_name, image.photographer_name);
  const avatar = getAvatarDisplay({ avatarPath: authorStats?.avatar_path || image.profiles?.avatar_path, avatarUrl: authorStats?.avatar_url || image.profiles?.avatar_url, displayName: name });
  const rank = fullPhotographerRank(authorStats?.rank_short);
  const streak = authorStats?.year_streak ? formatStreakBadge(authorStats.year_streak) : null;
  const streakTip = authorStats?.year_streak_from ? `Out under the Milky Way every year, ${authorStats.year_streak_from} to ${authorStats.year_streak_to}` : undefined;
  const back = from === "guild-hall" ? { href: "/guild-hall", label: "← Back to the Guild Hall" } : { href: "/feed", label: "← Back to the Gallery" };
  const memberHref = `/members/${image.user_id}`;
  const width = Number(image.image_width) || 0, height = Number(image.image_height) || 0;
  const portrait = width > 0 && height > 0 && width < height;
  const ratio = width > 0 && height > 0 ? Math.min(4, Math.max(0.35, width / height)) : 1.5;
  const firstName = name === MEMBER_NAME_FALLBACK ? "The photographer" : firstNameOf(name);
  const whose = firstName === "The photographer" ? "the photographer's" : `${firstName}'s`;
  const general = comments.filter((c) => !c.section || c.section === "general");
  const wentWellReplies = comments.filter((c) => c.section === "went_well");
  const betterReplies = comments.filter((c) => c.section === "could_be_better");
  return (
    <article className="pb-6">
      <div className="mw-detail-topbar"><Link href={back.href} className="mw-nav-text text-sm text-[#f0bd66]">{back.label}</Link></div>
      <div className={`mw-report-stage ${portrait ? "is-portrait" : "is-landscape"}`} style={{ "--mw-ar": ratio } as React.CSSProperties}>
        <div className="mw-report-center">
          <ImageViewer src={image.image_url} alt={image.title} width={width || null} height={height || null} blurred={Boolean(image.moderation_blur_required)} className={`mw-detail-image ${image.moderation_blur_required ? "blur-2xl" : ""}`} />
          {image.moderation_blur_required && <div className="absolute inset-0 grid place-items-center bg-black/45 text-center font-display text-xl uppercase tracking-widest">Blurred pending moderation review</div>}
          {edited && <p role="status" className="mw-comment-notice absolute right-4 top-4 z-[3]">✓ Your changes are saved.</p>}
          {badge && <span className={`mw-iotw-badge mw-detail-badge ${badgeTone(badge)}`}>{badge.label}</span>}
        </div>
        <aside className="mw-report-side mw-report-left" aria-label="Reactions">
          <section className="mw-report-panel">
            <p className="mw-report-nudge">Give both. A quick reaction, and what you&apos;re praising.</p>
            <ReactionBar imageId={image.id} reactions={reactions} currentUserId={currentUserId} people={people} compact />
          </section>
        </aside>
        <aside className="mw-report-side mw-report-right" aria-label="Capture details and honors">
          <section className="mw-report-panel">
            <p className="mw-capture-heading">Capture Details</p>
            <dl className="mw-report-details">
              <div><dt className="mw-capture-label">Captured</dt><dd>{formatDate(image.capture_date)}</dd></div>
              <div><dt className="mw-capture-label">Location</dt><dd><span className="block text-white">{location.primary}</span><span className="block text-white/55">{location.country}</span></dd></div>
              <div><dt className="mw-capture-label">Gear & Settings</dt><dd className="whitespace-pre-wrap">{image.gear_settings}</dd></div>
            </dl>
            {dateReview && (
              <div className="mw-date-review">
                <p><strong className="text-[#f0bd66]">Admin · capture date</strong>{" "}
                  {dateReview.status === "vetted" ? "Vetted." : dateReview.status === "corrected" ? `Corrected (declared ${dateReview.declared ? formatDate(dateReview.declared) : "unknown"}).` : "Declared by the member, not yet vetted."}
                  {" "}It sets the year this image counts toward the streak.</p>
                <form action={adminReviewCaptureDate}>
                  <input type="hidden" name="image_id" value={image.id} />
                  {dateReview.status !== "vetted" && dateReview.hasCoverage && <button name="mode" value="vet">Vet date</button>}
                  <input type="date" name="capture_date" defaultValue={image.capture_date || ""} aria-label="Corrected capture date" />
                  <button name="mode" value="correct">Correct date</button>
                  {dateReview.status === "corrected" && <button name="mode" value="reset">Restore declared</button>}
                </form>
              </div>
            )}
          </section>
          <section className="mw-report-panel mw-report-honors">
            <p className="mw-eyebrow">Honors This Image Earned</p>
            {honors.length ? (
              <div className="mt-4 flex flex-wrap gap-3">{honors.map((h, i) => <HonorBadge key={h.id} honor={h} filled={i === 0} />)}</div>
            ) : (
              <p className="mt-3 text-sm text-white/60">No honors on this one yet.</p>
            )}
          </section>
          {badge && <section className={`mw-iotw-panel p-5 ${badgeTone(badge)}`}><p className="mw-iotw-panel-glyph text-2xl">{badge.place ? `#${badge.place}` : "✪"}</p><h3>{badge.legacy ? "Image of the Week Contender" : badge.label}</h3><p>{badge.place ? `Placed ${placeWord} in IOTW ${badge.week}${iotwBallot?.voting_closes_at ? `, voted by the Guild until ${formatMountainShort(iotwBallot.voting_closes_at)}` : ""}.` : !iotwBallot ? "Entered for Image of the Week." : iotwBallot.status === "upcoming" ? `Entered in IOTW ${iotwWeekLabel(iotwBallot)}. Entries close ${formatMountainShort(iotwBallot.submission_cutoff)}, then members vote on this week all of next week, until ${formatMountainShort(iotwBallot.voting_closes_at)}.` : iotwBallot.status === "voting_open" ? `On the IOTW ${iotwWeekLabel(iotwBallot)} ballot. Voting closes ${formatMountainShort(iotwBallot.voting_closes_at)}, and the winner is announced then.` : `Was on the IOTW ${iotwWeekLabel(iotwBallot)} ballot, which closed ${formatMountainShort(iotwBallot.voting_closes_at)}.`}</p>{iotwSchedule && <IotwSchedule entry={iotwSchedule.entry} voting={iotwSchedule.voting} compact />}{iotwBallot?.status === "voting_open" && image.user_id !== currentUserId && <OpenVoteButton className="mw-btn-primary mt-4 w-full rounded-sm" label={`Vote for IOTW ${iotwWeekLabel(iotwBallot)}`} />}</section>}
        </aside>
      </div>
      <div className="mw-report-body">
        <header>
          <h1 className="mw-post-title">{image.title}</h1>
          <div className="mt-4 flex items-center gap-3">
            <Link href={memberHref} aria-label={`View ${name}'s profile`} className="mw-avatar-circle grid h-12 w-12 place-items-center overflow-hidden rounded-full border border-[#e79f2b]/65 bg-[#e79f2b]/10 font-display text-[#f0bd66]">{avatar.avatarUrl ? <img src={avatar.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" /> : avatar.initials}</Link>
            <div>
              <p className="flex flex-wrap items-center gap-2 text-lg font-bold text-white"><Link href={memberHref} className="mw-member-link">{name}</Link>{streak && <span className="mw-streak-pill" title={streakTip}>{streak}</span>}</p>
              <p className="mt-0.5 font-semibold text-[#e79f2b]">{rank}</p>
            </div>
          </div>
          {canEditCandidate && <div className="mt-4 flex flex-wrap gap-3">
            <Link href={`/images/${image.id}/edit`} className="mw-owner-edit"><span aria-hidden="true">✎</span> Edit your field report</Link>
            {(!image.is_weekly_candidate || !iotwBallot || iotwBallot.status === "upcoming") && <form action={toggleWeeklyCandidate} className="inline-block"><input type="hidden" name="image_id" value={image.id} /><input type="hidden" name="week_starts_on" value={image.week_starts_on} /><input type="hidden" name="next" value={(!image.is_weekly_candidate).toString()} /><button className="mw-btn-ghost">{image.is_weekly_candidate ? `Withdraw from IOTW ${iotwBallot ? iotwWeekLabel(iotwBallot) : ""}`.trim() : `Enter this image for ${iotwSchedule?.entry.label || "this week\u2019s"} Image of the Week consideration`}</button></form>}
          </div>}
        </header>
        <section className="mw-report-story"><h2 className="mw-field-report-label">The Field Report</h2><p className="mt-3 whitespace-pre-wrap mw-body">{image.short_story || "No story added yet."}</p></section>
        <div className="mw-insight-row">
          <section id="went-well" className="mw-insight-block is-good" aria-labelledby="went-well-heading">
            <div className="mw-insight-answer">
              <h2 id="went-well-heading" className="mw-insight-title">What went well</h2>
              <p className="mw-insight-by">{firstName} wrote</p>
              <p className="mw-insight-quote">{image.what_went_well || `${firstName} left this one blank.`}</p>
            </div>
            <SectionReplyTray imageId={image.id} section="went_well" comments={wentWellReplies} currentAuthor={currentAuthor} label="what went well" placeholder={`Reply to ${whose} what went well, or share what you think went well in this image.`} />
          </section>
          <section id="could-be-better" className="mw-insight-block is-better" aria-labelledby="could-be-better-heading">
            <div className="mw-insight-answer">
              <h2 id="could-be-better-heading" className="mw-insight-title">What could have gone better</h2>
              <p className="mw-insight-by">{firstName} wrote</p>
              <p className="mw-insight-quote">{image.what_could_have_gone_better || `${firstName} left this one blank.`}</p>
            </div>
            <SectionReplyTray imageId={image.id} section="could_be_better" comments={betterReplies} currentAuthor={currentAuthor} label="what could have gone better" placeholder={`Reply to ${whose} what could have gone better, or share what you'd try differently.`} />
          </section>
        </div>
        <section id="feedback">
          <h2 className="mw-feedback-heading">Guild Feedback <span>{general.length}</span></h2>
          <div className="mt-4"><CommentsSection imageId={image.id} comments={general} currentAuthor={currentAuthor} /></div>
        </section>
      </div>
    </article>
  );
}

/** First word of a public name, for "Sean wrote". Falls back to the whole name. */
function firstNameOf(name: string) {
  const first = (name || "").trim().split(/\s+/)[0] || "";
  return first.length >= 2 ? first : (name || "The photographer").trim();
}
