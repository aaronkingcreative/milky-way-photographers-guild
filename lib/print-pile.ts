/** Layout math for the public pile of Guild prints. Positions are percentages of the table. */

export type PrintSafe = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  maxRotate: number;
};

/** Phone and narrow tables. Inset so a rotated, slightly larger print stays at least 8px inside the table. */
export const PRINT_SAFE: PrintSafe = {
  minX: 42,
  maxX: 58,
  minY: 38,
  maxY: 62,
  maxRotate: 11,
};

/** Looser casual spread for wide tables. Leaves a margin so rotated prints stay inside. */
export const PRINT_SAFE_WIDE: PrintSafe = {
  minX: 8,
  maxX: 92,
  minY: 32,
  maxY: 68,
  maxRotate: 11,
};

/** Must match the CSS media query that swaps print positions and sizes. */
export const PRINT_SPREAD_MIN_WIDTH = 800;
export const PRINT_SPREAD_MQ = `(min-width: ${PRINT_SPREAD_MIN_WIDTH}px)`;

export type PrintPose = {
  x: number;
  y: number;
  rotate: number;
};

export function seedFromKeys(keys: string[]): number {
  let hash = 2166136261;
  const source = keys.join("|");
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Half-width and half-height of a print after rotation, in pixels. */
export function rotatedPrintHalfSize(widthPx: number, heightPx: number, rotateDeg: number) {
  const rad = (Math.abs(rotateDeg) * Math.PI) / 180;
  return {
    halfW: (widthPx / 2) * Math.cos(rad) + (heightPx / 2) * Math.sin(rad),
    halfH: (widthPx / 2) * Math.sin(rad) + (heightPx / 2) * Math.cos(rad),
  };
}

/** Approximate outer box of a print, including the cream frame and avatar band. */
export function printFrameSize(printLongPx: number, avatarPx: number) {
  const side = 0.42 * 16;
  const bottom = avatarPx * 0.68 + 0.18 * 16;
  return {
    width: printLongPx + side * 2,
    height: printLongPx + side + bottom,
  };
}

/**
 * Inset a safe box so a rotated print of the given size stays at least insetPx
 * inside the table. Used for every table width, including 1280.
 */
export function printSafeForTable(
  tableW: number,
  tableH: number,
  printWidthPx: number,
  printHeightPx: number,
  base: PrintSafe,
  insetPx = 8,
): PrintSafe {
  if (tableW <= 0 || tableH <= 0) return base;
  const { halfW, halfH } = rotatedPrintHalfSize(printWidthPx, printHeightPx, base.maxRotate);
  const xPad = ((halfW + insetPx) / tableW) * 100;
  const yPad = ((halfH + insetPx) / tableH) * 100;
  const minX = Math.min(49, Math.max(base.minX, xPad));
  const maxX = Math.max(51, Math.min(base.maxX, 100 - xPad));
  const minY = Math.min(49, Math.max(base.minY, yPad));
  const maxY = Math.max(51, Math.min(base.maxY, 100 - yPad));
  return { ...base, minX, maxX, minY, maxY };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function clampPose(pose: PrintPose, safe: PrintSafe = PRINT_SAFE): PrintPose {
  return {
    x: clamp(pose.x, safe.minX, safe.maxX),
    y: clamp(pose.y, safe.minY, safe.maxY),
    rotate: clamp(pose.rotate, -safe.maxRotate, safe.maxRotate),
  };
}

function isLoose(safe: PrintSafe) {
  return safe.maxX - safe.minX >= 50;
}

function shuffleIndices(count: number, rand: () => number): number[] {
  const items = Array.from({ length: count }, (_, index) => index);
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rand() * (index + 1));
    const current = items[index];
    items[index] = items[swap];
    items[swap] = current;
  }
  return items;
}

/** Column and row counts for a jittered slot grid that covers the table evenly. */
export function scatterGridSize(count: number, safe: PrintSafe = PRINT_SAFE): { cols: number; rows: number } {
  if (count <= 1) return { cols: 1, rows: 1 };
  if (count === 2) return { cols: 2, rows: 1 };
  if (isLoose(safe) && count >= 4) {
    const rows = 2;
    return { cols: Math.ceil(count / rows), rows };
  }
  const cols = Math.ceil(Math.sqrt(count));
  return { cols, rows: Math.ceil(count / cols) };
}

function rowCountsFor(count: number, rows: number, cols: number): number[] {
  const base = Math.floor(count / rows);
  const extra = count % rows;
  const counts: number[] = [];
  for (let row = 0; row < rows; row += 1) {
    counts.push(row < extra ? base + 1 : base);
  }
  if (counts[0] > cols) counts[0] = cols;
  return counts;
}

function rowCenters(countInRow: number, cols: number, safe: PrintSafe): number[] {
  const width = safe.maxX - safe.minX;
  if (countInRow <= 1) return [(safe.minX + safe.maxX) / 2];
  if (countInRow === cols - 1 && cols >= 3) {
    return Array.from({ length: countInRow }, (_, index) => safe.minX + ((index + 0.5) / (cols - 1)) * width);
  }
  if (countInRow < cols && cols > 1) {
    const inset = width / (2 * (cols - 1));
    const inner = width - 2 * inset;
    return Array.from({ length: countInRow }, (_, index) => safe.minX + inset + (index / (countInRow - 1)) * inner);
  }
  return Array.from({ length: countInRow }, (_, index) => safe.minX + (index / (countInRow - 1)) * width);
}

/**
 * Jittered slots that cover the table evenly. Neighbors overlap so it still reads as a pile.
 * Stable for a given seed. Shuffle passes a new seed and gets a new assignment in the same even grid.
 */
export function scatterPrints(count: number, seed: number, safe: PrintSafe = PRINT_SAFE): PrintPose[] {
  if (count < 1) return [];
  const rand = mulberry32(seed);
  if (count === 1) {
    return [
      clampPose({
        x: 50,
        y: 50,
        rotate: (rand() - 0.5) * 8,
      }, safe),
    ];
  }
  const { cols, rows } = scatterGridSize(count, safe);
  const counts = rowCountsFor(count, rows, cols);
  const width = safe.maxX - safe.minX;
  const height = safe.maxY - safe.minY;
  const colSpacing = cols > 1 ? width / (cols - 1) : 0;
  const rowSpacing = rows > 1 ? height / (rows - 1) : 0;
  const slots: PrintPose[] = [];
  counts.forEach((countInRow, row) => {
    const y0 = rows === 1 ? (safe.minY + safe.maxY) / 2 : safe.minY + (row / (rows - 1)) * height;
    const xs = rowCenters(countInRow, cols, safe);
    xs.forEach((x0) => {
      const x = x0 + (rand() - 0.5) * colSpacing * 0.32;
      const y = y0 + (rand() - 0.5) * rowSpacing * 0.28;
      const rotate = (rand() - 0.5) * 2 * safe.maxRotate;
      slots.push(clampPose({ x, y, rotate }, safe));
    });
  });
  return shuffleIndices(slots.length, rand).map((index) => slots[index]);
}

export function isWidePrintSpread(): boolean {
  return typeof window !== "undefined" && window.matchMedia(PRINT_SPREAD_MQ).matches;
}

export const DRAG_THRESHOLD_PX = 8;
