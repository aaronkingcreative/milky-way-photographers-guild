"use client";

import { useActionState } from "react";
import { updateOwnFieldReport, type EditReportState } from "@/app/actions";
import { LocationSelects } from "./LocationSelects";

export function EditFieldReportForm({ image }: { image: any }) {
  const [state, action, pending] = useActionState<EditReportState, FormData>(updateOwnFieldReport, {});
  return (
    <form action={action} className="mw-submit-card mt-6 space-y-5 p-5">
      <input type="hidden" name="image_id" value={image.id} />
      <label className="mw-submit-field-label block">Image Title <span>*</span><input className="mw-input mt-2" name="title" required maxLength={200} defaultValue={image.title || ""} /></label>
      <LocationSelects defaults={{ country: image.country, state_or_province: image.state_or_province, specific_location_name: image.specific_location_name }} />
      <label className="mw-submit-field-label block">Gear and Settings <span>*</span><input className="mw-input mt-2" name="gear_settings" required maxLength={500} defaultValue={image.gear_settings || ""} /></label>
      <label className="block text-[15.5px] font-bold text-white/85">The story<textarea className="mw-input mt-2 min-h-24" name="short_story" rows={5} maxLength={4000} defaultValue={image.short_story || ""} /></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-[15.5px] font-bold text-[#5fcf94]">What went well?<textarea className="mw-input mt-2 min-h-20" name="what_went_well" rows={3} maxLength={2000} defaultValue={image.what_went_well || ""} /></label>
        <label className="block text-[15.5px] font-bold text-[#e79f2b]">What could have gone better?<textarea className="mw-input mt-2 min-h-20" name="what_could_have_gone_better" rows={3} maxLength={2000} defaultValue={image.what_could_have_gone_better || ""} /></label>
      </div>
      {state.error && <p role="alert" className="mw-comment-error">{state.error}</p>}
      <button className="mw-btn-primary w-full rounded-sm sm:w-auto" disabled={pending} aria-busy={pending}>{pending ? "Saving..." : "Save changes"}</button>
    </form>
  );
}
