import assert from "node:assert/strict";
import test from "node:test";
import { PRINT_SAFE, PRINT_SAFE_WIDE, PRINT_SPREAD_MIN_WIDTH, clampPose, scatterPrints, seedFromKeys } from "../lib/print-pile.ts";
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
  assert.ok(xSpan > 24, String(xSpan));
  assert.ok(ySpan > 20, String(ySpan));
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
  assert.ok(span > 30, String(span));
  for (const pose of poses) {
    assert.ok(pose.x >= PRINT_SAFE_WIDE.minX && pose.x <= PRINT_SAFE_WIDE.maxX, String(pose.x));
    assert.ok(pose.y >= PRINT_SAFE_WIDE.minY && pose.y <= PRINT_SAFE_WIDE.maxY, String(pose.y));
    assert.ok(Math.abs(pose.rotate) <= PRINT_SAFE_WIDE.maxRotate, String(pose.rotate));
  }
  assert.equal(PRINT_SPREAD_MIN_WIDTH, 800);
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
