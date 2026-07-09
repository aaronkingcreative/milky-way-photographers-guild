"use client";
import { useMemo, useRef, useState } from "react";
import { updateProfileLocation } from "@/app/actions";
import { GuildAvatar } from "@/components/Avatar";
import { LocationSelects } from "@/components/images/LocationSelects";
import { getAvatarDisplay, resolveAvatarUrl } from "@/lib/avatar";
import { createClient } from "@/lib/supabase/client";
import { ALLOWED_IMAGE_TYPES, avatarPath, MAX_PROFILE_AVATAR_BYTES, PROFILE_AVATAR_BUCKET } from "@/lib/storage";

export function ProfileSettingsForm({ profile }: { profile: any }) {
  const supabase = useMemo(() => createClient(), []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState(profile?.avatar_path || profile?.avatar_url || "");
  const [message, setMessage] = useState(profile?.avatar_path || profile?.avatar_url ? "Your avatar is saved and visible across the Guild." : "");
  const [busy, setBusy] = useState(false);
  const display = getAvatarDisplay({ avatarPath: avatar, avatarUrl: profile?.avatar_url, displayName: profile?.display_name || profile?.full_name, email: profile?.email });

  async function upload(file?: File) {
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) { setMessage("Use JPG, PNG, or WebP for your profile image."); return; }
    if (file.size > MAX_PROFILE_AVATAR_BYTES) { setMessage("Profile images must be 5 MB or smaller."); return; }
    setBusy(true);
    setMessage("Uploading avatar to your Guild profile...");
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) { setBusy(false); setMessage("Sign in again before uploading."); return; }
    const path = avatarPath(userId, file.type);
    if (!path) { setBusy(false); setMessage("Use JPG, PNG, or WebP for your profile image."); return; }
    const { error: uploadError } = await supabase.storage.from(PROFILE_AVATAR_BUCKET).upload(path, file, { contentType: file.type, upsert: true });
    if (uploadError) { setBusy(false); setMessage(uploadError.message); return; }
    const publicUrl = resolveAvatarUrl(path);
    const { error: profileError } = await supabase.from("profiles").update({ avatar_path: path, avatar_url: publicUrl }).eq("id", userId);
    if (profileError) { setBusy(false); setMessage(profileError.message); return; }
    setAvatar(path);
    setBusy(false);
    setMessage("Avatar uploaded and saved. It will appear across the Guild.");
  }

  return <form action={updateProfileLocation} className="profile-settings-shell"><input type="hidden" name="avatar_path" value={avatar}/>
    <section className="profile-avatar-card">
      <div className="profile-card-label">Guild portrait</div>
      <div className="profile-avatar-preview" onClick={() => fileRef.current?.click()} role="button" tabIndex={0}>
        {display.avatarUrl ? <img src={display.avatarUrl} alt="" /> : <div><GuildAvatar profile={{...profile, avatar_path: null, avatar_url: null}} displayName={profile?.display_name || profile?.full_name} email={profile?.email} className="profile-avatar-fallback" fallbackClassName="" /><span>Upload Avatar Here</span></div>}
      </div>
      <p className="profile-avatar-help">JPG, PNG, or WebP. Max 5 MB.</p>
      <input ref={fileRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event)=>upload(event.target.files?.[0])}/>
      <button className="profile-avatar-button" type="button" disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? "Saving..." : display.avatarUrl ? "Replace Avatar" : "Choose Image"}</button>
      {message&&<p className="profile-save-message">{message}</p>}
    </section>
    <section className="profile-form-card">
      <div className="profile-card-label">Public details</div>
      <label className="mw-field-label">Display name<input className="mw-input mt-2" name="display_name" defaultValue={profile?.display_name || ""}/></label>
      <LocationSelects defaults={{ country: profile?.country, state_or_province: profile?.state_or_province || profile?.region, specific_location_name: profile?.specific_location_name || profile?.specific_location }}/>
      <p className="profile-private-note">Specific location is optional.</p>
      <button className="mw-btn-primary profile-save-button">Save Profile</button>
    </section>
  </form>;
}
