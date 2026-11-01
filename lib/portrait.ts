/** Guild portrait shapes. The header shows a pill (7:4 capsule), everything else shows a circle. */
export const PILL_ASPECT = 7 / 4;
export const PORTRAIT_OUTPUT = { circle: { w: 512, h: 512 }, pill: { w: 700, h: 400 } } as const;
export const PORTRAIT_ORIGINAL_MAX = 2048;
export type PortraitShape = "circle" | "pill";
/** Crop for one shape. x and y are the center of the crop as a fraction of the source image, zoom 1 fills the shape. */
export type ShapeCrop = { x: number; y: number; zoom: number };
export type PortraitCrop = { circle: ShapeCrop; pill: ShapeCrop };
export const DEFAULT_CROP: PortraitCrop = { circle: { x: 0.5, y: 0.5, zoom: 1 }, pill: { x: 0.5, y: 0.5, zoom: 1 } };

function num(v: unknown, min: number, max: number, fallback: number) { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback; }
export function sanitizeShapeCrop(v: any): ShapeCrop { return { x: num(v?.x, 0, 1, 0.5), y: num(v?.y, 0, 1, 0.5), zoom: num(v?.zoom, 1, 5, 1) }; }
export function sanitizeCrop(v: any): PortraitCrop { return { circle: sanitizeShapeCrop(v?.circle), pill: sanitizeShapeCrop(v?.pill) }; }

/** Scale and top-left offset that place a source of size nw by nh inside a frame of fw by fh for this crop. Keeps the frame covered. */
export function placeCrop(nw: number, nh: number, fw: number, fh: number, crop: ShapeCrop) {
  const scale = Math.max(fw / nw, fh / nh) * crop.zoom;
  const halfX = fw / (2 * scale * nw), halfY = fh / (2 * scale * nh);
  const x = Math.min(1 - halfX, Math.max(halfX, crop.x));
  const y = Math.min(1 - halfY, Math.max(halfY, crop.y));
  return { scale, x, y, left: fw / 2 - x * nw * scale, top: fh / 2 - y * nh * scale };
}
