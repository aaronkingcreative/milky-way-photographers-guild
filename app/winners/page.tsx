import Link from "next/link";
import { KeepTail } from "@/components/KeepTail";
import { requireAccess } from "@/lib/guards";
import { formatMountainShort, getIotwSchedule } from "@/lib/iotw";
import { momentOfEnvyCopy } from "@/lib/public-copy";
import { IotwSchedule } from "@/components/iotw/IotwSchedule";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAvatarDisplay, publicMemberName } from "@/lib/avatar";
import { fetchDecidedIotwWeeks, type IotwDecidedWeek } from "@/lib/iotw-winners";

function votesText(n: number) {
  return `${n} ${n === 1 ? "vote" : "votes"}`;
}

function WinnerEntry({ week }: { week: IotwDecidedWeek }) {
  const w = week.winner!;
  const image = w.image;
  const name = publicMemberName(image?.profiles?.display_name, image?.profiles?.full_name);
  const avatar = getAvatarDisplay({ avatarPath: image?.profiles?.avatar_path, avatarUrl: image?.profiles?.avatar_url, displayName: name });
  const href = image ? `/images/${image.id}` : null;
  const thumb = image?.image_url ? <img src={image.image_url} alt={w.title} className="mw-winners-thumb" /> : <div className="mw-winners-thumb mw-winners-thumb-empty">Image unavailable</div>;
  return (
    <article className="mw-winners-entry card">
      {href ? <Link href={href} aria-label={`Open the field report for ${w.title}`}>{thumb}</Link> : thumb}
      <div className="mw-winners-body">
        <span className="mw-iotw-badge is-gold">IOTW {week.label} #1</span>
        <p className="eyebrow mt-2">{week.year}</p>
        <h2 className="mw-winners-title">{href ? <Link href={href}>{w.title}</Link> : w.title}</h2>
        <div className="mw-winners-by">
          <span className="mw-avatar-circle mw-winners-avatar">{avatar.avatarUrl ? <img src={avatar.avatarUrl} alt="" /> : avatar.initials || "G"}</span>
          <span>{name}</span>
        </div>
        <p className="mw-winners-votes">{votesText(w.votes)}{w.points ? ` · ${w.points} points` : ""}</p>
        {week.ballot.voting_closes_at && <p className="mw-winners-date">Crowned {formatMountainShort(week.ballot.voting_closes_at)}</p>}
        {week.placements.filter((p) => p.place > 1).length > 0 && (
          <ul className="mw-winners-runners">
            {week.placements.filter((p) => p.place > 1).map((p) => (
              <li key={p.place}>
                <span className={`mw-iotw-badge mw-iotw-badge-sm ${p.place === 2 ? "is-silver" : "is-bronze"}`}>IOTW {week.label} #{p.place}</span>
                {p.image ? <Link href={`/images/${p.image.id}`}>{p.title}</Link> : <span>{p.title}</span>}
                <span className="mw-winners-runner-by">{publicMemberName(p.image?.profiles?.display_name, p.image?.profiles?.full_name)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

export default async function Page() {
  await requireAccess();
  const supabase = await createServerSupabaseClient();
  const [weeks, schedule] = await Promise.all([fetchDecidedIotwWeeks(supabase), getIotwSchedule(supabase)]);
  const decided = weeks.filter((w) => w.winner);
  const next = schedule.voting || schedule.entry;
  return (
    <section className="mx-auto max-w-6xl px-5 py-14">
      <p className="eyebrow">Image of the Week</p>
      <h1 className="mt-2 font-display text-5xl uppercase">Image of the Week Winners</h1>
      <p className="mt-3 max-w-3xl text-white/68">Every Image of the Week winner, newest first. Open any winning image to read its field report.</p>
      <p className="mt-3 max-w-3xl text-white/68"><KeepTail text={momentOfEnvyCopy} /></p>
      <div className="max-w-3xl"><IotwSchedule entry={schedule.entry} voting={schedule.voting} /></div>
      {decided.length ? (
        <div className="mw-winners-list">{decided.map((w) => <WinnerEntry key={w.ballot.id} week={w} />)}</div>
      ) : (
        <div className="mw-winners-empty card">
          <p className="eyebrow">The throne is waiting</p>
          <h2 className="mt-2 font-display text-3xl uppercase text-[#f0bd66]">No winners crowned yet</h2>
          <p className="mt-3 text-white/68">
            {next ? `The first winner, Image of the Week ${next.label}, is announced ${formatMountainShort(next.voting_closes_at)}. Every week's winner will be listed here after that.` : "Every week's winner will be listed here once voting closes."}
          </p>
          <Link href="/feed" className="mw-btn-secondary mt-5 inline-block px-4 py-2 text-xs">Browse the Gallery</Link>
        </div>
      )}
    </section>
  );
}
