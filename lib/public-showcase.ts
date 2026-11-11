/**
 * Public Guild totals and the public pile of Guild prints.
 * Counts come from public_guild_counts. Photos come from public_showcase_photos.
 * Neither payload is allowed to carry a name, a handle, or a member row.
 */

export const PUBLIC_SHOWCASE_CACHE_TAG = "public-showcase";
export const SHOWCASE_MIN = 1;
export const SHOWCASE_MAX = 9;

export type PublicCounts = {
  comments: number;
  pics: number;
  honors: number;
};

export type ShowcasePhoto = {
  imageUrl: string;
  avatarUrl: string;
};

export type PublicShowcase = {
  counts: PublicCounts;
  photos: ShowcasePhoto[];
};

/** Labels for the three totals that have their own tables. */
export const PUBLIC_SHOWCASE_STATS: { key: keyof PublicCounts; label: string }[] = [
  { key: "comments", label: "Comments" },
  { key: "pics", label: "Pics shared" },
  { key: "honors", label: "Field Honors" },
];

const COUNT_KEYS = PUBLIC_SHOWCASE_STATS.map((stat) => stat.key);
const HTTPS_URL = /^https:\/\/\S+$/;

function asCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && Number.isSafeInteger(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  return null;
}

/** Accept only the three count fields. Anything else in the payload is ignored. */
export function parsePublicCounts(value: unknown): PublicCounts | null {
  let row: unknown = value;
  if (typeof row === "string") {
    try {
      row = JSON.parse(row);
    } catch {
      return null;
    }
  }
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const source = row as Record<string, unknown>;
  const counts = {} as PublicCounts;
  for (const key of COUNT_KEYS) {
    const parsed = asCount(source[key]);
    if (parsed === null) return null;
    counts[key] = parsed;
  }
  return counts;
}

function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  return HTTPS_URL.test(url) ? url : null;
}

/**
 * Keep image and avatar URLs only. Show the strip when at least one photo survives.
 * Extra fields such as a name or id are dropped and never returned.
 */
export function parseShowcasePhotos(value: unknown): ShowcasePhoto[] {
  if (!Array.isArray(value)) return [];
  const photos: ShowcasePhoto[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const imageUrl = httpsUrl(record.image_url);
    const avatarUrl = httpsUrl(record.avatar_url);
    if (!imageUrl || !avatarUrl) continue;
    photos.push({ imageUrl, avatarUrl });
    if (photos.length >= SHOWCASE_MAX) break;
  }
  return photos.length >= SHOWCASE_MIN ? photos : [];
}

export function formatShowcaseCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
