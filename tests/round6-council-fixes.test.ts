import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { homeLead, signupIntro, signupStorageNote } from "../lib/public-copy.ts";
import { imageOfTheWeekName } from "../lib/iotw.ts";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the offer line keeps a single nbsp on paid tier and no forced chain", () => {
  assert.equal(homeLead.includes("through 2027. I plan a paid\u00A0tier."), true);
  assert.equal(homeLead.includes("\u00A0I\u00A0plan"), false);
  assert.equal(homeLead.includes("\u2011"), false);
  assert.equal(signupIntro.includes("paid\u00A0tier."), true);
  const home = read("app/page.tsx");
  assert.equal(home.includes("lg:-ml-2"), false);
  assert.equal(home.includes("mw-home-offer"), true);
  assert.equal(home.includes("mw-public-shell"), true);
});

test("Image of the Week labels never double the word Week", () => {
  assert.equal(imageOfTheWeekName("Week 46"), "Image of the Week 46");
  for (const path of [
    "app/submit/page.tsx",
    "components/images/SubmitImageForm.tsx",
    "components/images/WeeklySubmissionStatus.tsx",
    "app/field-desk/page.tsx",
    "app/guild-hall/page.tsx",
  ]) {
    const source = read(path);
    assert.equal(source.includes("Image of the Week ${"), false, path);
    assert.equal(source.includes("Week Week"), false, path);
  }
});

test("the Field Desk drops Learn tabs, uses one gold CTA, and folds empty Moment of Envy", () => {
  const desk = read("app/field-desk/page.tsx");
  assert.equal(desk.includes("fd-learn"), false);
  assert.equal(desk.includes('href="/courses"'), false);
  assert.equal(desk.includes("fd-hero-cta"), true);
  assert.equal(desk.includes("fd-moe-inline"), true);
  assert.equal(desk.includes("fd-main-grid"), false);
  const weekly = read("components/images/WeeklySubmissionStatus.tsx");
  assert.equal(weekly.includes("File one now"), true);
  assert.equal(weekly.includes("12:00\u00A0PM Mountain"), true);
  assert.equal(weekly.includes("PM\u00A0MT"), false);
});

test("the honor picker is a searchable chip grid", () => {
  const widget = read("components/images/AchievementWidget.tsx");
  assert.equal(widget.includes("mw-honor-chip-grid"), true);
  assert.equal(widget.includes("Search honors"), true);
  assert.equal(widget.includes("Months"), true);
  assert.equal(widget.includes("1 selected"), true);
  const css = read("app/globals.css");
  assert.equal(css.includes("repeat(auto-fill, minmax(200px, 1fr))"), true);
});

test("The Ascent wraps whole ranks instead of clipping Novice", () => {
  const css = read("app/globals.css");
  assert.equal(css.includes("repeat(auto-fit, minmax(140px, 1fr))"), true);
  const board = read("components/hall/AscentBoard.tsx");
  assert.equal(board.includes("RANKS.map"), true);
});

test("the profile nudge still remembers Not now per member", () => {
  const nudge = read("components/ProfileNudge.tsx");
  assert.equal(nudge.includes("mwpg-profile-nudge-dismissed:${userId}"), true);
  assert.equal(nudge.includes("localStorage.setItem(storageKey(userId), \"1\")"), true);
});

test("the mobile menu has a close button, backdrop, Escape, and focus return", () => {
  const header = read("components/HeaderClient.tsx");
  assert.equal(header.includes("mw-nav-panel-close"), true);
  assert.equal(header.includes("mw-nav-backdrop"), true);
  assert.equal(header.includes("Escape"), true);
  assert.equal(header.includes("toggle?.focus()"), true);
  assert.equal(header.includes('["Learn", "/courses"]') || read("lib/nav-menu.ts").includes('["Learn", "/courses"]'), true);
});

test("Helpful story is on the visible Praise the craft row", () => {
  const bar = read("components/images/ReactionBar.tsx");
  assert.match(bar, /Praise the Craft[\s\S]*helpful_story/);
});

test("gear settings placeholder is complete and has no stray colon", () => {
  const form = read("components/images/SubmitImageForm.tsx");
  assert.equal(form.includes("ISO, :"), false);
  assert.equal(form.includes("shutter speed"), true);
  assert.equal(form.includes("tracked"), true);
});

test("member and public gutters match the Forum token", () => {
  const css = read("app/globals.css");
  assert.equal(css.includes("--mw-gutter: clamp(20px, 4.4vw, 56px)"), true);
  assert.equal(css.includes(":focus-visible"), true);
  assert.equal(read("app/field-desk/page.tsx").includes("<main"), false);
  assert.equal(read("app/profile/page.tsx").includes("<main"), false);
});

test("the free-access wording is left unchanged for Aaron", () => {
  assert.match(homeLead, /Free access lasts through 2027/);
  assert.equal(signupStorageNote.includes("January 1, 2027"), false);
  assert.equal(homeLead.includes("accounts created before"), false);
});

test("Aaron's Hall message body is not edited", () => {
  const message = read("components/hall/MessageFromAaron.tsx");
  assert.equal(message.includes("{body}"), true);
  assert.equal(message.includes("Read the whole note"), true);
});
