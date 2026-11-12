import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FORUM_CATEGORIES, FORUM_REQUEST_QUESTION, forumCategoryIsPrivate, forumFirstWords, forumNextRank, forumRankTier } from "../lib/forum.ts";

test("categories run in Aaron's order with his copy, and only Trips and Meetups is private", () => {
  assert.deepEqual(FORUM_CATEGORIES.map((c) => c.slug), ["general", "locations", "techniques", "gear", "trips"]);
  assert.equal(FORUM_CATEGORIES.find((c) => c.slug === "locations")!.blurb, "Share and discuss\u00A0locations.");
  assert.equal(FORUM_CATEGORIES.find((c) => c.slug === "techniques")!.blurb, "Share your tips and\u00A0techniques.");
  assert.equal(FORUM_CATEGORIES.find((c) => c.slug === "gear")!.blurb, "A place to share and talk about your\u00A0gear.");
  assert.deepEqual(FORUM_CATEGORIES.filter((c) => c.private).map((c) => c.slug), ["trips"]);
  assert.equal(forumCategoryIsPrivate("trips"), true);
  assert.equal(forumCategoryIsPrivate("critique"), false);
});

test("member-facing forum copy has no em dashes or colons and keeps the last two words together", () => {
  for (const c of FORUM_CATEGORIES) {
    assert.equal(/[\u2014:]/.test(c.blurb), false, c.slug);
    assert.match(c.blurb, /\u00A0\S+$/, c.slug);
  }
  assert.equal(/[\u2014:]/.test(FORUM_REQUEST_QUESTION), false);
});

test("rank tiers follow the Field Honor thresholds", () => {
  assert.equal(forumRankTier("Master"), "master");
  assert.equal(forumRankTier("Unranked"), "unranked");
  assert.deepEqual(forumNextRank(0), { label: "Beginner", needed: 1 });
  assert.deepEqual(forumNextRank(7), { label: "Amateur", needed: 1 });
  assert.deepEqual(forumNextRank(17), { label: "Novice", needed: 1 });
  assert.deepEqual(forumNextRank(24), { label: "Veteran", needed: 1 });
  assert.deepEqual(forumNextRank(32), { label: "Master", needed: 1 });
  assert.equal(forumNextRank(33), null);
});

test("previews show the first words of a post", () => {
  assert.equal(forumFirstWords("one two three", 12), "one two three");
  assert.equal(forumFirstWords("a b c d e f g h i j k l m n", 12), "a b c d e f g h i j k l\u2026");
  assert.equal(forumFirstWords("  spaced\n\nout   words, here. and more", 3), "spaced out words\u2026");
});

test("the trips migration hashes codes, limits tries and gates posts with RLS", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261112041649_forum_v2_private_trips.sql", import.meta.url), "utf8");
  const cleanup = readFileSync(new URL("../supabase/migrations/20261112041752_forum_v2_advisor_cleanup.sql", import.meta.url), "utf8");
  assert.match(sql, /crypt\(code_clean, gen_salt\('bf'/);
  assert.match(sql, /interval '10 minutes'\) >= 5/);
  assert.doesNotMatch(sql, /grant select on public\.forum_trip_codes/);
  assert.match(sql, /update public\.forum_threads set category = 'general' where category = 'critique'/);
  assert.match(cleanup, /forum_private\.can_read_thread\(thread_id\)/);
});
