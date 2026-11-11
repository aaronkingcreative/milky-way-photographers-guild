import { parsePublicCounts, parseShowcasePhotos, PUBLIC_SHOWCASE_CACHE_TAG, type PublicShowcase } from "@/lib/public-showcase";

const COUNTS_RPC = "public_guild_counts";
const PHOTOS_RPC = "public_showcase_photos";

function showcaseEndpoint(name: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return null;
  return {
    url: `${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/${name}`,
    anonKey,
  };
}

/** Anon key only. The RPC grants return counts, or image and avatar URLs. No member JWT is sent. */
async function rpc(name: string): Promise<unknown> {
  const endpoint = showcaseEndpoint(name);
  if (!endpoint) throw new Error("Public showcase is not configured.");
  const response = await fetch(endpoint.url, {
    method: "POST",
    headers: {
      apikey: endpoint.anonKey,
      Authorization: `Bearer ${endpoint.anonKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: "{}",
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 300, tags: [PUBLIC_SHOWCASE_CACHE_TAG] },
  });
  if (!response.ok) throw new Error(`Public showcase ${name} did not load.`);
  return response.json();
}

/**
 * Cached about five minutes. A counts failure throws so the caller can hide the section.
 * A photo failure leaves the totals up and hides the strip.
 */
export async function loadPublicShowcase(): Promise<PublicShowcase> {
  const [countsResult, photosResult] = await Promise.allSettled([rpc(COUNTS_RPC), rpc(PHOTOS_RPC)]);
  if (countsResult.status === "rejected") throw countsResult.reason;
  const counts = parsePublicCounts(countsResult.value);
  if (!counts) throw new Error("Public showcase counts were not numbers.");
  const photos = photosResult.status === "fulfilled" ? parseShowcasePhotos(photosResult.value) : [];
  return { counts, photos };
}

export async function getPublicShowcase(): Promise<PublicShowcase | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  try {
    return await loadPublicShowcase();
  } catch {
    console.error("Public Guild counts did not load.");
    return null;
  }
}
