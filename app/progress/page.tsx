import Image from "next/image";
import { requireLogin } from "@/lib/guards";
import { withReviewNotes } from "@/lib/review-notes";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AchievementDefinition, AchievementLibraryCategory, DECADE_BADGE_LABEL, isDecadeAchievement, UserAchievement, achievementLibraryCategoryDetails, seededAchievementDefinitions, trackingAchievementDefinitions } from "@/lib/achievements";
import { getMemberStats, initialsForName, EARNED_ACHIEVEMENT_STATUSES } from "@/lib/member-stats";
import { moreHonorsToRank, rankProgressPercent } from "@/lib/member-labels";
import { fetchFieldYearCoverage, fetchHonorEvidence, formatEvidenceDate, type HonorEvidence } from "@/lib/field-year";
import { finishedLeagueYears, leagueForMonths, nextLeagueForMonths } from "@/lib/leagues";
import { SKY_VIEW, SkyLayoutKey, buildSkyMap } from "@/lib/sky-constellations";
import { HonorStar } from "@/components/progress/HonorStar";

const favicon = "/launch/mwpg/MWPG_Logo_FAVICON.png";
const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
// Milky Way Calendar order: seasons start with December.
const calendarSeasons = [
  { id: "seasonal_winter", label: "Winter", months: [12, 1, 2] },
  { id: "seasonal_spring", label: "Spring", months: [3, 4, 5] },
  { id: "seasonal_summer", label: "Summer", months: [6, 7, 8] },
  { id: "seasonal_fall", label: "Fall", months: [9, 10, 11] },
];
type DbAchievement = { id: string; name: string; category: AchievementDefinition["category"]; reward_type: AchievementDefinition["rewardType"]; glyph: string; description: string; requirement: string; constellation: string | null; sort_order: number; is_active: boolean; metadata: Record<string, unknown> | null; is_manual_claimable?: boolean | null; is_automatic?: boolean | null; counts_toward_rank?: boolean | null; allow_repeat?: boolean | null };
type DbUserAchievement = { user_id: string; achievement_id: string; earned_at: string | null; source_submission_id: string | null; awarded_by: string | null; notes: string | null; metadata: Record<string, unknown> | null; status?: string | null };

function mapDefinition(row: DbAchievement): AchievementDefinition {
  return { id: row.id, name: row.name, category: row.category, rewardType: row.reward_type, glyph: row.glyph, description: row.description, requirement: row.requirement, constellation: row.constellation, sortOrder: row.sort_order, isManualClaimable: row.is_manual_claimable ?? undefined, isAutomatic: row.is_automatic ?? undefined, countsTowardRank: row.counts_toward_rank ?? undefined, allowRepeat: row.allow_repeat ?? undefined, isActive: row.is_active, metadata: row.metadata ?? undefined };
}

function earnedDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export default async function Page() {
  const { user } = await requireLogin();
  const supabase = await createServerSupabaseClient();
  const stats = await getMemberStats(supabase, user);
  const { data: definitionRows } = await supabase.from("achievement_definitions").select("id,name,category,reward_type,glyph,description,requirement,constellation,sort_order,is_active,metadata,is_manual_claimable,is_automatic,counts_toward_rank,allow_repeat").eq("is_active", true).order("sort_order");
  const { data: earnedRows } = await supabase.from("user_achievements").select("user_id,achievement_id,earned_at,source_submission_id,awarded_by,notes,metadata,status").eq("user_id", user.id).in("status", EARNED_ACHIEVEMENT_STATUSES);

  const definitions = ((definitionRows as DbAchievement[] | null)?.map(mapDefinition) ?? seededAchievementDefinitions).filter((item) => item.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const earnedRecords: UserAchievement[] = ((earnedRows as DbUserAchievement[] | null) ?? []).map((row) => ({ userId: row.user_id, achievementId: row.achievement_id, earnedAt: row.earned_at, sourceSubmissionId: row.source_submission_id, awardedBy: row.awarded_by, notes: row.notes, metadata: row.metadata ?? undefined, status: row.status }));
  const earnedById = new Map(earnedRecords.map((record) => [record.achievementId, record]));
  const earnedCount = stats.earned_honor_count;
  const rank = { short: stats.rank_short, full: stats.rank, min: 0 };
  const nextRank = stats.next_rank ? { short: stats.next_rank, min: earnedCount + stats.honors_to_next_rank } : null;
  const progressPct = rankProgressPercent(earnedCount, stats.honors_to_next_rank, Boolean(nextRank));
  const name = stats.display_name;
  const initials = initialsForName(name);
  const yearStreak = stats.year_streak;
  const monthStreak = stats.month_streak;
  const coverage = await fetchFieldYearCoverage(supabase, user.id);
  const fieldYear = coverage.year;
  const monthsThisYear = coverage.monthsByYear.get(fieldYear) ?? new Set<number>();
  const yearCount = monthsThisYear.size;
  const onTrack = leagueForMonths(yearCount);
  const nextLeague = nextLeagueForMonths(yearCount);
  const keptLeagues = finishedLeagueYears(coverage.monthsByYear, fieldYear);
  const evidence = await fetchHonorEvidence(supabase, earnedRecords);
  const isPending = (id: string) => earnedById.get(id)?.status === "auto_awarded_pending_review";
  const evidenceLine = (e: HonorEvidence | undefined) => e ? `${e.label}${e.date ? ` · ${e.date}` : ""}${e.confirmedByAaron ? " · Confirmed by Aaron" : ""}` : "Earned";
  const decadeAchievements = definitions.filter((item) => isDecadeAchievement(item) && earnedById.has(item.id));
  const sky = buildSkyMap(definitions);
  const starByKey = new Map(sky.stars.map((star) => [star.key, star]));
  const isEarnedStar = (key: string) => { const achievement = starByKey.get(key)?.achievement; return Boolean(achievement && earnedById.has(achievement.id)); };
  const completeConstellations = new Set(sky.constellations.filter((constellation) => {
    const honors = sky.stars.filter((star) => star.constellationId === constellation.id && star.achievement);
    return honors.length > 0 && honors.every((star) => isEarnedStar(star.key));
  }).map((constellation) => constellation.id));
  const pct = (value: number, layout: SkyLayoutKey, axis: "w" | "h") => `${((value / SKY_VIEW[layout][axis]) * 100).toFixed(2)}%`;
  const starSize = (mag: number) => Math.max(0.78, Math.min(1.18, 1.3 - 0.16 * mag)).toFixed(2);
  const tipClass = (x: number, y: number) => [x < 160 ? "tip-left" : x > 840 ? "tip-right" : "", y > 560 ? "tip-up" : ""].join(" ").trim();
  const tipClassMobile = (x: number, y: number) => [x < 300 ? "mtip-left" : x > 700 ? "mtip-right" : "", y > 2050 ? "mtip-up" : ""].join(" ").trim();

  const categoryOrder: AchievementLibraryCategory[] = ["monthly", "seasonal", "foreground", "technique", "special", "rank", "tracking"];
  const libraryDefinitions = definitions.filter((item) => !item.id.startsWith("year_") || isDecadeAchievement(item));
  const libraryGroups = categoryOrder.map((category) => ({
    category,
    details: achievementLibraryCategoryDetails[category],
    items: category === "tracking" ? trackingAchievementDefinitions : libraryDefinitions.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);
  const rewardLabel = (rewardType?: AchievementDefinition["rewardType"]) => rewardType === "sticker_and_square_pin" ? "Sticker and square pin" : rewardType === "square_pin" ? "Square pin" : rewardType === "sticker" ? "Sticker" : "None";
  const typeLabel = (item: AchievementDefinition | typeof trackingAchievementDefinitions[number]) => item.category === "tracking" ? item.type : item.category === "rank" ? "Rank milestone" : item.category === "special" ? "Automatic special" : "Manual Field Honor";
  const countsLabel = (item: AchievementDefinition | typeof trackingAchievementDefinitions[number]) => item.category === "tracking" ? "Tracking only" : item.category === "rank" ? "Milestone only" : (item as AchievementDefinition).countsTowardRank === false ? "No" : "Yes";
  const statusFor = (item: AchievementDefinition | typeof trackingAchievementDefinitions[number]) => {
    if (item.category === "tracking") return "Automatic tracking";
    const record = earnedById.get(item.id);
    if (record?.status === "verified") return "Verified";
    if (record?.status === "auto_awarded_pending_review") return "Pending review";
    if (record) return "Earned";
    return (item as AchievementDefinition).isManualClaimable === false ? "Locked" : "Available";
  };

  // Guild review results that carry a note or a reassignment. Viewing this page marks them seen.
  const { data: reviewRowsRaw } = await supabase.from("field_report_achievement_claims").select("id,status,reviewed_at,original_achievement_id,member_seen_at,achievement_id,achievement_definitions(name,glyph),field_reports(title)").eq("user_id", user.id).neq("status", "auto_awarded_pending_review").not("reviewed_at", "is", null).order("reviewed_at", { ascending: false }).limit(30);
  const reviewRows = await withReviewNotes(supabase, reviewRowsRaw as any[]);
  const defNameById = new Map((definitionRows || []).map((d: any) => [d.id, d.name as string]));
  const reviewNotes = (reviewRows || []).filter((r: any) => r.review_notes || r.original_achievement_id).slice(0, 8).map((r: any) => {
    const def = Array.isArray(r.achievement_definitions) ? r.achievement_definitions[0] : r.achievement_definitions;
    const report = Array.isArray(r.field_reports) ? r.field_reports[0] : r.field_reports;
    const honor = def?.name || r.achievement_id;
    const original = r.original_achievement_id ? defNameById.get(r.original_achievement_id) || r.original_achievement_id : null;
    const headline = r.status === "verified" ? (original ? `Verified as ${honor} (you claimed ${original})` : `${honor} verified`) : r.status === "rejected" ? `${honor} not approved` : `${honor} ${r.status}`;
    return { id: r.id, glyph: def?.glyph || "✦", headline, title: report?.title || null, note: r.review_notes as string | null, date: earnedDate(r.reviewed_at), isNew: !r.member_seen_at, status: r.status as string };
  });
  if (reviewNotes.some((n) => n.isNew)) await supabase.rpc("mark_my_claim_reviews_seen");
  return <main className="mw-page-wide progress-page">
    <div className="progress-kicker"><Image src={favicon} alt="" width={20} height={20} /><span>Guild Progress</span></div>
    <h1 className="progress-title">Your Climb to Master</h1>
    <section className="progress-top-grid">
      <div className="progress-member-card">
        {stats.avatar_url ? <Image src={stats.avatar_url} alt="" width={120} height={120} unoptimized className="progress-avatar" /> : <div className="progress-avatar progress-avatar-initials">{initials}</div>}
        <div><p className="progress-panel-label">Member Standing</p><h2>{name}</h2><div className="progress-pills"><span>{rank.short}</span>{yearStreak > 0 && <span>☄ {yearStreak}-yr Milky Way streak</span>}</div><p className="progress-muted">{earnedCount} field honors earned, {rank.full}</p></div>
      </div>
      <div className="progress-streak-card"><strong>{yearStreak}</strong><span>Year Streak</span><p>Upload a Milky Way image from a year and declare when you shot it. Each consecutive year adds to your streak. <a href="/profile#streak" className="underline">See&nbsp;your&nbsp;years</a></p></div>
      <div className="progress-streak-card progress-streak-card-cool"><strong>{monthStreak}</strong><span>Month Streak</span><p>Earned calendar month honors</p></div>
    </section>
    {reviewNotes.length > 0 && <section id="guild-review" className="progress-panel progress-review-notes"><div className="progress-section-head"><h2>Guild review notes</h2><p>What the Verification Desk said about your Field Honor claims</p></div><ul>{reviewNotes.map((n) => <li key={n.id} className={`progress-review-note ${n.status}`}><span className="progress-review-glyph" aria-hidden="true">{n.glyph}</span><div><p className="progress-review-head">{n.headline}{n.isNew && <span className="progress-review-new">New</span>}</p>{n.title && <p className="progress-muted">{n.title}{n.date ? ` · reviewed ${n.date}` : ""}</p>}{n.note && <blockquote>“{n.note}”</blockquote>}</div></li>)}</ul></section>}
    <section className="progress-panel progress-rank-panel"><div><h2>Progress to {nextRank?.short ?? "Master"}</h2><p>{nextRank ? moreHonorsToRank(stats.honors_to_next_rank) : "Master rank reached"}</p></div><div className="progress-bar"><span style={{ width: `${progressPct}%` }} /></div></section>
    <section className="progress-panel progress-punch" aria-labelledby="field-year-title">
      <div className="progress-section-head"><h2 id="field-year-title">{fieldYear} Field Year</h2><p>{yearCount > 0 ? `You went out for the Milky Way ${yearCount} of 12 months this year.` : "No Milky Way months logged yet this year. Upload an image and declare its capture date to punch a month."}</p></div>
      <div className="progress-punch-grid">{monthLabels.map((label, index) => {
        const month = index + 1; const punched = monthsThisYear.has(month); const shots = coverage.shotsThisYear.get(month) ?? [];
        return <div key={label} tabIndex={0} className={`progress-punch-hole ${punched ? "earned" : "open"}`}><span className="progress-punch-label">{label}</span>{punched && <span className="progress-punch-mark" aria-hidden="true">★</span>}<span className="progress-hover-card"><strong>{label} {fieldYear}</strong>{punched ? shots.map((shot, i) => <em key={i}>{shot.title || "Untitled image"}{shot.date ? ` · ${formatEvidenceDate(shot.date)}` : ""}</em>) : <em>Not punched yet</em>}</span></div>;
      })}</div>
      <div className="progress-league-line">
        <p>{onTrack ? <>On track for the <strong>{onTrack.name}</strong> for {fieldYear}.</> : <>Not in a league yet for {fieldYear}.</>} {nextLeague ? <>{nextLeague.minMonths - yearCount} more {nextLeague.minMonths - yearCount === 1 ? "month" : "months"} to reach the <strong>{nextLeague.name}</strong>.</> : <>Every month of the year. Nothing higher to reach.</>}</p>
        <div className="progress-league-bar" aria-hidden="true"><span style={{ width: `${(yearCount / 12) * 100}%` }} />{[3, 6, 8, 10, 12].map((m) => <i key={m} style={{ left: `${(m / 12) * 100}%` }} className={yearCount >= m ? "reached" : undefined} />)}</div>
        {keptLeagues.length > 0 && <div className="progress-league-badges">{keptLeagues.map((row) => <span key={row.year} className={`league-badge league-${row.league.id}`} title={`${row.months} of 12 months in ${row.year}`}>{row.league.name} {row.year}</span>)}</div>}
        <p className="progress-muted">Leagues are set when the year ends: Bronze 3+ months, Silver 6+, Gold 8+, Platinum 10+, Diamond all 12. You keep each year&apos;s league on your profile.</p>
      </div>
    </section>
    <section className="progress-panel progress-calendar" aria-labelledby="mw-calendar-title">
      <div className="progress-section-head"><h2 id="mw-calendar-title">Milky Way Calendar</h2><p>Earn every month, in any years. Holding all three months of a season earns the season.</p></div>
      <div className="progress-calendar-seasons">{calendarSeasons.map((season) => {
        const seasonEarned = earnedById.has(season.id);
        const seasonMonths = season.months.map((m) => ({ m, id: `monthly_${monthNames[m - 1]}` }));
        const held = seasonMonths.filter((x) => earnedById.has(x.id)).length;
        return <div key={season.id} className={`progress-calendar-season ${seasonEarned ? "earned" : "open"}`}>
          <div tabIndex={0} className="progress-calendar-season-head"><span className="progress-season-flourish" aria-hidden="true">✧</span><strong>{season.label}</strong><small>{seasonEarned ? (isPending(season.id) ? "Season earned · pending review" : "Season earned") : `${held} of 3 months`}</small>
            <span className="progress-hover-card"><strong>{season.label} Milky Way</strong>{seasonMonths.map((x) => <em key={x.id}>{monthLabels[x.m - 1]}: {earnedById.has(x.id) ? evidenceLine(evidence.get(x.id)) : "not earned yet"}</em>)}</span>
          </div>
          <div className="progress-calendar-months">{seasonMonths.map((x) => {
            const earned = earnedById.has(x.id);
            return <div key={x.id} tabIndex={0} className={`progress-calendar-month ${earned ? "earned" : "open"}${isPending(x.id) ? " pending" : ""}`}><span>{monthLabels[x.m - 1]}</span>{earned && <i aria-hidden="true">★</i>}<span className="progress-hover-card"><strong>{monthLabels[x.m - 1]} Milky Way</strong><em>{earned ? evidenceLine(evidence.get(x.id)) : "Not earned yet"}</em>{isPending(x.id) && <small>Pending review</small>}</span></div>;
          })}</div>
        </div>;
      })}</div>
    </section>
    <section className="progress-panel progress-decade"><div className="progress-section-head"><h2>❖ A Decade Under the Stars</h2><p>Credibility bonus for Milky Way images captured across different years.</p></div>{decadeAchievements.length ? <div className="progress-year-chips">{decadeAchievements.map((achievement) => <span key={achievement.id} title={achievement.name}>{DECADE_BADGE_LABEL} · 10 yrs</span>)}</div> : <p className="progress-empty">Not earned yet. Capture the Milky Way in ten different calendar&nbsp;years.</p>}</section>
    <section className="progress-constellation-head"><h2>The Constellation of Honors</h2><p>Open any star for details. A fully earned cluster lights its constellation gold</p></section>
    <section className="progress-sky">
      {(["desktop", "mobile"] as const).map((layout) => <svg key={layout} className={`progress-sky-lines progress-sky-${layout}`} viewBox={`0 0 ${SKY_VIEW[layout].w} ${SKY_VIEW[layout].h}`} preserveAspectRatio="none" aria-hidden="true">
        {sky.constellations.map((constellation) => <g key={constellation.id} className={completeConstellations.has(constellation.id) ? "progress-sky-figure complete" : "progress-sky-figure"}>
          {constellation.lines.map(({ a, b }) => { const from = starByKey.get(a); const to = starByKey.get(b); if (!from || !to) return null; return <line key={`${a}-${b}`} vectorEffect="non-scaling-stroke" x1={from.pos[layout].x} y1={from.pos[layout].y} x2={to.pos[layout].x} y2={to.pos[layout].y} className={isEarnedStar(a) && isEarnedStar(b) ? "complete" : !from.achievement || !to.achievement ? "future" : undefined} />; })}
        </g>)}
      </svg>)}
      {sky.constellations.map((constellation) => <span key={constellation.id} className={`progress-sky-label anchor-${constellation.label.desktop.anchor} manchor-${constellation.label.mobile.anchor}${completeConstellations.has(constellation.id) ? " complete" : ""}`} style={{ "--dx": pct(constellation.label.desktop.x, "desktop", "w"), "--dy": pct(constellation.label.desktop.y, "desktop", "h"), "--mx": pct(constellation.label.mobile.x, "mobile", "w"), "--my": pct(constellation.label.mobile.y, "mobile", "h") } as React.CSSProperties}>{constellation.name}</span>)}
      {sky.stars.map((star) => {
        const definition = star.achievement;
        const record = definition ? earnedById.get(definition.id) : undefined;
        const earned = Boolean(record);
        const style = { "--dx": pct(star.pos.desktop.x, "desktop", "w"), "--dy": pct(star.pos.desktop.y, "desktop", "h"), "--mx": pct(star.pos.mobile.x, "mobile", "w"), "--my": pct(star.pos.mobile.y, "mobile", "h"), "--star": starSize(star.mag) } as React.CSSProperties;
        const tips = `${tipClass(star.pos.desktop.x, star.pos.desktop.y)} ${tipClassMobile(star.pos.mobile.x, star.pos.mobile.y)}`.trim();
        if (!definition) return <HonorStar key={star.key} className={`progress-star future ${tips}`} style={style} label={`Future honor, ${star.starName}`}><span className="progress-star-shape" /><span className="progress-tooltip"><strong>Future honor</strong><em>Reserved for an honor the Guild has not added yet.</em><small>{star.starName}, {star.constellationName}</small></span></HonorStar>;
        return <HonorStar key={star.key} className={`progress-star ${earned ? "earned" : "locked"}${completeConstellations.has(star.constellationId) ? " in-complete" : ""} ${tips}`} style={style} label={definition.name}><span className="progress-star-shape"><span>{definition.glyph}</span></span><span className="progress-tooltip"><strong>{definition.name}</strong><em>{definition.requirement}</em><b>{earned ? (record?.earnedAt ? `✓ Earned ${earnedDate(record.earnedAt)}` : "✓ Earned") : "Locked"}</b><small>{star.starName}, {star.constellationName}</small></span></HonorStar>;
      })}
    </section>
    <div className="progress-legend"><span><i className="earned" />Earned honor</span><span><i />Locked, not yet earned</span>{sky.stars.some((s) => !s.achievement) ? <span><i className="future" />Future honor</span> : null}<span><i className="line" />Gold line joins two earned honors, a fully earned constellation glows gold</span></div>

    <section className="progress-achievement-library" aria-labelledby="achievement-library-title">
      <div className="progress-library-heading">
        <p className="progress-panel-label">Field Honor Library</p>
        <h2 id="achievement-library-title">Every Field Honor, streak tracker, and rank milestone in the Guild.</h2>
      </div>
      <div className="progress-honor-explainer">
        <h3>How Field Honors Work</h3>
        <p>Pick one Field Honor when you submit an image. Your capture date also fills your calendar coverage for month, season, year, and streak tracking. Coverage helps track your history, but it does not count as a Field Honor unless you choose that honor for the image.</p>
      </div>
      <div className="progress-library-notes">
        <span>One submitted image can claim one rank-counting Field Honor.</span>
        <span>Perfect Year is automatic when all 12 months have coverage in the same calendar&nbsp;year.</span>
        <span>Seasons are automatic: hold all three months of a season, in any years, and the season is yours.</span>
        <span>Raw coverage and streaks are tracking only.</span>
      </div>
      {libraryGroups.map((group) => <section key={group.category} className="progress-library-group">
        <div className="progress-library-group-head"><div><h3>{group.details.label}</h3><p>{group.details.summary}</p></div><small>{group.details.why}</small></div>
        <div className="progress-library-table">
          <div className="progress-library-row progress-library-header"><span>Honor</span><span>Type</span><span>How it is earned</span><span>Counts to rank</span><span>Reward</span><span>Your status</span></div>
          {group.items.map((item) => {
            const status = statusFor(item);
            return <div key={item.id} className="progress-library-row">
              <div className="progress-library-honor"><i>{item.glyph}</i><strong>{item.name}</strong></div>
              <div data-label="Type">{typeLabel(item)}</div>
              <div data-label="How it is earned">{item.requirement}</div>
              <div data-label="Counts to rank"><span className={countsLabel(item) === "Yes" ? "progress-rank-yes" : "progress-rank-no"}>{countsLabel(item)}</span></div>
              <div data-label="Reward">{"rewardType" in item ? rewardLabel(item.rewardType) : "None"}</div>
              <div data-label="Your status"><span className={`progress-status-pill ${status.toLowerCase().replace(/\s+/g, "-")}`}>{status}</span></div>
            </div>;
          })}
        </div>
      </section>)}
    </section>
  </main>;
}
