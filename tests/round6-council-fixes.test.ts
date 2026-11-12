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

test("the home hero stacks below 1100px and balances the headline on a phone", () => {
  const css = read("app/globals.css");
  assert.equal(css.includes("@media (min-width: 1024px) {\n  .mw-home-hero-grid"), false);
  assert.equal(css.includes("@media (min-width: 1100px) {\n  .mw-home-hero-grid"), true);
  assert.match(css, /\.mw-home-headline \{[\s\S]*text-wrap: balance;/);
  assert.match(css, /@media \(max-width: 480px\) \{[\s\S]*\.mw-home-headline \{ font-size: 46px; \}/);
  const home = read("app/page.tsx");
  assert.equal(home.includes("<KeepTail text={homeHeadline} />"), false);
  assert.equal(home.includes("{homeHeadline}"), true);
});

test("the public rank ladder is five equal columns from 640px so Master is not alone at 1024", () => {
  const css = read("app/globals.css");
  assert.equal(css.includes("repeat(5, minmax(0, 1fr))"), true);
  assert.equal(css.includes("repeat(auto-fit, minmax(120px, 1fr))"), false);
});

test("the desktop nav can wrap instead of clipping Learn on the Hall", () => {
  const css = read("app/globals.css");
  assert.match(css, /@media \(min-width: 1281px\) \{[\s\S]*\.mw-primary-nav \{[\s\S]*min-width: 0;[\s\S]*flex-wrap: wrap;/);
  assert.equal(read("lib/nav-menu.ts").includes('["Learn", "/courses"]'), true);
});

test("the header inner uses the public shell, which widens to 1440 from 1600px", () => {
  const css = read("app/globals.css");
  assert.match(css, /@media \(min-width: 1600px\) \{[\s\S]*--mw-public-max: 1440px;/);
  assert.match(css, /\.mw-app-header \.mw-header-nav \{[\s\S]*max-width: var\(--mw-public-max\);[\s\S]*padding-inline: var\(--mw-gutter\);/);
  assert.match(css, /@media \(min-width: 1600px\) \{[\s\S]*\.mw-showcase \{[\s\S]*max-width: 1600px/);
  assert.equal(read("components/HeaderClient.tsx").includes("max-w-[1680px]"), false);
});

test("the rank ladder uses a consistent left rule and a one-column list below 640px", () => {
  const css = read("app/globals.css");
  assert.equal(css.includes("border-left: 1px solid rgba(232, 159, 43, .35)"), true);
  assert.match(css, /@media \(max-width: 639px\) \{[\s\S]*min-height: 36px;/);
});

test("Inside the Guild keeps one gold Join button and a text link for the other", () => {
  const home = read("app/page.tsx");
  assert.equal(home.includes("mw-text-link"), true);
  assert.equal((home.match(/Join the Guild free/g) || []).length, 3);
  assert.equal((home.match(/btn btn-primary/g) || []).length, 2);
});

test("legal pages use the shell gutter and date nbsp, without three-word KeepTail chains", () => {
  const legal = read("components/LegalDocument.tsx");
  assert.equal(legal.includes("mw-legal-shell"), true);
  assert.equal(legal.includes("<KeepTail text={paragraph} />"), false);
  const copy = read("lib/public-copy.ts");
  assert.equal(copy.includes("1\u00A0January\u00A02027"), true);
  assert.equal(copy.includes("1\u00A0January\u00A02028"), true);
});

test("signup helper text is Mulish 15px, and the login copy panel can shrink", () => {
  const css = read("app/globals.css");
  assert.match(css, /\.mw-auth-helper \{[\s\S]*font-size: 15px;[\s\S]*line-height: 1\.5;/);
  assert.match(css, /\.mw-join--login \.mw-join-copy \{[\s\S]*width: fit-content;[\s\S]*max-width: 34rem;/);
  assert.equal(read("components/AuthForm.tsx").includes("mw-auth-helper"), true);
  assert.equal(read("app/login/page.tsx").includes("fitCopy"), true);
  assert.equal(read("components/auth/AuthShell.tsx").includes("mw-join-credit-slot"), true);
});

test("More from Aaron uses a two-column grid with Photog Adventures spanning both", () => {
  const css = read("app/globals.css");
  assert.match(css, /\.mw-more-aaron-actions \{[\s\S]*grid-template-columns: 1fr 1fr;[\s\S]*gap: 12px;/);
  assert.equal(read("app/page.tsx").includes("mw-more-aaron-wide"), true);
});

test("feature numbers sit in a fixed 28px tabular column", () => {
  const css = read("app/globals.css");
  assert.equal(css.includes("grid-template-columns: 28px 1fr"), true);
  assert.equal(css.includes("font-variant-numeric: tabular-nums"), true);
});
