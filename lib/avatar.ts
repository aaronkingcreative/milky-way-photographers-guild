import { PROFILE_AVATAR_BUCKET, storagePublicUrl } from "@/lib/storage";

export type AvatarDisplay = {
  avatarUrl: string | null;
  initials: string;
  displayName: string;
};

export const MEMBER_NAME_FALLBACK = "Guild Member";

/**
 * A name is shown publicly only when it looks like a real name a member typed.
 * Rejects blanks, "null" or "undefined", lone letters, anything with an @ (never show an email),
 * and long single-token random strings left by bot signups.
 */
export function isPublicName(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const name = value.trim();
  if (name.length < 2 || name.length > 80) return false;
  if (/^(null|undefined|none|n\/a)$/i.test(name)) return false;
  if (name.includes("@")) return false;
  if (!/[\p{L}]{2,}/u.test(name)) return false;
  if (!/\s/.test(name) && name.length >= 12 && (name.slice(1).match(/[A-Z]/g) || []).length >= 3) return false;
  return true;
}

/** First usable name from the candidates, otherwise "Guild Member". Never derived from an email. */
export function publicMemberName(...candidates: unknown[]) {
  for (const candidate of candidates) if (isPublicName(candidate)) return candidate.trim();
  return MEMBER_NAME_FALLBACK;
}

/** Profile display name, then the name given at signup, then the profile full name. Never an email. */
export function displayNameFromProfile(profile: any, metadata?: Record<string, any> | null, _email?: string | null) {
  return publicMemberName(profile?.display_name, metadata?.full_name, metadata?.name, profile?.full_name);
}

export function initialsForDisplay(displayName?: string | null, _email?: string | null) {
  const name = publicMemberName(displayName);
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
  const displayName = publicMemberName(input.displayName, input.metadata?.full_name, input.metadata?.name);
  return {
    avatarUrl: resolveAvatarUrl(input.avatarPath || input.avatarUrl, input.metadata?.avatar_url),
    initials: initialsForDisplay(displayName, input.email),
    displayName,
  };
}
