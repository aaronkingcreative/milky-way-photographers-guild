import test from "node:test";
import assert from "node:assert/strict";
import { FORUM_CATEGORIES, forumCategory, forumPageForIndex, forumPostHref, parseForumBody } from "../lib/forum.ts";

test("forum bodies become paragraphs, line breaks and safe links only", () => {
  const out = parseForumBody("First line\nsecond line\n\nSee https://example.com/a?b=1, then <b>bold</b>.");
  assert.equal(out.length, 2);
  assert.deepEqual(out[0], [{ type: "text", value: "First line" }, { type: "br" }, { type: "text", value: "second line" }]);
  assert.deepEqual(out[1][1], { type: "link", value: "https://example.com/a?b=1", href: "https://example.com/a?b=1" });
  assert.equal(out[1].filter((p) => p.type === "text").map((p: any) => p.value).join(""), "See , then <b>bold</b>.");
  assert.equal(parseForumBody("javascript:alert(1)").flat().some((p) => p.type === "link"), false);
});

test("forum categories and quote links land on the right page", () => {
  assert.deepEqual(FORUM_CATEGORIES.map((c) => c.label), ["Gear", "Techniques", "Locations", "Trips and Meetups", "Critique", "General"]);
  assert.equal(forumCategory("nope"), null);
  assert.equal(forumPageForIndex(0), 1);
  assert.equal(forumPageForIndex(24), 1);
  assert.equal(forumPageForIndex(25), 2);
  assert.equal(forumPostHref("t", "p", 30), "/forum/t/t?page=2#post-p");
  assert.equal(forumPostHref("t", "p", 3), "/forum/t/t#post-p");
});

test("forum copy has no em dashes or colons in member-facing blurbs", () => {
  for (const c of FORUM_CATEGORIES) {
    assert.equal(/[\u2014:]/.test(c.blurb), false, c.slug);
  }
});
