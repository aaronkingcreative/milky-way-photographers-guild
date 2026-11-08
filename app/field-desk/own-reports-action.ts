"use server";

import { fetchOwnReportPage, parseOwnReportCursor, type OwnReportPage } from "@/lib/own-reports";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Next page of the signed-in member's reports. The client sends a cursor, never a user id. */
export async function loadMoreOwnReports(cursor: unknown): Promise<OwnReportPage> {
  const parsed = parseOwnReportCursor(cursor);
  if (parsed === "invalid") return { ok: false, error: "Those reports did not load. Try again.", reports: [], next: null };
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in again to see your reports.", reports: [], next: null };
  return fetchOwnReportPage(supabase, user.id, parsed);
}
