"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfileLocation, type ProfileSaveState } from "@/app/actions";
import { GuildAvatar } from "@/components/Avatar";
import { LocationSelects } from "@/components/images/LocationSelects";
import { getAvatarDisplay } from "@/lib/avatar";
import { createClient } from "@/lib/supabase/client";
import { ALLOWED_IMAGE_TYPES, avatarPath, MAX_PROFILE_AVATAR_BYTES, PROFILE_AVATAR_BUCKET } from "@/lib/storage";

const initialSaveState: ProfileSaveState = { status: "idle" };

export function ProfileSettingsForm({ profile }: { profile: any }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [saveState, formAction] = useActionState(updateProfileLocation, initialSaveState);
  const [currentProfile, setCurrentProfile] = useState(profile || {});
  const [avatar, setAvatar] = useState(profile?.avatar_path || profile?.avatar_url || "");
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState(profile?.avatar_path || profile?.avatar_url ? "Your avatar is saved and visible across the Guild." : "");
  const display = getAvatarDisplay({ avatarPath: avatar, avatarUrl: currentProfile?.avatar_url, displayName: currentProfile?.display_name || currentProfile?.full_name, email: currentProfile?.email });
  const saving = isPending || saveState.status === "saving";

  useEffect(() => {
    if (saveState.status === "success" && saveState.profile) {
      setCurrentProfile((previous: any) => ({ ...previous, ...saveState.profile }));
      setAvatar(saveState.profile.avatar_path || saveState.profile.avatar_url || "");
      setDirty(false);
      setNotice("Profile saved. Your Guild identity is updated.");
      router.refresh();
    }
    if (saveState.status === "error") {
      setNotice("We could not save your profile. Try again.");
    }
  }, [router, saveState]);

  async function upload(file?: File) {
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) { setNotice("Use JPG, PNG, or WebP for your profile image."); return; }
    if (file.size > MAX_PROFILE_AVATAR_BYTES) { setNotice("Profile images must be 5 MB or smaller."); return; }
    setUploading(true);
    setNotice("Uploading avatar to your Guild profile...");
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) { setUploading(false); setNotice("Sign in again before uploading."); return; }
    const path = avatarPath(userId, file.type);
    if (!path) { setUploading(false); setNotice("Use JPG, PNG, or WebP for your profile image."); return; }
    const { error: uploadError } = await supabase.storage.from(PROFILE_AVATAR_BUCKET).upload(path, file, { contentType: file.type, upsert: true });
    setUploading(false);
    if (uploadError) { console.error("Profile avatar upload failed", uploadError); setNotice("We could not upload your avatar. Try again."); return; }
    setAvatar(path);
    setDirty(true);
    setNotice("Avatar uploaded. Click Save Profile to update your Guild identity.");
  }

  function submit(formData: FormData) {
    setNotice("Saving...");
    startTransition(() => formAction(formData));
  }

  return <form action={submit} onChange={() => setDirty(true)} className="profile-settings-shell"><input type="hidden" name="avatar_path" value={avatar}/>
    <section className="profile-avatar-card">
      <div className="profile-card-label">Guild portrait</div>
      <div className="profile-avatar-preview" onClick={() => fileRef.current?.click()} role="button" tabIndex={0}>
        {display.avatarUrl ? <img src={display.avatarUrl} alt="" /> : <div><GuildAvatar profile={{...currentProfile, avatar_path: null, avatar_url: null}} displayName={currentProfile?.display_name || currentProfile?.full_name} email={currentProfile?.email} className="profile-avatar-fallback" fallbackClassName="" /><span>Upload Avatar Here</span></div>}
      </div>
      <p className="profile-avatar-help">JPG, PNG, or WebP. Max 5 MB.</p>
      <input ref={fileRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event)=>upload(event.target.files?.[0])}/>
      <button className="profile-avatar-button" type="button" disabled={uploading || saving} onClick={() => fileRef.current?.click()}>{uploading ? "Uploading..." : display.avatarUrl ? "Replace Avatar" : "Choose Image"}</button>
      {notice&&<p className={`profile-save-message ${saveState.status === "error" ? "profile-save-message-error" : ""}`}>{notice}</p>}
      {dirty && !saving && saveState.status !== "error" ? <p className="profile-save-message">Unsaved changes</p> : null}
    </section>
    <section className="profile-form-card">
      <div className="profile-card-label">Public details</div>
      <label className="mw-field-label">Display name<input className="mw-input mt-2" name="display_name" defaultValue={currentProfile?.display_name || ""}/></label>
      <LocationSelects defaults={{ country: currentProfile?.country, state_or_province: currentProfile?.state_or_province || currentProfile?.region, specific_location_name: currentProfile?.specific_location_name || currentProfile?.specific_location }} />
      <p className="profile-private-note">Specific location is optional.</p>
      <button className="mw-btn-primary profile-save-button" disabled={saving || uploading}>{saving ? "Saving..." : saveState.status === "success" && !dirty ? "Saved" : "Save Profile"}</button>
    </section>
  </form>;
}
