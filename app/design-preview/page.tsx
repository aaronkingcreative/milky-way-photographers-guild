import Link from "next/link";
import { notFound } from "next/navigation";
import { CoursesLibrary } from "@/components/courses/CoursesLibrary";
import { PendingBand } from "@/components/field-desk/PendingBand";
import { KeepTail } from "@/components/KeepTail";
import { ScenePage } from "@/components/ScenePage";
import { formatMountainShort, getIotwSchedule } from "@/lib/iotw";
import { fieldDeskGreeting } from "@/lib/member-labels";
import { courseLibraryLabel, courseLibraryUrl, momentOfEnvyCopy, momentOfEnvyPending, resourcesNote } from "@/lib/public-copy";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Design preview",
  robots: { index: false, follow: false },
};

export default async function Page() {
  if (process.env.VERCEL_ENV === "production") notFound();

  const supabase = await createServerSupabaseClient();
  const schedule = await getIotwSchedule(supabase).catch(() => null);
  const pending = schedule?.voting || schedule?.entry || null;
  const throneCopy = pending
    ? `Image of the Week ${pending.label} winner is announced ${formatMountainShort(pending.voting_closes_at)}`
    : "The first Image of the Week winner will appear here";
  const next = pending;

  return (
    <div className="mw-public">
      <p className="sr-only">Design preview for layout review. Not a member page.</p>

      <section id="preview-resources">
        <ScenePage>
          <h1 className="text-4xl font-bold text-white">Resources</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-[#e7eef6]">{resourcesNote}</p>
          <p className="mt-6">
            <a className="btn btn-secondary" href={courseLibraryUrl}>
              {courseLibraryLabel}
            </a>
          </p>
          <div className="mt-10">
            <CoursesLibrary heading="Online Courses" />
          </div>
        </ScenePage>
      </section>

      <section id="preview-courses" className="mx-auto max-w-7xl px-5 py-14">
        <h1 className="text-4xl font-bold">Online Courses</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-[#e7eef6]">Each card opens the Photog Adventures course library.</p>
        <div className="mt-8">
          <CoursesLibrary />
        </div>
      </section>

      <section id="preview-winners" className="mx-auto max-w-6xl px-5 py-14">
        <p className="eyebrow">Image of the Week</p>
        <h1 className="mt-2 font-display text-5xl uppercase">Image of the Week Winners</h1>
        <p className="mt-3 max-w-3xl text-white/68">Every Image of the Week winner, newest first. Open any winning image to read its field report.</p>
        <p className="mt-3 max-w-3xl text-white/68"><KeepTail text={momentOfEnvyCopy} /></p>
        <div className="mw-winners-empty card mt-8">
          <p className="eyebrow">The throne is waiting</p>
          <h2 className="mt-2 font-display text-3xl uppercase text-[#f0bd66]">No winners crowned yet</h2>
          <p className="mt-3 text-white/68">
            {next ? `The first winner, Image of the Week ${next.label}, is announced ${formatMountainShort(next.voting_closes_at)}. Every week's winner will be listed here after that.` : "Every week's winner will be listed here once voting closes."}
          </p>
          <Link href="/feed" className="mw-btn-secondary mt-5 inline-block px-4 py-2 text-xs">Browse the Gallery</Link>
        </div>
      </section>

      <section id="preview-field-desk" className="mw-page-wide fd-page">
        <div className="fd-intro">
          <div>
            <span className="fd-label">Your Field Desk</span>
            <h1><KeepTail text={fieldDeskGreeting("Guild member")} /></h1>
            <p><KeepTail text="Your standing in the Guild, this week's contenders, and the honors you're chasing." /></p>
          </div>
          <Link className="fd-outline-button" href="/submit">File a Field Report</Link>
        </div>
        <section className="fd-panel fd-standing">
          <div className="fd-standing-head">
            <div>
              <span className="fd-label fd-label-muted">Guild Standing</span>
              <h2>Beginner Milky Way Photographer</h2>
            </div>
          </div>
        </section>
        <section className="fd-contenders">
          <div className="fd-contender-head">
            <div>
              <span className="fd-label fd-label-muted">Two weeks at once</span>
              <span>Voting is one week. The photos in Open for entries are the next week, not the&nbsp;ballot.</span>
            </div>
            <Link href="/feed">Open Gallery →</Link>
          </div>
          <p className="fd-pending-inline">No Image of the Week is open yet.</p>
        </section>
        <section className="fd-stats">
          {([[0, "Guild Submissions", "Your first field report starts the climb."], [0, "Field Honors earned", "Claim an honor when you file a report."], [0, "Reactions Received", "Reactions arrive as the Guild sees your work."], [0, "Image of the Week Wins", "Enter a contender this week."]] as [number, string, string][]).map(([n, l, hint], i) => (
            <div key={l} className="fd-stat-card">
              <strong className={i % 2 ? "gold" : ""}>{n}</strong>
              <span>{l}</span>
              <small className="fd-stat-hint">{hint}</small>
            </div>
          ))}
        </section>
        <PendingBand label="The Winners' Throne" message={throneCopy} actionHref="/feed" actionLabel="See this week's ballot" />
        <PendingBand label={"Photog Phavorite, Moment of\u00A0Envy"} message={momentOfEnvyPending} footnote={momentOfEnvyCopy} />
      </section>
    </div>
  );
}
