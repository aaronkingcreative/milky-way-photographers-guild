/** Layout math for the public pile of Guild prints. Positions are percentages of the table. */

export const PRINT_SAFE = {
  minX: 32,
  maxX: 68,
  minY: 34,
  maxY: 66,
  maxRotate: 13,
} as const;

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

export function clampPose(pose: PrintPose): PrintPose {
  return {
    x: clamp(pose.x, PRINT_SAFE.minX, PRINT_SAFE.maxX),
    y: clamp(pose.y, PRINT_SAFE.minY, PRINT_SAFE.maxY),
    rotate: clamp(pose.rotate, -PRINT_SAFE.maxRotate, PRINT_SAFE.maxRotate),
  };
}

/** A loose overlapping cluster around the middle of the table. Stable for a given seed. */
export function scatterPrints(count: number, seed: number): PrintPose[] {
  if (count < 1) return [];
  const rand = mulberry32(seed);
  const poses: PrintPose[] = [];
  for (let index = 0; index < count; index += 1) {
    if (count === 1) {
      poses.push(
        clampPose({
          x: 50,
          y: 50,
          rotate: (rand() - 0.5) * 8,
        }),
      );
      continue;
    }
    const angle = (index / count) * Math.PI * 2 + (rand() - 0.5) * 0.7;
    const radius = 0.28 + rand() * 0.55;
    const x =
      50 +
      Math.cos(angle) * radius * ((PRINT_SAFE.maxX - PRINT_SAFE.minX) / 2);
    const y =
      50 +
      Math.sin(angle) * radius * ((PRINT_SAFE.maxY - PRINT_SAFE.minY) / 2);
    const rotate = (rand() - 0.5) * 2 * PRINT_SAFE.maxRotate;
    poses.push(clampPose({ x, y, rotate }));
  }
  return poses;
}

export const DRAG_THRESHOLD_PX = 8;
