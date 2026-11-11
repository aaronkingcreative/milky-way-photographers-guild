import { withReviewNotes } from "@/lib/review-notes";
import Link from "next/link";
import { requireAdmin } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAvatarDisplay, publicMemberName } from "@/lib/avatar";
import { FIELD_REPORT_IMAGE_BUCKET, storagePublicUrl } from "@/lib/storage";
import { ImageViewer } from "@/components/images/ImageViewer";
import { ClaimDesk, type DeskClaim, type ReassignInfo, type ReassignOption } from "@/components/admin/ClaimDesk";

const PENDING = "auto_awarded_pending_review";
const SELECT = "id,status,claimed_at,reviewed_at,original_achievement_id,user_id,achievement_id,achievement_definitions(id,name,glyph,category),profiles(display_name,full_name,email,avatar_url,avatar_path),field_reports(id,title,capture_date,gear,story,guild_image_id,image_bucket,image_original_path,guild_images(image_url,image_bucket,image_original_path,image_width,image_height,country,state_or_province,specific_location_name),user_field_coverage(capture_year,capture_month,capture_season))";

// Claimed images live in the public field-report bucket. They are shown with a plain <img>
// (via ImageViewer) rather than next/image, whose optimizer only allows the logo path.
function claimImageUrl(report: any): string | null {
  const image = report?.guild_images;
  if (image?.image_url) return image.image_url;
  const path = image?.image_original_path || report?.image_original_path;
  return path ? storagePublicUrl(image?.image_bucket || report?.image_bucket || FIELD_REPORT_IMAGE_BUCKET, path) : null;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
type Def = { id: string; name: string; glyph: string | null; category: string };

// Month and season come from the automatic coverage row, falling back to the report's capture date.
function captureParts(report: any, coverage: any) {
  const month = coverage?.capture_month || (report?.capture_date ? Number(String(report.capture_date).slice(5, 7)) : null);
  const year = coverage?.capture_year || (report?.capture_date ? Number(String(report.capture_date).slice(0, 4)) : null);
  return { monthName: month ? MONTHS[month - 1] : null, monthId: month ? `monthly_${MONTHS[month - 1].toLowerCase()}` : null, season: coverage?.capture_season || null, year };
}

function reassignInfo(claim: any, report: any, coverage: any, defs: Def[], held: Set<string>): ReassignInfo {
  const claimed = claim.achievement_definitions as Def | null;
  const { monthName, monthId, season, year } = captureParts(report, coverage);
  const seasonId = season ? `seasonal_${String(season).toLowerCase()}` : null;
  let suggestedId: string | null = null, mismatch: string | null = null;
  if (claimed?.category === "monthly" && monthId && claimed.id !== monthId) { suggestedId = monthId; mismatch = `Claimed ${claimed.name}, but the capture date is ${monthName} ${year ?? ""}`.trim(); }
  if (claimed?.category === "seasonal" && seasonId && claimed.id !== seasonId) { suggestedId = seasonId; mismatch = `Claimed ${claimed.name}, but the capture date is ${season} ${year ?? ""}`.trim(); }
  const options: ReassignOption[] = defs.filter((d) => d.id !== claim.achievement_id).map((d) => ({ ...d, held: held.has(d.id) }));
  return { claimedName: claimed?.name || "that honor", captureMonth: monthName, captureSeason: season, suggestedId, mismatch, options };
}

function toDeskClaim(claim: any, defs: Def[] = [], heldByUser: Map<string, Set<string>> = new Map()): DeskClaim {
  const report = claim.field_reports;
  const image = report?.guild_images;
  const coverage = Array.isArray(report?.user_field_coverage) ? report.user_field_coverage[0] : report?.user_field_coverage;
  const name = publicMemberName(claim.profiles?.display_name, claim.profiles?.full_name);
  const honor = claim.achievement_definitions?.name || "Field Honor";
  const src = claimImageUrl(report);
  const avatar = getAvatarDisplay({ avatarPath: claim.profiles?.avatar_path, avatarUrl: claim.profiles?.avatar_url, displayName: claim.profiles?.display_name || claim.profiles?.full_name, email: claim.profiles?.email });
  const original = claim.original_achievement_id ? defs.find((d) => d.id === claim.original_achievement_id)?.name || claim.original_achievement_id : null;
  const status = claim.status === PENDING ? "Pending review" : `${claim.status}${original ? ` as ${honor} (claimed ${original})` : ""}${claim.review_notes ? ` · “${claim.review_notes}”` : ""}`;
  const reassign = claim.status === PENDING ? reassignInfo(claim, report, coverage, defs, heldByUser.get(claim.user_id) || new Set()) : undefined;
  const body = <div className="grid gap-5 md:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
    <div className="mw-claim-image">
      {src ? <ImageViewer src={src} alt={report?.title || "Field report image"} width={image?.image_width} height={image?.image_height} className="mw-claim-img" /> : <p className="p-6 text-sm text-white/55">No image on this field report.</p>}
      {src && <p className="mt-1 text-xs text-white/45">Click to view full screen</p>}
    </div>
    <div>
      <div className="flex items-center gap-3"><span className="mw-avatar-circle grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-[#e79f2b]/65 bg-[#e79f2b]/10 font-display text-[#f0bd66]">{avatar.avatarUrl ? <img src={avatar.avatarUrl} alt="" className="h-full w-full object-cover" /> : avatar.initials}</span><div><p className="font-bold text-white">{name}</p><p className="text-sm text-white/50">{status}</p></div></div>
      <p className="mt-4 font-display text-xl uppercase tracking-[.12em] text-[#f0bd66]">{claim.achievement_definitions?.glyph} {honor}</p>
      {reassign?.mismatch && <p className="mw-claim-mismatch">⚠ {reassign.mismatch}</p>}
      <h2 className="mt-2 font-display text-3xl uppercase text-white">{report?.title}</h2>
      <p className="mt-1 text-sm text-white/58">Captured {report?.capture_date} · {image?.country}, {image?.state_or_province} {image?.specific_location_name ? `· ${image.specific_location_name}` : ""}</p>
      <div className="mt-4 grid gap-2 text-sm text-white/70"><p><strong>Automatic coverage:</strong> {coverage ? `${coverage.capture_season} ${coverage.capture_year}, month ${coverage.capture_month}` : "No coverage row found"}</p><p><strong>Gear:</strong> {report?.gear}</p></div>
      {report?.story && <p className="mt-4 line-clamp-5 text-white/72">{report.story}</p>}
      {report?.guild_image_id && <Link href={`/images/${report.guild_image_id}`} className="mt-4 inline-block font-display uppercase tracking-[.12em] text-[#f0bd66]">Open field report</Link>}
    </div>
  </div>;
  return { id: claim.id, label: `${name} · ${honor}`, notes: claim.review_notes, body, reassign };
}

export default async function Page() {
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const [{ data: pendingRaw }, { data: reviewedRaw }] = await Promise.all([
    supabase.from("field_report_achievement_claims").select(SELECT).eq("status", PENDING).order("claimed_at", { ascending: true }).limit(100),
    supabase.from("field_report_achievement_claims").select(SELECT).neq("status", PENDING).order("reviewed_at", { ascending: false, nullsFirst: false }).limit(20),
  ]);
  const [pending, reviewed] = await Promise.all([withReviewNotes(supabase, pendingRaw as any[]), withReviewNotes(supabase, reviewedRaw as any[])]);
  const userIds = [...new Set((pending || []).map((c: any) => c.user_id))];
  const [{ data: defRows }, { data: heldRows }] = await Promise.all([
    supabase.from("achievement_definitions").select("id,name,glyph,category,sort_order").eq("is_active", true).eq("is_manual_claimable", true).order("sort_order", { ascending: true }),
    userIds.length ? supabase.from("user_achievements").select("user_id,achievement_id,status").in("user_id", userIds).in("status", ["auto_awarded_pending_review", "verified"]) : Promise.resolve({ data: [] as any[] }),
  ]);
  const defs: Def[] = (defRows || []).map((d: any) => ({ id: d.id, name: d.name, glyph: d.glyph, category: d.category }));
  const heldByUser = new Map<string, Set<string>>();
  for (const r of heldRows || []) { if (!heldByUser.has(r.user_id)) heldByUser.set(r.user_id, new Set()); heldByUser.get(r.user_id)!.add(r.achievement_id); }
  const pendingClaims = (pending || []).map((c: any) => toDeskClaim(c, defs, heldByUser));
  const reviewedClaims = (reviewed || []).map((c: any) => toDeskClaim(c, defs, heldByUser));
  return <section className="mx-auto max-w-7xl px-5 py-14">
    <Link href="/admin" className="font-display uppercase tracking-[.16em] text-[#f0bd66]">← Admin</Link>
    <p className="eyebrow mt-6">Verification Desk</p>
    <h1 className="mt-2 font-display text-5xl uppercase">Field Honor claims</h1>
    <p className="mt-3 max-w-3xl text-white/68">Compare each image with the Field Honor claimed for it. Notes are optional. Verify or reject, and the claim leaves this list. If they picked the wrong honor, use Verify as a different Field Honor. Capture dates are on the honor system.</p>
    <h2 className="mt-8 font-display text-2xl uppercase text-white">Pending review <span className="text-[#f0bd66]">({pendingClaims.length})</span></h2>
    <ClaimDesk claims={pendingClaims} actions={["verified", "rejected"]} emptyText="All caught up. No claims are waiting for review." />
    {reviewedClaims.length > 0 && <details className="mt-12">
      <summary className="cursor-pointer font-display text-xl uppercase text-white/70">Recently reviewed ({reviewedClaims.length})</summary>
      <p className="mt-2 text-sm text-white/55">Change a past decision here if needed.</p>
      <ClaimDesk claims={reviewedClaims} actions={["verified", "rejected", "revoked"]} emptyText="Nothing reviewed yet." />
    </details>}
  </section>;
}
