"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAccess, requireAdmin, requireLogin } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { REACTION_TYPES } from "@/lib/images";
import { getIotwTargetPeriod } from "@/lib/iotw";
import { coverageFromCaptureDate } from "@/lib/coverage";
import { ALLOWED_IMAGE_TYPES, FIELD_REPORT_IMAGE_BUCKET, MAX_UPLOAD_BYTES, PROFILE_AVATAR_BUCKET, storagePublicUrl } from "@/lib/storage";

function value(formData: FormData, key: string) { return String(formData.get(key) || "").trim(); }
function validImageMeta(type: string, size: number) { return ALLOWED_IMAGE_TYPES.includes(type) && size > 0 && size <= MAX_UPLOAD_BYTES; }

export async function signOut() { const supabase = await createServerSupabaseClient(); await supabase.auth.signOut(); redirect("/"); }

async function awardPerfectYearIfComplete(supabase: any, userId: string, fieldReportId: string, year: number) {
  const { data: coverage } = await supabase.from("user_field_coverage").select("capture_month").eq("user_id", userId).eq("capture_year", year);
  const months = new Set((coverage || []).map((row: any) => row.capture_month));
  if (months.size < 12) return null;
  const achievement_id = "special_perfect_year";
  await supabase.from("user_achievements").upsert({ user_id: userId, achievement_id, earned_at: new Date().toISOString(), source_field_report_id: fieldReportId, status: "auto_awarded_pending_review", metadata: { source: "calendar_coverage", year } }, { onConflict: "user_id,achievement_id" });
  return { achievement_id, name: "Perfect Year", year };
}

export async function submitImage(formData: FormData) {
  const { user } = await requireAccess(); const supabase = await createServerSupabaseClient(); const targetBallot = getIotwTargetPeriod();
  const title=value(formData,"title"), capture_date=value(formData,"capture_date"), country=value(formData,"country"), state_or_province=value(formData,"state_or_province"), gear_settings=value(formData,"gear_settings");
  const image_original_path=value(formData,"image_original_path"), image_mime_type=value(formData,"image_mime_type"), submission_id=value(formData,"submission_id");
  const image_size_bytes=Number(value(formData,"image_size_bytes") || 0), image_width=Number(value(formData,"image_width") || 0) || null, image_height=Number(value(formData,"image_height") || 0) || null;
  if (!title || !image_original_path || !capture_date || !country || !state_or_province || !gear_settings) return { error: "Please complete all required fields and upload an image." };
  if (!validImageMeta(image_mime_type, image_size_bytes)) return { error: "Upload a JPG, PNG, or WebP image up to 30 MB." };
  if (!image_original_path.startsWith(`users/${user.id}/field-reports/${submission_id}/original.`)) return { error: "Image upload path does not match your account." };
  const coverage = coverageFromCaptureDate(capture_date); if (!coverage) return { error: "Use a valid capture date." };
  const selectedAchievementId = value(formData, "achievement_id");
  if (selectedAchievementId) {
    const { data: def } = await supabase.from("achievement_definitions").select("id,is_manual_claimable,is_active,allow_repeat").eq("id", selectedAchievementId).maybeSingle();
    if (!def?.is_active || !def?.is_manual_claimable) return { error: "Choose an available Field Honor." };
    if (!def.allow_repeat) { const { data: existing } = await supabase.from("user_achievements").select("achievement_id,status").eq("user_id", user.id).eq("achievement_id", selectedAchievementId).in("status", ["auto_awarded_pending_review", "verified"]).maybeSingle(); if (existing) return { error: "You already earned that Field Honor. Choose a different one." }; }
  }
  const is_weekly_candidate = formData.get("is_weekly_candidate") === "on";
  if (is_weekly_candidate) { const { count: candidateCount } = await supabase.from("field_reports").select("id",{count:"exact",head:true}).eq("user_id",user.id).eq("iotw_week_start",targetBallot.period_start.slice(0,10)).eq("is_iotw_candidate",true).neq("status","removed"); if ((candidateCount || 0)>0) return { error: "You already have an Image of the Week contender this week. You can still submit this as a regular field report." }; }
  const publicUrl = storagePublicUrl(FIELD_REPORT_IMAGE_BUCKET, image_original_path) || "";
  const reportPayload = { id: submission_id || undefined, user_id:user.id, title, capture_date, country, region:state_or_province, specific_location:value(formData,"specific_location_name")||null, gear:gear_settings, story:value(formData,"short_story")||null, went_well:value(formData,"what_went_well")||null, could_have_gone_better:value(formData,"what_could_have_gone_better")||null, image_original_path, image_bucket:FIELD_REPORT_IMAGE_BUCKET, image_width, image_height, image_size_bytes, is_iotw_candidate:is_weekly_candidate, iotw_week_start:is_weekly_candidate ? targetBallot.period_start.slice(0,10) : null, status:"published" };
  const { data: report, error: reportError } = await supabase.from("field_reports").insert(reportPayload).select("id").single(); if (reportError) return { error: reportError.message };
  const { data, error } = await supabase.from("guild_images").insert({ user_id:user.id, title, image_url:publicUrl, image_source:"supabase_storage", image_bucket:FIELD_REPORT_IMAGE_BUCKET, image_original_path, image_width, image_height, image_size_bytes, display_image_path:image_original_path, detail_image_path:image_original_path, capture_date, country, state_or_province, specific_location_name:value(formData,"specific_location_name")||null, gear_settings, short_story:value(formData,"short_story")||null, what_went_well:value(formData,"what_went_well")||null, what_could_have_gone_better:value(formData,"what_could_have_gone_better")||null, is_weekly_candidate, week_starts_on:targetBallot.period_start.slice(0,10), status:"published" }).select("id").single(); if (error) return { error: error.message };
  await supabase.from("field_reports").update({ guild_image_id: data.id }).eq("id", report.id).eq("user_id", user.id);
  if (is_weekly_candidate) { const ballotId = await ensureIotwBallot(supabase, targetBallot); if (ballotId) await supabase.from("iotw_ballot_entries").insert({ ballot_id: ballotId, field_report_id: report.id, user_id: user.id }); }
  await supabase.from("user_field_coverage").upsert({ field_report_id: report.id, user_id: user.id, capture_date, capture_year: coverage.year, capture_month: coverage.month, capture_season: coverage.season }, { onConflict: "field_report_id" });
  if (selectedAchievementId) { await supabase.from("field_report_achievement_claims").insert({ field_report_id: report.id, user_id: user.id, achievement_id: selectedAchievementId, status: "auto_awarded_pending_review" }); await supabase.from("user_achievements").upsert({ user_id: user.id, achievement_id: selectedAchievementId, earned_at: new Date().toISOString(), source_submission_id: data.id, source_field_report_id: report.id, status: "auto_awarded_pending_review", metadata: { source: "field_report_claim" } }, { onConflict: "user_id,achievement_id" }); }
  await awardPerfectYearIfComplete(supabase, user.id, report.id, coverage.year);
  revalidatePath("/feed"); revalidatePath("/field-desk"); revalidatePath("/guild-hall"); revalidatePath("/progress"); revalidatePath("/profile"); redirect(`/images/${data.id}?achievement=1`);
}


async function ensureIotwBallot(supabase: any, period: ReturnType<typeof getIotwTargetPeriod>) {
  const payload = { period_start: period.period_start, period_end: period.period_end, submission_cutoff: period.submission_cutoff, voting_opens_at: period.voting_opens_at, voting_closes_at: period.voting_closes_at, status: period.status };
  const { data } = await supabase.from("iotw_ballots").upsert(payload, { onConflict: "period_start" }).select("id").single();
  return data?.id as string | undefined;
}

export async function enterIotwContender(formData: FormData) {
  const { user } = await requireAccess(); const supabase = await createServerSupabaseClient(); const field_report_id = value(formData,"field_report_id"), guild_image_id = value(formData,"guild_image_id"); const period = getIotwTargetPeriod(); const ballotId = await ensureIotwBallot(supabase, period); if (!ballotId) return;
  const { data: report } = await supabase.from("field_reports").select("id,user_id,status").eq("id",field_report_id).eq("user_id",user.id).maybeSingle(); if(!report || report.status === "removed") return;
  await supabase.from("iotw_ballot_entries").insert({ ballot_id: ballotId, field_report_id, user_id: user.id });
  await supabase.from("field_reports").update({ is_iotw_candidate:true, iotw_week_start:period.period_start.slice(0,10) }).eq("id",field_report_id).eq("user_id",user.id);
  if (guild_image_id) await supabase.from("guild_images").update({ is_weekly_candidate:true, week_starts_on:period.period_start.slice(0,10) }).eq("id",guild_image_id).eq("user_id",user.id);
  revalidatePath(`/images/${guild_image_id}`); revalidatePath("/feed");
}

export async function submitIotwVote(formData: FormData) {
  const { user } = await requireAccess(); const supabase = await createServerSupabaseClient(); const ballot_id=value(formData,"ballot_id"), first=value(formData,"first"), second=value(formData,"second")||null, third=value(formData,"third")||null;
  const picks=[first,second,third].filter(Boolean); if(!first || new Set(picks).size !== picks.length) return { error:"Choose each image only once." };
  const { data: ballot } = await supabase.from("iotw_ballots").select("id,status,voting_opens_at,voting_closes_at").eq("id",ballot_id).maybeSingle(); const now=new Date().toISOString(); if(!ballot || ballot.status!=="voting_open" || now<ballot.voting_opens_at || now>=ballot.voting_closes_at) return { error:"Voting is closed for this ballot." };
  const { count } = await supabase.from("iotw_ballot_entries").select("id",{count:"exact",head:true}).eq("ballot_id",ballot_id).in("field_report_id",picks); if((count||0)!==picks.length) return { error:"Choose images from this ballot." };
  await supabase.from("iotw_votes").upsert({ ballot_id, voter_user_id:user.id, first_place_field_report_id:first, second_place_field_report_id:second, third_place_field_report_id:third, submitted_at:new Date().toISOString() }, { onConflict:"ballot_id,voter_user_id" });
  revalidatePath("/"); revalidatePath("/feed"); return { ok:true };
}

export async function adminFinalizeIotw(formData: FormData) {
  await requireAdmin(); const supabase=await createServerSupabaseClient(); const ballot_id=value(formData,"ballot_id"); await supabase.from("iotw_ballots").update({ status:"finalized", winner_field_report_id:value(formData,"winner")||null, second_place_field_report_id:value(formData,"second")||null, third_place_field_report_id:value(formData,"third")||null, photog_phavorite_field_report_id:value(formData,"phavorite")||null, admin_notes:value(formData,"admin_notes")||null }).eq("id",ballot_id); revalidatePath("/admin/iotw"); revalidatePath("/winners"); revalidatePath("/field-desk");
}

export async function addComment(formData: FormData) { const { user } = await requireAccess(); const supabase=await createServerSupabaseClient(); const image_id=value(formData,"image_id"), body=value(formData,"body"); if(!body) return; await supabase.from("image_comments").insert({image_id,user_id:user.id,body}); revalidatePath(`/images/${image_id}`); }
export async function toggleReaction(formData: FormData) { const { user } = await requireAccess(); const supabase=await createServerSupabaseClient(); const image_id=value(formData,"image_id"), reaction_type=value(formData,"reaction_type"); if(!REACTION_TYPES.some(([t])=>t===reaction_type)) return; const {data}=await supabase.from("image_reactions").select("id").eq("image_id",image_id).eq("user_id",user.id).eq("reaction_type",reaction_type).maybeSingle(); if(data) await supabase.from("image_reactions").delete().eq("id",data.id); else await supabase.from("image_reactions").insert({image_id,user_id:user.id,reaction_type}); revalidatePath(`/images/${image_id}`); revalidatePath("/feed"); }
export async function toggleWeeklyCandidate(formData: FormData) { const { user } = await requireAccess(); const supabase=await createServerSupabaseClient(); const image_id=value(formData,"image_id"), week=value(formData,"week_starts_on"), next=value(formData,"next")==="true"; if(next){ const { count }=await supabase.from("guild_images").select("id",{count:"exact",head:true}).eq("user_id",user.id).eq("week_starts_on",week).eq("is_weekly_candidate",true).is("deleted_at",null).neq("id",image_id); if((count||0)>0) return; } await supabase.from("guild_images").update({is_weekly_candidate:next}).eq("id",image_id).eq("user_id",user.id); revalidatePath(`/images/${image_id}`); revalidatePath("/feed"); }
export type ProfileSaveState = { status: "idle" | "saving" | "success" | "error"; profile?: any; message?: string };

export async function updateProfileLocation(_previousState: ProfileSaveState, formData: FormData): Promise<ProfileSaveState> {
  const { user } = await requireLogin();
  const supabase = await createServerSupabaseClient();
  const avatar_path = value(formData, "avatar_path") || null;
  const profilePayload = {
    id: user.id,
    email: user.email || null,
    display_name: value(formData, "display_name") || null,
    avatar_path,
    avatar_url: avatar_path ? storagePublicUrl(PROFILE_AVATAR_BUCKET, avatar_path) : null,
    country: value(formData, "country") || null,
    region: value(formData, "state_or_province") || null,
    state_or_province: value(formData, "state_or_province") || null,
    specific_location: value(formData, "specific_location_name") || null,
    specific_location_name: value(formData, "specific_location_name") || null,
  };

  const { error } = await supabase.from("profiles").upsert(profilePayload, { onConflict: "id" });
  if (error) {
    console.error("Profile save failed", error);
    return { status: "error", message: "We could not save your profile. Try again." };
  }

  const { data: refetchedProfile, error: refetchError } = await supabase
    .from("profiles")
    .select("display_name,full_name,email,avatar_url,avatar_path,country,region,state_or_province,specific_location,specific_location_name,updated_at")
    .eq("id", user.id)
    .maybeSingle();
  if (refetchError || !refetchedProfile || refetchedProfile.avatar_path !== avatar_path) {
    console.error("Profile refetch failed", refetchError || { expectedAvatarPath: avatar_path, refetchedProfile });
    return { status: "error", message: "We could not save your profile. Try again." };
  }

  revalidatePath("/profile"); revalidatePath("/progress"); revalidatePath("/field-desk"); revalidatePath("/guild-hall"); revalidatePath("/feed"); revalidatePath("/gallery");
  return { status: "success", message: "Profile saved. Your Guild identity is updated.", profile: refetchedProfile };
}
export async function adminImageAction(formData: FormData) { const { user }=await requireAdmin(); const supabase=await createServerSupabaseClient(); const image_id=value(formData,"image_id"), action=value(formData,"action"); const reason=value(formData,"moderation_reason")||null; const patch:any={moderation_reason:reason}; if(action==="hide") Object.assign(patch,{hidden_at:new Date().toISOString(),hidden_by:user.id,moderation_status:"hidden",status:"hidden"}); if(action==="unhide") Object.assign(patch,{hidden_at:null,hidden_by:null,moderation_status:"visible",status:"published"}); if(action==="delete") Object.assign(patch,{deleted_at:new Date().toISOString(),deleted_by:user.id,moderation_status:"deleted",status:"removed"}); if(action==="blur") Object.assign(patch,{moderation_blur_required:true,moderation_status:"blurred"}); if(action==="unblur") Object.assign(patch,{moderation_blur_required:false,moderation_status:"visible"}); if(action==="review") Object.assign(patch,{moderation_reviewed_by:user.id,moderation_reviewed_at:new Date().toISOString()}); await supabase.from("guild_images").update(patch).eq("id",image_id); revalidatePath("/admin/images"); }

export async function adminAchievementClaimAction(formData: FormData) { const { user }=await requireAdmin(); const supabase=await createServerSupabaseClient(); const claim_id=value(formData,"claim_id"), action=value(formData,"action"), review_notes=value(formData,"review_notes")||null; if(!["verified","rejected","revoked"].includes(action)) return; const { data: claim }=await supabase.from("field_report_achievement_claims").select("user_id,achievement_id").eq("id",claim_id).maybeSingle(); if(!claim) return; await supabase.from("field_report_achievement_claims").update({status:action,reviewed_at:new Date().toISOString(),reviewed_by:user.id,review_notes}).eq("id",claim_id); await supabase.from("user_achievements").update({status:action,awarded_by:user.id,notes:review_notes}).eq("user_id",claim.user_id).eq("achievement_id",claim.achievement_id); revalidatePath("/admin/achievements"); revalidatePath("/field-desk"); revalidatePath("/guild-hall"); revalidatePath("/progress"); }
