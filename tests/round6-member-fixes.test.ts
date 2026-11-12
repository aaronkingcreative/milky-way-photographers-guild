import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { formatMountainDeadline, imageOfTheWeekName } from "../lib/iotw.ts";

test("the profile nudge is a bottom-corner toast outside the sticky header", () => {
  const header = readFileSync(new URL("../components/HeaderClient.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const nudgeOpen = header.indexOf("<ProfileNudge");
  const headerOpen = header.indexOf('<header className="mw-app-header">');
  const headerClose = header.indexOf("</header>");
  assert.equal(nudgeOpen > headerClose, true);
  assert.equal(nudgeOpen > headerOpen, true);
  assert.match(css, /\.mw-profile-nudge \{[^}]*position:\s*fixed/);
  assert.match(css, /\.mw-profile-nudge \{[^}]*bottom:\s*22px/);
  assert.match(css, /\.mw-profile-nudge \{[^}]*top:\s*auto/);
});

test("the profile page does not nest a second main landmark", () => {
  const page = readFileSync(new URL("../app/profile/page.tsx", import.meta.url), "utf8");
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  assert.equal(layout.includes("<main>{children}</main>"), true);
  assert.equal(page.includes("<main"), false);
  assert.equal(page.includes("mw-page-wide profile-settings-page"), true);
});

test("the winners empty state is compact and uses the live ballot close, not a hardcoded date", () => {
  const source = readFileSync(new URL("../components/winners/WinnersEmpty.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.equal(source.includes("No winners crowned yet"), true);
  assert.equal(source.includes("formatMountainDeadline"), true);
  assert.equal(source.includes("imageOfTheWeekName"), true);
  assert.equal(source.includes("Nov 15"), false);
  assert.equal(source.includes("November 15"), false);
  assert.equal(source.includes("mw-winners-empty-frame"), false);
  assert.equal(source.includes("The throne is waiting"), false);
  assert.equal(/min-height:\s*22rem/.test(css), false);
  const close = formatMountainDeadline("2026-11-15T19:00:00.000Z");
  assert.match(close, /Sunday/);
  assert.match(close, /Nov\u00A015/);
  assert.match(close, /12:00\u00A0PM\u00A0M[DS]T/);
  assert.equal(imageOfTheWeekName("Week 45"), "Image of the Week 45");
});

test("the submit page constrains the subtitle and notice so it cannot scroll sideways", () => {
  const page = readFileSync(new URL("../app/submit/page.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.equal(page.includes("mw-submit-page"), true);
  assert.match(css, /\.mw-submit-page \{[^}]*min-width:\s*0/);
  assert.match(css, /\.mw-submit-page \.mw-submit-notice \{[^}]*max-width:\s*100%/);
});
