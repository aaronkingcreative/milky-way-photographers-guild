/** True when a pointer event landed outside the menu button and the menu panel. */
export function navPointerShouldClose<T>(path: readonly T[], toggle: T | null, panel: T | null) {
  if (!path.length) return false;
  if (toggle && path.includes(toggle)) return false;
  if (panel && path.includes(panel)) return false;
  return true;
}

/** Main member nav. Learn holds Courses and Resources, which switch with tabs on those pages. */
export const NAV_ITEMS: [string, string][] = [
  ["Guild Hall", "/guild-hall"],
  ["Gallery", "/feed"],
  ["Forum", "/forum"],
  ["Field Desk", "/field-desk"],
  ["Winners", "/winners"],
  ["Progress", "/progress"],
  ["Learn", "/courses"],
];

const under = (pathname: string, path: string) => pathname === path || pathname.startsWith(`${path}/`);

/** Which nav item a path lights up. Gallery covers image pages; Learn covers Courses and Resources. */
export function navItemIsActive(pathname: string, href: string) {
  if (href === "/courses") return under(pathname, "/courses") || under(pathname, "/resources");
  if (href === "/feed") return pathname === "/feed" || pathname === "/gallery" || pathname.startsWith("/images/");
  return under(pathname, href);
}
