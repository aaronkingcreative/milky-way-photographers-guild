"use client";
import { useActionState, useMemo, useState } from "react";
import { submitImage } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";
import { coverageFromCaptureDate } from "@/lib/coverage";
import { rankForCount } from "@/lib/achievements";
import { ALLOWED_IMAGE_TYPES, FIELD_REPORT_IMAGE_BUCKET, fieldReportOriginalPath, MAX_UPLOAD_BYTES, storagePublicUrl } from "@/lib/storage";
import { LocationSelects } from "./LocationSelects";

type AchievementOption = { id: string; name: string; category: string; glyph?: string; requirement?: string; allow_repeat?: boolean };

type SubmitState = { error?: string };

async function readImageSize(file: File) {
  const url = URL.createObjectURL(file);
  try { const img = new Image(); await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("Unable to read image dimensions.")); img.src = url; }); return { width: img.naturalWidth, height: img.naturalHeight }; }
  finally { URL.revokeObjectURL(url); }
}

function AchievementWidget({ achievements, earnedIds, selectedId, setSelectedId, captureDate, currentHonorCount }: { achievements: AchievementOption[]; earnedIds: string[]; selectedId: string; setSelectedId: (id: string) => void; captureDate: string; currentHonorCount: number }) {
  const coverage = captureDate ? coverageFromCaptureDate(captureDate) : null;
  const grouped = ["monthly", "seasonal", "foreground", "technique", "special"].map((category) => ({ category, items: achievements.filter((item) => item.category === category) }));
  const perfectYearCount = coverage ? Math.min(12, 1) : 0;
  return <aside className="mw-submit-achievement-widget">
    <h2>Claim One Field Honor</h2>
    <p>Pick the one Field Honor this image earns. Month, season, year, and streak coverage are tracked automatically.</p>
    <input type="hidden" name="achievement_id" value={selectedId} />
    <div className="mt-5 space-y-5">
      {grouped.map((group) => group.items.length > 0 && <section key={group.category}>
        <h3>{group.category}</h3>
        <div className="mt-2 grid gap-2">
          {group.items.map((achievement) => {
            const earned = earnedIds.includes(achievement.id) && !achievement.allow_repeat;
            const selected = selectedId === achievement.id;
            const locked = achievement.category === "special";
            return <button key={achievement.id} type="button" disabled={earned || locked} onClick={() => setSelectedId(selected ? "" : achievement.id)} className={`mw-achievement-choice ${selected ? "is-selected" : ""} ${earned ? "is-earned" : ""} ${locked ? "is-locked" : ""}`}>
              <span className="glyph">{selected ? "✓" : achievement.glyph || "✦"}</span>
              <span className="min-w-0 flex-1"><span className="block truncate">{achievement.name}</span><span className="state">{selected ? "Selected" : earned ? "Already earned" : locked ? "Locked" : "Available"}</span></span>
            </button>;
          })}
        </div>
      </section>)}
    </div>
    <section className="mw-auto-tracking mt-5">
      <h3>Automatic Tracking</h3>
      {coverage ? <div className="mt-3 space-y-2 text-sm text-white/72">
        <p>This image will fill {coverage.monthLabel} in your calendar coverage.</p>
        <p>It will also update {coverage.seasonLabel} and {coverage.yearLabel} year coverage.</p>
        <p>Month streak and year streak progress will update from this capture date.</p>
        <p>Perfect Year progress for {coverage.year}: {perfectYearCount} of 12 months after this image, plus your existing coverage.</p>
        <p className="font-bold text-[#f0bd66]">This does not use your one Field Honor claim.</p>
      </div> : <p className="mt-3 text-sm text-white/62">Add a capture date to preview month, season, year, and streak progress.</p>}
    </section>
    <section className="mt-5 rounded border border-white/10 bg-white/[.03] p-3 text-sm text-white/70">
      <strong className="font-display uppercase tracking-[.12em] text-[#f0bd66]">Rank Preview</strong>
      <p className="mt-2">Current rank-counting Field Honors: {currentHonorCount}</p>
      <p>With this claim: {rankForCount(currentHonorCount + (selectedId ? 1 : 0)).short}</p>
    </section>
  </aside>;
}

export function SubmitImageForm({ remaining: _remaining, hasCandidate, achievements = [], earnedAchievementIds = [], currentHonorCount = 0 }: { remaining: number; hasCandidate: boolean; achievements?: AchievementOption[]; earnedAchievementIds?: string[]; currentHonorCount?: number }) {
  const [state, formAction] = useActionState<SubmitState, FormData>(async (_: SubmitState, fd: FormData) => submitImage(fd), {});
  const [upload, setUpload] = useState<{ path?: string; type?: string; size?: number; width?: number; height?: number; id?: string; error?: string; name?: string; busy?: boolean }>({});
  const [selectedId, setSelectedId] = useState("");
  const [captureDate, setCaptureDate] = useState("");
  const supabase = useMemo(() => createClient(), []);
  const previewUrl = upload.path ? storagePublicUrl(FIELD_REPORT_IMAGE_BUCKET, upload.path) : null;

  async function onFile(file?: File) { if (!file) return; if (!ALLOWED_IMAGE_TYPES.includes(file.type) || file.size > MAX_UPLOAD_BYTES) { setUpload({ error: "Upload a JPG, PNG, or WebP image up to 30 MB." }); return; } setUpload({ busy: true, name: file.name }); const { data: auth } = await supabase.auth.getUser(); const userId = auth.user?.id; if (!userId) { setUpload({ error: "Sign in again before uploading." }); return; } const id = crypto.randomUUID(); const path = fieldReportOriginalPath(userId, id, file.type); if (!path) { setUpload({ error: "Unsupported image type." }); return; } const dimensions = await readImageSize(file).catch(() => ({ width: 0, height: 0 })); const { error } = await supabase.storage.from(FIELD_REPORT_IMAGE_BUCKET).upload(path, file, { contentType: file.type, upsert: false }); if (error) { setUpload({ error: error.message }); return; } setUpload({ path, type: file.type, size: file.size, width: dimensions.width, height: dimensions.height, id, name: file.name }); }

  return <form action={formAction} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
    <div className="space-y-6">
      <div className="mw-submit-card p-5"><p className="mw-submit-field-label">The Image <span>*</span></p><label className="mt-3 block cursor-pointer rounded-[5px] border border-dashed border-[#e79f2b]/45 bg-[#06101c]/55 p-8 text-center"><span className="block text-3xl text-[#e79f2b]">↑</span><span className="mt-2 block font-display text-[18.5px] font-semibold text-white">Choose the image for this field report</span><span className="mt-2 block mw-help">JPG, PNG, or WebP only. Max 30 MB. HEIC is not supported at launch.</span><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onFile(event.target.files?.[0])} /><span className="mw-btn-ghost mt-5 inline-block rounded-sm">Select Image</span></label>{previewUrl && <img src={previewUrl} alt="Uploaded field report preview" className="mt-4 max-h-72 w-full rounded object-cover" />}{upload.busy && <p className="mt-3 text-sm text-white/70">Uploading {upload.name}...</p>}{upload.path && <p className="mt-3 text-sm text-[#f0bd66]">Uploaded {upload.name}. Original kept for Guild review.</p>}{upload.error && <p className="mw-error mt-3">{upload.error}</p>}<p className="mt-3 text-sm text-[#f0bd66]">Regular submissions are unlimited. {hasCandidate ? "You already have a weekly contender." : "You may nominate one Image of the Week contender."}</p></div>
      <input type="hidden" name="submission_id" value={upload.id || ""} /><input type="hidden" name="image_original_path" value={upload.path || ""} /><input type="hidden" name="image_mime_type" value={upload.type || ""} /><input type="hidden" name="image_size_bytes" value={upload.size || ""} /><input type="hidden" name="image_width" value={upload.width || ""} /><input type="hidden" name="image_height" value={upload.height || ""} />
      {state?.error && <p className="mw-error">{state.error}</p>}
      <label className="mw-submit-field-label">Image Title <span>*</span><input className="mw-input mt-2" name="title" required placeholder="Give your image a name worth remembering" /></label>
      <div className="grid gap-4 md:grid-cols-2"><label className="mw-submit-field-label">Capture Date <span>*</span><input className="mw-input mt-2" name="capture_date" type="date" required onChange={(event) => setCaptureDate(event.target.value)} /></label><label className="mw-submit-field-label">Gear and Settings <span>*</span><input className="mw-input mt-2" name="gear_settings" required placeholder="Camera, lens, ISO, shutter..." /></label></div>
      <div className="lg:hidden"><AchievementWidget achievements={achievements} earnedIds={earnedAchievementIds} selectedId={selectedId} setSelectedId={setSelectedId} captureDate={captureDate} currentHonorCount={currentHonorCount} /></div>
      <LocationSelects />
      <div className="h-px bg-white/[.08]" />
      <div><div className="mw-submit-section-label">Tell Us About This Night <span>optional, but it is how we all learn</span></div><label className="mt-5 block text-[15.5px] font-bold text-white/85">The story, in 3 to 5 sentences<textarea className="mw-input mt-2 min-h-24" name="short_story" rows={5} placeholder="What was the adventure? How did you find this spot, and what was the night like?" /></label><div className="mt-5 grid gap-4 md:grid-cols-2"><label className="block text-[15.5px] font-bold text-[#5fcf94]">What went well?<textarea className="mw-input mt-2 min-h-20" name="what_went_well" rows={3} placeholder="What are you proud of in this shot?" /></label><label className="block text-[15.5px] font-bold text-[#e79f2b]">What could have gone better?<textarea className="mw-input mt-2 min-h-20" name="what_could_have_gone_better" rows={3} placeholder="What would you do differently next time?" /></label></div></div>
      <label className="mw-iotw-submit-card"><input className="mw-iotw-checkbox" name="is_weekly_candidate" type="checkbox" disabled={hasCandidate} /><span><span className="block font-display text-[17.5px] font-semibold text-white">Enter this image for Image of the Week</span><span className="mw-help">One contender per member each week. Voting will come later.</span></span></label>
      <button className="mw-btn-primary w-full rounded-sm sm:w-auto" disabled={!upload.path || upload.busy}>File This Field Report</button>
    </div>
    <div className="hidden lg:block"><AchievementWidget achievements={achievements} earnedIds={earnedAchievementIds} selectedId={selectedId} setSelectedId={setSelectedId} captureDate={captureDate} currentHonorCount={currentHonorCount} /></div>
  </form>;
}
