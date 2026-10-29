import Link from "next/link";
import { getAvatarDisplay } from "@/lib/avatar";
import { toggleWeeklyCandidate } from "@/app/actions";
import { formatStreakBadge, fullPhotographerRank } from "@/lib/display";
import { ReactionBar } from "./ReactionBar";
import { CommentsSection, type CommentAuthor, type CommentView } from "./Comments";
import { ImageLightbox } from "./ImageLightbox";
import { OpenVoteButton } from "./OpenVoteButton";
import { HonorBadge, type HonorView } from "@/components/HonorBadge";

const formatDate = (v: string) => new Date(v).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
const loc = (image: any) => ({ primary: [image.specific_location_name, image.state_or_province].filter(Boolean).join(", ") || image.state_or_province || "Location pending", country: image.country });

export function ImageDetail({ image, authorStats, reactions, comments, canEditCandidate, from, currentUserId, currentAuthor, honors, edited }: { edited?: boolean; image: any; authorStats?: any; reactions: any[]; comments: CommentView[]; canEditCandidate: boolean; from?: string; currentUserId: string; currentAuthor: CommentAuthor; honors: HonorView[] }) {
  const location = loc(image);
  const name = authorStats?.display_name || image.profiles?.display_name || image.display_name || image.photographer_name || "Guild photographer";
  const avatar = getAvatarDisplay({ avatarPath: authorStats?.avatar_path || image.profiles?.avatar_path, avatarUrl: authorStats?.avatar_url || image.profiles?.avatar_url, displayName: name, email: image.profiles?.email });
  const rank = fullPhotographerRank(authorStats?.rank_short);
  const streak = authorStats?.year_streak ? formatStreakBadge(`${authorStats.year_streak} Year Streak`) : null;
  const back = from === "guild-hall" ? { href: "/guild-hall", label: "← Back to the Guild Hall" } : { href: "/feed", label: "← Back to the Gallery" };
  const memberHref = `/members/${image.user_id}`;
  return (
    <article className="pb-6">
      <div className="mw-detail-topbar"><Link href={back.href} className="mw-nav-text text-sm text-[#f0bd66]">{back.label}</Link></div>
      <div className={`mw-detail-stage ${Number(image.image_width) > 0 && Number(image.image_height) > 0 && Number(image.image_width) < Number(image.image_height) ? "is-portrait" : "is-landscape"}`}>
        <div className="relative grid min-h-[40vh] place-items-center">
          <ImageLightbox src={image.image_url} alt={image.title} className={`mw-detail-image ${image.moderation_blur_required ? "blur-2xl" : ""}`} />
          {image.moderation_blur_required && <div className="absolute inset-0 grid place-items-center bg-black/45 text-center font-display text-xl uppercase tracking-widest">Blurred pending moderation review</div>}
          {edited && <p role="status" className="mw-comment-notice absolute right-4 top-4 z-[3]">✓ Your changes are saved.</p>}
          {image.is_weekly_candidate && <span className="absolute left-4 top-4 rounded-sm border border-[#e79f2b]/70 bg-[#091625] px-4 py-2 font-display text-xs uppercase tracking-[.16em] text-[#f0bd66]">IOTW Contender</span>}
        </div>
      </div>
      <div className="mw-page-wide mw-detail-grid mw-detail-body">
        <main className="space-y-6">
          <section>
            <h1 className="mw-post-title">{image.title}</h1>
            <div className="mt-3 flex items-center gap-3">
              <Link href={memberHref} aria-label={`View ${name}'s profile`} className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-[#e79f2b]/65 bg-[#e79f2b]/10 font-display text-[#f0bd66]">{avatar.avatarUrl ? <img src={avatar.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" /> : avatar.initials}</Link>
              <div>
                <p className="flex flex-wrap items-center gap-2 font-bold text-white"><Link href={memberHref} className="mw-member-link">{name}</Link>{streak && <span className="mw-streak-pill">{streak}</span>}</p>
                <p className="mt-0.5 text-sm font-semibold text-[#e79f2b]">{rank}</p>
              </div>
            </div>
            {canEditCandidate && <Link href={`/images/${image.id}/edit`} className="mw-btn-ghost mt-5 mr-3 inline-block">Edit field report</Link>}
            {canEditCandidate && <form action={toggleWeeklyCandidate} className="mt-5 inline-block"><input type="hidden" name="image_id" value={image.id} /><input type="hidden" name="week_starts_on" value={image.week_starts_on} /><input type="hidden" name="next" value={(!image.is_weekly_candidate).toString()} /><button className="mw-btn-ghost">{image.is_weekly_candidate ? "Unmark weekly candidate" : "Mark as weekly candidate"}</button></form>}
          </section>
          <section className="mw-card-soft p-6"><ReactionBar imageId={image.id} reactions={reactions} currentUserId={currentUserId} /></section>
          <section><h2 className="mw-field-report-label">The Field Report</h2><p className="mt-3 whitespace-pre-wrap mw-body">{image.short_story || "No story added yet."}</p></section>
          <div className="grid gap-4 md:grid-cols-2">
            <section className="mw-insight-good p-5"><h2 className="mw-card-title">What went well</h2><p className="mt-2 whitespace-pre-wrap mw-body">{image.what_went_well || "Not added yet"}</p></section>
            <section className="mw-insight-better p-5"><h2 className="mw-card-title">What could've gone better</h2><p className="mt-2 whitespace-pre-wrap mw-body">{image.what_could_have_gone_better || "Not added yet"}</p></section>
          </div>
          <section id="feedback">
            <h2 className="mw-feedback-heading">Guild Feedback <span>{comments.length}</span></h2>
            <div className="mt-4"><CommentsSection imageId={image.id} comments={comments} currentAuthor={currentAuthor} /></div>
          </section>
        </main>
        <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <section className="mw-card-soft p-5">
            <p className="mw-capture-heading">Capture Details</p>
            <dl className="mt-4 space-y-4 text-sm">
              <div><dt className="mw-capture-label">Captured</dt><dd>{formatDate(image.capture_date)}</dd></div>
              <div><dt className="mw-capture-label">Location</dt><dd><span className="block text-white">{location.primary}</span><span className="block text-white/55">{location.country}</span></dd></div>
              <div><dt className="mw-capture-label">Gear & Settings</dt><dd className="whitespace-pre-wrap mw-body">{image.gear_settings}</dd></div>
            </dl>
          </section>
          <section className="mw-card-gold rounded-lg p-5">
            <p className="mw-eyebrow">Honors This Image Earned</p>
            {honors.length ? (
              <div className="mt-4 flex flex-wrap gap-3">{honors.map((h, i) => <HonorBadge key={h.id} honor={h} filled={i === 0} />)}</div>
            ) : (
              <p className="mt-3 text-sm text-white/60">No honors on this one yet.</p>
            )}
          </section>
          {image.is_weekly_candidate && <section className="mw-iotw-panel p-6"><p className="text-2xl text-[#f0bd66]">✪</p><h3>Image of the Week Contender</h3><p>Entered in this week's vote. Winners are crowned every Monday.</p><OpenVoteButton className="mw-btn-primary mt-5 w-full rounded-sm" /></section>}
        </aside>
      </div>
    </article>
  );
}
