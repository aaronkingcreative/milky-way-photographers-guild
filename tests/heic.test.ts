import assert from "node:assert/strict";
import test from "node:test";
import { HEIC_HOWTO, HEIC_SELECTED_ERROR, isHeicFile } from "../lib/heic.ts";

test("HEIC detection uses the type or the file name", () => {
  assert.equal(isHeicFile({ type: "image/heic", name: "IMG_1.HEIC" }), true);
  assert.equal(isHeicFile({ type: "image/heif", name: "photo.heif" }), true);
  assert.equal(isHeicFile({ type: "", name: "IMG_2044.heic" }), true);
  assert.equal(isHeicFile({ type: "image/jpeg", name: "night.jpg" }), false);
  assert.equal(isHeicFile({ type: "image/png", name: "night.png" }), false);
});

test("HEIC guidance stays in Aaron's voice and names the JPEG path", () => {
  for (const line of [HEIC_HOWTO, HEIC_SELECTED_ERROR]) {
    assert.equal(line.includes("\u2014"), false, line);
    assert.equal(line.includes(":"), false, line);
    assert.equal(line.toLowerCase().includes("milkywayphotographers.com"), false, line);
    assert.match(line, /JPEG/);
  }
  assert.match(HEIC_HOWTO, /30 MB/);
  assert.match(HEIC_SELECTED_ERROR, /This photo is HEIC/);
});
