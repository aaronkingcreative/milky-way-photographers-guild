/**
 * Guild portrait shapes. The header shows a vertical pill (4:7 capsule), everything else shows a circle.
 * The circle is the top of the pill. Same width, the pill simply continues down into a rounded bottom.
 */
export const PILL_ASPECT = 4 / 7; // width / height
export const PORTRAIT_OUTPUT = { circle: { w: 512, h: 512 }, pill: { w: 400, h: 700 } } as const;
export const PORTRAIT_ORIGINAL_MAX = 2048;
export type PortraitShape = "circle" | "pill";
/** Crop for one shape. x and y are the center of the crop as a fraction of the source image, zoom 1 fills the shape. */
export type ShapeCrop = { x: number; y: number; zoom: number };
export type PortraitCrop = { circle: ShapeCrop; pill: ShapeCrop; pillShape?: "vertical" };
export const DEFAULT_CROP: PortraitCrop = { circle: { x: 0.5, y: 0.5, zoom: 1 }, pill: { x: 0.5, y: 0.5, zoom: 1 } };

function num(v: unknown, min: number, max: number, fallback: number) { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback; }
export function sanitizeShapeCrop(v: any): ShapeCrop { return { x: num(v?.x, 0, 1, 0.5), y: num(v?.y, 0, 1, 0.5), zoom: num(v?.zoom, 1, 5, 1) }; }
export function sanitizeCrop(v: any): PortraitCrop { return { circle: sanitizeShapeCrop(v?.circle), pill: sanitizeShapeCrop(v?.pill), ...(v?.pillShape === "vertical" ? { pillShape: "vertical" as const } : {}) }; }

/** Scale and top-left offset that place a source of size nw by nh inside a frame of fw by fh for this crop. Keeps the frame covered. */
export function placeCrop(nw: number, nh: number, fw: number, fh: number, crop: ShapeCrop) {
  const scale = Math.max(fw / nw, fh / nh) * crop.zoom;
  const halfX = fw / (2 * scale * nw), halfY = fh / (2 * scale * nh);
  const x = Math.min(1 - halfX, Math.max(halfX, crop.x));
  const y = Math.min(1 - halfY, Math.max(halfY, crop.y));
  return { scale, x, y, left: fw / 2 - x * nw * scale, top: fh / 2 - y * nh * scale };
}

/** The circle crop that matches the top square of a pill crop, so the circle is exactly the top of the pill. */
export function circleFromPill(nw: number, nh: number, pill: ShapeCrop): ShapeCrop {
  const fw = 100, fh = fw / PILL_ASPECT;
  const p = placeCrop(nw, nh, fw, fh, pill);
  const base = Math.max(fw / nw, fw / nh);
  return { x: (fw / 2 - p.left) / (nw * p.scale), y: (fw / 2 - p.top) / (nh * p.scale), zoom: Math.min(5, Math.max(1, p.scale / base)) };
}
