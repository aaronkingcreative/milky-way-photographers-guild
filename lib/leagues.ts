// Yearly Milky Way leagues, by how many calendar months a member shot the Milky Way in one calendar year.
// Names and thresholds live here only. A league is kept for good once the year ends ("Platinum League 2025").
export const LEAGUES = [
  { id: "bronze", name: "Bronze League", short: "Bronze", minMonths: 3 },
  { id: "silver", name: "Silver League", short: "Silver", minMonths: 6 },
  { id: "gold", name: "Gold League", short: "Gold", minMonths: 8 },
  { id: "platinum", name: "Platinum League", short: "Platinum", minMonths: 10 },
  { id: "diamond", name: "Diamond League", short: "Diamond", minMonths: 12 },
] as const;
export type League = (typeof LEAGUES)[number];

export function leagueForMonths(months: number): League | null {
  let best: League | null = null;
  for (const league of LEAGUES) if (months >= league.minMonths) best = league;
  return best;
}

export function nextLeagueForMonths(months: number): League | null {
  return LEAGUES.find((league) => league.minMonths > months) ?? null;
}

/** Current calendar year in the Guild's home time zone (America/Denver). */
export function currentGuildYear(now = new Date()) {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Denver", year: "numeric" }).format(now));
}

export type LeagueYear = { year: number; months: number; league: League };

/** Leagues kept from finished years (current year excluded), newest first. */
export function finishedLeagueYears(monthsByYear: Map<number, Set<number>>, currentYear = currentGuildYear()): LeagueYear[] {
  return [...monthsByYear.entries()]
    .filter(([year]) => year < currentYear)
    .map(([year, months]) => ({ year, months: months.size, league: leagueForMonths(months.size) }))
    .filter((row): row is LeagueYear => row.league !== null)
    .sort((a, b) => b.year - a.year);
}
