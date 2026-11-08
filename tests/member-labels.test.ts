import assert from "node:assert/strict";
import test from "node:test";
import { countReactionsOnReports, fieldDeskGreeting, honorsToGo, moreHonorsToRank, rankProgressPercent } from "../lib/member-labels.ts";

test("honor labels stay singular only for one", () => {
  assert.equal(honorsToGo(0), "0 honors to go");
  assert.equal(honorsToGo(1), "1 honor to go");
  assert.equal(honorsToGo(2), "2 honors to go");
  assert.equal(moreHonorsToRank(0), "0 more honors to rank up");
  assert.equal(moreHonorsToRank(1), "1 more honor to rank up");
  assert.equal(moreHonorsToRank(2), "2 more honors to rank up");
});

test("reactions received count only the member's own reports", () => {
  const reactions = [
    { image_id: "mine" },
    { image_id: "mine" },
    { image_id: "theirs" },
    { image_id: null },
  ];
  assert.equal(countReactionsOnReports([], reactions), 0);
  assert.equal(countReactionsOnReports(["mine"], reactions), 2);
  assert.equal(countReactionsOnReports(["theirs"], reactions), 1);
  assert.equal(countReactionsOnReports(["missing"], reactions), 0);
});

test("a member with zero honors has an empty progress fill", () => {
  assert.equal(rankProgressPercent(0, 1, true), 0);
  assert.equal(rankProgressPercent(0, 7, true), 0);
  assert.ok(rankProgressPercent(1, 6, true) > 0);
  assert.ok(rankProgressPercent(1, 6, true) < 100);
  assert.equal(rankProgressPercent(33, 0, false), 100);
});

test("the field desk greeting keeps the name and enough words to wrap", () => {
  for (const name of ["Jo", "MaoMao", "Christopher Williamson"]) {
    const greeting = fieldDeskGreeting(name);
    assert.equal(greeting.includes(name), true);
    assert.ok(greeting.split(/\s+/).length >= 5, greeting);
    assert.equal(greeting.endsWith("welcome back to the field."), true);
  }
  assert.equal(fieldDeskGreeting("  "), "Guild member, welcome back to the field.");
});
