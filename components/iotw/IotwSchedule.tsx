import type { ReactNode } from "react";
import { OpenVoteButton } from "@/components/images/OpenVoteButton";
import { formatMountainShort, imageOfTheWeekName, type IotwScheduleWeek } from "@/lib/iotw";

export type BallotThumb = { id: string; image_url: string | null; title: string };

/**
 * The week being voted on and the week taking entries, in two panels.
 * Ballot photos and the vote button stay in Voting now. Entry photos stay in Open for entries.
 */
export function IotwSchedule({
  entry,
  voting,
  compact = false,
  ballotThumbs = [],
  hasVote = false,
  entryImages = null,
}: {
  entry: IotwScheduleWeek;
  voting: IotwScheduleWeek | null;
  compact?: boolean;
  ballotThumbs?: BallotThumb[];
  hasVote?: boolean;
  entryImages?: ReactNode;
}) {
  const shown = ballotThumbs.filter((thumb) => thumb.image_url).slice(0, 4);
  return (
    <div className={compact ? "mw-iotw-schedule mw-iotw-schedule-compact" : "mw-iotw-schedule"}>
      <div className="mw-iotw-phase mw-iotw-phase-vote">
        <span className="mw-iotw-phase-tag">Voting now</span>
        {voting ? (
          <>
            <strong>{imageOfTheWeekName(voting.label)}</strong>
            <small>Voting closes {formatMountainShort(voting.voting_closes_at)}, winner announced&nbsp;then.</small>
            {shown.length > 0 ? (
              <>
                <p className="mw-iotw-ballot-note">These photos are on the ballot being voted on now.</p>
                <div className="mw-iotw-ballot-thumbs">
                  {shown.map((thumb) => (
                    <img key={thumb.id} src={thumb.image_url || ""} alt={thumb.title || "Ballot photo"} />
                  ))}
                </div>
              </>
            ) : (
              <p className="mw-iotw-ballot-note">This ballot is a different week from the photos still open for entries.</p>
            )}
            {!compact && <OpenVoteButton className="mw-btn-secondary mw-iotw-ballot-cta" label={hasVote ? "Edit your vote" : "See this week's ballot"} />}
          </>
        ) : (
          <>
            <strong>No week on the ballot yet</strong>
            <small>{imageOfTheWeekName(entry.label)} voting opens {formatMountainShort(entry.voting_opens_at)}.</small>
          </>
        )}
      </div>
      <div className="mw-iotw-phase mw-iotw-phase-entry">
        <span className="mw-iotw-phase-tag">Open for entries</span>
        <strong>{imageOfTheWeekName(entry.label)}</strong>
        <small>These photos are next week&apos;s entries, not the ballot. Entries close {formatMountainShort(entry.entries_close_at)}. Voting on them runs until {formatMountainShort(entry.voting_closes_at)}.</small>
        {entryImages}
      </div>
    </div>
  );
}
