export type AchievementCategory = "monthly" | "seasonal" | "foreground" | "technique" | "special" | "rank";
export type AchievementLibraryCategory = AchievementCategory | "tracking";
export type AchievementRewardType = "sticker" | "square_pin" | "sticker_and_square_pin";

export type AchievementDefinition = {
  id: string;
  name: string;
  category: AchievementCategory;
  rewardType: AchievementRewardType;
  glyph: string;
  description: string;
  requirement: string;
  constellation: string | null;
  sortOrder: number;
  isManualClaimable?: boolean;
  isAutomatic?: boolean;
  countsTowardRank?: boolean;
  allowRepeat?: boolean;
  isActive: boolean;
  metadata?: Record<string, unknown>;
};

export type UserAchievement = {
  userId: string;
  achievementId: string;
  earnedAt: string | null;
  sourceSubmissionId?: string | null;
  awardedBy?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
  status?: string | null;
};

export type TrackingAchievement = {
  id: string;
  name: string;
  category: "tracking";
  glyph: string;
  type: string;
  requirement: string;
  sortOrder: number;
};

export const achievementLibraryCategoryDetails: Record<AchievementLibraryCategory, { label: string; summary: string; why: string }> = {
  monthly: { label: "Monthly Field Honors", summary: "These are manually claimable Field Honors. They count toward rank only if chosen as the one Field Honor for an image.", why: "Choose a month honor when the timing of the image is the story." },
  seasonal: { label: "Seasonal Field Honors", summary: "These are manually claimable Field Honors. They count toward rank only if chosen as the one Field Honor for an image.", why: "Choose a season honor when the seasonal Milky Way window is the accomplishment." },
  foreground: { label: "Foreground Field Honors", summary: "These are manually claimable Field Honors. They count toward rank.", why: "Choose a foreground honor when the land feature makes the image special." },
  technique: { label: "Technique Field Honors", summary: "These are manually claimable Field Honors. They count toward rank.", why: "Choose a technique honor when the method is the accomplishment." },
  special: { label: "Special Honors", summary: "These are automatic or long-term honors based on larger field patterns.", why: "Earned through bigger patterns across your field year or long-term history." },
  rank: { label: "Rank Milestones", summary: "These are automatic rank milestones based on rank-counting Field Honors.", why: "Rank milestones show how far your verified Field Honors have carried you." },
  tracking: { label: "Passive Tracking", summary: "These are not manually claimed Field Honors. They are calculated from submitted images and capture dates.", why: "Updated automatically from your submissions. Tracking helps show your field history." },
};

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const foregroundRequirements: Record<string, string> = {
  Rocky: "Choose this Field Honor for an image where rock, stone, cliffs, arches, towers, or formations are a major foreground element.",
  Water: "Choose this Field Honor for an image where water is a major foreground element.",
  Trees: "Choose this Field Honor for an image where trees or a forested scene are a major foreground element.",
  Desert: "Choose this Field Honor for an image where desert landscape is a major foreground element.",
  "Man Made": "Choose this Field Honor for an image where a building, ruin, structure, road, vehicle, or other human-made element is a major foreground element.",
  Chasm: "Choose this Field Honor for an image where a canyon, gorge, ravine, cave opening, or chasm is a major foreground element.",
  "Light Polluted": "Choose this Field Honor for an image that intentionally includes city glow, town glow, or other light pollution as part of the scene.",
  Plant: "Choose this Field Honor for an image where a plant, cactus, shrub, wildflower, or smaller natural subject is a major foreground element.",
  Reflection: "Choose this Field Honor for an image where the Milky Way, stars, or night sky are reflected in water, wet sand, salt flats, ice, or another reflective surface.",
  "Selfie/Human": "Choose this Field Honor for an image where a person or silhouette is a meaningful part of the composition.",
  Abandoned: "Choose this Field Honor for an image with an abandoned building, vehicle, mine, ruin, or forgotten human-made subject.",
  "Light Painted": "Choose this Field Honor for an image where intentional light painting or low-level lighting is part of the final image.",
};
const foregrounds = Object.keys(foregroundRequirements);
const seasonRequirements = ["Choose this Field Honor on an image captured in December, January, or February.", "Choose this Field Honor on an image captured in March, April, or May.", "Choose this Field Honor on an image captured in June, July, or August.", "Choose this Field Honor on an image captured in September, October, or November."];
const seasons = ["Winter", "Spring", "Summer", "Fall"];
const techniqueRequirements: Record<string, string> = {
  "Milky Way Timelapse": "Choose this Field Honor for a submitted Milky Way timelapse sequence or timelapse-based field report.",
  "Moving Milky Way Timelapse": "Choose this Field Honor for a Milky Way timelapse with meaningful camera movement, motion control, pan, tilt, slider movement, or moving composition.",
  "Panorama Milky Way": "Choose this Field Honor for a stitched Milky Way panorama.",
  "Stacked Milky Way": "Choose this Field Honor for a Milky Way image made with stacked exposures to reduce noise or improve detail.",
  "Tracked Milky Way": "Choose this Field Honor for a Milky Way image made with a star tracker or tracking mount.",
  "Time Blended Milky Way": "Choose this Field Honor for an image that combines exposures from different times, such as blue hour foreground with night sky.",
};
const techniques = Object.keys(techniqueRequirements);
const rankRequirements = ["Earn 1 to 7 rank-counting Field Honors.", "Earn 8 to 17 rank-counting Field Honors.", "Earn 18 to 24 rank-counting Field Honors.", "Earn 25 to 32 rank-counting Field Honors.", "Earn 33 or more rank-counting Field Honors."];
const ranks = ["Beginner", "Amateur", "Novice", "Veteran", "Master"];
const slug = (value: string) => value.toLowerCase().replace(/\//g, " ").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export const seededAchievementDefinitions: AchievementDefinition[] = [
  ...months.map((month, index) => ({ id: `monthly_${month.toLowerCase()}`, name: `${month} Milky Way`, category: "monthly" as const, rewardType: "sticker" as const, glyph: "☾", description: `A manually claimed Field Honor for a Milky Way image captured in ${month}.`, requirement: `Choose this Field Honor on an image captured in ${month}.`, constellation: "field_year", sortOrder: index + 10, isManualClaimable: true, isAutomatic: false, countsTowardRank: true, isActive: true, metadata: { month: index + 1 } })),
  ...foregrounds.map((name, index) => ({ id: `foreground_${slug(name)}`, name: `${name} Foreground Milky Way`, category: "foreground" as const, rewardType: "sticker" as const, glyph: name === "Water" || name === "Reflection" ? "◒" : name === "Trees" ? "♣" : name === "Selfie/Human" ? "♟" : "◆", description: `A manually claimed Field Honor for a ${name.toLowerCase()} foreground Milky Way image.`, requirement: foregroundRequirements[name], constellation: "foregrounds", sortOrder: 100 + index, isManualClaimable: true, isAutomatic: false, countsTowardRank: true, isActive: true })),
  { id: "special_decade_under_the_stars", name: "Decade Under the Stars", category: "special", rewardType: "sticker_and_square_pin", glyph: "✦", description: "Milky Way year coverage across ten different calendar years.", requirement: "Earned when a member has Milky Way year coverage across ten different calendar years.", constellation: "decade", sortOrder: 220, isManualClaimable: false, isAutomatic: true, countsTowardRank: true, isActive: true, metadata: { years: 10 } },
  ...seasons.map((season, index) => ({ id: `seasonal_${season.toLowerCase()}`, name: `${season} Milky Way`, category: "seasonal" as const, rewardType: "sticker_and_square_pin" as const, glyph: "✧", description: `A manually claimed Field Honor for a Milky Way image captured in ${season}.`, requirement: seasonRequirements[index], constellation: "seasons", sortOrder: 240 + index, isManualClaimable: true, isAutomatic: false, countsTowardRank: true, isActive: true })),
  ...techniques.map((name, index) => ({ id: `technique_${slug(name.replace(" Milky Way", ""))}`, name, category: "technique" as const, rewardType: "sticker_and_square_pin" as const, glyph: ["▷", "▣", "▱", "♨", "⊕", "◫"][index], description: `${name} field technique honor.`, requirement: techniqueRequirements[name], constellation: "techniques", sortOrder: 300 + index, isManualClaimable: true, isAutomatic: false, countsTowardRank: true, isActive: true })),
  { id: "special_perfect_year", name: "Perfect Year", category: "special", rewardType: "sticker_and_square_pin", glyph: "✦", description: "Automatic honor for coverage in all 12 months of one calendar year.", requirement: "Automatically earned when a member has submitted at least one Milky Way field report from every month in the same calendar year.", constellation: "special", sortOrder: 360, isManualClaimable: false, isAutomatic: true, countsTowardRank: true, allowRepeat: true, isActive: true },
  ...ranks.map((rank, index) => ({ id: `rank_${rank.toLowerCase()}`, name: `${rank} Milky Way Photographer`, category: "rank" as const, rewardType: "square_pin" as const, glyph: "★", description: `${rank} Guild rank milestone.`, requirement: rankRequirements[index], constellation: "ranks", sortOrder: 400 + index, isManualClaimable: false, isAutomatic: true, countsTowardRank: false, isActive: true })),
];

export const trackingAchievementDefinitions: TrackingAchievement[] = [
  { id: "tracking_month_coverage", name: "Month coverage", category: "tracking", glyph: "◷", type: "Automatic tracking", requirement: "Each submitted image fills the month it was captured in for that calendar year.", sortOrder: 500 },
  { id: "tracking_season_coverage", name: "Season coverage", category: "tracking", glyph: "◇", type: "Automatic tracking", requirement: "Each submitted image fills the season it was captured in for that calendar year.", sortOrder: 501 },
  { id: "tracking_year_coverage", name: "Year coverage", category: "tracking", glyph: "✦", type: "Automatic tracking", requirement: "Submitting at least one Milky Way image from a calendar year gives that year coverage.", sortOrder: 502 },
  { id: "tracking_year_streak", name: "Year streak", category: "tracking", glyph: "☄", type: "Automatic tracking", requirement: "Tracks consecutive calendar years with at least one submitted Milky Way image.", sortOrder: 503 },
  { id: "tracking_month_streak", name: "Month streak", category: "tracking", glyph: "☾", type: "Automatic tracking", requirement: "Tracks consecutive months with submitted Milky Way coverage, if the current system supports it.", sortOrder: 504 },
  { id: "tracking_perfect_year_progress", name: "Perfect Year progress", category: "tracking", glyph: "◎", type: "Automatic tracking", requirement: "Tracks how many months in a single calendar year have coverage. When all 12 are filled, Perfect Year is earned.", sortOrder: 505 },
];

export const rankThresholds = [
  { short: "Beginner", full: "Beginner Milky Way Photographer", min: 1 },
  { short: "Amateur", full: "Amateur Milky Way Photographer", min: 8 },
  { short: "Novice", full: "Novice Milky Way Photographer", min: 18 },
  { short: "Veteran", full: "Veteran Milky Way Photographer", min: 25 },
  { short: "Master", full: "Master Milky Way Photographer", min: 33 },
];

export function rankForCount(count: number) {
  return [...rankThresholds].reverse().find((rank) => count >= rank.min) ?? { short: "Unranked", full: "Unranked", min: 0 };
}

export function nextRankForCount(count: number) {
  return rankThresholds.find((rank) => rank.min > count) ?? null;
}
