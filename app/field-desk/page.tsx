import Image from "next/image";
import Link from "next/link";
import { AccessNeededPanel } from "@/components/Cards";
import { keepLastTwo } from "@/lib/keep-last-two";
import { WeeklySubmissionStatus } from "@/components/images/WeeklySubmissionStatus";
import { getWeekStart } from "@/lib/images";
import { requireLogin } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { badgeTone, fetchIotwBadges } from "@/lib/iotw-badges";
import { getMemberStats } from "@/lib/member-stats";
import { fetchWinningImageIds } from "@/lib/ranks";
import { publicMemberName } from "@/lib/avatar";
import { formatMountainShort, getIotwSchedule, imageOfTheWeekName } from "@/lib/iotw";
import { fetchDecidedIotwWeeks, fetchLatestPhotogPhavorite, type IotwDecidedWeek, type IotwPlacement, type PhotogPhavoritePick } from "@/lib/iotw-winners";
import { IotwSchedule, type BallotThumb } from "@/components/iotw/IotwSchedule";
import { fieldDeskGreeting, fieldDeskHonorBadges, fieldDeskHonorCatalog, honorsToGo, rankProgressPercent } from "@/lib/member-labels";
import { momentOfEnvyCopy, momentOfEnvyPending } from "@/lib/public-copy";
import { countReceivedReactions } from "@/lib/received-reactions";
import { fetchOwnReportPage } from "@/lib/own-reports";
import { OwnReportsPanel } from "@/components/field-desk/OwnReports";
import { PendingBand } from "@/components/field-desk/PendingBand";

function nameFor(image: any) {
  return publicMemberName(image?.profiles?.display_name, image?.profiles?.full_name, image?.display_name, image?.photographer_name);
}

function FieldDeskLabel({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return <span className={muted ? "fd-label fd-label-muted" : "fd-label"}>{children}</span>;
}

function WinnerSlot({ placement, place, featured, weekLabel }: { placement: IotwPlacement | null; place: "1" | "2" | "3"; featured?: boolean; weekLabel?: string }) {
  const image = placement?.image;
  if (!placement || !image) {
    return <div className={featured ? "fd-winner fd-winner-featured" : "fd-winner"}><div className={featured ? "fd-empty fd-empty-featured" : "fd-empty"}>Awaiting winner</div></div>;
  }
  const votes = `${placement.votes} ${placement.votes === 1 ? "vote" : "votes"}`;

  return (
    <Link href={`/images/${image.id}`} className={featured ? "fd-winner fd-winner-featured" : "fd-winner"}>
      {featured && <div className="fd-crown">♛</div>}
      <div className={featured ? "fd-winner-image fd-winner-image-featured" : "fd-winner-image"}>
        <img src={image.image_url} alt={placement.title || "Guild image"} />
        <span className={`fd-place fd-place-${place}`}>{place}</span>
        {featured && <div className="fd-winner-overlay"><span className="mw-iotw-badge is-gold">{weekLabel ? `IOTW ${weekLabel} #1` : "Image of the Week"}</span><h3>{placement.title}</h3><p>{nameFor(image)}, {votes}</p></div>}
      </div>
      {!featured && <>{weekLabel && <span className={`mw-iotw-badge mw-iotw-badge-sm ${place === "2" ? "is-silver" : "is-bronze"}`}>IOTW {weekLabel} #{place}</span>}<h3>{placement.title}</h3><p>{nameFor(image)}, {votes}</p></>}
    </Link>
  );
}

async function loadBallotThumbs(supabase: any, ballotId: string): Promise<BallotThumb[]> {
  const { data: entries } = await supabase.from("iotw_ballot_entries").select("field_report_id,submitted_at").eq("ballot_id", ballotId).order("submitted_at", { ascending: false }).limit(4);
  const reportIds = (entries || []).map((entry: any) => entry.field_report_id);
  if (!reportIds.length) return [];
  const { data: reports } = await supabase.from("field_reports").select("id,guild_image_id,title").in("id", reportIds);
  const imageIds = (reports || []).map((report: any) => report.guild_image_id).filter(Boolean);
  if (!imageIds.length) return [];
  const { data: images } = await supabase.from("guild_images").select("id,image_url,title").in("id", imageIds).is("hidden_at", null).is("deleted_at", null);
  return (images || []).map((image: any) => ({ id: image.id, image_url: image.image_url || null, title: image.title || "Ballot photo" }));
}

function ContenderPreview({ image }: { image: any }) {
  return (
    <Link href={`/images/${image.id}`} className="fd-contender-card">
      <img src={image.image_url} alt={image.title || "Guild image"} />
      <div className="fd-contender-shade" />
      {image.iotw_badge ? <span className={`fd-ribbon mw-iotw-badge ${badgeTone(image.iotw_badge)}`}>{image.iotw_badge.label}</span> : image.is_weekly_candidate && <span className="fd-ribbon">IOTW Contender</span>}
      <div className="fd-contender-copy"><h3>{image.title}</h3><p>{nameFor(image)}</p></div>
      <span className="fd-view">View →</span>
    </Link>
  );
}

export default async function Page() {
  const { hasAccess, user } = await requireLogin();
  const supabase = await createServerSupabaseClient();
  let iotwSchedule: Awaited<ReturnType<typeof getIotwSchedule>> | null = null;
  let filedThisWeek = 0, hasCandidate = false, myCount = 0, candidateCount = 0, stats: any = null, iotwWins = 0, receivedReactions = 0;
  let ownReports: Awaited<ReturnType<typeof fetchOwnReportPage>> = { ok: true, reports: [], next: null };
  let lastWeek: IotwDecidedWeek | null = null, contenders: any[] = [];
  let phavorite: PhotogPhavoritePick | null = null;
  let hasVote = false;
  let ballotThumbs: BallotThumb[] = [];

  if (hasAccess && user) {
    const week = getWeekStart();
    const [{ count }, { count: cand }, { count: mine }, memberStats, received] = await Promise.all([
      supabase.from("guild_images").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("week_starts_on", week).is("deleted_at", null),
      supabase.from("guild_images").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("week_starts_on", week).eq("is_weekly_candidate", true).is("deleted_at", null),
      supabase.from("guild_images").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("deleted_at", null),
      getMemberStats(supabase, user),
      countReceivedReactions(supabase, user.id),
    ]);
    receivedReactions = received;
    phavorite = await fetchLatestPhotogPhavorite(supabase).catch(() => null);
    ownReports = await fetchOwnReportPage(supabase, user.id, null);
    filedThisWeek = count || 0;
    hasCandidate = (cand || 0) > 0;
    myCount = mine || 0;
    const [winningIds, { data: myImageIds }] = await Promise.all([fetchWinningImageIds(supabase), supabase.from("guild_images").select("id").eq("user_id", user.id).is("deleted_at", null)]);
    iotwWins = (myImageIds || []).filter((row: any) => winningIds.has(row.id)).length;
    stats = memberStats;
    const [schedule, decided] = await Promise.all([getIotwSchedule(supabase), fetchDecidedIotwWeeks(supabase, 1)]);
    iotwSchedule = schedule;
    lastWeek = decided[0] || null;
    // Contenders are the field reports entered for the week taking entries (IOTW Week N).
    if (schedule.entry.id) {
      const { data: entries } = await supabase.from("iotw_ballot_entries").select("field_report_id,submitted_at").eq("ballot_id", schedule.entry.id).order("submitted_at", { ascending: false });
      candidateCount = entries?.length || 0;
      const reportIds = (entries || []).map((e: any) => e.field_report_id);
      if (reportIds.length) {
        const { data: reports } = await supabase.from("field_reports").select("id,guild_image_id").in("id", reportIds);
        const imageIds = (reports || []).map((r: any) => r.guild_image_id).filter(Boolean);
        const { data: imgs2 } = imageIds.length ? await supabase.from("guild_images").select("*, profiles:member_profiles(display_name,full_name,avatar_url,avatar_path)").in("id", imageIds).is("hidden_at", null).is("deleted_at", null) : { data: [] };
        const order = new Map<string, number>((reports || []).map((r: any) => [r.guild_image_id, reportIds.indexOf(r.id)]));
        const badges = await fetchIotwBadges(supabase, (imgs2 || []).map((i: any) => i.id)).catch(() => new Map());
        contenders = (imgs2 || []).map((i: any) => ({ ...i, is_weekly_candidate: true, iotw_badge: badges.get(i.id) || null })).sort((a: any, b: any) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
      }
    }
    if (schedule.voting?.id) {
      const [{ data: voteRow }, thumbs] = await Promise.all([
        supabase.from("iotw_votes").select("ballot_id").eq("ballot_id", schedule.voting.id).eq("voter_user_id", user.id).maybeSingle(),
        loadBallotThumbs(supabase, schedule.voting.id),
      ]);
      hasVote = Boolean(voteRow);
      ballotThumbs = thumbs;
    }
  }

  const first = stats?.first_name || "Guild member";
  const earnedHonors = stats?.earned_honors ?? [];
  const honorBadges = fieldDeskHonorBadges(earnedHonors, fieldDeskHonorCatalog());
  const honorCount = earnedHonors.length;
  const contendersPreview = contenders.slice(0, contenders.length === 1 ? 1 : 3);
  const entryLabel = iotwSchedule?.entry.label;
  const place = (n: 1 | 2 | 3) => lastWeek?.placements.find((p) => p.place === n) || null;
  const pending = iotwSchedule?.voting || iotwSchedule?.entry || null;
  const throneCopy = lastWeek ? `${imageOfTheWeekName(lastWeek.label)} winner and the Top 3` : pending ? `${imageOfTheWeekName(pending.label)} winner is announced ${formatMountainShort(pending.voting_closes_at)}` : "The first Image of the Week winner will appear here";
  const contenderCopy = entryLabel ? `${candidateCount} entered${iotwSchedule ? `, entries close ${formatMountainShort(iotwSchedule.entry.entries_close_at)}` : ""}` : "Cast your vote in the Gallery";

  return <section className="mw-page-wide fd-page">{hasAccess ? <>
    <div className="fd-intro">
      <div>
        <div className="fd-kicker-with-icon"><Image src="/launch/mwpg/MWPG_Logo_FAVICON.png" alt="" width={20} height={20} /><FieldDeskLabel>Your Field Desk</FieldDeskLabel></div>
        <h1>{keepLastTwo(fieldDeskGreeting(first))}</h1>
        <p className="fd-rank-now">{stats?.rank || "Unranked"}</p>
        <div className="fd-rank-progress">
          <span className="fd-rank-progress-track" aria-hidden="true"><span className="fd-rank-progress-fill" style={{ width: `${rankProgressPercent(honorCount, stats?.honors_to_next_rank ?? 0, Boolean(stats?.next_rank))}%` }} /></span>
          <span className="fd-rank-progress-label">{stats?.next_rank ? `${stats.next_rank}, ${honorsToGo(stats.honors_to_next_rank)}` : "Rank reached"}</span>
        </div>
        <p className="mw-copy-natural">{keepLastTwo("Your standing in the Guild, this week's contenders, and the honors you're chasing.")}</p>
      </div>
      <Link className="fd-outline-button" href="/submit">File a Field Report</Link>
    </div>
    <nav className="fd-learn" aria-label="Learn">
      <Link href="/courses">Courses</Link>
      <Link href="/resources">Resources</Link>
    </nav>


    <section className="fd-contenders"><div className="fd-contender-head"><div><FieldDeskLabel muted>Two weeks at once</FieldDeskLabel><span>Voting is one week. The photos in Open for entries are the next week, not the&nbsp;ballot. {contenderCopy}</span></div><Link href="/feed">Open Gallery →</Link></div>{iotwSchedule ? <IotwSchedule entry={iotwSchedule.entry} voting={iotwSchedule.voting} ballotThumbs={ballotThumbs} hasVote={hasVote} entryImages={contendersPreview.length ? <div className={contendersPreview.length === 1 ? "fd-contender-grid fd-contender-grid-single" : "fd-contender-grid"}>{contendersPreview.map((i) => <ContenderPreview key={i.id} image={i} />)}</div> : <p className="fd-pending-inline">{entryLabel ? `No entries for ${imageOfTheWeekName(entryLabel)} yet. File a field report before entries close.` : "No entries have been filed yet."}</p>} /> : <p className="fd-pending-inline">No Image of the Week is open yet.</p>}</section>

    <section className="fd-stats">{([[myCount, "Guild Submissions", "Your first field report starts the climb."], [honorCount, "Field Honors earned", "Claim an honor when you file a report."], [receivedReactions, "Reactions Received", "Reactions arrive as the Guild sees your work."], [iotwWins, "Image of the Week Wins", "Enter a contender this week."]] as [number, string, string][]).map(([n, l, hint], i) => <div key={l} className="fd-stat-card"><strong className={i % 2 ? "gold" : ""}>{n}</strong><span>{l}</span>{!n && <small className="fd-stat-hint">{hint}</small>}</div>)}</section>

    {lastWeek ? (
      <section className="fd-panel fd-throne"><div className="fd-section-head"><span>✪</span><FieldDeskLabel>The Winners&apos; Throne</FieldDeskLabel><p>{throneCopy}</p><Link href="/winners" className="fd-throne-archive">All winners →</Link></div><div className="fd-throne-grid"><WinnerSlot placement={place(2)} place="2" weekLabel={lastWeek?.label} /><WinnerSlot placement={place(1)} place="1" featured weekLabel={lastWeek?.label} /><WinnerSlot placement={place(3)} place="3" weekLabel={lastWeek?.label} /></div></section>
    ) : (
      <PendingBand label="The Winners' Throne" message={throneCopy} actionHref="/feed" actionLabel="See this week's ballot" />
    )}

    <div className="fd-main-grid">{phavorite ? <section className="fd-panel fd-phavorite"><div className="fd-section-head"><span>✪</span><FieldDeskLabel>Photog Phavorite, Moment of Envy</FieldDeskLabel></div><Link href={`/images/${phavorite.imageId}`} className="fd-phavorite-image"><img src={phavorite.imageUrl} alt={phavorite.title} /><div /><div className="fd-phavorite-copy"><span>Photog Phavorite</span><h3>{phavorite.title}</h3><p>{phavorite.photographerName}{phavorite.location ? `, ${phavorite.location}` : ""}{phavorite.weekLabel ? `, ${imageOfTheWeekName(phavorite.weekLabel)}` : ""}</p></div></Link><div className="fd-phavorite-foot"><p className="mw-copy-natural">{keepLastTwo(momentOfEnvyCopy)}</p><Link href={`/images/${phavorite.imageId}`}>View →</Link></div></section> : <PendingBand label={"Photog Phavorite, Moment of\u00A0Envy"} message={momentOfEnvyPending} footnote={momentOfEnvyCopy} />}<div className="fd-side-stack"><WeeklySubmissionStatus filed={filedThisWeek} hasCandidate={hasCandidate} iotwLabel={iotwSchedule?.entry.label} /><OwnReportsPanel initial={ownReports.reports} initialNext={ownReports.next} initialError={!ownReports.ok} /></div></div>

    <section className="fd-panel fd-honors"><div className="fd-honors-head"><div><FieldDeskLabel muted>Field Honors</FieldDeskLabel><span>{honorCount} earned</span></div><Link href="/progress">View All Honors →</Link></div><div className="fd-honor-legend"><span><i className="earned" />Earned</span><span><i />Locked</span></div><div className="fd-honor-grid">{honorBadges.map((badge) => <div key={badge.id} aria-label={`${badge.name}, ${badge.earned ? "earned" : "locked"}`}><div className={badge.earned ? "fd-honor-badge earned" : "fd-honor-badge"}>{badge.glyph}</div><p>{badge.name.replaceAll("Milky Way", "Milky\u00A0Way")}</p></div>)}</div></section>
  </> : <div className="mt-8"><AccessNeededPanel /></div>}</section>;
}
