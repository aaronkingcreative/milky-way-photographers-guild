import Image from "next/image";
import { requireLogin } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AchievementDefinition, UserAchievement, seededAchievementDefinitions } from "@/lib/achievements";
import { getMemberStats, initialsForName, EARNED_ACHIEVEMENT_STATUSES } from "@/lib/member-stats";

const favicon = "/launch/mwpg/MWPG_Logo_FAVICON.png";
const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const seasonIds = ["seasonal_winter", "seasonal_spring", "seasonal_summer", "seasonal_fall"];
const seasonLabels = ["Winter", "Spring", "Summer", "Fall"];
const starPositions = [
  [8, 70], [11, 65], [17, 62], [21, 56], [28, 63], [36, 58], [45, 57], [53, 57], [61, 58], [69, 60], [77, 62], [82, 60],
  [16, 22], [33, 15], [50, 20], [67, 14], [84, 22], [24, 35], [54, 38], [73, 36], [90, 54], [6, 54], [30, 48], [88, 68],
  [39, 80], [49, 70], [59, 80], [49, 88], [40, 40], [66, 68], [80, 47], [14, 52], [34, 48], [70, 52], [92, 70], [5, 78], [75, 74], [58, 28], [22, 74], [82, 82],
];
const constellationLinks = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[12,13],[13,14],[14,15],[15,16],[17,21],[17,22],[18,19],[19,20],[24,25],[25,26],[26,27],[27,24],[28,29],[29,30],[31,32],[32,33],[34,35],[35,36]];

type DbAchievement = { id: string; name: string; category: AchievementDefinition["category"]; reward_type: AchievementDefinition["rewardType"]; glyph: string; description: string; requirement: string; constellation: string | null; sort_order: number; is_active: boolean; metadata: Record<string, unknown> | null };
type DbUserAchievement = { user_id: string; achievement_id: string; earned_at: string | null; source_submission_id: string | null; awarded_by: string | null; notes: string | null; metadata: Record<string, unknown> | null };

function mapDefinition(row: DbAchievement): AchievementDefinition {
  return { id: row.id, name: row.name, category: row.category, rewardType: row.reward_type, glyph: row.glyph, description: row.description, requirement: row.requirement, constellation: row.constellation, sortOrder: row.sort_order, isActive: row.is_active, metadata: row.metadata ?? undefined };
}

function earnedDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export default async function Page() {
  const { user } = await requireLogin();
  const supabase = await createServerSupabaseClient();
  const stats = await getMemberStats(supabase, user);
  const { data: definitionRows } = await supabase.from("achievement_definitions").select("id,name,category,reward_type,glyph,description,requirement,constellation,sort_order,is_active,metadata").eq("is_active", true).order("sort_order");
  const { data: earnedRows } = await supabase.from("user_achievements").select("user_id,achievement_id,earned_at,source_submission_id,awarded_by,notes,metadata,status").eq("user_id", user.id).in("status", EARNED_ACHIEVEMENT_STATUSES);

  const definitions = ((definitionRows as DbAchievement[] | null)?.map(mapDefinition) ?? seededAchievementDefinitions).filter((item) => item.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const earnedRecords: UserAchievement[] = ((earnedRows as DbUserAchievement[] | null) ?? []).map((row) => ({ userId: row.user_id, achievementId: row.achievement_id, earnedAt: row.earned_at, sourceSubmissionId: row.source_submission_id, awardedBy: row.awarded_by, notes: row.notes, metadata: row.metadata ?? undefined }));
  const earnedById = new Map(earnedRecords.map((record) => [record.achievementId, record]));
  const earnedCount = stats.earned_honor_count;
  const rank = { short: stats.rank_short, full: stats.rank, min: 0 };
  const nextRank = stats.next_rank ? { short: stats.next_rank, min: earnedCount + stats.honors_to_next_rank } : null;
  const rankProgressBase = Math.max(0, earnedCount - (earnedCount % Math.max(1, stats.honors_to_next_rank || 1)));
  const rankProgressTarget = nextRank?.min ?? Math.max(earnedCount, 1);
  const progressPct = nextRank ? Math.max(4, Math.min(100, ((earnedCount - rankProgressBase) / Math.max(1, rankProgressTarget - rankProgressBase)) * 100)) : 100;
  const name = stats.display_name;
  const initials = initialsForName(name);
  const yearStreak = stats.year_streak;
  const monthStreak = stats.month_streak;
  const monthly = definitions.filter((item) => item.category === "monthly");
  const yearAchievements = definitions.filter((item) => item.category === "special" && earnedById.has(item.id));
  const stars = definitions.map((definition, index) => ({ definition, pos: starPositions[index % starPositions.length], earned: earnedById.has(definition.id), record: earnedById.get(definition.id) }));

  return <main className="mw-page-wide progress-page">
    <div className="progress-kicker"><Image src={favicon} alt="" width={20} height={20} /><span>Guild Progress</span></div>
    <h1 className="progress-title">Your Climb to Master</h1>
    <section className="progress-top-grid">
      <div className="progress-member-card">
        {stats.avatar_url ? <Image src={stats.avatar_url} alt="" width={120} height={120} className="progress-avatar" /> : <div className="progress-avatar progress-avatar-initials">{initials}</div>}
        <div><p className="progress-panel-label">Member Standing</p><h2>{name}</h2><div className="progress-pills"><span>{rank.short}</span>{yearStreak > 0 && <span>☄ {yearStreak} Year Streak</span>}</div><p className="progress-muted">{earnedCount} field honors earned, {rank.full}</p></div>
      </div>
      <div className="progress-streak-card"><strong>{yearStreak}</strong><span>Year Streak</span><p>A new Milky Way in each earned year</p></div>
      <div className="progress-streak-card progress-streak-card-cool"><strong>{monthStreak}</strong><span>Month Streak</span><p>Earned calendar month honors</p></div>
    </section>
    <section className="progress-panel progress-rank-panel"><div><h2>Progress to {nextRank?.short ?? "Master"}</h2><p>{nextRank ? `${Math.max(0, nextRank.min - earnedCount)} more honors to rank up` : "Master rank reached"}</p></div><div className="progress-bar"><span style={{ width: `${progressPct}%` }} /></div></section>
    <section className="progress-panel"><div className="progress-section-head"><h2>2026 Field Year</h2><p>A Milky Way in every month you shoot</p></div><div className="progress-month-grid">{monthly.map((achievement, index) => <div key={achievement.id} className={earnedById.has(achievement.id) ? "earned" : "locked"}>{monthLabels[index]}</div>)}</div><div className="progress-season-grid">{seasonIds.map((id, index) => <div key={id} className={earnedById.has(id) ? "earned" : "locked"}>{seasonLabels[index]}</div>)}</div></section>
    <section className="progress-panel progress-decade"><div className="progress-section-head"><h2>❖ A Decade Under the Stars</h2><p>Credibility bonus for Milky Way images captured across different years.</p></div>{yearAchievements.length ? <div className="progress-year-chips">{yearAchievements.map((achievement) => <span key={achievement.id}>{String(achievement.metadata?.year ?? achievement.name.replace(/\D/g, ""))}</span>)}</div> : <p className="progress-empty">No earned year honors yet.</p>}</section>
    <section className="progress-constellation-head"><h2>The Constellation of Honors</h2><p>Hover any star for details, a fully earned cluster lights its constellation gold</p></section>
    <section className="progress-sky">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{constellationLinks.map(([a, b]) => <line key={`${a}-${b}`} x1={starPositions[a][0]} y1={starPositions[a][1]} x2={starPositions[b][0]} y2={starPositions[b][1]} className={stars[a]?.earned && stars[b]?.earned ? "complete" : undefined} />)}</svg>
      {stars.map(({ definition, pos, earned, record }) => <button key={definition.id} type="button" className={`progress-star ${earned ? "earned" : "locked"}`} style={{ left: `${pos[0]}%`, top: `${pos[1]}%` }}><span className="progress-star-shape"><span>{definition.glyph}</span></span><span className="progress-tooltip"><strong>{definition.name}</strong><em>{definition.requirement}</em><b>{earned ? (record?.earnedAt ? `✓ Earned ${earnedDate(record.earnedAt)}` : "✓ Earned") : "Locked"}</b></span></button>)}
    </section>
    <div className="progress-legend"><span><i className="earned" />Earned honor</span><span><i />Locked, not yet earned</span><span><i className="line" />Gold line means complete constellation</span></div>
  </main>;
}
