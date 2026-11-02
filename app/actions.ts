"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAccess, requireAdmin, requireLogin } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { REACTION_TYPES, SUBMISSION_LIMIT, getWeekStart } from "@/lib/images";
import { getIotwEntryPeriod, getIotwTargetPeriod } from "@/lib/iotw";
import { sanitizeCrop } from "@/lib/portrait";
import { coverageFromCaptureDate } from "@/lib/coverage";
import { displayNameFromProfile, getAvatarDisplay } from "@/lib/avatar";
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
  const { user } = await requireAccess(); const supabase = await createServerSupabaseClient(); const targetBallot = await getIotwEntryPeriod(supabase);
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
  const weekStart = getWeekStart();
  const { count: weekCount } = await supabase.from("guild_images").select("id",{count:"exact",head:true}).eq("user_id",user.id).eq("week_starts_on",weekStart).is("deleted_at",null);
  if ((weekCount || 0) >= SUBMISSION_LIMIT) return { error: `You have filed ${SUBMISSION_LIMIT} field reports this week. Your slots reset on Sunday.` };
  const is_weekly_candidate = formData.get("is_weekly_candidate") === "on";
  if (is_weekly_candidate) { const { count: candidateCount } = await supabase.from("field_reports").select("id",{count:"exact",head:true}).eq("user_id",user.id).eq("iotw_week_start",targetBallot.period_start.slice(0,10)).eq("is_iotw_candidate",true).neq("status","removed"); if ((candidateCount || 0)>0) return { error: `You already have an IOTW Week ${targetBallot.contest_week} contender. You can still submit this as a regular field report.` }; }
  const publicUrl = storagePublicUrl(FIELD_REPORT_IMAGE_BUCKET, image_original_path) || "";
  const reportPayload = { id: submission_id || undefined, user_id:user.id, title, capture_date, country, region:state_or_province, specific_location:value(formData,"specific_location_name")||null, gear:gear_settings, story:value(formData,"short_story")||null, went_well:value(formData,"what_went_well")||null, could_have_gone_better:value(formData,"what_could_have_gone_better")||null, image_original_path, image_bucket:FIELD_REPORT_IMAGE_BUCKET, image_width, image_height, image_size_bytes, is_iotw_candidate:is_weekly_candidate, iotw_week_start:is_weekly_candidate ? targetBallot.period_start.slice(0,10) : null, status:"published" };
  const { data: report, error: reportError } = await supabase.from("field_reports").insert(reportPayload).select("id").single(); if (reportError) return { error: reportError.message };
  const { data, error } = await supabase.from("guild_images").insert({ user_id:user.id, title, image_url:publicUrl, image_source:"supabase_storage", image_bucket:FIELD_REPORT_IMAGE_BUCKET, image_original_path, image_width, image_height, image_size_bytes, display_image_path:image_original_path, detail_image_path:image_original_path, capture_date, country, state_or_province, specific_location_name:value(formData,"specific_location_name")||null, gear_settings, short_story:value(formData,"short_story")||null, what_went_well:value(formData,"what_went_well")||null, what_could_have_gone_better:value(formData,"what_could_have_gone_better")||null, is_weekly_candidate, week_starts_on:weekStart, status:"published" }).select("id").single(); if (error) return { error: error.message };
  await supabase.from("field_reports").update({ guild_image_id: data.id }).eq("id", report.id).eq("user_id", user.id);
  if (is_weekly_candidate) { const ballotId = await ensureIotwBallot(supabase, targetBallot); if (ballotId) { const { error: entryError } = await supabase.from("iotw_ballot_entries").insert({ ballot_id: ballotId, field_report_id: report.id, user_id: user.id }); if (entryError) console.error("IOTW entry failed", entryError); } }
  await supabase.from("user_field_coverage").upsert({ field_report_id: report.id, user_id: user.id, capture_date, capture_year: coverage.year, capture_month: coverage.month, capture_season: coverage.season }, { onConflict: "field_report_id" });
  if (selectedAchievementId) { await supabase.from("field_report_achievement_claims").insert({ field_report_id: report.id, user_id: user.id, achievement_id: selectedAchievementId, status: "auto_awarded_pending_review" }); await supabase.from("user_achievements").upsert({ user_id: user.id, achievement_id: selectedAchievementId, earned_at: new Date().toISOString(), source_submission_id: data.id, source_field_report_id: report.id, status: "auto_awarded_pending_review", metadata: { source: "field_report_claim" } }, { onConflict: "user_id,achievement_id" }); }
  await awardPerfectYearIfComplete(supabase, user.id, report.id, coverage.year);
  revalidatePath("/feed"); revalidatePath("/field-desk"); revalidatePath("/guild-hall"); revalidatePath("/progress"); revalidatePath("/profile"); redirect(`/images/${data.id}?achievement=1`);
}


async function ensureIotwBallot(supabase: any, _period?: ReturnType<typeof getIotwTargetPeriod>) {
  // The ballot row is created by a SECURITY DEFINER function so members never need write access to iotw_ballots.
  const { data, error } = await supabase.rpc("ensure_iotw_ballot");
  if (error) console.error("IOTW ballot lookup failed", error);
  return (data as string | null) || undefined;
}

export async function enterIotwContender(formData: FormData) {
  const { user } = await requireAccess(); const supabase = await createServerSupabaseClient(); const field_report_id = value(formData,"field_report_id"), guild_image_id = value(formData,"guild_image_id"); const period = await getIotwEntryPeriod(supabase); const ballotId = await ensureIotwBallot(supabase, period); if (!ballotId) return;
  const { data: report } = await supabase.from("field_reports").select("id,user_id,status").eq("id",field_report_id).eq("user_id",user.id).maybeSingle(); if(!report || report.status === "removed") return;
  const { error: candidateError } = await supabase.from("field_reports").update({ is_iotw_candidate:true, iotw_week_start:period.period_start.slice(0,10) }).eq("id",field_report_id).eq("user_id",user.id);
  if (candidateError) { console.error("IOTW candidate update failed", candidateError); return; }
  const { error: entryError } = await supabase.from("iotw_ballot_entries").insert({ ballot_id: ballotId, field_report_id, user_id: user.id });
  if (entryError) console.error("IOTW entry failed", entryError);
  if (guild_image_id) await supabase.from("guild_images").update({ is_weekly_candidate:true }).eq("id",guild_image_id).eq("user_id",user.id);
  revalidatePath(`/images/${guild_image_id}`); revalidatePath("/feed");
}

export async function submitIotwVote(_previousState: any, formData: FormData) {
  const { user } = await requireAccess(); const supabase = await createServerSupabaseClient(); const ballot_id=value(formData,"ballot_id"), first=value(formData,"first"), second=value(formData,"second")||null, third=value(formData,"third")||null;
  const picks=[first,second,third].filter(Boolean); if(!first || new Set(picks).size !== picks.length) return { error:"Choose each image only once." };
  const { data: ballot } = await supabase.from("iotw_ballots").select("id,status,voting_opens_at,voting_closes_at").eq("id",ballot_id).maybeSingle(); const now=new Date().toISOString(); if(!ballot || ballot.status!=="voting_open" || now<ballot.voting_opens_at || now>=ballot.voting_closes_at) return { error:"Voting is closed for this ballot." };
  const { data: ballotEntries } = await supabase.from("iotw_ballot_entries").select("field_report_id,user_id").eq("ballot_id",ballot_id);
  const eligible = new Set((ballotEntries||[]).filter((entry:any)=>entry.user_id!==user.id).map((entry:any)=>entry.field_report_id));
  if (picks.some((id)=>!eligible.has(id as string))) return { error:"Choose images from this ballot. You cannot vote for your own image." };
  if (picks.length < Math.min(3, eligible.size)) return { error:`Rank your Top ${Math.min(3, eligible.size)} to lock in your vote.` };
  const { error: voteError } = await supabase.from("iotw_votes").upsert({ ballot_id, voter_user_id:user.id, first_place_field_report_id:first, second_place_field_report_id:second, third_place_field_report_id:third, submitted_at:new Date().toISOString() }, { onConflict:"ballot_id,voter_user_id" });
  if (voteError) { console.error("IOTW vote failed", voteError); return { error:"We could not save your vote. Please try again." }; }
  revalidatePath("/", "layout"); revalidatePath("/feed"); return { ok:true };
}

export async function adminFinalizeIotw(formData: FormData) {
  await requireAdmin(); const supabase=await createServerSupabaseClient(); const ballot_id=value(formData,"ballot_id"); await supabase.from("iotw_ballots").update({ status:"finalized", winner_field_report_id:value(formData,"winner")||null, second_place_field_report_id:value(formData,"second")||null, third_place_field_report_id:value(formData,"third")||null, photog_phavorite_field_report_id:value(formData,"phavorite")||null, admin_notes:value(formData,"admin_notes")||null }).eq("id",ballot_id); revalidatePath("/admin/iotw"); revalidatePath("/winners"); revalidatePath("/field-desk");
}

export type CommentState = { ok?: boolean; error?: string; comment?: any; nonce?: number };
export type CommentSection = "general" | "went_well" | "could_be_better";
const COMMENT_SECTIONS: CommentSection[] = ["general", "went_well", "could_be_better"];
export type GuildComment = { id: string; image_id: string; user_id: string; body: string; created_at: string; section: CommentSection; author: { id: string; name: string; avatarUrl: string | null; initials: string } };
export type CommentResult = { ok: true; comment: GuildComment; duplicate?: boolean } | { ok: false; error: string };

/** Posts one piece of Guild feedback as the signed-in member and returns it with the author attached. */
export async function addComment(_prev: CommentState, formData: FormData): Promise<CommentState> {
  const result = await postComment(formData);
  return result.ok ? { ok: true, comment: result.comment, nonce: Date.now() } : { ok: false, error: result.error, nonce: Date.now() };
}

async function postComment(formData: FormData): Promise<CommentResult> {
  const { user } = await requireAccess();
  const supabase = await createServerSupabaseClient();
  const image_id = value(formData, "image_id"), body = value(formData, "body");
  const rawSection = value(formData, "section") || "general";
  const section = COMMENT_SECTIONS.find((s) => s === rawSection);
  if (!image_id) return { ok: false, error: "We could not tell which image this feedback is for. Refresh and try again." };
  if (!section) return { ok: false, error: "We could not tell where this reply goes. Refresh and try again." };
  if (!body) return { ok: false, error: section === "general" ? "Write a little feedback before posting." : "Write a short reply before posting." };
  if (section === "general" && body.length > 4000) return { ok: false, error: "That feedback is too long. Keep it under 4,000 characters." };
  if (section !== "general" && body.length > 280) return { ok: false, error: "Section replies stop at 280 characters. Longer thoughts belong in Guild Feedback below." };
  const [{ data: profile }, { data: recent }] = await Promise.all([
    supabase.from("profiles").select("display_name,full_name,avatar_url,avatar_path").eq("id", user.id).maybeSingle(),
    // Guard against double submits: the same note from the same member on the same image in the last two minutes is returned, not re-inserted.
    supabase.from("image_comments").select("id,image_id,user_id,body,created_at,section").eq("image_id", image_id).eq("user_id", user.id).eq("section", section).eq("body", body).is("deleted_at", null).gte("created_at", new Date(Date.now() - 2 * 60 * 1000).toISOString()).order("created_at", { ascending: true }).limit(1),
  ]);
  const author = commentAuthor(user.id, profile, user);
  if (recent?.[0]) return { ok: true, duplicate: true, comment: { ...recent[0], author } };
  const { data, error } = await supabase.from("image_comments").insert({ image_id, user_id: user.id, body, section }).select("id,image_id,user_id,body,created_at,section").single();
  if (error || !data) { console.error("Comment insert failed", error); return { ok: false, error: "Your feedback did not post. Your text is still here, so try again in a moment." }; }
  revalidatePath(`/images/${image_id}`); revalidatePath("/guild-hall");
  return { ok: true, comment: { ...data, author } };
}

function commentAuthor(id: string, profile: any, user?: any) {
  const name = displayNameFromProfile(profile, user?.user_metadata, null);
  const avatar = getAvatarDisplay({ avatarPath: profile?.avatar_path, avatarUrl: profile?.avatar_url, displayName: name });
  return { id, name, avatarUrl: avatar.avatarUrl, initials: avatar.initials };
}

export type ReactionResult = { ok: true; active: boolean } | { ok: false; error: string };

/** Sets one reaction on or off for the signed-in member. Idempotent, so fast repeat clicks cannot drift out of sync. */
export async function setReaction(image_id: string, reaction_type: string, active: boolean): Promise<ReactionResult> {
  const { user } = await requireAccess();
  if (!image_id || !REACTION_TYPES.some(([t]) => t === reaction_type)) return { ok: false, error: "That reaction is not available." };
  const supabase = await createServerSupabaseClient();
  const { error } = active
    ? await supabase.from("image_reactions").upsert({ image_id, user_id: user.id, reaction_type }, { onConflict: "image_id,user_id,reaction_type", ignoreDuplicates: true })
    : await supabase.from("image_reactions").delete().eq("image_id", image_id).eq("user_id", user.id).eq("reaction_type", reaction_type);
  if (error) { console.error("Reaction save failed", error); return { ok: false, error: "That reaction did not save. Try again." }; }
  revalidatePath(`/images/${image_id}`); revalidatePath("/feed"); revalidatePath("/guild-hall");
  return { ok: true, active };
}
export async function toggleWeeklyCandidate(formData: FormData) {
  // Marking an image as a contender must also put its field report on the ballot, otherwise it shows as entered but never reaches voters.
  const { user } = await requireAccess(); const supabase=await createServerSupabaseClient(); const image_id=value(formData,"image_id"), next=value(formData,"next")==="true";
  const { data: report } = await supabase.from("field_reports").select("id,status,is_iotw_candidate,iotw_week_start").eq("guild_image_id",image_id).eq("user_id",user.id).maybeSingle();
  if (next) {
    if (!report || report.status === "removed") return;
    const period = await getIotwEntryPeriod(supabase); const week = period.period_start.slice(0,10);
    const { count } = await supabase.from("field_reports").select("id",{count:"exact",head:true}).eq("user_id",user.id).eq("iotw_week_start",week).eq("is_iotw_candidate",true).neq("status","removed").neq("id",report.id); if((count||0)>0) return;
    const ballotId = await ensureIotwBallot(supabase, period); if (!ballotId) return;
    const { error: candidateError } = await supabase.from("field_reports").update({ is_iotw_candidate:true, iotw_week_start:week }).eq("id",report.id).eq("user_id",user.id); if (candidateError) { console.error("IOTW candidate update failed", candidateError); return; }
    const { error: entryError } = await supabase.from("iotw_ballot_entries").insert({ ballot_id: ballotId, field_report_id: report.id, user_id: user.id }); if (entryError && entryError.code !== "23505") { console.error("IOTW entry failed", entryError); return; }
  } else if (report) {
    // Withdrawal only removes the entry while its ballot is still upcoming (RLS). Once voting opens it stays on the ballot.
    const { count: removed } = await supabase.from("iotw_ballot_entries").delete({ count: "exact" }).eq("field_report_id",report.id).eq("user_id",user.id);
    const { count: remaining } = await supabase.from("iotw_ballot_entries").select("field_report_id",{count:"exact",head:true}).eq("field_report_id",report.id);
    if ((remaining || 0) > 0) { if (removed) console.error("IOTW partial withdrawal"); return; }
    await supabase.from("field_reports").update({ is_iotw_candidate:false }).eq("id",report.id).eq("user_id",user.id);
  }
  await supabase.from("guild_images").update({is_weekly_candidate:next}).eq("id",image_id).eq("user_id",user.id); revalidatePath(`/images/${image_id}`); revalidatePath("/feed");
}
const PROFILE_SETTINGS_COLUMNS = "display_name,full_name,email,avatar_url,avatar_path,avatar_pill_path,avatar_original_path,avatar_crop,country,region,state_or_province,specific_location,specific_location_name,updated_at";
export type ProfileSaveState = { status: "idle" | "saving" | "success" | "error"; profile?: any; message?: string };

export async function updateProfileLocation(_previousState: ProfileSaveState, formData: FormData): Promise<ProfileSaveState> {
  const { user } = await requireLogin();
  const supabase = await createServerSupabaseClient();
  // The portrait saves on its own (savePortrait), so this form never touches avatar columns.
  const profilePayload = {
    id: user.id,
    email: user.email || null,
    display_name: value(formData, "display_name") || null,
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
    .select(PROFILE_SETTINGS_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();
  if (refetchError || !refetchedProfile) {
    console.error("Profile refetch failed", refetchError);
    return { status: "error", message: "We could not save your profile. Try again." };
  }

  revalidatePath("/", "layout");
  return { status: "success", message: "Profile saved. Your Guild identity is updated.", profile: refetchedProfile };
}

export type PortraitSaveState = { ok: boolean; message: string; profile?: any };
const PORTRAIT_FILE = /^users\/[0-9a-f-]{36}\/avatar[a-z0-9-]*\.(jpg|png|webp)$/;

/**
 * Saves the member's portrait in one step right after the browser uploads the crops.
 * avatar_path is the circle crop (used everywhere), avatar_pill_path the header pill, avatar_original_path the source photo,
 * and avatar_crop the position and zoom for each shape so the member can come back and adjust.
 */
export async function savePortrait(input: { circlePath: string; pillPath: string; originalPath: string | null; crop: unknown }): Promise<PortraitSaveState> {
  const { user } = await requireLogin();
  const supabase = await createServerSupabaseClient();
  const own = (p: string | null | undefined) => !p || (p.startsWith(`users/${user.id}/`) && PORTRAIT_FILE.test(p));
  if (!input?.circlePath || !input?.pillPath || !own(input.circlePath) || !own(input.pillPath) || !own(input.originalPath)) return { ok: false, message: "That portrait upload did not match your account. Try again." };
  const avatar_crop = sanitizeCrop(input.crop);
  const patch = {
    id: user.id,
    avatar_path: input.circlePath,
    avatar_url: storagePublicUrl(PROFILE_AVATAR_BUCKET, input.circlePath),
    avatar_pill_path: input.pillPath,
    avatar_original_path: input.originalPath || null,
    avatar_crop,
  };
  const { error } = await supabase.from("profiles").upsert(patch, { onConflict: "id" });
  if (error) { console.error("Portrait save failed", error); return { ok: false, message: "We could not save your portrait. Try again." }; }
  const { data: profile } = await supabase.from("profiles").select(PROFILE_SETTINGS_COLUMNS).eq("id", user.id).maybeSingle();
  if (!profile || profile.avatar_path !== input.circlePath) return { ok: false, message: "We could not save your portrait. Try again." };

  // Tidy older portrait files in the member's own folder. Field report images live in a subfolder and are never touched.
  const keep = new Set([input.circlePath, input.pillPath, input.originalPath].filter(Boolean));
  const { data: files } = await supabase.storage.from(PROFILE_AVATAR_BUCKET).list(`users/${user.id}`, { limit: 100 });
  const stale = (files || []).filter((f: any) => f.id && /^avatar/.test(f.name)).map((f: any) => `users/${user.id}/${f.name}`).filter((p: string) => !keep.has(p));
  if (stale.length) { const { error: removeError } = await supabase.storage.from(PROFILE_AVATAR_BUCKET).remove(stale); if (removeError) console.error("Old portrait cleanup failed", removeError); }

  revalidatePath("/", "layout");
  return { ok: true, message: "Portrait saved. It shows across the Guild now.", profile };
}
export async function adminImageAction(formData: FormData) { const { user }=await requireAdmin(); const supabase=await createServerSupabaseClient(); const image_id=value(formData,"image_id"), action=value(formData,"action"); const reason=value(formData,"moderation_reason")||null; const patch:any={moderation_reason:reason}; if(action==="hide") Object.assign(patch,{hidden_at:new Date().toISOString(),hidden_by:user.id,moderation_status:"hidden",status:"hidden"}); if(action==="unhide") Object.assign(patch,{hidden_at:null,hidden_by:null,moderation_status:"visible",status:"published"}); if(action==="delete") Object.assign(patch,{deleted_at:new Date().toISOString(),deleted_by:user.id,moderation_status:"deleted",status:"removed"}); if(action==="blur") Object.assign(patch,{moderation_blur_required:true,moderation_status:"blurred"}); if(action==="unblur") Object.assign(patch,{moderation_blur_required:false,moderation_status:"visible"}); if(action==="review") Object.assign(patch,{moderation_reviewed_by:user.id,moderation_reviewed_at:new Date().toISOString()}); await supabase.from("guild_images").update(patch).eq("id",image_id); revalidatePath("/admin/images"); }

export async function adminAchievementClaimAction(formData: FormData) { const { user }=await requireAdmin(); const supabase=await createServerSupabaseClient(); const claim_id=value(formData,"claim_id"), action=value(formData,"action"), review_notes=value(formData,"review_notes")||null; if(!["verified","rejected","revoked"].includes(action)) return; const { data: claim }=await supabase.from("field_report_achievement_claims").select("user_id,achievement_id").eq("id",claim_id).maybeSingle(); if(!claim) return; await supabase.from("field_report_achievement_claims").update({status:action,reviewed_at:new Date().toISOString(),reviewed_by:user.id,review_notes}).eq("id",claim_id); await supabase.from("user_achievements").update({status:action,awarded_by:user.id,notes:review_notes}).eq("user_id",claim.user_id).eq("achievement_id",claim.achievement_id); revalidatePath("/admin/achievements"); revalidatePath("/field-desk"); revalidatePath("/guild-hall"); revalidatePath("/progress"); }

export type EditReportState = { ok?: boolean; error?: string };

export async function updateOwnFieldReport(_prev: EditReportState, formData: FormData): Promise<EditReportState> {
  const { user } = await requireAccess();
  const supabase = await createServerSupabaseClient();
  const image_id = value(formData, "image_id");
  const title = value(formData, "title"), country = value(formData, "country"), state_or_province = value(formData, "state_or_province"), gear_settings = value(formData, "gear_settings");
  const specific = value(formData, "specific_location_name") || null, story = value(formData, "short_story") || null, wentWell = value(formData, "what_went_well") || null, better = value(formData, "what_could_have_gone_better") || null;
  if (!image_id) return { error: "That field report could not be found." };
  if (!title || !country || !state_or_province || !gear_settings) return { error: "Title, country, state or region, and gear are required." };
  if (title.length > 200 || (story?.length || 0) > 4000 || (wentWell?.length || 0) > 2000 || (better?.length || 0) > 2000 || gear_settings.length > 500) return { error: "One of the fields is too long. Trim it a little and save again." };
  const { data: image } = await supabase.from("guild_images").select("id,user_id").eq("id", image_id).eq("user_id", user.id).maybeSingle();
  if (!image) return { error: "You can only edit your own field reports." };
  const { error } = await supabase.from("guild_images").update({ title, country, state_or_province, specific_location_name: specific, gear_settings, short_story: story, what_went_well: wentWell, what_could_have_gone_better: better }).eq("id", image_id).eq("user_id", user.id);
  if (error) return { error: "Your changes did not save. Please try again in a moment." };
  const { error: reportError } = await supabase.from("field_reports").update({ title, country, region: state_or_province, specific_location: specific, gear: gear_settings, story, went_well: wentWell, could_have_gone_better: better }).eq("guild_image_id", image_id).eq("user_id", user.id);
  if (reportError) console.error("Field report sync failed", reportError);
  revalidatePath(`/images/${image_id}`); revalidatePath("/feed"); revalidatePath("/guild-hall"); revalidatePath("/field-desk"); revalidatePath(`/members/${user.id}`);
  redirect(`/images/${image_id}?edited=1`);
}
