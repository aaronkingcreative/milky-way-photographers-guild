"use client";
import { useActionState, useMemo, useState } from "react";
import { submitImage } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";
import { ALLOWED_IMAGE_TYPES, FIELD_REPORT_IMAGE_BUCKET, fieldReportOriginalPath, MAX_UPLOAD_BYTES } from "@/lib/storage";
import { LocationSelects } from "./LocationSelects";

type AchievementOption = { id: string; name: string; category: string };

async function readImageSize(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("Unable to read image dimensions.")); img.src = url; });
    return { width: img.naturalWidth, height: img.naturalHeight };
  } finally { URL.revokeObjectURL(url); }
}

export function SubmitImageForm({remaining,hasCandidate,achievements=[]}:{remaining:number;hasCandidate:boolean;achievements?:AchievementOption[]}){
  const [state,formAction]=useActionState<any, FormData>(async(_: any,fd:FormData)=>submitImage(fd),{});
  const [upload, setUpload] = useState<{ path?: string; type?: string; size?: number; width?: number; height?: number; id?: string; error?: string; name?: string; busy?: boolean }>({});
  const supabase = useMemo(() => createClient(), []);
  async function onFile(file?: File) {
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type) || file.size > MAX_UPLOAD_BYTES) { setUpload({ error: "Upload a JPG, PNG, or WebP image up to 30 MB." }); return; }
    setUpload({ busy: true, name: file.name });
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) { setUpload({ error: "Sign in again before uploading." }); return; }
    const id = crypto.randomUUID();
    const path = fieldReportOriginalPath(userId, id, file.type);
    if (!path) { setUpload({ error: "Unsupported image type." }); return; }
    const dimensions = await readImageSize(file).catch(() => ({ width: 0, height: 0 }));
    const { error } = await supabase.storage.from(FIELD_REPORT_IMAGE_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
    if (error) { setUpload({ error: error.message }); return; }
    setUpload({ path, type: file.type, size: file.size, width: dimensions.width, height: dimensions.height, id, name: file.name });
  }
  return <form action={formAction} className="mw-card-soft space-y-6 p-6">
    <div className="rounded-lg border border-[#e79f2b]/35 bg-[#0b1a2b] p-5"><p className="mw-eyebrow">Image File</p><label className="mt-3 block rounded-lg border border-dashed border-[#e79f2b]/55 bg-[#06101c]/55 p-6 text-center"><span className="block text-3xl text-[#f0bd66]">↑</span><span className="mt-2 block font-display text-2xl uppercase">Choose the image for this field report</span><span className="mt-2 block mw-help">JPG, PNG, or WebP only. Max 30 MB. HEIC is not supported at launch.</span><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event)=>onFile(event.target.files?.[0])}/><span className="mw-btn-ghost mt-5 inline-block">Select Image</span></label>{upload.busy&&<p className="mt-3 text-sm text-white/70">Uploading {upload.name}...</p>}{upload.path&&<p className="mt-3 text-sm text-[#f0bd66]">Uploaded {upload.name}. Original kept for Guild review.</p>}{upload.error&&<p className="mw-error mt-3">{upload.error}</p>}<p className="mt-3 text-sm text-[#f0bd66]">Regular submissions are unlimited. {hasCandidate?'You already have a weekly contender.':'You may nominate one Image of the Week contender.'}</p></div>
    <input type="hidden" name="submission_id" value={upload.id||""}/><input type="hidden" name="image_original_path" value={upload.path||""}/><input type="hidden" name="image_mime_type" value={upload.type||""}/><input type="hidden" name="image_size_bytes" value={upload.size||""}/><input type="hidden" name="image_width" value={upload.width||""}/><input type="hidden" name="image_height" value={upload.height||""}/>
    {state?.error&&<p className="mw-error">{state.error}</p>}<label className="mw-field-label">Image Title *<input className="mw-input mt-2" name="title" required placeholder="Give your image a name worth remembering"/></label><div className="grid gap-4 md:grid-cols-2"><label className="mw-field-label">Capture Date *<input className="mw-input mt-2" name="capture_date" type="date" required/></label><label className="mw-field-label">Gear and Settings *<input className="mw-input mt-2" name="gear_settings" required placeholder="Camera, lens, ISO, shutter..."/></label></div><LocationSelects/><label className="mw-field-label">The Field Report<textarea className="mw-input mt-2" name="short_story" rows={5} placeholder="What was the adventure? How did you find this spot, and what was the night like?"/></label><div className="grid gap-4 md:grid-cols-2"><label className="mw-field-label">What went well?<textarea className="mw-input mt-2" name="what_went_well" rows={3}/></label><label className="mw-field-label">What could have gone better?<textarea className="mw-input mt-2" name="what_could_have_gone_better" rows={3}/></label></div>
    {achievements.length>0&&<fieldset className="rounded-lg border border-white/10 bg-[#081321] p-5"><legend className="px-2 font-display uppercase tracking-[.12em] text-[#f0bd66]">Claim field honors</legend><p className="mw-help mb-4">Claim any achievements this image earns. They appear immediately and can be reviewed later.</p><div className="grid gap-2 md:grid-cols-2">{achievements.map(a=><label key={a.id} className="flex gap-2 rounded border border-white/10 bg-white/[.03] p-3 text-sm text-white/82"><input type="checkbox" name="achievement_ids" value={a.id}/><span>{a.name}</span></label>)}</div></fieldset>}
    <label className="rounded-lg border border-[#e79f2b]/35 bg-[#0b1a2b] flex gap-3 p-4 text-white/82"><input name="is_weekly_candidate" type="checkbox" disabled={hasCandidate}/><span><span className="block font-display uppercase tracking-[.08em] text-[#f0bd66]">Enter this image for Image of the Week</span><span className="mw-help">One contender per member each week. Voting will come later.</span></span></label><button className="mw-btn-primary w-full rounded-sm sm:w-auto" disabled={!upload.path || upload.busy}>File This Field Report</button></form>
}
