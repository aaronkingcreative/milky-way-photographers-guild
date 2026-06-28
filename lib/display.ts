export function titleCaseLabel(label?: string | null, fallback = "Veteran") {
  return (label || fallback)
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatStreakBadge(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return null;
  const match = String(value).match(/\d+/);
  return match ? `☄ ${match[0]} y` : null;
}

export function fullPhotographerRank(rank?: string | null) {
  const displayRank = titleCaseLabel(rank);
  return `${displayRank} Milky Way Photographer`;
}
