/** True when a pointer event landed outside the menu button and the menu panel. */
export function navPointerShouldClose<T>(path: readonly T[], toggle: T | null, panel: T | null) {
  if (!path.length) return false;
  if (toggle && path.includes(toggle)) return false;
  if (panel && path.includes(panel)) return false;
  return true;
}
