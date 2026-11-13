import { after } from "next/server";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import {
  PILE_IMAGE_QUALITY,
  THUMB_BUCKET,
  parseStorageObjectUrl,
  showcaseSizedUrl,
  thumbObjectPath,
  thumbWidth,
  type ThumbKind,
} from "@/lib/showcase-images";

const MAX_SOURCE_BYTES = 40 * 1024 * 1024;
const THUMB_CACHE_SECONDS = "31536000";

export type ThumbResult = "created" | "exists" | "skipped" | "failed";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Resize with sharp. Photos fit inside a square, avatars fill one. Output is WebP. */
export async function renderThumb(input: Buffer, kind: ThumbKind): Promise<Buffer> {
  const width = thumbWidth(kind);
  return sharp(input, { failOn: "none" })
    .rotate()
    .resize({ width, height: width, fit: kind === "avatar" ? "cover" : "inside", withoutEnlargement: true })
    .webp({ quality: PILE_IMAGE_QUALITY })
    .toBuffer();
}

async function thumbExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(4000) });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Make the stored thumbnail for a public Storage object if it is missing.
 * Adds a new object in the thumbs bucket only. The original is read, never changed.
 */
export async function ensureThumb(sourceUrl: string | null | undefined, kind: ThumbKind): Promise<ThumbResult> {
  const source = parseStorageObjectUrl(sourceUrl || "");
  if (!source) return "skipped";
  const thumbUrl = showcaseSizedUrl(sourceUrl || "", kind);
  if (await thumbExists(thumbUrl)) return "exists";
  const supabase = adminClient();
  if (!supabase) return "skipped";
  try {
    const original = await fetch(`${source.origin}/storage/v1/object/public/${source.bucket}/${source.path}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    if (!original.ok) return "failed";
    const bytes = Buffer.from(await original.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_SOURCE_BYTES) return "failed";
    const thumb = await renderThumb(bytes, kind);
    const { error } = await supabase.storage
      .from(THUMB_BUCKET)
      .upload(thumbObjectPath(source, thumbWidth(kind)), thumb, {
        contentType: "image/webp",
        cacheControl: THUMB_CACHE_SECONDS,
        upsert: false,
      });
    if (error) {
      if (/exists|duplicate/i.test(error.message)) return "exists";
      console.error("Thumbnail upload failed", error.message);
      return "failed";
    }
    return "created";
  } catch (error) {
    console.error("Thumbnail render failed", error instanceof Error ? error.message : "unknown");
    return "failed";
  }
}

/** Run jobs a few at a time so a backfill does not flood Storage. */
export async function ensureThumbs(jobs: { url: string | null | undefined; kind: ThumbKind }[], concurrency = 4) {
  const results: Record<ThumbResult, number> = { created: 0, exists: 0, skipped: 0, failed: 0 };
  const failed: string[] = [];
  let next = 0;
  async function worker() {
    while (next < jobs.length) {
      const job = jobs[next++];
      const result = await ensureThumb(job.url, job.kind);
      results[result] += 1;
      if (result === "failed" && job.url) failed.push(job.url);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker));
  return { results, failed };
}

/** Make the thumbnail after the response, so a new upload or portrait has one before the pile asks. */
export function queueThumb(url: string | null | undefined, kind: ThumbKind) {
  if (!url) return;
  try {
    after(async () => {
      await ensureThumb(url, kind);
    });
  } catch {
    console.error("Thumbnail could not be scheduled.");
  }
}

export { adminClient as thumbAdminClient };
