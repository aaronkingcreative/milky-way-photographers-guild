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

export const HEIC_HOWTO =
  "iPhone cameras save HEIC by default. This form stores JPG, PNG, or WebP, up to 30 MB. Open the photo, tap Share, tap Options, and save a JPEG. In Settings, then Camera, then Formats, Most Compatible makes new photos JPEG.";

export const HEIC_SELECTED_ERROR =
  "This photo is HEIC, which this form cannot store. Open it on your iPhone, tap Share, tap Options, and save a JPEG. Then choose that JPEG here. In Settings, then Camera, then Formats, Most Compatible makes new photos JPEG.";
