const HEIC_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

/** True when the browser reports a HEIC or HEIF photo, including an empty type with a .heic name. */
export function isHeicFile(file: { type?: string; name?: string }) {
  const type = String(file.type || "").toLowerCase();
  if (HEIC_TYPES.has(type)) return true;
  return /\.(heic|heif)$/i.test(String(file.name || ""));
}

/** IMG_2044.HEIC becomes IMG_2044.jpg after the browser converts it. */
export function jpegNameFor(name: string) {
  const base = String(name || "").replace(/\.(heic|heif)$/i, "");
  return `${base || "photo"}.jpg`;
}

export const HEIC_HOWTO =
  "iPhone HEIC photos are turned into a JPEG in your browser before upload, up to 30 MB. If that does not work, open the photo, tap Share, tap Options, and save a JPEG. In Settings, then Camera, then Formats, Most Compatible makes new photos JPEG.";

export const HEIC_SELECTED_ERROR =
  "This photo is HEIC, and your browser could not turn it into a JPEG. Open it on your iPhone, tap Share, tap Options, and save a JPEG. Then choose that JPEG here. In Settings, then Camera, then Formats, Most Compatible makes new photos JPEG.";
