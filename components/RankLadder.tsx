import { rankHonorRanges } from "@/lib/achievements";

/** Five stored ranks with their honor spans, tied by a thin rule. */
export function RankLadder() {
  const ranks = rankHonorRanges();
  return (
    <ol className="mw-rank-ladder">
      {ranks.map((rank) => (
        <li key={rank.short}>
          <strong>{rank.short}</strong>
          <span>{rank.honors}</span>
        </li>
      ))}
    </ol>
  );
}
