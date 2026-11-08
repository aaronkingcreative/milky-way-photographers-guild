import Link from "next/link";
import { streakLabel } from "@/lib/streak";

export type CloudHonor = { id: string; name: string; glyph: string };
type Climber = { id: string; name: string; avatarUrl: string | null; initials: string; streak?: number; count: number };

const MAX_MEDALS = 12;

/**
 * One portrait on the Ascent. On hover (fine pointers) the portrait grows 4x and the member's earned
 * Field Honors burst out around it as small medals, the same ring pattern as the Ivy Hall profile
 * badge ring: each medal is rotated to its clock position, pushed out along --orbit, then counter-rotated
 * so the glyph stays upright. Past MAX_MEDALS the last medal is "+N". A caption under the ring carries
 * the name, honor count, and Milky Way streak. Pure CSS, so it costs nothing until hovered.
 */
export function AscentFace({ member, rankLabel, honors, rowAnchor }: { member: Climber; rankLabel: string; honors: CloudHonor[]; rowAnchor: string }) {
  const overflow = honors.length > MAX_MEDALS;
  const shown = honors.slice(0, overflow ? MAX_MEDALS - 1 : MAX_MEDALS);
  const extra = honors.length - shown.length;
  const slots = shown.length + (extra ? 1 : 0);
  // Fan medals over the top 300 degrees of the circle, leaving the bottom for the caption.
  const span = slots <= 1 ? 0 : Math.min(300, (slots - 1) * 30);
  const angle = (i: number) => (slots <= 1 ? 0 : -span / 2 + (span / (slots - 1)) * i);
  const streak = streakLabel(member.streak);
  const honorsText = `${member.count} ${member.count === 1 ? "honor" : "honors"}`;
  return (
    <span className="mw-ascent-slot">
      <Link href={`/members/${member.id}`} className="mw-ascent-face" aria-label={`${member.name}, ${rankLabel}, ${honorsText}${streak ? `, ${streak}` : ""}`}>
        {member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : <span>{member.initials}</span>}
      </Link>
      <span className="mw-ascent-cloud" aria-hidden="true">
        {shown.map((h, i) => (
          <span key={h.id} className="mw-ascent-medal" style={{ ["--a" as any]: `${angle(i)}deg`, ["--i" as any]: i }} title={h.name}>{h.glyph}</span>
        ))}
        {extra > 0 && <span className="mw-ascent-medal is-more" style={{ ["--a" as any]: `${angle(slots - 1)}deg`, ["--i" as any]: slots - 1 }}>+{extra}</span>}
      </span>
      <span className="mw-ascent-caption" style={{ positionAnchor: rowAnchor }}>
        <b>{member.name}</b>
        <span>{honorsText}</span>
        {streak && <span className="mw-ascent-caption-streak">☄ {streak}</span>}
      </span>
    </span>
  );
}
