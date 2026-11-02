import { currentGuildYear } from "@/lib/leagues";

export type CoverageShot = { title: string | null; date: string | null };
export type FieldYearCoverage = { monthsByYear: Map<number, Set<number>>; shotsThisYear: Map<number, CoverageShot[]>; year: number };

/** Month coverage from a member's uploaded or declared images (user_field_coverage). */
export async function fetchFieldYearCoverage(supabase: any, userId: string): Promise<FieldYearCoverage> {
  const year = currentGuildYear();
  const { data } = await supabase.from("user_field_coverage").select("capture_year,capture_month,capture_date,field_report_id").eq("user_id", userId);
  // Titles come from a separate query (no embed), so a new FK can never make this page ambiguous.
  const reportIds = [...new Set(((data as any[] | null) ?? []).filter((r) => Number(r.capture_year) === year && r.field_report_id).map((r) => r.field_report_id as string))];
  const titles = new Map<string, string | null>();
  if (reportIds.length) {
    const { data: reports } = await supabase.from("field_reports").select("id,title").in("id", reportIds);
    for (const r of (reports as any[] | null) ?? []) titles.set(r.id, r.title ?? null);
  }
  const monthsByYear = new Map<number, Set<number>>();
  const shotsThisYear = new Map<number, CoverageShot[]>();
  for (const row of (data as any[] | null) ?? []) {
    const y = Number(row.capture_year), m = Number(row.capture_month);
    if (!y || !m) continue;
    if (!monthsByYear.has(y)) monthsByYear.set(y, new Set());
    monthsByYear.get(y)!.add(m);
    if (y === year) {
      if (!shotsThisYear.has(m)) shotsThisYear.set(m, []);
      shotsThisYear.get(m)!.push({ title: (row.field_report_id && titles.get(row.field_report_id)) || null, date: row.capture_date ?? null });
    }
  }
  return { monthsByYear, shotsThisYear, year };
}

export type HonorEvidence = { label: string; date: string | null; confirmedByAaron: boolean };

function formatDay(value: string | null | undefined) {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return value; // free text such as "January (date not on file)"
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])));
}
export const formatEvidenceDate = formatDay;

/** Evidence for earned honors: the submitted image (title + capture date) or backfill metadata. */
export async function fetchHonorEvidence(supabase: any, records: { achievementId: string; sourceSubmissionId?: string | null; metadata?: Record<string, unknown> }[]) {
  const ids = [...new Set(records.map((r) => r.sourceSubmissionId).filter(Boolean))] as string[];
  const images = new Map<string, { title: string | null; capture_date: string | null }>();
  if (ids.length) {
    const { data } = await supabase.from("guild_images").select("id,title,capture_date").in("id", ids);
    for (const row of (data as any[] | null) ?? []) images.set(row.id, row);
  }
  const out = new Map<string, HonorEvidence>();
  for (const r of records) {
    const md = (r.metadata ?? {}) as Record<string, any>;
    const confirmedByAaron = String(md.evidence_basis || "").startsWith("confirmed_by_aaron");
    const image = r.sourceSubmissionId ? images.get(r.sourceSubmissionId) : undefined;
    if (image) { out.set(r.achievementId, { label: image.title || "Untitled image", date: formatDay(image.capture_date), confirmedByAaron }); continue; }
    if (md.evidence_path || md.capture_date || confirmedByAaron) {
      const base = md.evidence_path ? String(md.evidence_path).split("/").pop() || null : null;
      const day = formatDay(md.capture_date);
      out.set(r.achievementId, base ? { label: base, date: day, confirmedByAaron } : { label: day || "No file on record", date: null, confirmedByAaron });
    }
  }
  return out;
}
