// The Constellation of Honors star map (/progress).
//
// Every active achievement is pinned to a real star in one of seven classic constellations. Star shapes come from
// real J2000 coordinates (RA in hours, Dec in degrees), projected per constellation with a gnomonic (flat sky)
// projection, so each figure keeps its true shape. The constellations are NOT placed in their true positions relative
// to each other: each one is fitted into its own box on the panel, with a separate desktop and mobile arrangement.
//
// How achievements land on stars (deterministic and data driven):
//   1. Achievements are sorted by category (SKY_CATEGORY_ORDER), then sort_order, then id.
//   2. Constellations are filled in the order listed in SKY_CONSTELLATIONS. Each star takes the next unplaced
//      achievement whose `constellation` field (or, if that is empty, its category) is in the star's `takes` list,
//      or the constellation's `takes` list when the star has none.
//   3. Any achievement still unplaced (for example a brand new field) takes the first free star in
//      SKY_OVERFLOW_ORDER, so a new honor never disappears.
//   4. Stars left without an achievement render as faint "Future honor" placeholders.
//   5. If every star is taken, extra achievements render as loose stars along the bottom of the panel. At that point,
//      add stars (with real coordinates and lines) to a constellation below.
//
// To add an achievement later: insert the achievement_definitions row with a `constellation` field and sort_order.
// It fills the first free Future honor slot that accepts its field, otherwise the first free slot anywhere.

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
    layout: { desktop: { x: 660, y: 370, w: 270, h: 280, label: "below" }, mobile: { x: 570, y: 1260, w: 370, h: 430, label: "below" } },
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
    layout: { desktop: { x: 40, y: 50, w: 320, h: 190, label: "below" }, mobile: { x: 70, y: 90, w: 860, h: 310, label: "below" } },
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
    layout: { desktop: { x: 660, y: 40, w: 210, h: 125, label: "below" }, mobile: { x: 570, y: 560, w: 360, h: 200, label: "below" } },
  },
  {
    id: "little_dipper", name: "Little Dipper", takes: ["ranks", "decade"],
    // Ranks climb from the bowl up the handle, so Master sits on Polaris. The two Guardians of the Pole hold
    // the Decade honors.
    stars: [
      { id: "eta", name: "η UMi", ra: hms(16, 17, 30), dec: dms(75, 45), mag: 5.0, takes: ["ranks"] },
      { id: "zeta", name: "ζ UMi", ra: hms(15, 44, 4), dec: dms(77, 47), mag: 4.3, takes: ["ranks"] },
      { id: "epsilon", name: "ε UMi", ra: hms(16, 45, 58), dec: dms(82, 2), mag: 4.2, takes: ["ranks"] },
      { id: "delta", name: "Yildun (δ UMi)", ra: hms(17, 32, 13), dec: dms(86, 35), mag: 4.4, takes: ["ranks"] },
      { id: "polaris", name: "Polaris (α UMi)", ra: hms(2, 31, 49), dec: dms(89, 15, 51), mag: 2.0, takes: ["ranks"] },
      { id: "kochab", name: "Kochab (β UMi)", ra: hms(14, 50, 42), dec: dms(74, 9), mag: 2.1, takes: ["decade"] },
      { id: "pherkad", name: "Pherkad (γ UMi)", ra: hms(15, 20, 44), dec: dms(71, 50), mag: 3.0, takes: ["decade"] },
    ],
    lines: [["polaris", "delta"], ["delta", "epsilon"], ["epsilon", "zeta"], ["zeta", "kochab"], ["kochab", "pherkad"], ["pherkad", "eta"], ["eta", "zeta"]],
    layout: { desktop: { x: 410, y: 40, w: 190, h: 250, label: "below" }, mobile: { x: 70, y: 560, w: 360, h: 450, label: "below" } },
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
    layout: { desktop: { x: 70, y: 345, w: 240, h: 300, label: "below" }, mobile: { x: 60, y: 1230, w: 380, h: 460, label: "below" } },
  },
  {
    id: "sagittarius", name: "Sagittarius (the Teapot)", takes: ["techniques"],
    stars: [
      { id: "epsilon", name: "Kaus Australis (ε Sgr)", ra: hms(18, 24, 10), dec: dms(-34, 23), mag: 1.8 },
      { id: "gamma", name: "Alnasl (γ² Sgr)", ra: hms(18, 5, 48), dec: dms(-30, 25), mag: 3.0 },
      { id: "delta", name: "Kaus Media (δ Sgr)", ra: hms(18, 20, 60), dec: dms(-29, 50), mag: 2.7 },
      { id: "phi", name: "φ Sgr", ra: hms(18, 45, 39), dec: dms(-26, 59), mag: 3.2 },
      { id: "zeta", name: "Ascella (ζ Sgr)", ra: hms(19, 2, 37), dec: dms(-29, 53), mag: 2.6 },
      { id: "sigma", name: "Nunki (σ Sgr)", ra: hms(18, 55, 16), dec: dms(-26, 18), mag: 2.1 },
      { id: "lambda", name: "Kaus Borealis (λ Sgr)", ra: hms(18, 27, 58), dec: dms(-25, 25), mag: 2.8 },
      { id: "tau", name: "τ Sgr", ra: hms(19, 6, 56), dec: dms(-27, 40), mag: 3.3 },
    ],
    lines: [["gamma", "delta"], ["gamma", "epsilon"], ["delta", "epsilon"], ["delta", "lambda"], ["lambda", "phi"], ["delta", "phi"], ["phi", "zeta"], ["epsilon", "zeta"], ["phi", "sigma"], ["sigma", "tau"], ["tau", "zeta"]],
    layout: { desktop: { x: 360, y: 420, w: 250, h: 210, rotate: -29, label: "below" }, mobile: { x: 150, y: 1900, w: 700, h: 340, rotate: -29, label: "below" } },
  },
  {
    id: "andromeda", name: "Andromeda", takes: [],
    // Reserved for honors the Guild has not added yet.
    stars: [
      { id: "alpheratz", name: "Alpheratz (α And)", ra: hms(0, 8, 23), dec: dms(29, 5), mag: 2.1 },
      { id: "delta", name: "δ And", ra: hms(0, 39, 20), dec: dms(30, 52), mag: 3.3 },
      { id: "mirach", name: "Mirach (β And)", ra: hms(1, 9, 44), dec: dms(35, 37), mag: 2.1 },
      { id: "almach", name: "Almach (γ And)", ra: hms(2, 3, 54), dec: dms(42, 20), mag: 2.1 },
    ],
    lines: [["alpheratz", "delta"], ["delta", "mirach"], ["mirach", "almach"]],
    layout: { desktop: { x: 700, y: 210, w: 260, h: 95, label: "below" }, mobile: { x: 570, y: 910, w: 360, h: 150, label: "below" } },
  },
];

/** Where unplaced achievements go first when their own constellation is full. */
export const SKY_OVERFLOW_ORDER = ["andromeda", "sagittarius", "little_dipper", "cygnus", "cassiopeia", "big_dipper", "scorpius"];

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

  // Overflow: achievements whose field has no free star take the first free star in SKY_OVERFLOW_ORDER.
  for (const item of pool) {
    if (used.has(item.id)) continue;
    const free = SKY_OVERFLOW_ORDER.flatMap((id) => stars.filter((s) => s.constellationId === id && !s.achievement))[0];
    if (!free) continue;
    free.achievement = item; used.add(item.id);
  }
  // Sky full: loose stars along the bottom edge so nothing is ever hidden.
  const loose = pool.filter((item) => !used.has(item.id));
  loose.forEach((item, i) => {
    const step = (n: number) => 60 + ((i % 12) * (880 / 11));
    stars.push({ key: `loose:${item.id}`, constellationId: "loose", constellationName: "Unmapped", starName: "Loose star", mag: 3, pos: { desktop: { x: round(step(i)), y: SKY_VIEW.desktop.h - 30 - Math.floor(i / 12) * 50 }, mobile: { x: round(step(i)), y: SKY_VIEW.mobile.h - 50 - Math.floor(i / 12) * 80 } }, achievement: item });
  });

  return { stars, constellations };
}
