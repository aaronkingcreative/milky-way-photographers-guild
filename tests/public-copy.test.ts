import assert from "node:assert/strict";
import test from "node:test";
import { EMAIL_DOT_MESSAGE, EMAIL_REQUIRED_MESSAGE, EMAIL_SHAPE_MESSAGE, emailFieldError } from "../lib/email-address.ts";
import { contactLead, courseLibraryUrl, homeFeatures, homeLead, privacySections, rankNameList, resourcesNote, signupIntro, termsSections } from "../lib/public-copy.ts";
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
    messages: [CHECK_EMAIL_MESSAGE, TOO_FAST_MESSAGE, STALE_FORM_MESSAGE, DISPOSABLE_EMAIL_MESSAGE, SIGNUP_REASSURANCE, EMAIL_DOT_MESSAGE, EMAIL_REQUIRED_MESSAGE, EMAIL_SHAPE_MESSAGE, homeLead, signupIntro, contactLead, resourcesNote],
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

test("free join lasts through 2027 and names no price", () => {
  for (const line of [homeLead, signupIntro]) {
    assert.match(line, /Joining is free right now/);
    assert.match(line, /Free access lasts through 2027/);
    assert.match(line, /I plan a paid tier/);
    assert.equal(line.toLowerCase().includes("keep what they have"), false);
    assert.equal(line.includes("$"), false);
  }
  const legal = [...privacySections, ...termsSections].flatMap((section) => section.paragraphs).join(" ");
  assert.match(legal, /1 January 2028 Mountain time/);
  assert.equal(legal.toLowerCase().includes("keep what they have"), false);
  assert.equal(contactLead, "Questions? Email me at");
  assert.match(resourcesNote, /I am still writing these resources/);
  assert.equal(resourcesNote.toLowerCase().includes("december"), false);
  assert.equal(resourcesNote.toLowerCase().includes("placeholder"), false);
  assert.equal(courseLibraryUrl, "https://onlinecourses.photogadventures.com");
  assert.equal(homeLead.includes("\u200B"), false);
  assert.equal(homeLead.includes("photographers"), true);
});

test("the weekly upload cap stays unlimited", () => {
  assert.equal(WEEKLY_SUBMISSION_LIMIT, null);
});
