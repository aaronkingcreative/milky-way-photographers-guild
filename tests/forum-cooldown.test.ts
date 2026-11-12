import test from "node:test";
import assert from "node:assert/strict";
import { FORUM_COOLDOWN_ERROR, forumCooldownLeft, forumCooldownMessage, isForumCooldownError, secondsUntil } from "../lib/forum-cooldown.ts";
import { forumErrorMessage } from "../lib/forum.ts";

test("the cooldown error from the database is recognised after the friendly mapping", () => {
  // The exact text raised by forum_assert_cooldown in the guild_forum migration.
  const mapped = forumErrorMessage({ message: "Give it a few seconds before posting again." });
  assert.equal(mapped, FORUM_COOLDOWN_ERROR);
  assert.equal(isForumCooldownError(mapped), true);
  assert.equal(isForumCooldownError("Something went wrong. Please try again."), false);
});

test("seconds left come from the last post and stay between 1 and 20", () => {
  const now = Date.parse("2026-11-12T03:40:00Z");
  assert.equal(forumCooldownLeft("2026-11-12T03:39:53Z", now), 13);
  assert.equal(forumCooldownLeft("2026-11-12T03:39:59.5Z", now), 20);
  assert.equal(forumCooldownLeft("2026-11-12T03:39:30Z", now), 1);
  assert.equal(forumCooldownLeft(null, now), 20);
  assert.equal(forumCooldownLeft("not a date", now), 20);
});

test("the countdown reaches zero and then clears", () => {
  const start = 1_000_000;
  const deadline = start + 13_000;
  assert.equal(secondsUntil(deadline, start), 13);
  assert.equal(secondsUntil(deadline, start + 12_100), 1);
  assert.equal(secondsUntil(deadline, start + 13_000), 0);
  assert.equal(secondsUntil(deadline, start + 27_000), 0);
  assert.equal(secondsUntil(null, start), 0);
});

test("the countdown line names the seconds, with no colons or em dashes and no orphan", () => {
  assert.equal(forumCooldownMessage(13), "Give it 13\u00A0more seconds before posting again.");
  assert.equal(forumCooldownMessage(1), "Give it 1\u00A0more second before posting again.");
  assert.equal(/[\u2014:]/.test(forumCooldownMessage(5)), false);
});
