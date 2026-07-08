import Link from "next/link";

export function WeeklySubmissionStatus({ remaining, hasCandidate }: { remaining: number; hasCandidate: boolean }) {
  const used = 3 - remaining;

  return <div className="fd-panel fd-weekly-status">
    <p className="fd-label fd-label-muted">This Week&apos;s Field Reports</p>
    <div className="fd-weekly-bars">{[0, 1, 2].map((i) => <span key={i} className={i < used ? "used" : ""} />)}</div>
    <div className="fd-weekly-count"><span>{used} of 3 used</span><strong>{hasCandidate ? "IOTW candidate set" : "IOTW candidate open"}</strong></div>
    <p>Up to 3 Guild images per week. One may be entered for Image of the Week.</p>
    <Link href="/submit">+ New Field Report</Link>
  </div>;
}
