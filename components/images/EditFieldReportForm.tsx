"use client";

import { useActionState, useState } from "react";
import { updateOwnFieldReport, type EditReportState } from "@/app/actions";
import { AchievementWidget, type AchievementOption } from "./AchievementWidget";
import { LocationSelects } from "./LocationSelects";
import type { ExistingFieldHonor } from "@/lib/field-honors";

function claimStatusLabel(status: string) {
  if (status === "auto_awarded_pending_review") return "Pending Guild review";
  if (status === "verified") return "Verified by the Guild";
  if (status === "rejected") return "Not accepted by the Guild";
  if (status === "revoked") return "Revoked";
  return "On file";
}

export function EditFieldReportForm({ image, achievements = [], earnedAchievementIds = [], currentHonorCount = 0, existingHonor = null, canClaim = false }: { image: any; achievements?: AchievementOption[]; earnedAchievementIds?: string[]; currentHonorCount?: number; existingHonor?: ExistingFieldHonor | null; canClaim?: boolean }) {
  const [state, action, pending] = useActionState<EditReportState, FormData>(updateOwnFieldReport, {});
  const [selectedId, setSelectedId] = useState("");
  const [captureDate, setCaptureDate] = useState(image.capture_date || "");
  return (
    <form action={action} className="mw-submit-card mt-6 space-y-5 p-5">
      <input type="hidden" name="image_id" value={image.id} />
      <label className="mw-submit-field-label block">Image Title <span>*</span><input className="mw-input mt-2" name="title" required maxLength={200} defaultValue={image.title || ""} /></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="mw-submit-field-label block">Capture Date <span>*</span><input className="mw-input mt-2" name="capture_date" type="date" required defaultValue={image.capture_date || ""} onChange={(event) => setCaptureDate(event.target.value)} /></label>
        <label className="mw-submit-field-label block">Gear and Settings <span>*</span><input className="mw-input mt-2" name="gear_settings" required maxLength={500} defaultValue={image.gear_settings || ""} /></label>
      </div>
      <LocationSelects required defaults={{ country: image.country, state_or_province: image.state_or_province, specific_location_name: image.specific_location_name }} />
      <label className="block text-[15.5px] font-bold text-white/85">The story<textarea className="mw-input mt-2 min-h-24" name="short_story" rows={5} maxLength={4000} defaultValue={image.short_story || ""} placeholder="What was the adventure? How did you find this spot, and what was the night like?" /></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-[15.5px] font-bold text-[#5fcf94]">What went well?<textarea className="mw-input mt-2 min-h-20" name="what_went_well" rows={3} maxLength={2000} defaultValue={image.what_went_well || ""} /></label>
        <label className="block text-[15.5px] font-bold text-[#e79f2b]">What could have gone better?<textarea className="mw-input mt-2 min-h-20" name="what_could_have_gone_better" rows={3} maxLength={2000} defaultValue={image.what_could_have_gone_better || ""} /></label>
      </div>
      {(canClaim || existingHonor) && <div className="h-px bg-white/[.08]" />}
      {existingHonor ? (
        <aside className="mw-submit-achievement-widget" aria-labelledby="existing-honor-heading">
          <h2 id="existing-honor-heading">Field Honor</h2>
          <p>The Field Honor for this report is on file. One claim per field report.</p>
          <p className="mt-3 text-lg font-bold text-white"><span className="mr-2 text-[#f0bd66]" aria-hidden="true">{existingHonor.glyph || "✦"}</span>{existingHonor.name}</p>
          <p className="mt-1 text-sm uppercase tracking-[.12em] text-[#f0bd66]">{claimStatusLabel(existingHonor.status)}</p>
        </aside>
      ) : canClaim ? (
        <div>
          <div className="mw-submit-section-label">Claim a Field Honor <span>optional</span></div>
          <div className="mt-4">
            <AchievementWidget achievements={achievements} earnedIds={earnedAchievementIds} selectedId={selectedId} setSelectedId={setSelectedId} captureDate={captureDate} currentHonorCount={currentHonorCount} />
          </div>
        </div>
      ) : null}
      {state.error && <p role="alert" className="mw-comment-error">{state.error}</p>}
      <button className="mw-btn-primary w-full rounded-sm sm:w-auto" disabled={pending} aria-busy={pending}>{pending ? "Saving..." : "Save changes"}</button>
    </form>
  );
}
