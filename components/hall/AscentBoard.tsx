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

export function AscentBoard({ ascent, cloudHonors }: { ascent: Map<string, AscentClimber[]>; cloudHonors: Map<string, CloudHonor[]> }) {
  return (
    <section className="mw-ascent-board mb-10">
      <div className="mw-ascent-heading">
        <p className="mw-ascent-label">The Ascent</p>
        <p className="mw-ascent-helper">Every guildie&apos;s climb toward Master. Tap a face to visit their profile.</p>
      </div>
      <ol className="mw-ascent-track">
        {RANKS.map((rank, index) => {
          const climbers = (ascent.get(rank.label) || []).toSorted(compareAscentClimbers);
          const rowAnchor = `--rank${index}`;
          return (
            <li key={rank.label} className={`mw-ascent-step ${climbers.length ? "" : "is-empty"}`}>
              <div className="mw-ascent-node">
                <span className="mw-ascent-dot" />
                <span className="mw-ascent-rank">{rank.label}</span>
                <span className="mw-ascent-range">{rank.range}</span>
              </div>
              <div className="mw-ascent-faces" style={{ anchorName: rowAnchor }}>
                {climbers.map((member) => (
                  <AscentFace key={member.id} member={member} rankLabel={rank.label} honors={cloudHonors.get(member.id) || []} rowAnchor={rowAnchor} />
                ))}
                {!climbers.length && <span className="mw-ascent-open">Open</span>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
