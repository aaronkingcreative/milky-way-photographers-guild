import Link from "next/link";
import { imageOfTheWeekName, type IotwScheduleWeek, formatMountainDateParts, formatMountainShort } from "@/lib/iotw";

export function WinnersEmpty({ next }: { next: IotwScheduleWeek | null }) {
  const parts = next?.voting_closes_at ? formatMountainDateParts(next.voting_closes_at) : null;
  const closeLine = next
    ? `The first winner, ${imageOfTheWeekName(next.label)}, is announced ${formatMountainShort(next.voting_closes_at)}. Every week's winner will be listed here after that.`
    : "Every week's winner will be listed here once voting closes.";
  return (
    <div className="mw-winners-empty">
      <div className="mw-winners-empty-frame">
        {parts ? (
          <>
            <p className="mw-winners-empty-kicker">{parts.weekday}</p>
            <p className="mw-winners-empty-hero">{parts.headline}</p>
            <p className="mw-winners-empty-time">{parts.time}</p>
          </>
        ) : (
          <p className="mw-winners-empty-kicker">Image of the Week</p>
        )}
      </div>
      <div className="mw-winners-empty-copy">
        <p className="mw-winners-empty-title">The throne is waiting</p>
        <p className="mw-winners-empty-status">No winners crowned yet</p>
        <p className="mw-winners-empty-note mw-copy-natural">{closeLine}</p>
        <Link href="/feed" className="mw-btn-secondary mt-5 inline-block px-4 py-2 text-xs">Browse the Gallery</Link>
      </div>
    </div>
  );
}
