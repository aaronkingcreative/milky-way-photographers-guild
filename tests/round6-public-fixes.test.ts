import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { keepLastTwo } from "../lib/keep-last-two.ts";
import { homeFeatures } from "../lib/public-copy.ts";

const bodies = Object.fromEntries(homeFeatures.map((item) => [item.title, item.body]));

test("keepLastTwo holds the last two words so gone better, the Ascent, and your rank stay together", () => {
  const fieldReports = bodies["Field reports"];
  const fieldHonors = bodies["Field Honors"];
  const feedback = bodies["Feedback"];
  assert.equal(keepLastTwo(fieldReports).endsWith("gone\u00A0better."), true);
  assert.equal(keepLastTwo(fieldHonors).endsWith("the\u00A0Ascent."), true);
  assert.equal(keepLastTwo(feedback).endsWith("your\u00A0rank."), true);
  for (const body of [fieldReports, fieldHonors, feedback]) {
    assert.equal(keepLastTwo(body).replaceAll("\u00A0", " "), body);
    assert.equal(body.includes("\u00A0"), false);
  }
  assert.equal(keepLastTwo("change your rank.").endsWith("your\u00A0rank."), true);
});

test("the home page applies that hold on every Inside the Guild feature body", () => {
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.equal(page.includes("{keepLastTwo(item.body)}"), true);
  assert.equal(page.includes("{item.body}"), false);
});

test("signup uses the same public overflow clip as home, and the map and place bars can shrink", () => {
  const signup = readFileSync(new URL("../app/signup/page.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.equal(signup.includes('className="mw-public"'), true);
  assert.match(css, /main \{[^}]*overflow-x:\s*clip/);
  assert.match(css, /\.mw-stats-map-art \{[^}]*overflow:\s*hidden/);
  assert.match(css, /\.mw-stats,\s*\n\s*\.mw-stats-places,\s*\n\s*\.mw-stats-map-art,\s*\n\s*\.mw-stats-bars \{[^}]*min-width:\s*0/);
  assert.match(css, /\.mw-stats-bars li \{[^}]*minmax\(0,\s*auto\)[^}]*max-content/);
});

test("the sticky header only captures pointers on its own content, and prints keep a scroll margin", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.mw-app-header \{[^}]*pointer-events:\s*none/);
  assert.match(css, /\.mw-app-header > \* \{[^}]*pointer-events:\s*auto/);
  assert.match(css, /\.mw-print \{[^}]*scroll-margin-top:\s*calc\(var\(--mw-header-h\) \+ 8px\)/);
});
