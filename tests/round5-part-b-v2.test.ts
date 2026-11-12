import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { rankHonorRanges, rankThresholds } from "../lib/achievements.ts";
import { keepLastTwo } from "../lib/keep-last-two.ts";
import { formatMountainDateParts, formatMountainShort, getIotwSchedule, imageOfTheWeekName, iotwWeekNumber } from "../lib/iotw.ts";

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
  assert.equal(parts.headline, "Nov\u00A015");
  assert.match(parts.time, /12:00\u00A0PM\u00A0M[DS]T/);
  const source = readFileSync(new URL("../components/winners/WinnersEmpty.tsx", import.meta.url), "utf8");
  assert.equal(source.includes("Nov 15"), false);
  assert.equal(source.includes("November 15"), false);
  assert.equal(source.includes("formatMountainDateParts"), true);
});

const week45 = {
  id: "ec721635-8180-48bf-b5e9-6c0688cd2de8",
  contest_week: 45,
  contest_year: 2026,
  status: "voting_open",
  period_start: "2026-11-08T19:00:00.000Z",
  period_end: "2026-11-15T19:00:00.000Z",
  submission_cutoff: "2026-11-08T19:00:00.000Z",
  voting_opens_at: "2026-11-08T19:00:00.000Z",
  voting_closes_at: "2026-11-15T19:00:00.000Z",
};
const week46 = {
  id: "39bea3ba-b9bc-4770-b9cb-1cbe9fec4787",
  contest_week: 46,
  contest_year: 2026,
  status: "upcoming",
  period_start: "2026-11-15T19:00:00.000Z",
  period_end: "2026-11-22T19:00:00.000Z",
  submission_cutoff: "2026-11-15T19:00:00.000Z",
  voting_opens_at: "2026-11-15T19:00:00.000Z",
  voting_closes_at: "2026-11-22T19:00:00.000Z",
};
function mockSchedule(rows: unknown[]) {
  return {
    rpc: async (name: string) => name === "iotw_schedule_ballots" ? { data: rows, error: null } : { data: null, error: "unknown" },
  };
}

test("getIotwSchedule reads the open voting ballot from the database, not the computed entry week", async () => {
  const schedule = await getIotwSchedule(mockSchedule([week45, week46]), new Date("2026-11-12T02:00:00.000Z"));
  assert.equal(schedule.voting?.contest_week, 45);
  assert.equal(schedule.voting?.status, "voting_open");
  assert.equal(schedule.voting?.voting_closes_at, "2026-11-15T19:00:00.000Z");
  assert.equal(imageOfTheWeekName(schedule.voting?.label), "Image of the Week 45");
  assert.equal(schedule.entry.contest_week, 46);
});

test("getIotwSchedule rolls to the next ballot after the close", async () => {
  const justBefore = await getIotwSchedule(mockSchedule([week45, week46]), new Date("2026-11-15T18:59:59.000Z"));
  assert.equal(justBefore.voting?.contest_week, 45);
  const atClose = await getIotwSchedule(mockSchedule([{ ...week45, status: "voting_closed" }, week46]), new Date("2026-11-15T19:00:00.000Z"));
  assert.equal(atClose.voting?.contest_week, 46);
  assert.equal(atClose.voting?.voting_closes_at, "2026-11-22T19:00:00.000Z");
  const advanced = await getIotwSchedule(mockSchedule([{ ...week46, status: "voting_open" }]), new Date("2026-11-16T00:00:00.000Z"));
  assert.equal(advanced.voting?.contest_week, 46);
  assert.equal(advanced.voting?.voting_closes_at, "2026-11-22T19:00:00.000Z");
});

test("keepLastTwo holds the last pair with a NBSP and does not force a longer group", () => {
  assert.equal(keepLastTwo("Guild member, welcome back to the field.").endsWith("the\u00A0field."), true);
  assert.equal(keepLastTwo("Guild member, welcome back to the field.").includes("welcome\u00A0back"), false);
});

test("Mountain date helpers keep the month and day on one line", () => {
  const short = formatMountainShort("2026-11-15T19:00:00.000Z");
  assert.match(short, /Nov\u00A015/);
  assert.equal(short.includes("Nov 15"), false);
  const parts = formatMountainDateParts("2026-11-15T19:00:00.000Z");
  assert.equal(parts.headline, "Nov\u00A015");
});
