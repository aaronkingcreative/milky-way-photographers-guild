import Image from "next/image";
import Link from "next/link";
import { AccessNeededPanel } from "@/components/Cards";
import { WeeklySubmissionStatus } from "@/components/images/WeeklySubmissionStatus";
import { getWeekStart, SUBMISSION_LIMIT } from "@/lib/images";
import { requireLogin } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const ranks = ["Beginner", "Amateur", "Novice", "Veteran", "Master"];
const honors = [
  ["★", "First Light", true],
  ["✦", "Helpful Eye", true],
  ["☄", "Storyteller", false],
  ["◎", "Clean Craft", false],
  ["♛", "IOTW Crown", false],
  ["◫", "Composition", false],
] as const;

function nameFor(image: any) {
  return image?.display_name || image?.photographer_name || "Guild photographer";
}

function reportMeta(image: any, reactions: any[]) {
  const total = reactions.filter((r) => r.image_id === image.id).length;
  const date = image.capture_date ? new Date(`${image.capture_date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Field report";
  return `${date}, ${total} reactions`;
}

function imageLocation(image: any) {
  return [image.specific_location_name, image.state_or_province, image.country].filter(Boolean).join(", ");
}

function FieldDeskLabel({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return <span className={muted ? "fd-label fd-label-muted" : "fd-label"}>{children}</span>;
}

function WinnerSlot({ image, place, featured, reactions }: { image: any; place: "1" | "2" | "3"; featured?: boolean; reactions: any[] }) {
  if (!image) {
    return <div className={featured ? "fd-winner fd-winner-featured" : "fd-winner"}><div className={featured ? "fd-empty fd-empty-featured" : "fd-empty"}>Awaiting winner</div></div>;
  }

  const total = reactions.filter((r) => r.image_id === image.id).length;

  return (
    <Link href={`/images/${image.id}`} className={featured ? "fd-winner fd-winner-featured" : "fd-winner"}>
      {featured && <div className="fd-crown">♛</div>}
      <div className={featured ? "fd-winner-image fd-winner-image-featured" : "fd-winner-image"}>
        <img src={image.image_url} alt={image.title || "Guild image"} />
        <span className={`fd-place fd-place-${place}`}>{place}</span>
        {featured && <div className="fd-winner-overlay"><span>Image of the Week</span><h3>{image.title}</h3><p>{nameFor(image)}, {total} votes</p></div>}
      </div>
      {!featured && <><h3>{image.title}</h3><p>{nameFor(image)}, {total} reactions</p></>}
    </Link>
  );
}

function ContenderPreview({ image }: { image: any }) {
  return (
    <Link href={`/images/${image.id}`} className="fd-contender-card">
      <img src={image.image_url} alt={image.title || "Guild image"} />
      <div className="fd-contender-shade" />
      {image.is_weekly_candidate && <span className="fd-ribbon">IOTW Contender</span>}
      <div className="fd-contender-copy"><h3>{image.title}</h3><p>{nameFor(image)}</p></div>
      <span className="fd-view">View →</span>
    </Link>
  );
}

export default async function Page() {
  const { hasAccess, user } = await requireLogin();
  const supabase = await createServerSupabaseClient();
  let latest: any[] = [], reactions: any[] = [], remaining = 0, hasCandidate = false, myCount = 0, candidateCount = 0;

  if (hasAccess && user) {
    const week = getWeekStart();
    const [{ data: imgs }, { data: rx }, { count }, { count: cand }, { count: mine }] = await Promise.all([
      supabase.from("guild_images").select("*").is("hidden_at", null).is("deleted_at", null).order("created_at", { ascending: false }).limit(9),
      supabase.from("image_reactions").select("image_id,reaction_type"),
      supabase.from("guild_images").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("week_starts_on", week).is("deleted_at", null),
      supabase.from("guild_images").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("week_starts_on", week).eq("is_weekly_candidate", true).is("deleted_at", null),
      supabase.from("guild_images").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("deleted_at", null),
    ]);
    latest = imgs || [];
    reactions = rx || [];
    remaining = Math.max(0, SUBMISSION_LIMIT - (count || 0));
    hasCandidate = (cand || 0) > 0;
    myCount = mine || 0;
    candidateCount = latest.filter((i) => i.is_weekly_candidate).length;
  }

  const first = (user?.user_metadata?.display_name || user?.email || "Guild member").split(/[ @]/)[0];
  const top = latest.slice(0, 3);
  const contenders = latest.filter((i) => i.is_weekly_candidate);
  const contendersPreview = (contenders.length ? contenders : latest).slice(0, contenders.length === 1 ? 1 : 3);

  return <section className="mw-page-wide fd-page">{hasAccess ? <>
    <div className="fd-intro">
      <div>
        <div className="fd-kicker-with-icon"><Image src="/launch/mwpg/MWPG_Logo_FAVICON.png" alt="" width={20} height={20} /><FieldDeskLabel>Your Field Desk</FieldDeskLabel></div>
        <h1>Welcome back, {first}.</h1>
        <p>Your standing in the Guild, this week&apos;s contenders, and the honors you&apos;re chasing.</p>
      </div>
      <Link className="fd-outline-button" href="/submit">File a Field Report</Link>
    </div>

    <section className="fd-panel fd-standing">
      <div className="fd-standing-head"><div><FieldDeskLabel muted>Guild Standing</FieldDeskLabel><h2>Veteran Milky Way Photographer</h2></div><div className="fd-next-rank"><span>Next rank</span><strong>Master <small>4 honors to go</small></strong></div></div>
      <div className="fd-rank-track"><div className="fd-rank-line" />{ranks.map((r, i) => <div key={r} className="fd-rank-step"><span className={i < 4 ? `complete ${i === 3 ? "active" : ""}` : ""} /><strong className={i < 4 ? "complete" : ""}>{r}</strong></div>)}</div>
    </section>

    <section className="fd-stats">{[[myCount, "Guild Submissions"], [2, "Achievements Earned"], [reactions.length, "Reactions Received"], [0, "Image of the Week Wins"]].map(([n, l], i) => <div key={l} className="fd-stat-card"><strong className={i % 2 ? "gold" : ""}>{n}</strong><span>{l}</span></div>)}</section>

    <section className="fd-panel fd-throne"><div className="fd-section-head"><span>✪</span><FieldDeskLabel>The Winners&apos; Throne</FieldDeskLabel><p>Last week&apos;s Image of the Week, the Top 3</p></div><div className="fd-throne-grid"><WinnerSlot image={top[1]} place="2" reactions={reactions} /><WinnerSlot image={top[0]} place="1" featured reactions={reactions} /><WinnerSlot image={top[2]} place="3" reactions={reactions} /></div></section>

    <div className="fd-main-grid"><section className="fd-panel fd-phavorite"><div className="fd-section-head"><span>✪</span><FieldDeskLabel>Photog Phavorite, Moment of Envy</FieldDeskLabel></div>{top[0] ? <Link href={`/images/${top[0].id}`} className="fd-phavorite-image"><img src={top[0].image_url} alt={top[0].title || "Guild image"} /><div /><span className="fd-video-chip">▶ Envy Video</span><div className="fd-phavorite-copy"><span>Aaron&apos;s Phavorite</span><h3>{top[0].title}</h3><p>{nameFor(top[0])}{imageLocation(top[0]) ? `, ${imageLocation(top[0])}` : ""}</p></div></Link> : <div className="fd-empty fd-empty-large">Aaron&apos;s Phavorite will appear here once images are available.</div>}<div className="fd-phavorite-foot"><p>Aaron&apos;s personal pick from outside the Top 3, awarded its own Moment of Envy video</p>{top[0] && <Link href={`/images/${top[0].id}`}>View →</Link>}</div></section>
      <div className="fd-side-stack"><WeeklySubmissionStatus remaining={remaining} hasCandidate={hasCandidate} /><section className="fd-panel fd-recent"><FieldDeskLabel muted>Your Recent Reports</FieldDeskLabel><div>{latest.slice(0, 3).map((i) => <Link key={i.id} href={`/images/${i.id}`}><img src={i.image_url} alt="" /><span><strong>{i.title}</strong><small>{reportMeta(i, reactions)}</small></span></Link>)}{!latest.length && <p>No recent reports yet.</p>}</div></section></div>
    </div>

    <section className="fd-panel fd-honors"><div className="fd-honors-head"><div><FieldDeskLabel muted>Field Honors</FieldDeskLabel><span>2 earned</span></div><Link href="/profile">View All Honors →</Link></div><div className="fd-honor-legend"><span><i className="earned" />Earned</span><span><i />Locked</span></div><div className="fd-honor-grid">{honors.map(([g, n, e]) => <div key={n}><div className={e ? "fd-honor-badge earned" : "fd-honor-badge"}>{g}</div><p>{n}</p></div>)}</div></section>

    <section className="fd-contenders"><div className="fd-contender-head"><div><FieldDeskLabel muted>This Week&apos;s Contenders</FieldDeskLabel><span>{candidateCount ? `${candidateCount} active` : "Cast your vote in the Gallery"}</span></div><Link href="/feed">Open Gallery →</Link></div>{contendersPreview.length ? <div className={contendersPreview.length === 1 ? "fd-contender-grid fd-contender-grid-single" : "fd-contender-grid"}>{contendersPreview.map((i) => <ContenderPreview key={i.id} image={i} />)}</div> : <div className="fd-panel fd-empty fd-empty-large">No contenders have been filed yet.</div>}</section>
  </> : <div className="mt-8"><AccessNeededPanel /></div>}</section>;
}
