"use client";
import { useMemo, useState } from "react";
import { updateProfileLocation } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";
import { ALLOWED_IMAGE_TYPES, avatarPath, MAX_UPLOAD_BYTES, PROFILE_AVATAR_BUCKET } from "@/lib/storage";
import { LocationSelects } from "@/components/images/LocationSelects";

export function ProfileSettingsForm({ profile }: { profile: any }) {
  const supabase = useMemo(() => createClient(), []);
  const [avatar, setAvatar] = useState(profile?.avatar_path || "");
  const [message, setMessage] = useState("");
  async function upload(file?: File) {
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type) || file.size > MAX_UPLOAD_BYTES) { setMessage("Upload a JPG, PNG, or WebP image up to 30 MB."); return; }
    setMessage("Uploading avatar...");
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) { setMessage("Sign in again before uploading."); return; }
    const path = avatarPath(userId, file.type);
    if (!path) { setMessage("Unsupported image type."); return; }
    const { error } = await supabase.storage.from(PROFILE_AVATAR_BUCKET).upload(path, file, { contentType: file.type, upsert: true });
    if (error) { setMessage(error.message); return; }
    setAvatar(path);
    setMessage("Avatar uploaded. Save your profile to use it across the Guild.");
  }
  return <form action={updateProfileLocation} className="progress-panel space-y-5"><input type="hidden" name="avatar_path" value={avatar}/><div className="progress-section-head"><h2>Profile Settings</h2><p>Your public Guild identity and home sky location</p></div><label className="mw-field-label">Display name<input className="mw-input mt-2" name="display_name" defaultValue={profile?.display_name || ""}/></label><label className="mw-field-label">Profile image<input className="mw-input mt-2" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event)=>upload(event.target.files?.[0])}/></label>{message&&<p className="text-sm text-[#f0bd66]">{message}</p>}<LocationSelects defaults={{ country: profile?.country, state_or_province: profile?.state_or_province || profile?.region, specific_location_name: profile?.specific_location_name || profile?.specific_location }}/><button className="mw-btn-primary rounded-sm">Save Profile</button></form>;
}
