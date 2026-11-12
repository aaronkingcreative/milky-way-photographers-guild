import Link from "next/link";
import { imageOfTheWeekName, type IotwScheduleWeek, formatMountainDeadline } from "@/lib/iotw";

export function WinnersEmpty({ next }: { next: IotwScheduleWeek | null }) {
  const weekName = next ? imageOfTheWeekName(next.label) : null;
  const closeLine = next
    ? `The ${weekName} vote closes ${formatMountainDeadline(next.voting_closes_at)}. The first winner is listed here after that.`
    : "Every week's winner will be listed here once voting closes.";
  return (
    <div className="mw-winners-empty">
      <p className="mw-winners-empty-status">No winners crowned yet</p>
      <p className="mw-winners-empty-note mw-copy-natural">{closeLine}</p>
      <Link href="/feed" className="mw-btn-secondary mt-5 inline-block px-4 py-2 text-xs">Browse the Gallery</Link>
    </div>
  );
}
