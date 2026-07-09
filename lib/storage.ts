export const PROFILE_AVATAR_BUCKET = "profile-avatars";
export const FIELD_REPORT_IMAGE_BUCKET = "field-report-images";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;
export const MAX_PROFILE_AVATAR_BYTES = 5 * 1024 * 1024;

export function extensionForMimeType(type: string) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return null;
}

export function storagePublicUrl(bucket: string | null | undefined, path: string | null | undefined) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || !bucket || !path) return null;
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${path}`;
}

export function fieldReportOriginalPath(userId: string, submissionId: string, mimeType: string) {
  const ext = extensionForMimeType(mimeType);
  if (!ext) return null;
  return `users/${userId}/field-reports/${submissionId}/original.${ext}`;
}

export function avatarPath(userId: string, mimeType: string) {
  const ext = extensionForMimeType(mimeType);
  if (!ext) return null;
  return `users/${userId}/avatar.${ext}`;
}
