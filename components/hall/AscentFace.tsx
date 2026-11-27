import Link from "next/link";
import { streakLabel } from "@/lib/streak";

export type CloudHonor = { id: string; name: string; glyph: string };
type Climber = { id: string; name: string; avatarUrl: string | null; initials: string; streak?: number; count: number };

/**
 * One portrait on the Ascent. Tapping it opens the member's profile.
 * On hover (fine pointers) or keyboard focus, AvatarHoverLayer shows the portrait about 3x larger
 * with the member's earned Field Honors ringed around the big circle and a caption under it.
 * The honors never curl around the small face itself, where they could not read.
 */
export function AscentFace({ member, rankLabel, honors }: { member: Climber; rankLabel: string; honors: CloudHonor[] }) {
  const streak = streakLabel(member.streak);
  const honorsText = `${member.count} Field ${member.count === 1 ? "Honor" : "Honors"}`;
  const meta = [rankLabel, honorsText, streak ? `☄ ${streak}` : ""].filter(Boolean).join(" · ");
  return (
    <span className="mw-ascent-slot">
      <Link
        href={`/members/${member.id}`}
        className="mw-ascent-face"
        aria-label={`${member.name}, ${rankLabel}, ${honorsText}${streak ? `, ${streak}` : ""}`}
        data-avatar-hover=""
        data-avatar-hover-name={member.name}
        data-avatar-hover-meta={meta}
        data-avatar-hover-honors={honors.length ? JSON.stringify(honors.map((h) => ({ g: h.glyph, n: h.name }))) : undefined}
      >
        {member.avatarUrl ? <img src={member.avatarUrl} alt="" loading="lazy" decoding="async" /> : <span>{member.initials}</span>}
      </Link>
    </span>
  );
}
