import assert from "node:assert/strict";
import test from "node:test";
import { EMAIL_DOT_MESSAGE, EMAIL_REQUIRED_MESSAGE, EMAIL_SHAPE_MESSAGE, emailFieldError } from "../lib/email-address.ts";
import { homeFeatures, privacySections, rankNameList, termsSections } from "../lib/public-copy.ts";
import { RANKS } from "../lib/ranks.ts";
import { CHECK_EMAIL_MESSAGE, DISPOSABLE_EMAIL_MESSAGE, SIGNUP_REASSURANCE, STALE_FORM_MESSAGE, TOO_FAST_MESSAGE } from "../lib/signup-messages.ts";
import { WEEKLY_SUBMISSION_LIMIT } from "../lib/images.ts";

function stringsOf(value: unknown, found: string[] = []) {
  if (typeof value === "string") found.push(value);
  else if (Array.isArray(value)) value.forEach((item) => stringsOf(item, found));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => stringsOf(item, found));
  return found;
}

test("new customer copy has no em dash, colon, or the retired domain", () => {
  const copy = stringsOf({
    homeFeatures,
    privacySections,
    termsSections,
    rankNameList,
    messages: [CHECK_EMAIL_MESSAGE, TOO_FAST_MESSAGE, STALE_FORM_MESSAGE, DISPOSABLE_EMAIL_MESSAGE, SIGNUP_REASSURANCE, EMAIL_DOT_MESSAGE, EMAIL_REQUIRED_MESSAGE, EMAIL_SHAPE_MESSAGE],
  });
  for (const line of copy) {
    assert.equal(line.includes("\u2014"), false, line);
    assert.equal(line.includes(":"), false, line);
    assert.equal(line.toLowerCase().includes("milkywayphotographers.com"), false, line);
  }
});

test("rank names on the home page match the Ascent ladder", () => {
  const rankCard = homeFeatures.find((item) => item.title === "Ranks");
  assert.ok(rankCard);
  for (const rank of RANKS) assert.equal(rankCard.body.includes(rank.label), true, rank.label);
  assert.equal(rankCard.body.includes("Master Milky Way Photographer to"), false);
  assert.match(rankNameList, /Unranked, Beginner, Amateur, Novice, Veteran and Master/);
});

test("email blur rules require a dotted domain", () => {
  assert.equal(emailFieldError(""), EMAIL_REQUIRED_MESSAGE);
  assert.equal(emailFieldError("ada"), EMAIL_SHAPE_MESSAGE);
  assert.equal(emailFieldError("ada@nodot"), EMAIL_DOT_MESSAGE);
  assert.equal(emailFieldError("ada@mail."), EMAIL_DOT_MESSAGE);
  assert.equal(emailFieldError("ada@mail.com"), null);
  assert.equal(emailFieldError(" ada@mail.co.uk "), null);
});

test("the weekly upload cap stays unlimited", () => {
  assert.equal(WEEKLY_SUBMISSION_LIMIT, null);
});
