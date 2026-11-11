/** Small, fast public pile images from Supabase Storage transforms. */

export const DEFAULT_PRINT_AVATAR = "/guild-print-avatar.svg";
export const PILE_PHOTO_WIDTH = 600;
export const PILE_AVATAR_WIDTH = 128;
export const PILE_IMAGE_QUALITY = 75;

const OBJECT_PUBLIC = /^(https:\/\/[^/?#]+\.supabase\.co)\/storage\/v1\/object\/public\/(.+?)$/i;

type ResizeMode = "contain" | "cover";

/**
 * Rewrite a public Storage object URL to a sized render URL.
 * Width alone is not enough. Storage keeps the original height unless both sides
 * and a resize mode are set, which is what turned landscapes into tall strips.
 * Other hosts are left alone.
 */
export function showcaseSizedUrl(
  url: string,
  width: number,
  quality = PILE_IMAGE_QUALITY,
  resize: ResizeMode = "contain",
  format?: "webp",
): string {
  const trimmed = url.trim();
  const match = trimmed.match(OBJECT_PUBLIC);
  if (!match) return trimmed;
  const origin = match[1];
  const path = match[2].split("?")[0].split("#")[0];
  if (!path) return trimmed;
  const params = new URLSearchParams({
    width: String(width),
    height: String(width),
    resize,
    quality: String(quality),
  });
  if (format) params.set("format", format);
  return `${origin}/storage/v1/render/image/public/${path}?${params.toString()}`;
}

export function showcaseThumbUrl(url: string, format?: "webp"): string {
  return showcaseSizedUrl(url, PILE_PHOTO_WIDTH, PILE_IMAGE_QUALITY, "contain", format);
}

export function showcaseAvatarUrl(url: string, format?: "webp"): string {
  if (!url || url.startsWith("/")) return url || DEFAULT_PRINT_AVATAR;
  return showcaseSizedUrl(url, PILE_AVATAR_WIDTH, PILE_IMAGE_QUALITY, "cover", format);
}

export function isDefaultPrintAvatar(url: string): boolean {
  return !url || url === DEFAULT_PRINT_AVATAR;
}

/** True when the URL looks like a reachable image. Network failures are treated as unknown, not dead. */
export async function isReachableImage(url: string, timeoutMs = 2500): Promise<"yes" | "no" | "unknown"> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    });
    if (response.ok) return "yes";
    if (response.status >= 400 && response.status < 500) return "no";
    return "unknown";
  } catch {
    return "unknown";
  }
}
