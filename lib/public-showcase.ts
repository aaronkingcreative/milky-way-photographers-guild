/**
 * Public Guild totals and the public pile of Guild prints.
 * Counts come from public_guild_counts. Photos come from public_showcase_photos.
 * Neither payload is allowed to carry a name, a handle, or a member row.
 */

export const PUBLIC_SHOWCASE_CACHE_TAG = "public-showcase";
export const SHOWCASE_MIN = 1;
export const SHOWCASE_MAX = 9;

export const HONOR_CATEGORY_KEYS = ["foreground", "monthly", "technique", "seasonal", "special"] as const;
export type HonorCategoryKey = (typeof HONOR_CATEGORY_KEYS)[number];

export const HONOR_CATEGORY_LABELS: Record<HonorCategoryKey, string> = {
  foreground: "Foreground",
  monthly: "Monthly",
  technique: "Technique",
  seasonal: "Seasonal",
  special: "Special",
};

export const US_STATE_CODES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
  "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM",
  "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA",
  "WV", "WI", "WY",
] as const;

export type UsStateCode = (typeof US_STATE_CODES)[number];

export type NamedCount = { name: string; n: number };
export type YearCount = { year: number; n: number };
export type StateCount = { code: UsStateCode; n: number };
export type CategoryCount = { key: HonorCategoryKey; n: number };

export type PublicCounts = {
  comments: number;
  pics: number;
  honors: number;
  members?: number;
  reactions?: number;
  regions?: number;
  countries?: number;
  weekPics?: number;
  honorCategories?: CategoryCount[];
  places?: NamedCount[];
  usStates?: StateCount[];
  captureYears?: YearCount[];
};

export type ShowcasePhoto = {
  imageUrl: string;
  avatarUrl: string;
};

export type PublicShowcase = {
  counts: PublicCounts;
  photos: ShowcasePhoto[];
};

/** Labels for the three totals that have always been on the public page. */
export const PUBLIC_SHOWCASE_STATS: { key: "comments" | "pics" | "honors"; label: string }[] = [
  { key: "comments", label: "Comments" },
  { key: "pics", label: "Pics shared" },
  { key: "honors", label: "Field Honors" },
];

const REQUIRED_KEYS = PUBLIC_SHOWCASE_STATS.map((stat) => stat.key);
const OPTIONAL_COUNT_KEYS = ["members", "reactions", "regions", "countries", "week_pics"] as const;
type OptionalScalarKey = "members" | "reactions" | "regions" | "countries" | "weekPics";
const OPTIONAL_TO_CAMEL: Record<(typeof OPTIONAL_COUNT_KEYS)[number], OptionalScalarKey> = {
  members: "members",
  reactions: "reactions",
  regions: "regions",
  countries: "countries",
  week_pics: "weekPics",
};

const HTTPS_URL = /^https:\/\/\S+$/;
const PLACE_NAME = /^[A-Za-z][A-Za-z .'-]{0,39}$/;
const US_STATE_SET = new Set<string>(US_STATE_CODES);
const HONOR_CATEGORY_SET = new Set<string>(HONOR_CATEGORY_KEYS);

function asCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && Number.isSafeInteger(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  return null;
}

function asYear(value: unknown): number | null {
  const year = asCount(value);
  if (year === null || year < 1990 || year > 2100) return null;
  return year;
}

function asPlaceName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  if (!PLACE_NAME.test(name)) return null;
  return name;
}

function asStateCode(value: unknown): UsStateCode | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return US_STATE_SET.has(code) ? (code as UsStateCode) : null;
}

function asCategoryKey(value: unknown): HonorCategoryKey | null {
  if (typeof value !== "string") return null;
  const key = value.trim().toLowerCase();
  return HONOR_CATEGORY_SET.has(key) ? (key as HonorCategoryKey) : null;
}

function parseNamedCounts(value: unknown, nameOf: (raw: unknown) => string | null): NamedCount[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const rows: NamedCount[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const name = nameOf(record.name);
    const n = asCount(record.n);
    if (!name || n === null) continue;
    rows.push({ name, n });
  }
  return rows;
}

function parseYearCounts(value: unknown): YearCount[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const rows: YearCount[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const year = asYear(record.year);
    const n = asCount(record.n);
    if (year === null || n === null) continue;
    rows.push({ year, n });
  }
  rows.sort((a, b) => a.year - b.year);
  return rows;
}

function parseStateCounts(value: unknown): StateCount[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const rows: StateCount[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const code = asStateCode(record.code);
    const n = asCount(record.n);
    if (!code || n === null || seen.has(code)) continue;
    seen.add(code);
    rows.push({ code, n });
  }
  return rows;
}

function parseCategoryCounts(value: unknown): CategoryCount[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const rows: CategoryCount[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const key = asCategoryKey(record.key);
    const n = asCount(record.n);
    if (!key || n === null || seen.has(key)) continue;
    seen.add(key);
    rows.push({ key, n });
  }
  return rows;
}

/**
 * Accept the three required totals. Optional aggregate fields are kept when valid.
 * Anything else in the payload, including a name or id, is ignored.
 */
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
  const counts: PublicCounts = { comments: 0, pics: 0, honors: 0 };
  for (const key of REQUIRED_KEYS) {
    const parsed = asCount(source[key]);
    if (parsed === null) return null;
    counts[key] = parsed;
  }
  for (const key of OPTIONAL_COUNT_KEYS) {
    if (!(key in source)) continue;
    const parsed = asCount(source[key]);
    if (parsed === null) continue;
    counts[OPTIONAL_TO_CAMEL[key]] = parsed;
  }
  const honorCategories = parseCategoryCounts(source.honor_categories);
  if (honorCategories && honorCategories.length) counts.honorCategories = honorCategories;
  const places = parseNamedCounts(source.places, asPlaceName);
  if (places && places.length) counts.places = places;
  const usStates = parseStateCounts(source.us_states);
  if (usStates && usStates.length) counts.usStates = usStates;
  const captureYears = parseYearCounts(source.capture_years);
  if (captureYears && captureYears.length) counts.captureYears = captureYears;
  return counts;
}

/** Fill missing years so a sparkline reads as a continuous run from the first year to the last. */
export function fillCaptureYears(rows: YearCount[], throughYear?: number): YearCount[] {
  if (!rows.length) return [];
  const last = Math.max(rows[rows.length - 1].year, throughYear ?? rows[rows.length - 1].year);
  const first = rows[0].year;
  const byYear = new Map(rows.map((row) => [row.year, row.n]));
  const filled: YearCount[] = [];
  for (let year = first; year <= last; year += 1) {
    filled.push({ year, n: byYear.get(year) ?? 0 });
  }
  return filled;
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
    if (!imageUrl) continue;
    const avatarUrl = httpsUrl(record.avatar_url) ?? "";
    photos.push({ imageUrl, avatarUrl });
    if (photos.length >= SHOWCASE_MAX) break;
  }
  return photos.length >= SHOWCASE_MIN ? photos : [];
}

export function formatShowcaseCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
