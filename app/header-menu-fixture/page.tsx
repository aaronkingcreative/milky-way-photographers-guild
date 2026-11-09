import { notFound } from "next/navigation";
import { HeaderClient } from "@/components/HeaderClient";
import { AscentBoard } from "@/components/hall/AscentBoard";
import { KeepTail } from "@/components/KeepTail";
import { fieldDeskHonorBadges, fieldDeskHonorCatalog } from "@/lib/member-labels";
import { getIotwPeriod, voteLockConfirmation } from "@/lib/iotw";
import { momentOfEnvyCopy, momentOfEnvyPending } from "@/lib/public-copy";

const sampleEntries = ["North ridge", "Core over the canyon", "Foreground arch"].map((title, index) => ({
  field_report_id: `fixture-${index}`,
  title,
  image_url: "/join/island-in-the-sky-milky-way.jpg",
  photographer_name: "Sample member",
  user_id: `member-${index}`,
}));

/** Development-only surface for the phone menu, honors, vote notice, and page width. */
export default function HeaderMenuFixture() {
  if (process.env.NODE_ENV === "production") notFound();
  const period = getIotwPeriod(new Date("2026-11-09T18:00:00Z"));
  const confirmation = voteLockConfirmation(3, period.voting_closes_at);
  const locked = fieldDeskHonorBadges([], fieldDeskHonorCatalog());
  const earned = fieldDeskHonorBadges([{ id: "monthly_january", name: "January Milky Way", glyph: "☾" }], fieldDeskHonorCatalog());
  const ascent = new Map([
    ["Unranked", [{ id: "u1", name: "MaoMao Test", avatarUrl: null, initials: "MT", count: 0 }]],
    ["Veteran", [{ id: "v1", name: "Christopher Neal", avatarUrl: null, initials: "CN", count: 25, streak: 11 }]],
  ]);
  const iotw = { ballot: { id: "fixture-ballot", contest_week: period.contest_week, voting_closes_at: period.voting_closes_at }, entries: sampleEntries, vote: null, mustVote: false, entryWeek: null };
  return (
    <>
    <style>{`body > header.mw-app-header { display: none !important; }`}</style>
    <HeaderClient user isAdmin={false} name="MaoMao Test" rankLabel="Unranked" streakLabel={null} avatarUrl={null} iotw={iotw} />
    <section className="mw-page-wide">
      <h1 className="mw-guild-page-title">Fixture</h1>
      <AscentBoard ascent={ascent} cloudHonors={new Map()} />
      <section className="fd-panel fd-phavorite" aria-label="Moment of Envy">
        <div className="fd-empty fd-empty-large">{momentOfEnvyPending}</div>
        <div className="fd-phavorite-foot"><p><KeepTail text={momentOfEnvyCopy} /></p></div>
      </section>
      <section className="fd-panel fd-honors" data-honors="none">
        <div className="fd-honors-head"><div><span className="fd-label fd-label-muted">Field Honors</span><span>0 earned</span></div></div>
        <div className="fd-honor-grid">{locked.map((badge) => <div key={badge.id}><div className="fd-honor-badge">{badge.glyph}</div><p>{badge.name}</p></div>)}</div>
      </section>
      <section className="fd-panel fd-honors" data-honors="one">
        <div className="fd-honors-head"><div><span className="fd-label fd-label-muted">Field Honors</span><span>1 earned</span></div></div>
        <div className="fd-honor-grid">{earned.map((badge) => <div key={badge.id}><div className={badge.earned ? "fd-honor-badge earned" : "fd-honor-badge"}>{badge.glyph}</div><p>{badge.name}</p></div>)}</div>
      </section>
      <p className="mw-vote-confirm" role="status" data-vote-confirm>{confirmation}</p>
      <article>
        <div className="mw-report-stage" style={{ ["--mw-ar" as string]: "1.5" }}>
          <div className="mw-report-center"><div className="mw-detail-image" style={{ height: 220, background: "#102033" }} /></div>
          <div className="mw-report-side mw-report-left"><p>Reactions</p></div>
          <div className="mw-report-side mw-report-right"><p>Details</p></div>
        </div>
      </article>
      <div className="progress-punch-grid" aria-hidden="true">
        {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((label) => (
          <div key={label} className="progress-punch-hole open" tabIndex={0}>{label}<span className="progress-hover-card"><strong>{label}</strong><em>Not punched yet</em></span></div>
        ))}
      </div>
    </section>
    </>
  );
}
