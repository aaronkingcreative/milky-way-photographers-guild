import { NextResponse } from "next/server";
import { ensureThumbs, thumbAdminClient } from "@/lib/thumbnails.server";
import type { ThumbKind } from "@/lib/showcase-images";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * One time and repeatable thumbnail backfill. Needs the THUMBS_BACKFILL_SECRET bearer token.
 * Only adds missing objects to the thumbs bucket. Nothing is deleted and no rows change.
 */
export async function POST(request: Request) {
  const secret = process.env.THUMBS_BACKFILL_SECRET;
  const auth = request.headers.get("authorization") || "";
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  const supabase = thumbAdminClient();
  if (!supabase) return NextResponse.json({ error: "Storage is not configured" }, { status: 500 });

  const params = new URL(request.url).searchParams;
  const offset = Math.max(0, Number(params.get("offset") || 0));
  const limit = Math.min(80, Math.max(1, Number(params.get("limit") || 40)));

  const [images, profiles] = await Promise.all([
    supabase.from("guild_images").select("image_url").is("deleted_at", null).like("image_url", "https://%").order("created_at", { ascending: true }),
    supabase.from("profiles").select("avatar_url").like("avatar_url", "https://%").order("created_at", { ascending: true }),
  ]);
  if (images.error || profiles.error) return NextResponse.json({ error: "Could not list images" }, { status: 500 });

  const seen = new Set<string>();
  const jobs: { url: string; kind: ThumbKind }[] = [];
  for (const row of images.data || []) if (row.image_url && !seen.has(`p${row.image_url}`)) { seen.add(`p${row.image_url}`); jobs.push({ url: row.image_url, kind: "photo" }); }
  for (const row of profiles.data || []) if (row.avatar_url && !seen.has(`a${row.avatar_url}`)) { seen.add(`a${row.avatar_url}`); jobs.push({ url: row.avatar_url, kind: "avatar" }); }

  const batch = jobs.slice(offset, offset + limit);
  const { results, failed } = await ensureThumbs(batch);
  return NextResponse.json({ total: jobs.length, offset, processed: batch.length, nextOffset: offset + batch.length < jobs.length ? offset + batch.length : null, results, failed });
}
