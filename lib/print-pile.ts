/** Layout math for the public pile of Guild prints. Positions are percentages of the table. */

export type PrintSafe = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  maxRotate: number;
};

/** Phone and narrow tables. Wide enough to fill more of the table without spilling off. */
export const PRINT_SAFE: PrintSafe = {
  minX: 28,
  maxX: 72,
  minY: 28,
  maxY: 72,
  maxRotate: 11,
};

/** Looser casual spread for wide tables. Leaves a margin so rotated prints stay inside. */
export const PRINT_SAFE_WIDE: PrintSafe = {
  minX: 11,
  maxX: 89,
  minY: 28,
  maxY: 72,
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

/** A loose overlapping cluster or, on a wide table, a casual spread. Stable for a given seed. */
export function scatterPrints(count: number, seed: number, safe: PrintSafe = PRINT_SAFE): PrintPose[] {
  if (count < 1) return [];
  const rand = mulberry32(seed);
  const poses: PrintPose[] = [];
  const loose = isLoose(safe);
  for (let index = 0; index < count; index += 1) {
    if (count === 1) {
      poses.push(
        clampPose({
          x: 50,
          y: 50,
          rotate: (rand() - 0.5) * 8,
        }, safe),
      );
      continue;
    }
    const angle = (index / count) * Math.PI * 2 + (rand() - 0.5) * (loose ? 0.9 : 0.75);
    const radius = (loose ? 0.52 : 0.48) + rand() * (loose ? 0.48 : 0.52);
    const x =
      50 +
      Math.cos(angle) * radius * ((safe.maxX - safe.minX) / 2);
    const y =
      50 +
      Math.sin(angle) * radius * ((safe.maxY - safe.minY) / 2);
    const rotate = (rand() - 0.5) * 2 * safe.maxRotate;
    poses.push(clampPose({ x, y, rotate }, safe));
  }
  return poses;
}

export function isWidePrintSpread(): boolean {
  return typeof window !== "undefined" && window.matchMedia(PRINT_SPREAD_MQ).matches;
}

export const DRAG_THRESHOLD_PX = 8;
