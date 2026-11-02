import { formatMountainShort, type IotwScheduleWeek } from "@/lib/iotw";

/** Both Image of the Week phases, side by side: the week being voted on and the week taking entries. */
export function IotwSchedule({ entry, voting, compact = false }: { entry: IotwScheduleWeek; voting: IotwScheduleWeek | null; compact?: boolean }) {
  return <div className={compact ? "mw-iotw-schedule mw-iotw-schedule-compact" : "mw-iotw-schedule"}>
    <div className="mw-iotw-phase mw-iotw-phase-vote">
      <span className="mw-iotw-phase-tag">Voting now</span>
      {voting ? <><strong>IOTW {voting.label}</strong><small>Voting closes {formatMountainShort(voting.voting_closes_at)}, winner announced then.</small></>
        : <><strong>No week on the ballot yet</strong><small>IOTW {entry.label} voting opens {formatMountainShort(entry.voting_opens_at)}.</small></>}
    </div>
    <div className="mw-iotw-phase mw-iotw-phase-entry">
      <span className="mw-iotw-phase-tag">Open for entries</span>
      <strong>IOTW {entry.label}</strong>
      <small>Entries close {formatMountainShort(entry.entries_close_at)}. Voting runs until {formatMountainShort(entry.voting_closes_at)}.</small>
    </div>
  </div>;
}
