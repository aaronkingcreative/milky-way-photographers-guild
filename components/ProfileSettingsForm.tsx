"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfileLocation, type ProfileSaveState } from "@/app/actions";
import { PortraitEditor } from "@/components/PortraitEditor";
import { LocationSelects } from "@/components/images/LocationSelects";
import { getAvatarDisplay, isPublicName } from "@/lib/avatar";
import { hidePhotosHelp, hidePhotosTitle } from "@/lib/public-copy";
import { KeepTail } from "@/components/KeepTail";

const initialSaveState: ProfileSaveState = { status: "idle" };

export function ProfileSettingsForm({ profile }: { profile: any }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saveState, formAction] = useActionState(updateProfileLocation, initialSaveState);
  const [currentProfile, setCurrentProfile] = useState(profile || {});
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState("");
  const display = getAvatarDisplay({ displayName: currentProfile?.display_name || currentProfile?.full_name, email: currentProfile?.email });
  const saving = isPending || saveState.status === "saving";

  useEffect(() => {
    if (saveState.status === "success" && saveState.profile) {
      setCurrentProfile((previous: any) => ({ ...previous, ...saveState.profile }));
      setDirty(false);
      setNotice("Profile saved. Your Guild identity is updated.");
      router.refresh();
    }
    if (saveState.status === "error") setNotice(saveState.message || "We could not save your profile. Try again.");
  }, [router, saveState]);

  function submit(formData: FormData) {
    setNotice("Saving...");
    startTransition(() => formAction(formData));
  }

  return <div className="profile-settings-shell">
    <section className="profile-avatar-card" aria-labelledby="portrait-heading">
      <div id="portrait-heading" className="profile-card-label">Guild portrait</div>
      <PortraitEditor profile={currentProfile} initials={display.initials} onSaved={(p) => p && setCurrentProfile((prev: any) => ({ ...prev, ...p }))} />
    </section>
    <form action={submit} onChange={() => setDirty(true)} className="profile-form-card">
      <div className="profile-card-label">Public details</div>
      <label className="mw-field-label">Display name<input className="mw-input mt-2" name="display_name" maxLength={80} autoComplete="name" placeholder="The name members see on your work" defaultValue={currentProfile?.display_name || (isPublicName(currentProfile?.full_name) ? currentProfile.full_name : "")}/></label>
      <LocationSelects defaults={{ country: currentProfile?.country, state_or_province: currentProfile?.state_or_province || currentProfile?.region, specific_location_name: currentProfile?.specific_location_name || currentProfile?.specific_location }} />
      <p className="profile-private-note">Specific location is optional.</p>
      <label className="profile-showcase-choice">
        <input className="mw-iotw-checkbox" type="checkbox" name="hide_from_public_showcase" defaultChecked={Boolean(currentProfile?.hide_from_public_showcase)} />
        <span>
          <span className="profile-showcase-title"><KeepTail text={hidePhotosTitle} /></span>
          <span className="profile-private-note"><KeepTail text={hidePhotosHelp} /></span>
        </span>
      </label>
      <button className="mw-btn-primary profile-save-button" disabled={saving}>{saving ? "Saving..." : saveState.status === "success" && !dirty ? "Saved" : "Save Profile"}</button>
      {notice && <p className={`profile-save-message ${saveState.status === "error" ? "profile-save-message-error" : ""}`} role="status">{notice}</p>}
    </form>
  </div>;
}
