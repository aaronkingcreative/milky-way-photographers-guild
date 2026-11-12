import Link from "next/link";
import { WEEKLY_SUBMISSION_LIMIT, weeklySubmissionsUnlimited } from "@/lib/images";
import { imageOfTheWeekName } from "@/lib/iotw";

export function WeeklySubmissionStatus({ filed, hasCandidate, iotwLabel }: { filed: number; hasCandidate: boolean; iotwLabel?: string }) {
  const unlimited = weeklySubmissionsUnlimited();
  const limit = WEEKLY_SUBMISSION_LIMIT ?? 0;
  const used = unlimited ? filed : Math.min(filed, limit);
  const iotw = iotwLabel ? imageOfTheWeekName(iotwLabel) : "Image of the Week";
  const iotwState = hasCandidate ? "Entry filed" : "Open for an entry";

  return <div className="fd-panel fd-weekly-status">
    <p className="fd-label fd-label-muted">This Week&apos;s Field Reports</p>
    {!unlimited && <div className="fd-weekly-bars" style={{ gridTemplateColumns: `repeat(${limit}, minmax(0, 1fr))` }}>{Array.from({ length: limit }, (_, i) => <span key={i} className={i < used ? "used" : ""} />)}</div>}
    <div className={`fd-weekly-count${unlimited ? " is-open" : ""}`}><span>{unlimited ? `${filed} filed this week` : `${used} of ${limit} used`}</span><strong>{iotwState}</strong></div>
    <p>{unlimited
      ? `Unlimited Guild images this week. One may be entered for ${iotw}. The week still turns over Sunday at 12:00 PM Mountain.`
      : `Up to ${limit} Guild images per week. One may be entered for ${iotw}. Slots reset Sunday at 12:00 PM Mountain.`}</p>
    <Link href="/submit" className="fd-text-link">File one now →</Link>
  </div>;
}
