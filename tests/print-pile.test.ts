import assert from "node:assert/strict";
import test from "node:test";
import { PRINT_SAFE, PRINT_SAFE_TABLET, PRINT_SAFE_WIDE, PRINT_SPREAD_MIN_WIDTH, clampPose, printFrameSize, printSafeForTable, rotatedPrintHalfSize, scatterGridSize, scatterPrints, seedFromKeys } from "../lib/print-pile.ts";
import { DEFAULT_PRINT_AVATAR, PILE_AVATAR_WIDTH, PILE_PHOTO_WIDTH, showcaseAvatarUrl, showcaseThumbUrl } from "../lib/showcase-images.ts";

test("a seed from the same keys stays stable and a scatter stays on the table", () => {
  const keys = ["https://cdn.example.com/a.jpg", "https://cdn.example.com/b.jpg"];
  assert.equal(seedFromKeys(keys), seedFromKeys(keys));
  assert.notEqual(seedFromKeys(keys), seedFromKeys(["https://cdn.example.com/c.jpg"]));
  const poses = scatterPrints(9, seedFromKeys(keys));
  assert.equal(poses.length, 9);
  for (const pose of poses) {
    assert.ok(pose.x >= PRINT_SAFE.minX && pose.x <= PRINT_SAFE.maxX, String(pose.x));
    assert.ok(pose.y >= PRINT_SAFE.minY && pose.y <= PRINT_SAFE.maxY, String(pose.y));
    assert.ok(Math.abs(pose.rotate) <= PRINT_SAFE.maxRotate, String(pose.rotate));
  }
  const again = scatterPrints(9, seedFromKeys(keys));
  assert.deepEqual(poses, again);
  const shuffled = scatterPrints(9, seedFromKeys(keys) + 11);
  assert.notDeepEqual(poses, shuffled);
});

test("a phone scatter uses more of the table and stays inside the narrow safe box", () => {
  const poses = scatterPrints(9, 42, PRINT_SAFE);
  const xs = poses.map((pose) => pose.x);
  const ys = poses.map((pose) => pose.y);
  const xSpan = Math.max(...xs) - Math.min(...xs);
  const ySpan = Math.max(...ys) - Math.min(...ys);
  assert.ok(xSpan >= 12, String(xSpan));
  assert.ok(ySpan >= 20, String(ySpan));
  for (const pose of poses) {
    assert.ok(pose.x >= PRINT_SAFE.minX && pose.x <= PRINT_SAFE.maxX, String(pose.x));
    assert.ok(pose.y >= PRINT_SAFE.minY && pose.y <= PRINT_SAFE.maxY, String(pose.y));
  }
});

test("a wide scatter uses more of the table and stays inside the wide safe box", () => {
  const poses = scatterPrints(9, 42, PRINT_SAFE_WIDE);
  assert.equal(poses.length, 9);
  const xs = poses.map((pose) => pose.x);
  const span = Math.max(...xs) - Math.min(...xs);
  assert.ok(span > 60, String(span));
  for (const pose of poses) {
    assert.ok(pose.x >= PRINT_SAFE_WIDE.minX && pose.x <= PRINT_SAFE_WIDE.maxX, String(pose.x));
    assert.ok(pose.y >= PRINT_SAFE_WIDE.minY && pose.y <= PRINT_SAFE_WIDE.maxY, String(pose.y));
    assert.ok(Math.abs(pose.rotate) <= PRINT_SAFE_WIDE.maxRotate, String(pose.rotate));
  }
  assert.equal(PRINT_SPREAD_MIN_WIDTH, 600);
});

test("a dragged print is clamped back onto the table", () => {
  const pose = clampPose({ x: -20, y: 140, rotate: 40 });
  assert.equal(pose.x, PRINT_SAFE.minX);
  assert.equal(pose.y, PRINT_SAFE.maxY);
  assert.equal(pose.rotate, PRINT_SAFE.maxRotate);
  const wide = clampPose({ x: -20, y: 140, rotate: 40 }, PRINT_SAFE_WIDE);
  assert.equal(wide.x, PRINT_SAFE_WIDE.minX);
  assert.equal(wide.y, PRINT_SAFE_WIDE.maxY);
  assert.equal(wide.rotate, PRINT_SAFE_WIDE.maxRotate);
});

test("one print sits in the middle of the table", () => {
  const [pose] = scatterPrints(1, 1);
  assert.equal(pose.x, 50);
  assert.equal(pose.y, 50);
  assert.equal(scatterPrints(0, 1).length, 0);
});

test("Supabase public object URLs become sized render URLs", () => {
  const photo = "https://lzeljgbudkqpbmbbbsex.supabase.co/storage/v1/object/public/field-report-images/users/a/original.jpg";
  const avatar = "https://lzeljgbudkqpbmbbbsex.supabase.co/storage/v1/object/public/profile-avatars/users/a/avatar.jpg";
  const photoThumb = new URL(showcaseThumbUrl(photo, "webp"));
  assert.equal(photoThumb.origin, "https://lzeljgbudkqpbmbbbsex.supabase.co");
  assert.equal(photoThumb.pathname, "/storage/v1/render/image/public/field-report-images/users/a/original.jpg");
  assert.equal(photoThumb.searchParams.get("width"), String(PILE_PHOTO_WIDTH));
  assert.equal(photoThumb.searchParams.get("height"), String(PILE_PHOTO_WIDTH));
  assert.equal(photoThumb.searchParams.get("resize"), "contain");
  assert.equal(photoThumb.searchParams.get("quality"), "75");
  assert.equal(photoThumb.searchParams.get("format"), "webp");
  const jpegThumb = new URL(showcaseThumbUrl(photo));
  assert.equal(jpegThumb.searchParams.get("resize"), "contain");
  assert.equal(jpegThumb.searchParams.get("format"), null);
  const avatarThumb = new URL(showcaseAvatarUrl(avatar, "webp"));
  assert.equal(avatarThumb.searchParams.get("width"), String(PILE_AVATAR_WIDTH));
  assert.equal(avatarThumb.searchParams.get("height"), String(PILE_AVATAR_WIDTH));
  assert.equal(avatarThumb.searchParams.get("resize"), "cover");
  assert.equal(avatarThumb.searchParams.get("format"), "webp");
  assert.equal(showcaseThumbUrl("https://cdn.example.com/photo.jpg"), "https://cdn.example.com/photo.jpg");
  assert.equal(showcaseAvatarUrl(""), DEFAULT_PRINT_AVATAR);
  assert.equal(showcaseAvatarUrl(DEFAULT_PRINT_AVATAR), DEFAULT_PRINT_AVATAR);
});

function largestCenterGap(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  let gap = 0;
  for (let index = 1; index < sorted.length; index += 1) {
    gap = Math.max(gap, sorted[index] - sorted[index - 1]);
  }
  return gap;
}

test("a nine-print grid uses 5 by 2 on a wide table and 3 by 3 on a phone or tablet", () => {
  assert.deepEqual(scatterGridSize(9, PRINT_SAFE_WIDE), { cols: 5, rows: 2 });
  assert.deepEqual(scatterGridSize(9, PRINT_SAFE), { cols: 3, rows: 3 });
  assert.deepEqual(scatterGridSize(1, PRINT_SAFE), { cols: 1, rows: 1 });
  assert.deepEqual(scatterGridSize(8, PRINT_SAFE_WIDE), { cols: 4, rows: 2 });
});

test("wide and phone scatters stay even across many seeds, with no large empty gap", () => {
  for (let seed = 1; seed <= 30; seed += 1) {
    const wide = scatterPrints(9, seed, PRINT_SAFE_WIDE);
    const phone = scatterPrints(9, seed, PRINT_SAFE);
    const wideX = wide.map((pose) => pose.x);
    const wideY = wide.map((pose) => pose.y);
    const phoneX = phone.map((pose) => pose.x);
    assert.ok(Math.max(...wideX) - Math.min(...wideX) > 60, `wide span seed ${seed}`);
    assert.ok(Math.min(...wideX) <= PRINT_SAFE_WIDE.minX + 12, `wide left seed ${seed}`);
    assert.ok(Math.max(...wideX) >= PRINT_SAFE_WIDE.maxX - 12, `wide right seed ${seed}`);
    assert.ok(Math.min(...wideY) <= PRINT_SAFE_WIDE.minY + 12, `wide top seed ${seed}`);
    assert.ok(Math.max(...wideY) >= PRINT_SAFE_WIDE.maxY - 12, `wide bottom seed ${seed}`);
    assert.ok(largestCenterGap(wideX) < 32, `wide x gap ${largestCenterGap(wideX)} seed ${seed}`);
    assert.ok(largestCenterGap(phoneX) < 28, `phone x gap ${largestCenterGap(phoneX)} seed ${seed}`);
    const low = wideY.filter((y) => y < 50).length;
    const high = wideY.filter((y) => y >= 50).length;
    assert.ok(low >= 3 && high >= 3, `wide rows seed ${seed} ${low} ${high}`);
  }
});

test("rotated phone prints stay at least 8px inside a 375 and 390 table", () => {
  const cases = [
    { tableW: 335, tableH: 335 / 0.86 },
    { tableW: 350, tableH: 350 / 0.86 },
  ];
  const printLong = 13.15 * 16;
  const frameX = 0.42 * 16 * 2;
  const frameTop = 0.42 * 16;
  const frameBottom = 28 * 0.68 + 0.18 * 16;
  const width = printLong + frameX;
  const height = printLong + frameTop + frameBottom;
  for (const table of cases) {
    for (let seed = 1; seed <= 30; seed += 1) {
      for (const pose of scatterPrints(9, seed, PRINT_SAFE)) {
        const { halfW, halfH } = rotatedPrintHalfSize(width, height, pose.rotate);
        const cx = (pose.x / 100) * table.tableW;
        const cy = (pose.y / 100) * table.tableH;
        assert.ok(cx - halfW >= 8 - 0.5, `left ${cx - halfW} seed ${seed}`);
        assert.ok(cx + halfW <= table.tableW - 8 + 0.5, `right ${table.tableW - (cx + halfW)} seed ${seed}`);
        assert.ok(cy - halfH >= 8 - 0.5, `top ${cy - halfH} seed ${seed}`);
        assert.ok(cy + halfH <= table.tableH - 8 + 0.5, `bottom ${table.tableH - (cy + halfH)} seed ${seed}`);
      }
    }
  }
});

test("printSafeForTable keeps a wide rotated print inside 1280, 1440 and 1920 tables", () => {
  const cases = [
    { tableW: 1240, tableH: 577, printLong: 20.5 * 12.80 },
    { tableW: 1360, tableH: 608, printLong: 18.75 * 16 },
    { tableW: 1632, tableH: 608, printLong: 18.75 * 16 },
  ];
  for (const table of cases) {
    const frame = printFrameSize(table.printLong, 36);
    const safe = printSafeForTable(table.tableW, table.tableH, frame.width, frame.height, PRINT_SAFE_WIDE, 8);
    for (let seed = 1; seed <= 30; seed += 1) {
      for (const pose of scatterPrints(9, seed, safe)) {
        const { halfW, halfH } = rotatedPrintHalfSize(frame.width, frame.height, pose.rotate);
        const cx = (pose.x / 100) * table.tableW;
        const cy = (pose.y / 100) * table.tableH;
        assert.ok(cx - halfW >= 8 - 0.5, `left ${cx - halfW} w=${table.tableW} seed ${seed}`);
        assert.ok(cx + halfW <= table.tableW - 8 + 0.5, `right w=${table.tableW} seed ${seed}`);
        assert.ok(cy - halfH >= 8 - 0.5, `top w=${table.tableW} seed ${seed}`);
        assert.ok(cy + halfH <= table.tableH - 8 + 0.5, `bottom w=${table.tableW} seed ${seed}`);
      }
    }
  }
});

test("a tablet scatter uses a 3 by 3 grid and stays 8px inside a 768 table", () => {
  const tableW = 728;
  const tableH = 568;
  const printLong = 0.3 * tableW;
  const frame = printFrameSize(printLong, 36);
  const safe = printSafeForTable(tableW, tableH, frame.width, frame.height, PRINT_SAFE_TABLET, 8);
  assert.equal(scatterGridSize(9, safe).cols, 3);
  assert.equal(scatterGridSize(9, safe).rows, 3);
  for (let seed = 1; seed <= 20; seed += 1) {
    for (const pose of scatterPrints(9, seed, safe)) {
      const { halfW, halfH } = rotatedPrintHalfSize(frame.width, frame.height, pose.rotate);
      const cx = (pose.x / 100) * tableW;
      const cy = (pose.y / 100) * tableH;
      assert.ok(cx - halfW >= 8 - 0.5, `left ${cx - halfW} seed ${seed}`);
      assert.ok(cx + halfW <= tableW - 8 + 0.5, `right seed ${seed}`);
      assert.ok(cy - halfH >= 8 - 0.5, `top seed ${seed}`);
      assert.ok(cy + halfH <= tableH - 8 + 0.5, `bottom seed ${seed}`);
    }
  }
});
