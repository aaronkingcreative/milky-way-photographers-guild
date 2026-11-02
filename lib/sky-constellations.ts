// The Constellation of Honors star map (/progress).
//
// Every active achievement is pinned to a real star in one of six classic constellations. Star shapes come from
// real J2000 coordinates (RA in hours, Dec in degrees), projected per constellation with a gnomonic (flat sky)
// projection, so each figure keeps its true shape. The constellations are NOT placed in their true positions relative
// to each other: the layout mirrors a Milky Way panorama (Big Dipper and Cygnus in the north; Cassiopeia far left,
// Sagittarius left of the core, Scorpius right of the core, Crux low on the right as the southern Milky Way continues).
// Each one is fitted into its own box, with a separate desktop and mobile arrangement.
//
// Today: 41 stars for 41 achievements, no placeholders. Scorpius 12 (months), Big Dipper 7 + Cassiopeia 5
// (foregrounds), Cygnus 5 (seasons + Perfect Year), Sagittarius 8 (techniques + Decade on λ + Beginner on τ),
// Crux 4 (Amateur, Novice, Veteran, Master).
//
// How achievements land on stars (deterministic and data driven):
//   1. Achievements are sorted by category (SKY_CATEGORY_ORDER), then sort_order, then id.
//   2. Constellations are filled in the order listed in SKY_CONSTELLATIONS. Each star takes the next unplaced
//      achievement whose `constellation` field (or, if that is empty, its category) is in the star's `takes` list,
//      or the constellation's `takes` list when the star has none.
//   3. A star with no matching achievement renders as a faint "Future honor" (none today).
//   4. An achievement with no free star in its own constellation renders as a loose star along the bottom of the
//      panel, so a new honor never disappears.
//
// To add an achievement later: insert the achievement_definitions row with a `constellation` field and sort_order.
// It shows as a loose star until it gets a home: add a constellation (or stars) below with real coordinates, lines,
// a `takes` list that includes its field, and a desktop + mobile layout box.

export type SkyLayoutKey = "desktop" | "mobile";
export type SkyBox = { x: number; y: number; w: number; h: number; rotate?: number; label?: "above" | "below" | "left" | "right" };
export type SkyStarDef = { id: string; name: string; ra: number; dec: number; mag: number; takes?: string[] };
export type SkyConstellationDef = { id: string; name: string; takes: string[]; stars: SkyStarDef[]; lines: [string, string][]; layout: Record<SkyLayoutKey, SkyBox> };

/** Panel coordinate spaces. Stars and lines use these units; the panel keeps the same aspect ratio in CSS. */
export const SKY_VIEW: Record<SkyLayoutKey, { w: number; h: number }> = { desktop: { w: 1000, h: 720 }, mobile: { w: 1000, h: 2400 } };

export const SKY_CATEGORY_ORDER = ["monthly", "foreground", "technique", "seasonal", "special", "rank"];

const hms = (h: number, m: number, s = 0) => h + m / 60 + s / 3600;
const dms = (d: number, m: number, s = 0) => Math.sign(d || 1) * (Math.abs(d) + m / 60 + s / 3600);

export const SKY_CONSTELLATIONS: SkyConstellationDef[] = [
  {
    id: "scorpius", name: "Scorpius", takes: ["field_year"],
    // Field Year, January to December, runs from the head of the scorpion down to the stinger.
    stars: [
      { id: "beta", name: "Acrab (β Sco)", ra: hms(16, 5, 26), dec: dms(-19, 48), mag: 2.6 },
      { id: "delta", name: "Dschubba (δ Sco)", ra: hms(16, 0, 20), dec: dms(-22, 37), mag: 2.3 },
      { id: "pi", name: "Fang (π Sco)", ra: hms(15, 58, 51), dec: dms(-26, 7), mag: 2.9 },
      { id: "sigma", name: "Alniyat (σ Sco)", ra: hms(16, 21, 11), dec: dms(-25, 36), mag: 2.9 },
      { id: "alpha", name: "Antares (α Sco)", ra: hms(16, 29, 24), dec: dms(-26, 26), mag: 1.0 },
      { id: "tau", name: "Paikauhale (τ Sco)", ra: hms(16, 35, 53), dec: dms(-28, 13), mag: 2.8 },
      { id: "epsilon", name: "Larawag (ε Sco)", ra: hms(16, 50, 10), dec: dms(-34, 18), mag: 2.3 },
      { id: "mu", name: "Xamidimura (μ¹ Sco)", ra: hms(16, 51, 52), dec: dms(-38, 3), mag: 3.0 },
      { id: "zeta", name: "ζ² Sco", ra: hms(16, 54, 35), dec: dms(-42, 22), mag: 3.6 },
      { id: "eta", name: "η Sco", ra: hms(17, 12, 9), dec: dms(-43, 14), mag: 3.3 },
      { id: "theta", name: "Sargas (θ Sco)", ra: hms(17, 37, 19), dec: dms(-43, 0), mag: 1.9 },
      { id: "lambda", name: "Shaula (λ Sco)", ra: hms(17, 33, 36), dec: dms(-37, 6), mag: 1.6 },
    ],
    lines: [["beta", "delta"], ["delta", "pi"], ["delta", "sigma"], ["sigma", "alpha"], ["alpha", "tau"], ["tau", "epsilon"], ["epsilon", "mu"], ["mu", "zeta"], ["zeta", "eta"], ["eta", "theta"], ["theta", "lambda"]],
    layout: { desktop: { x: 540, y: 370, w: 270, h: 270, label: "below" }, mobile: { x: 560, y: 1080, w: 380, h: 520, label: "below" } },
  },
  {
    id: "big_dipper", name: "Big Dipper", takes: ["foregrounds"],
    stars: [
      { id: "dubhe", name: "Dubhe (α UMa)", ra: hms(11, 3, 44), dec: dms(61, 45), mag: 1.8 },
      { id: "merak", name: "Merak (β UMa)", ra: hms(11, 1, 50), dec: dms(56, 23), mag: 2.4 },
      { id: "phecda", name: "Phecda (γ UMa)", ra: hms(11, 53, 50), dec: dms(53, 42), mag: 2.4 },
      { id: "megrez", name: "Megrez (δ UMa)", ra: hms(12, 15, 25), dec: dms(57, 2), mag: 3.3 },
      { id: "alioth", name: "Alioth (ε UMa)", ra: hms(12, 54, 2), dec: dms(55, 58), mag: 1.8 },
      { id: "mizar", name: "Mizar (ζ UMa)", ra: hms(13, 23, 56), dec: dms(54, 56), mag: 2.2 },
      { id: "alkaid", name: "Alkaid (η UMa)", ra: hms(13, 47, 32), dec: dms(49, 19), mag: 1.9 },
    ],
    lines: [["dubhe", "merak"], ["merak", "phecda"], ["phecda", "megrez"], ["megrez", "dubhe"], ["megrez", "alioth"], ["alioth", "mizar"], ["mizar", "alkaid"]],
    layout: { desktop: { x: 60, y: 50, w: 340, h: 190, label: "below" }, mobile: { x: 70, y: 90, w: 860, h: 310, label: "below" } },
  },
  {
    id: "cassiopeia", name: "Cassiopeia", takes: ["foregrounds"],
    stars: [
      { id: "caph", name: "Caph (β Cas)", ra: hms(0, 9, 11), dec: dms(59, 9), mag: 2.3 },
      { id: "schedar", name: "Schedar (α Cas)", ra: hms(0, 40, 30), dec: dms(56, 32), mag: 2.2 },
      { id: "navi", name: "Navi (γ Cas)", ra: hms(0, 56, 43), dec: dms(60, 43), mag: 2.4 },
      { id: "ruchbah", name: "Ruchbah (δ Cas)", ra: hms(1, 25, 49), dec: dms(60, 14), mag: 2.7 },
      { id: "segin", name: "Segin (ε Cas)", ra: hms(1, 54, 24), dec: dms(63, 40), mag: 3.4 },
    ],
    lines: [["caph", "schedar"], ["schedar", "navi"], ["navi", "ruchbah"], ["ruchbah", "segin"]],
    layout: { desktop: { x: 30, y: 430, w: 210, h: 130, label: "below" }, mobile: { x: 60, y: 1880, w: 470, h: 250, label: "below" } },
  },
  {
    id: "cygnus", name: "Cygnus", takes: ["seasons", "special"],
    // The four seasons sit on the tips of the Northern Cross; Perfect Year sits at its heart.
    stars: [
      { id: "delta", name: "δ Cyg", ra: hms(19, 44, 58), dec: dms(45, 8), mag: 2.9, takes: ["seasons"] },
      { id: "deneb", name: "Deneb (α Cyg)", ra: hms(20, 41, 26), dec: dms(45, 17), mag: 1.3, takes: ["seasons"] },
      { id: "gienah", name: "Aljanah (ε Cyg)", ra: hms(20, 46, 13), dec: dms(33, 58), mag: 2.5, takes: ["seasons"] },
      { id: "albireo", name: "Albireo (β Cyg)", ra: hms(19, 30, 43), dec: dms(27, 58), mag: 3.1, takes: ["seasons"] },
      { id: "sadr", name: "Sadr (γ Cyg)", ra: hms(20, 22, 14), dec: dms(40, 15), mag: 2.2, takes: ["special"] },
    ],
    lines: [["deneb", "sadr"], ["sadr", "albireo"], ["delta", "sadr"], ["sadr", "gienah"]],
    layout: { desktop: { x: 600, y: 30, w: 240, h: 260, label: "below" }, mobile: { x: 300, y: 520, w: 400, h: 440, label: "below" } },
  },
  {
    id: "sagittarius", name: "Sagittarius (the Teapot)", takes: ["techniques"],
    // Six techniques fill the pot; the lid tip (λ) holds Decade Under the Stars and the handle (τ) holds Beginner,
    // where every photographer picks the hobby up.
    stars: [
      { id: "epsilon", name: "Kaus Australis (ε Sgr)", ra: hms(18, 24, 10), dec: dms(-34, 23), mag: 1.8 },
      { id: "gamma", name: "Alnasl (γ² Sgr)", ra: hms(18, 5, 48), dec: dms(-30, 25), mag: 3.0 },
      { id: "delta", name: "Kaus Media (δ Sgr)", ra: hms(18, 20, 60), dec: dms(-29, 50), mag: 2.7 },
      { id: "phi", name: "φ Sgr", ra: hms(18, 45, 39), dec: dms(-26, 59), mag: 3.2 },
      { id: "zeta", name: "Ascella (ζ Sgr)", ra: hms(19, 2, 37), dec: dms(-29, 53), mag: 2.6 },
      { id: "sigma", name: "Nunki (σ Sgr)", ra: hms(18, 55, 16), dec: dms(-26, 18), mag: 2.1 },
      { id: "lambda", name: "Kaus Borealis (λ Sgr)", ra: hms(18, 27, 58), dec: dms(-25, 25), mag: 2.8, takes: ["decade"] },
      { id: "tau", name: "τ Sgr", ra: hms(19, 6, 56), dec: dms(-27, 40), mag: 3.3, takes: ["ranks"] },
    ],
    lines: [["gamma", "delta"], ["gamma", "epsilon"], ["delta", "epsilon"], ["delta", "lambda"], ["lambda", "phi"], ["delta", "phi"], ["phi", "zeta"], ["epsilon", "zeta"], ["phi", "sigma"], ["sigma", "tau"], ["tau", "zeta"]],
    layout: { desktop: { x: 270, y: 420, w: 240, h: 200, rotate: -29, label: "below" }, mobile: { x: 40, y: 1150, w: 440, h: 330, rotate: -29, label: "below" } },
  },
  {
    id: "crux", name: "Crux (the Southern Cross)", takes: ["ranks"],
    // The ranks above Beginner get brighter as they climb: Amateur on faint Imai, Master on Acrux, the brightest.
    // The faint ε Crucis is left out so the cross reads cleanly.
    stars: [
      { id: "delta", name: "Imai (δ Cru)", ra: hms(12, 15, 9), dec: dms(-58, 45), mag: 2.8 },
      { id: "gamma", name: "Gacrux (γ Cru)", ra: hms(12, 31, 10), dec: dms(-57, 7), mag: 1.6 },
      { id: "beta", name: "Mimosa (β Cru)", ra: hms(12, 47, 43), dec: dms(-59, 41), mag: 1.3 },
      { id: "alpha", name: "Acrux (α Cru)", ra: hms(12, 26, 36), dec: dms(-63, 6), mag: 0.8 },
    ],
    lines: [["gamma", "alpha"], ["beta", "delta"]],
    layout: { desktop: { x: 845, y: 470, w: 120, h: 150, label: "below" }, mobile: { x: 570, y: 1800, w: 260, h: 360, label: "below" } },
  },
];


type Pt = { x: number; y: number };

function project(stars: SkyStarDef[]): Pt[] {
  const vec = stars.map((s) => { const a = (s.ra * 15 * Math.PI) / 180; const d = (s.dec * Math.PI) / 180; return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)]; });
  const c = vec.reduce((acc, v) => [acc[0] + v[0], acc[1] + v[1], acc[2] + v[2]], [0, 0, 0]);
  const n = Math.hypot(c[0], c[1], c[2]);
  const a0 = Math.atan2(c[1], c[0]);
  const d0 = Math.asin(c[2] / n);
  return stars.map((s) => {
    const a = (s.ra * 15 * Math.PI) / 180; const d = (s.dec * Math.PI) / 180;
    const cosc = Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(a - a0);
    const xi = (Math.cos(d) * Math.sin(a - a0)) / cosc;
    const eta = (Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(a - a0)) / cosc;
    // Sky view: east to the left, north up (screen y grows downward).
    return { x: -xi, y: -eta };
  });
}

function fit(points: Pt[], box: SkyBox): Pt[] {
  const r = ((box.rotate ?? 0) * Math.PI) / 180;
  const rotated = points.map((p) => ({ x: p.x * Math.cos(r) - p.y * Math.sin(r), y: p.x * Math.sin(r) + p.y * Math.cos(r) }));
  const xs = rotated.map((p) => p.x); const ys = rotated.map((p) => p.y);
  const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const scale = Math.min(box.w / Math.max(maxX - minX, 1e-6), box.h / Math.max(maxY - minY, 1e-6));
  const offX = box.x + (box.w - (maxX - minX) * scale) / 2; const offY = box.y + (box.h - (maxY - minY) * scale) / 2;
  return rotated.map((p) => ({ x: offX + (p.x - minX) * scale, y: offY + (p.y - minY) * scale }));
}

export type SkyAchievementInput = { id: string; category: string; constellation: string | null; sortOrder: number };
export type SkyPlacedStar<T> = { key: string; constellationId: string; constellationName: string; starName: string; mag: number; pos: Record<SkyLayoutKey, Pt>; achievement: T | null };
export type SkyPlacedConstellation = { id: string; name: string; label: Record<SkyLayoutKey, Pt & { anchor: "start" | "middle" | "end" }>; lines: { a: string; b: string }[] };

const round = (v: number) => Math.round(v * 10) / 10;

export function buildSkyMap<T extends SkyAchievementInput>(achievements: T[]) {
  const catIndex = (c: string) => { const i = SKY_CATEGORY_ORDER.indexOf(c); return i === -1 ? SKY_CATEGORY_ORDER.length : i; };
  const pool = [...achievements].sort((a, b) => catIndex(a.category) - catIndex(b.category) || a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
  const used = new Set<string>();
  const stars: SkyPlacedStar<T>[] = [];
  const constellations: SkyPlacedConstellation[] = [];

  for (const con of SKY_CONSTELLATIONS) {
    const raw = project(con.stars);
    const pos = { desktop: fit(raw, con.layout.desktop), mobile: fit(raw, con.layout.mobile) };
    con.stars.forEach((star, i) => {
      const takes = star.takes ?? con.takes;
      const match = pool.find((item) => !used.has(item.id) && takes.includes(item.constellation || item.category));
      if (match) used.add(match.id);
      stars.push({ key: `${con.id}:${star.id}`, constellationId: con.id, constellationName: con.name, starName: star.name, mag: star.mag, pos: { desktop: { x: round(pos.desktop[i].x), y: round(pos.desktop[i].y) }, mobile: { x: round(pos.mobile[i].x), y: round(pos.mobile[i].y) } }, achievement: match ?? null });
    });
    const label = (layout: SkyLayoutKey) => {
      const pts = pos[layout]; const box = con.layout[layout];
      const minX = Math.min(...pts.map((p) => p.x)); const maxX = Math.max(...pts.map((p) => p.x));
      const minY = Math.min(...pts.map((p) => p.y)); const maxY = Math.max(...pts.map((p) => p.y));
      const pad = layout === "mobile" ? 70 : 36;
      if (box.label === "above") return { x: round((minX + maxX) / 2), y: round(minY - pad * 0.8), anchor: "middle" as const };
      if (box.label === "left") return { x: round(minX - pad), y: round((minY + maxY) / 2), anchor: "end" as const };
      if (box.label === "right") return { x: round(maxX + pad * 0.6), y: round((minY + maxY) / 2), anchor: "start" as const };
      return { x: round((minX + maxX) / 2), y: round(maxY + pad * 1.15), anchor: "middle" as const };
    };
    constellations.push({ id: con.id, name: con.name, label: { desktop: label("desktop"), mobile: label("mobile") }, lines: con.lines.map(([a, b]) => ({ a: `${con.id}:${a}`, b: `${con.id}:${b}` })) });
  }

  // No free star in its own constellation: loose stars along the bottom edge so nothing is ever hidden.
  const loose = pool.filter((item) => !used.has(item.id));
  loose.forEach((item, i) => {
    const step = (n: number) => 60 + ((i % 12) * (880 / 11));
    stars.push({ key: `loose:${item.id}`, constellationId: "loose", constellationName: "Unmapped", starName: "Loose star", mag: 3, pos: { desktop: { x: round(step(i)), y: SKY_VIEW.desktop.h - 30 - Math.floor(i / 12) * 50 }, mobile: { x: round(step(i)), y: SKY_VIEW.mobile.h - 50 - Math.floor(i / 12) * 80 } }, achievement: item });
  });

  return { stars, constellations };
}
