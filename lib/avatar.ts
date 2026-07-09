import { PROFILE_AVATAR_BUCKET, storagePublicUrl } from "@/lib/storage";

export type AvatarDisplay = {
  avatarUrl: string | null;
  initials: string;
  displayName: string;
};

function titleCase(value: string) {
  return value.replace(/[._-]+/g, " ").split(/\s+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function displayNameFromProfile(profile: any, metadata?: Record<string, any> | null, email?: string | null) {
  const profileName = String(profile?.display_name || "").trim();
  if (profileName) return profileName;
  const metaName = String(metadata?.full_name || metadata?.name || "").trim();
  if (metaName) return metaName;
  const profileFullName = String(profile?.full_name || "").trim();
  if (profileFullName) return profileFullName;
  const sourceEmail = String(email || profile?.email || "").trim();
  if (sourceEmail.includes("@")) return titleCase(sourceEmail.split("@")[0]);
  return "Guild Member";
}

export function initialsForDisplay(displayName?: string | null, email?: string | null) {
  const name = String(displayName || "").trim() || displayNameFromProfile(null, null, email);
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "GM";
}

export function resolveAvatarUrl(avatarPathOrUrl?: string | null, metadataAvatarUrl?: string | null) {
  const value = String(avatarPathOrUrl || "").trim();
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value) return storagePublicUrl(PROFILE_AVATAR_BUCKET, value);
  const meta = String(metadataAvatarUrl || "").trim();
  return meta || null;
}

export function getAvatarDisplay(input: { avatarPath?: string | null; avatarUrl?: string | null; displayName?: string | null; email?: string | null; metadata?: Record<string, any> | null }): AvatarDisplay {
  const displayName = input.displayName || displayNameFromProfile({ display_name: input.displayName, email: input.email }, input.metadata, input.email);
  return {
    avatarUrl: resolveAvatarUrl(input.avatarPath || input.avatarUrl, input.metadata?.avatar_url),
    initials: initialsForDisplay(displayName, input.email),
    displayName,
  };
}
