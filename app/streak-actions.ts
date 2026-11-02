"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { coverageFromCaptureDate } from "@/lib/coverage";

/**
 * Admin: vet or correct the capture date a member declared on a field report.
 * The year rows behind the streak (member_milky_way_years, source='upload') follow
 * automatically through the user_field_coverage trigger.
 */
export async function adminReviewCaptureDate(formData: FormData) {
  const { user } = await requireAdmin();
  const imageId = String(formData.get("image_id") || "");
  const mode = String(formData.get("mode") || "");
  const newDate = String(formData.get("capture_date") || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(imageId) || !["vet", "correct", "reset"].includes(mode)) return;
  const supabase = await createServerSupabaseClient();
  const { data: report } = await supabase.from("field_reports").select("id,user_id,capture_date").eq("guild_image_id", imageId).maybeSingle();
  if (!report) return;
  const { data: cov } = await supabase.from("user_field_coverage").select("id,capture_date,declared_capture_date").eq("field_report_id", report.id).maybeSingle();
  const now = new Date().toISOString();
  const declared = cov?.declared_capture_date || cov?.capture_date || report.capture_date;
  if (mode === "vet") {
    if (cov) await supabase.from("user_field_coverage").update({ date_status: "vetted", declared_capture_date: declared, date_reviewed_by: user.id, date_reviewed_at: now }).eq("id", cov.id);
  } else {
    const date = mode === "reset" ? declared : newDate;
    const coverage = date ? coverageFromCaptureDate(date) : null;
    if (!date || !coverage) return;
    await supabase.from("guild_images").update({ capture_date: date }).eq("id", imageId);
    await supabase.from("field_reports").update({ capture_date: date }).eq("id", report.id);
    const patch = mode === "reset"
      ? { capture_date: date, capture_year: coverage.year, capture_month: coverage.month, capture_season: coverage.season, date_status: "declared", date_reviewed_by: null, date_reviewed_at: null }
      : { capture_date: date, capture_year: coverage.year, capture_month: coverage.month, capture_season: coverage.season, date_status: "corrected", declared_capture_date: declared, date_reviewed_by: user.id, date_reviewed_at: now };
    if (cov) await supabase.from("user_field_coverage").update(patch).eq("id", cov.id);
    else await supabase.from("user_field_coverage").insert({ field_report_id: report.id, user_id: report.user_id, ...patch });
  }
  revalidatePath(`/images/${imageId}`);
  revalidatePath(`/members/${report.user_id}`);
  revalidatePath("/guild-hall");
  revalidatePath("/progress");
  revalidatePath("/", "layout");
}
