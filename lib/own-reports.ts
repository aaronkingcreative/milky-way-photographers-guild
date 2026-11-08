/** Your Recent Reports. Only the signed-in member's own non-deleted reports. */

export const OWN_REPORT_PAGE_SIZE = 8;

export type OwnReportCursor = { createdAt: string; id: string };

export type OwnReportCard = {
  id: string;
  title: string;
  imageUrl: string;
  meta: string;
};

type ReportRow = {
  id: string;
  user_id: string;
  created_at: string;
  deleted_at: string | null;
  title?: string | null;
  image_url?: string | null;
  capture_date?: string | null;
};

export function compareOwnReports(a: { id: string; created_at: string }, b: { id: string; created_at: string }) {
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1;
  if (a.id !== b.id) return a.id < b.id ? 1 : -1;
  return 0;
}

export function isAfterOwnReportCursor(row: { id: string; created_at: string }, cursor: OwnReportCursor | null) {
  if (!cursor) return true;
  if (row.created_at < cursor.createdAt) return true;
  if (row.created_at === cursor.createdAt && row.id < cursor.id) return true;
  return false;
}

/** Newest first. Same timestamp uses id descending so a tie is never skipped or repeated. */
export function pageOwnReports<T extends ReportRow>(rows: T[], userId: string, cursor: OwnReportCursor | null, pageSize: number): { page: T[]; next: OwnReportCursor | null } {
  const mine = rows
    .filter((row) => row.user_id === userId && row.deleted_at == null)
    .sort(compareOwnReports)
    .filter((row) => isAfterOwnReportCursor(row, cursor));
  const page = mine.slice(0, pageSize);
  const last = page[page.length - 1];
  const next = mine.length > page.length && last ? { createdAt: last.created_at, id: last.id } : null;
  return { page, next };
}

const CURSOR_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const CURSOR_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseOwnReportCursor(value: unknown): OwnReportCursor | null | "invalid" {
  if (value == null) return null;
  if (typeof value !== "object") return "invalid";
  const createdAt = (value as { createdAt?: unknown }).createdAt;
  const id = (value as { id?: unknown }).id;
  if (typeof createdAt !== "string" || typeof id !== "string") return "invalid";
  if (!CURSOR_TIME.test(createdAt) || !CURSOR_ID.test(id)) return "invalid";
  return { createdAt, id };
}

export function ownReportCursorOr(cursor: OwnReportCursor) {
  const ts = `"${cursor.createdAt}"`;
  const id = `"${cursor.id}"`;
  return `created_at.lt.${ts},and(created_at.eq.${ts},id.lt.${id})`;
}

/** Empty encouragement only when the desk is idle, successful, and has no rows. */
export function ownReportsShowsEmpty(count: number, loading: boolean, error: string) {
  return count === 0 && !loading && !error;
}

export function ownReportsStatus(count: number, loading: boolean, error: string, hasNext: boolean) {
  if (loading) return "Loading more reports";
  if (error) return error;
  if (!hasNext && count > 0) return "That's every report.";
  return "";
}

export function ownReportMeta(image: { capture_date?: string | null }, reactionCount: number) {
  const date = image.capture_date
    ? new Date(`${image.capture_date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Field report";
  return `${date}, ${reactionCount} reactions`;
}

export type OwnReportPage = {
  ok: true;
  reports: OwnReportCard[];
  next: OwnReportCursor | null;
} | {
  ok: false;
  error: string;
  reports: [];
  next: null;
};

/**
 * One page of the session member's reports. userId must come from the server session.
 * limit stays at page size plus one, under the API row cap, and the cursor walks the rest.
 */
export async function fetchOwnReportPage(
  supabase: { from: (table: string) => any },
  userId: string,
  cursor: OwnReportCursor | null,
  pageSize = OWN_REPORT_PAGE_SIZE,
): Promise<OwnReportPage> {
  const size = Math.max(1, Math.min(pageSize, 50));
  let query = supabase
    .from("guild_images")
    .select("id,title,image_url,capture_date,created_at")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(size + 1);
  if (cursor) query = query.or(ownReportCursorOr(cursor));
  const { data, error } = await query;
  if (error) return { ok: false, error: "Those reports did not load. Try again.", reports: [], next: null };
  const rows = (data || []) as { id: string; title: string | null; image_url: string | null; capture_date: string | null; created_at: string }[];
  const page = rows.slice(0, size);
  const last = page[page.length - 1];
  const next = rows.length > size && last ? { createdAt: last.created_at, id: last.id } : null;
  const ids = page.map((row) => row.id);
  const reactions = ids.length
    ? await supabase.from("image_reactions").select("image_id").in("image_id", ids)
    : { data: [] as { image_id: string }[], error: null };
  if (reactions.error) return { ok: false, error: "Those reports did not load. Try again.", reports: [], next: null };
  const counts = new Map<string, number>();
  for (const row of reactions.data || []) counts.set(row.image_id, (counts.get(row.image_id) || 0) + 1);
  return {
    ok: true,
    reports: page.map((row) => ({
      id: row.id,
      title: row.title || "Field report",
      imageUrl: row.image_url || "",
      meta: ownReportMeta(row, counts.get(row.id) || 0),
    })),
    next,
  };
}
