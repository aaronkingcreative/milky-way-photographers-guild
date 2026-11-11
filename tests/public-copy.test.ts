import assert from "node:assert/strict";
import test from "node:test";
import { EMAIL_DOT_MESSAGE, EMAIL_REQUIRED_MESSAGE, EMAIL_SHAPE_MESSAGE, emailFieldError } from "../lib/email-address.ts";
import { readFileSync } from "node:fs";
import { contactLead, courseLibraryUrl, fieldHonorsPublicLine, hidePhotosHelp, hidePhotosTitle, homeFeatures, homeLead, momentOfEnvyCopy, nextPrintLabel, pileLead, previousPrintLabel, privacySections, publicPhotoChoiceCopy, putPrintBackLabel, rankNameList, resourcesNote, shufflePileLabel, signupIntro, termsSections } from "../lib/public-copy.ts";
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
    messages: [CHECK_EMAIL_MESSAGE, TOO_FAST_MESSAGE, STALE_FORM_MESSAGE, DISPOSABLE_EMAIL_MESSAGE, SIGNUP_REASSURANCE, EMAIL_DOT_MESSAGE, EMAIL_REQUIRED_MESSAGE, EMAIL_SHAPE_MESSAGE, homeLead, signupIntro, contactLead, resourcesNote, fieldHonorsPublicLine, publicPhotoChoiceCopy, hidePhotosTitle, hidePhotosHelp, pileLead, shufflePileLabel, putPrintBackLabel, nextPrintLabel, previousPrintLabel],
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

test("monday moment of envy uses one first-person definition", () => {
  const card = homeFeatures.find((item) => item.title === "Monday Moment of Envy");
  assert.equal(card?.body, momentOfEnvyCopy);
  assert.equal(termsSections.flatMap((section) => section.paragraphs).includes(momentOfEnvyCopy), true);
  assert.match(momentOfEnvyCopy, /I celebrate the vote winner and my Photog Phavorite, and sometimes the runner-up/);
  assert.equal(momentOfEnvyCopy.toLowerCase().includes("outside the top 3"), false);
  assert.equal(momentOfEnvyCopy.toLowerCase().includes("personal pick"), false);
  assert.equal(momentOfEnvyCopy.includes("\u2014"), false);
  assert.equal(momentOfEnvyCopy.includes(":"), false);
  for (const file of ["app/field-desk/page.tsx", "app/winners/page.tsx", "app/page.tsx"]) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.equal(source.toLowerCase().includes("outside the top 3"), false, file);
    assert.equal(source.toLowerCase().includes("personal pick"), false, file);
    assert.equal(source.includes("photo<wbr"), false, file);
    assert.equal(source.includes("<wbr"), false, file);
  }
  assert.equal(readFileSync(new URL("../app/field-desk/page.tsx", import.meta.url), "utf8").includes("momentOfEnvyCopy"), true);
  assert.equal(readFileSync(new URL("../app/winners/page.tsx", import.meta.url), "utf8").includes("momentOfEnvyCopy"), true);
  assert.equal(readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8").includes("mw-unbreakable"), true);
});

test("terms and privacy share one hide line for the public photo strip", () => {
  const privacy = privacySections.flatMap((section) => section.paragraphs);
  const terms = termsSections.flatMap((section) => section.paragraphs);
  assert.equal(privacy.includes(publicPhotoChoiceCopy), true);
  assert.equal(terms.includes(publicPhotoChoiceCopy), true);
  assert.match(publicPhotoChoiceCopy, /without your name/);
  assert.match(publicPhotoChoiceCopy, /turn that off in settings/);
  assert.match(publicPhotoChoiceCopy, /I remove any photo on request/);
  assert.equal(hidePhotosTitle, "Hide my photos from the public Guild page");
  assert.match(hidePhotosHelp, /Turn this on to keep yours off/);
  assert.equal(shufflePileLabel, "Shuffle the pile");
  assert.equal(putPrintBackLabel, "Put it back");
  assert.match(pileLead, /Drag the prints around the table/);

  assert.equal(fieldHonorsPublicLine.endsWith("real\u00A0adventures."), true);
  assert.equal(fieldHonorsPublicLine.includes("\u2014"), false);
  assert.equal(fieldHonorsPublicLine.includes(":"), false);
  const showcase = readFileSync(new URL("../components/PublicShowcase.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.equal(showcase.includes("mw-showcase-honors"), true);
  assert.match(css, /\.mw-public \.mw-showcase-honors \{[^}]*text-wrap:\s*balance/);
  assert.equal(showcase.toLowerCase().includes("display_name"), false);
  assert.equal(showcase.toLowerCase().includes("milkywayphotographers.com"), false);
});
