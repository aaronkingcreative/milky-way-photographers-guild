import assert from "node:assert/strict";
import test from "node:test";
import { PRINT_SAFE, clampPose, scatterPrints, seedFromKeys } from "../lib/print-pile.ts";

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

test("a dragged print is clamped back onto the table", () => {
  const pose = clampPose({ x: -20, y: 140, rotate: 40 });
  assert.equal(pose.x, PRINT_SAFE.minX);
  assert.equal(pose.y, PRINT_SAFE.maxY);
  assert.equal(pose.rotate, PRINT_SAFE.maxRotate);
});

test("one print sits in the middle of the table", () => {
  const [pose] = scatterPrints(1, 1);
  assert.equal(pose.x, 50);
  assert.equal(pose.y, 50);
  assert.equal(scatterPrints(0, 1).length, 0);
});
