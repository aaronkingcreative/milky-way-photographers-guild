"use client";

import { jpegNameFor } from "@/lib/heic";

const JPEG_QUALITY = 0.92;

function canvasToJpeg(source: CanvasImageSource, width: number, height: number) {
  return new Promise<Blob | null>((resolve) => {
    if (!width || !height) return resolve(null);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return resolve(null);
    ctx.drawImage(source, 0, 0, width, height);
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", JPEG_QUALITY);
  });
}

/** Safari can decode HEIC itself. Try that first so most iPhone and Mac users skip the wasm download. */
async function nativeDecode(file: File): Promise<Blob | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("native decode failed"));
      img.src = url;
    });
    return await canvasToJpeg(img, img.naturalWidth, img.naturalHeight);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Lazy-loads heic2any (libheif wasm) only when a HEIC is picked and the browser cannot decode it. */
async function wasmDecode(file: File): Promise<Blob | null> {
  try {
    const { default: heic2any } = await import("heic2any");
    const out = await heic2any({ blob: file, toType: "image/jpeg", quality: JPEG_QUALITY });
    const blob = Array.isArray(out) ? out[0] : out;
    return blob && blob.size ? blob : null;
  } catch {
    return null;
  }
}

/** Returns a JPEG File made from a HEIC or HEIF photo, or null when this browser cannot convert it. */
export async function convertHeicToJpeg(file: File): Promise<File | null> {
  const blob = (await nativeDecode(file)) || (await wasmDecode(file));
  if (!blob) return null;
  return new File([blob], jpegNameFor(file.name), { type: "image/jpeg", lastModified: file.lastModified || Date.now() });
}
