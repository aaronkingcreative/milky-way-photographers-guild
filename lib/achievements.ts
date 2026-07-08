export type AchievementCategory = "monthly" | "seasonal" | "foreground" | "technique" | "special" | "rank";
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
};

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const foregrounds = ["Rocky", "Water", "Trees", "Desert", "Man Made", "Chasm", "Light Polluted", "Plant", "Reflection", "Selfie/Human", "Abandoned", "Light Painted"];
const seasons = ["Winter", "Spring", "Summer", "Fall"];
const techniques = ["Milky Way Timelapse", "Moving Milky Way Timelapse", "Panorama Milky Way", "Stacked Milky Way", "Tracked Milky Way", "Time Blended Milky Way"];
const ranks = ["Beginner", "Amateur", "Novice", "Veteran", "Master"];

const slug = (value: string) => value.toLowerCase().replace(/\//g, " ").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export const seededAchievementDefinitions: AchievementDefinition[] = [
  ...months.map((month, index) => ({
    id: `monthly_${month.toLowerCase()}`,
    name: `${month} Milky Way`,
    category: "monthly" as const,
    rewardType: "sticker" as const,
    glyph: "☾",
    description: `A Milky Way image captured in ${month}.`,
    requirement: `Submit a Milky Way image captured in ${month}.`,
    constellation: "field_year",
    sortOrder: index + 10,
    isActive: true,
    metadata: { month: index + 1 },
  })),
  ...foregrounds.map((name, index) => ({
    id: `foreground_${slug(name)}`,
    name: `${name} Foreground Milky Way`,
    category: "foreground" as const,
    rewardType: "sticker" as const,
    glyph: name === "Water" || name === "Reflection" ? "◒" : name === "Trees" ? "♣" : name === "Selfie/Human" ? "♟" : "◆",
    description: `A Milky Way image featuring ${name.toLowerCase()} foreground interest.`,
    requirement: `Submit a Milky Way image with ${name.toLowerCase()} foreground interest.`,
    constellation: "foregrounds",
    sortOrder: 100 + index,
    isActive: true,
  })),
  {
    id: "special_decade_under_the_stars",
    name: "Decade Under the Stars",
    category: "special",
    rewardType: "sticker_and_square_pin",
    glyph: "✦",
    description: "A Milky Way image captured during 2018.",
    requirement: "Submit a Milky Way image captured during 2018.",
    constellation: "decade",
    sortOrder: 220,
    isActive: true,
    metadata: { years: 10 },
  },
  ...seasons.map((season, index) => ({
    id: `seasonal_${season.toLowerCase()}`,
    name: `${season} Milky Way`,
    category: "seasonal" as const,
    rewardType: "sticker_and_square_pin" as const,
    glyph: "✧",
    description: `A Milky Way image captured in ${season}.`,
    requirement: `Submit a Milky Way image captured in ${season}.`,
    constellation: "seasons",
    sortOrder: 240 + index,
    isActive: true,
  })),
  ...techniques.map((name, index) => ({
    id: `technique_${slug(name.replace(" Milky Way", ""))}`,
    name,
    category: "technique" as const,
    rewardType: "sticker_and_square_pin" as const,
    glyph: ["▷", "▣", "▱", "♨", "⊕", "◫"][index],
    description: `${name} field technique honor.`,
    requirement: `Submit a ${name.toLowerCase()} image or sequence.`,
    constellation: "techniques",
    sortOrder: 300 + index,
    isActive: true,
  })),
  {
    id: "special_perfect_year",
    name: "Perfect Year",
    category: "special" as const,
    rewardType: "sticker_and_square_pin" as const,
    glyph: "✦",
    description: "A field report from every month in one calendar year.",
    requirement: "Submit at least one Milky Way field report from every month in the same calendar year.",
    constellation: "special",
    sortOrder: 360,
    isManualClaimable: false,
    isAutomatic: true,
    countsTowardRank: true,
    allowRepeat: true,
    isActive: true,
  },
  ...ranks.map((rank, index) => ({
    id: `rank_${rank.toLowerCase()}`,
    name: `${rank} Milky Way Photographer`,
    category: "rank" as const,
    rewardType: "square_pin" as const,
    glyph: "★",
    description: `${rank} Guild rank honor.`,
    requirement: `Earn enough field honors to reach ${rank} rank.`,
    constellation: "ranks",
    sortOrder: 400 + index,
    isActive: true,
  })),
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
