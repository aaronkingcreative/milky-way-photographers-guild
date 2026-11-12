import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { rankHonorRanges, rankThresholds } from "../lib/achievements.ts";
import { formatMountainDateParts, imageOfTheWeekName, iotwWeekNumber } from "../lib/iotw.ts";

test("Image of the Week names do not repeat the word Week", () => {
  assert.equal(iotwWeekNumber("Week 46"), "46");
  assert.equal(imageOfTheWeekName("Week 46"), "Image of the Week 46");
  assert.equal(imageOfTheWeekName("46"), "Image of the Week 46");
  assert.equal(imageOfTheWeekName(""), "Image of the Week");
  const fieldDesk = readFileSync(new URL("../app/field-desk/page.tsx", import.meta.url), "utf8");
  const winners = readFileSync(new URL("../app/winners/page.tsx", import.meta.url), "utf8");
  const schedule = readFileSync(new URL("../components/iotw/IotwSchedule.tsx", import.meta.url), "utf8");
  for (const [name, source] of [["field-desk", fieldDesk], ["winners", winners], ["schedule", schedule]] as const) {
    assert.equal(source.includes("Image of the Week ${"), false, name);
    assert.equal(source.includes("Image of the Week {"), false, name);
  }
});

test("the rank ladder uses the five stored honor ranges", () => {
  const ranges = rankHonorRanges();
  assert.equal(ranges.length, 5);
  assert.deepEqual(ranges.map((rank) => rank.short), ["Beginner", "Amateur", "Novice", "Veteran", "Master"]);
  assert.equal(ranges[0].honors, "1\u20137");
  assert.equal(ranges[1].honors, "8\u201317");
  assert.equal(ranges[2].honors, "18\u201324");
  assert.equal(ranges[3].honors, "25\u201332");
  assert.equal(ranges[4].honors, "33+");
  assert.equal(rankThresholds[0].min, 1);
  assert.equal(rankThresholds[4].min, 33);
});

test("the winners empty date is computed from a close instant, not hardcoded", () => {
  const parts = formatMountainDateParts("2026-11-15T19:00:00.000Z");
  assert.equal(parts.weekday, "Sunday");
  assert.equal(parts.headline, "Nov 15");
  assert.match(parts.time, /12:00\u00A0PM\u00A0M[DS]T/);
  const source = readFileSync(new URL("../components/winners/WinnersEmpty.tsx", import.meta.url), "utf8");
  assert.equal(source.includes("Nov 15"), false);
  assert.equal(source.includes("November 15"), false);
  assert.equal(source.includes("formatMountainDateParts"), true);
});
