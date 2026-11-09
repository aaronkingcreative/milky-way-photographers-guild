import assert from "node:assert/strict";
import test from "node:test";
import { countsAsFieldHonor, fieldDeskHonorBadges, fieldDeskHonorCatalog } from "../lib/member-labels.ts";
import { navPointerShouldClose } from "../lib/nav-menu.ts";
import { formatMountainShort, getIotwPeriod, voteLockConfirmation } from "../lib/iotw.ts";

test("field honor badges follow awarded honors, not a hardcoded gold pair", () => {
  const catalog = fieldDeskHonorCatalog();
  assert.equal(catalog.some((item) => item.name === "First Light"), false);
  assert.equal(catalog.some((item) => item.name === "Helpful Eye"), false);
  const none = fieldDeskHonorBadges([], catalog);
  assert.equal(none.length > 0, true);
  assert.equal(none.some((badge) => badge.earned), false);
  const earned = [{ id: "monthly_january", name: "January Milky Way", glyph: "☾" }];
  const some = fieldDeskHonorBadges(earned, catalog);
  assert.equal(some.filter((badge) => badge.earned).map((badge) => badge.id).join(","), "monthly_january");
  assert.equal(some.filter((badge) => badge.id === "monthly_january").length, 1);
  assert.equal(countsAsFieldHonor("rank_beginner", true), false);
  assert.equal(countsAsFieldHonor("monthly_january", false), false);
  assert.equal(countsAsFieldHonor("monthly_january", undefined), true);
  assert.equal(countsAsFieldHonor("monthly_january", null), true);
});

test("a pointer on the menu button or panel does not count as outside", () => {
  const toggle = {};
  const panel = {};
  const link = {};
  const outside = {};
  assert.equal(navPointerShouldClose([link, panel], toggle, panel), false);
  assert.equal(navPointerShouldClose([toggle], toggle, panel), false);
  assert.equal(navPointerShouldClose([outside], toggle, panel), true);
  assert.equal(navPointerShouldClose([], toggle, panel), false);
});

test("vote confirmation names the real Mountain deadline", () => {
  const period = getIotwPeriod(new Date("2026-11-09T18:00:00Z"));
  const when = formatMountainShort(period.voting_closes_at);
  const text = voteLockConfirmation(3, period.voting_closes_at);
  assert.equal(text, `Your Top 3 is locked in. You can change it until ${when}.`);
  assert.match(when, /Sun, Nov 15, 12:00 PM MST/);
  assert.match(formatMountainShort("2026-07-12T18:00:00.000Z"), /MDT/);
  assert.match(formatMountainShort("2026-01-11T19:00:00.000Z"), /MST/);
  assert.equal(voteLockConfirmation(2, period.voting_closes_at).startsWith("Your Top 2 is locked in."), true);
  assert.equal(text.includes("\u2014"), false);
});
