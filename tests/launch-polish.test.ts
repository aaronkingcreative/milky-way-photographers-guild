import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("member pages are back in the wide format", () => {
  const css = read("app/globals.css");
  assert.match(css, /--mw-member-max: 1760px;/);
  const last = css.lastIndexOf("--mw-member-max:");
  assert.equal(css.slice(last).startsWith("--mw-member-max: 1760px;"), true);
});

test("the signed-in header uses the wide column and keeps every link on one row from 1280", () => {
  const css = read("app/globals.css");
  assert.match(css, /\.mw-app-header \.mw-header-nav\.mw-header-nav--member \{[\s\S]*max-width: var\(--mw-member-max\);/);
  assert.match(css, /@media \(min-width: 1280px\) \{\s*\.mw-header-nav--member \.mw-primary-nav \{[\s\S]*flex-wrap: nowrap;/);
  assert.match(read("components/HeaderClient.tsx"), /mw-header-nav--member/);
});

test("profile pictures enlarge on hover and never open a full-screen viewer", () => {
  const profile = read("app/members/[memberId]/page.tsx");
  assert.equal(profile.includes("ImageViewer"), false);
  assert.match(profile, /mw-member-profile-avatar" data-avatar-hover/);
  assert.match(read("app/layout.tsx"), /<AvatarHoverLayer \/>/);
  const layer = read("components/AvatarHoverLayer.tsx");
  assert.match(layer, /rect\.width \* 3/);
  assert.match(layer, /createPortal/);
});

test("the Ascent shows every climber with no +N, and honors ring only the enlarged portrait", () => {
  const board = read("components/hall/AscentBoard.tsx");
  const face = read("components/hall/AscentFace.tsx");
  assert.equal(/\+\{/.test(board) || /\+\{/.test(face), false);
  assert.equal(face.includes("mw-ascent-cloud"), false);
  assert.match(face, /data-avatar-hover-honors/);
});
