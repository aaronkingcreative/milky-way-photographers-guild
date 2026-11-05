export type AscentOrderable = { count: number; avatarUrl: string | null; name: string };

/**
 * Order within one Ascent rank. Highest Field Honor counts lead the column.
 * A portrait, then name, only breaks ties.
 */
export function compareAscentClimbers(a: AscentOrderable, b: AscentOrderable) {
  return b.count - a.count
    || Number(Boolean(b.avatarUrl)) - Number(Boolean(a.avatarUrl))
    || a.name.localeCompare(b.name, "en", { sensitivity: "base" });
}
