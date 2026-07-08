export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function seasonForMonth(month: number) {
  if ([12, 1, 2].includes(month)) return "Winter";
  if ([3, 4, 5].includes(month)) return "Spring";
  if ([6, 7, 8].includes(month)) return "Summer";
  return "Fall";
}

export function coverageFromCaptureDate(captureDate: string) {
  const date = new Date(`${captureDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const season = seasonForMonth(month);
  return { year, month, season, monthLabel: `${MONTH_NAMES[month - 1]} ${year}`, seasonLabel: `${season} ${year}`, yearLabel: String(year) };
}

export function consecutiveMonthStreakFromCoverage(rows: Array<{ capture_year: number; capture_month: number }>) {
  const months = [...new Set(rows.map((row) => row.capture_year * 12 + row.capture_month - 1))].sort((a, b) => b - a);
  if (!months.length) return 0;
  let streak = 1;
  for (let index = 1; index < months.length; index += 1) {
    if (months[index] === months[index - 1] - 1) streak += 1;
    else break;
  }
  return streak;
}
