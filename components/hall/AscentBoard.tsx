import { AscentFace, type CloudHonor } from "@/components/hall/AscentFace";
import { compareAscentClimbers } from "@/lib/ascent-order";
import { RANKS } from "@/lib/ranks";

export type AscentClimber = {
  id: string;
  name: string;
  avatarUrl: string | null;
  initials: string;
  streak?: number;
  count: number;
};

const TIER_MARKS = ["·", "I", "II", "III", "IV", "★"];

/**
 * The Ascent, the Guild Hall's featured board. Six ranks rise left to right like a staircase,
 * with Master at the summit. Every climber shows, so there is never a "+N".
 * On phones the ranks stack with Master on top.
 */
export function AscentBoard({ ascent, cloudHonors }: { ascent: Map<string, AscentClimber[]>; cloudHonors: Map<string, CloudHonor[]> }) {
  return (
    <section className="mw-ascent-board mw-ascent-featured mb-10" aria-labelledby="mw-ascent-title">
      <div className="mw-ascent-heading">
        <div className="mw-ascent-heading-copy">
          <p className="mw-ascent-label">The Ascent</p>
          <h2 id="mw-ascent-title" className="mw-ascent-title">Climb from Unranked to&nbsp;Master</h2>
          <p className="mw-ascent-helper">
            Every Field Honor you earn moves you up the mountain.{" "}
            <span className="mw-ascent-hint-hover">Hover a face to meet the climber, or click it to visit their&nbsp;profile.</span>
            <span className="mw-ascent-hint-touch">Tap a face to visit that climber&apos;s&nbsp;profile.</span>
          </p>
        </div>
      </div>
      <ol className="mw-ascent-track">
        {RANKS.map((rank, index) => {
          const climbers = (ascent.get(rank.label) || []).toSorted(compareAscentClimbers);
          const isSummit = index === RANKS.length - 1;
          return (
            <li key={rank.label} className={`mw-ascent-step ${climbers.length ? "" : "is-empty"} ${isSummit ? "is-summit" : ""}`} style={{ ["--step" as string]: index }}>
              <div className="mw-ascent-node">
                <span className="mw-ascent-dot" aria-hidden="true">{TIER_MARKS[index]}</span>
                <span className="mw-ascent-rank">{rank.label}</span>
                <span className="mw-ascent-range">{rank.range}</span>
                <span className="mw-ascent-count">{climbers.length ? `${climbers.length} ${climbers.length === 1 ? "climber" : "climbers"}` : "Open"}</span>
              </div>
              <div className="mw-ascent-faces">
                {climbers.map((member) => (
                  <AscentFace key={member.id} member={member} rankLabel={rank.label} honors={cloudHonors.get(member.id) || []} />
                ))}
                {!climbers.length && <span className="mw-ascent-open">{isSummit ? "The summit is waiting" : "Be the first here"}</span>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
