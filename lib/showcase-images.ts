/**
 * Small, fast public pile images. Thumbnails are made once with sharp and stored as plain
 * public objects in the thumbs bucket, so the site never calls Supabase image transforms.
 * A missing thumbnail falls back to the original object URL in the browser.
 */

export const DEFAULT_PRINT_AVATAR = "/guild-print-avatar.svg";
export const PILE_PHOTO_WIDTH = 600;
export const PILE_AVATAR_WIDTH = 128;
export const PILE_IMAGE_QUALITY = 75;
export const THUMB_BUCKET = "thumbs";

const OBJECT_PUBLIC = /^(https:\/\/[^/?#]+\.supabase\.co)\/storage\/v1\/object\/public\/([^/?#]+)\/([^?#]+)/i;

export type ThumbKind = "photo" | "avatar";

export type ThumbSource = {
  origin: string;
  bucket: string;
  path: string;
};

/** Split a public Storage object URL into origin, bucket and path. Other hosts and the thumbs bucket return null. */
export function parseStorageObjectUrl(url: string): ThumbSource | null {
  const match = (url || "").trim().match(OBJECT_PUBLIC);
  if (!match) return null;
  const [, origin, bucket, path] = match;
  if (!path || bucket === THUMB_BUCKET) return null;
  return { origin, bucket, path };
}

export function thumbWidth(kind: ThumbKind): number {
  return kind === "avatar" ? PILE_AVATAR_WIDTH : PILE_PHOTO_WIDTH;
}

/** Object path inside the thumbs bucket, for example field-report-images/600/users/a/original.webp */
export function thumbObjectPath(source: Pick<ThumbSource, "bucket" | "path">, width: number): string {
  const withoutExt = source.path.replace(/\.[a-z0-9]+$/i, "");
  return `${source.bucket}/${width}/${withoutExt}.webp`;
}

/** Plain public object URL of the stored thumbnail. Other hosts are left alone. */
export function showcaseSizedUrl(url: string, kind: ThumbKind): string {
  const source = parseStorageObjectUrl(url);
  if (!source) return (url || "").trim();
  return `${source.origin}/storage/v1/object/public/${THUMB_BUCKET}/${thumbObjectPath(source, thumbWidth(kind))}`;
}

export function showcaseThumbUrl(url: string): string {
  return showcaseSizedUrl(url, "photo");
}

export function showcaseAvatarUrl(url: string): string {
  if (!url || url.startsWith("/")) return url || DEFAULT_PRINT_AVATAR;
  return showcaseSizedUrl(url, "avatar");
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
      cache: "no-store",
    });
    if (response.ok) return "yes";
    if (response.status >= 400 && response.status < 500) return "no";
    return "unknown";
  } catch {
    return "unknown";
  }
}
