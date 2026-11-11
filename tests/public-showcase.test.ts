import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { SHOWCASE_MAX, SHOWCASE_MIN, fillCaptureYears, parsePublicCounts, parseShowcasePhotos, peakCaptureYears } from "../lib/public-showcase.ts";

function photo(index: number, extra: Record<string, unknown> = {}) {
  return {
    image_url: `https://cdn.example.com/photos/${index}.jpg`,
    avatar_url: `https://cdn.example.com/avatars/${index}.jpg`,
    ...extra,
  };
}

test("counts accept only the three public numbers", () => {
  assert.deepEqual(parsePublicCounts({ comments: 4, pics: 9, honors: 2, display_name: "Ada" }), { comments: 4, pics: 9, honors: 2 });
  assert.deepEqual(parsePublicCounts({ comments: "12", pics: "0", honors: "3" }), { comments: 12, pics: 0, honors: 3 });
  assert.equal(parsePublicCounts({ comments: 1, pics: 1 }), null);
  assert.equal(parsePublicCounts({ comments: -1, pics: 1, honors: 1 }), null);
  assert.equal(parsePublicCounts(null), null);
});

test("counts keep valid extras and drop names or unknown fields", () => {
  const parsed = parsePublicCounts({
    comments: 43,
    pics: 123,
    honors: 149,
    members: 40,
    reactions: 158,
    regions: 21,
    countries: 5,
    week_pics: 16,
    honor_categories: [{ key: "foreground", n: 58, owner: "Ada" }, { key: "rank", n: 9 }, { key: "monthly", n: "47" }],
    places: [{ name: "Utah", n: 35 }, { name: "Canary Islands", n: 9 }, { name: "secret_id", n: 4 }, { name: 12, n: 3 }],
    us_states: [{ code: "UT", n: 35 }, { code: "XX", n: 4 }, { code: "ca", n: 17 }],
    capture_years: [{ year: 2019, n: 15 }, { year: 21, n: 1 }, { year: 2026, n: 28 }],
    display_name: "Ada",
    email: "ada@example.com",
  });
  assert.ok(parsed);
  assert.equal(JSON.stringify(parsed).includes("Ada"), false);
  assert.equal(JSON.stringify(parsed).includes("email"), false);
  assert.equal(JSON.stringify(parsed).includes("secret_id"), false);
  assert.deepEqual(parsed, {
    comments: 43,
    pics: 123,
    honors: 149,
    members: 40,
    reactions: 158,
    regions: 21,
    countries: 5,
    weekPics: 16,
    honorCategories: [{ key: "foreground", n: 58 }, { key: "monthly", n: 47 }],
    places: [{ name: "Utah", n: 35 }, { name: "Canary Islands", n: 9 }],
    usStates: [{ code: "UT", n: 35 }, { code: "CA", n: 17 }],
    captureYears: [{ year: 2019, n: 15 }, { year: 2026, n: 28 }],
  });
});

test("the photo strip shows whatever valid photos exist and never keeps a name", () => {
  assert.deepEqual(parseShowcasePhotos([]), []);
  const few = parseShowcasePhotos([photo(1), photo(2)]);
  assert.equal(few.length, 2);
  assert.deepEqual(Object.keys(few[0]).sort(), ["avatarUrl", "imageUrl"]);
  const named = parseShowcasePhotos([1, 2, 3].map((index) => photo(index, { display_name: "Ada Lovelace", user_id: "secret" })));
  assert.equal(named.length, 3);
  assert.equal(JSON.stringify(named).includes("Ada"), false);
  assert.equal(JSON.stringify(named).includes("secret"), false);
  const many = parseShowcasePhotos(Array.from({ length: 12 }, (_, index) => photo(index)));
  assert.equal(many.length, SHOWCASE_MAX);
  assert.equal(SHOWCASE_MAX, 9);
  const mixed = parseShowcasePhotos([{ image_url: "http://cdn.example.com/a.jpg", avatar_url: "https://cdn.example.com/a.jpg" }, photo(2), photo(3)]);
  assert.equal(mixed.length, 2);
  assert.equal(SHOWCASE_MIN, 1);
  const noAvatar = parseShowcasePhotos([{ image_url: "https://cdn.example.com/photos/bare.jpg" }]);
  assert.equal(noAvatar.length, 1);
  assert.equal(noAvatar[0].imageUrl, "https://cdn.example.com/photos/bare.jpg");
  assert.equal(noAvatar[0].avatarUrl, "");
});

test("the showcase migration stays a counts-and-urls function for anon", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261111120000_public_member_showcase.sql", import.meta.url), "utf8");
  assert.match(sql, /public_showcase boolean not null default false/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /grant execute on function public\.public_guild_counts\(\) to anon, service_role/);
  assert.match(sql, /grant execute on function public\.public_showcase_photos\(\) to anon, service_role/);
  assert.match(sql, /revoke all on public\.member_profiles from public, anon/);
  assert.equal(sql.toLowerCase().includes("grant select on public.profiles to anon"), false);
  assert.equal(sql.toLowerCase().includes("grant select on public.member_profiles to anon"), false);
  assert.equal(/storage\.buckets/.test(sql), false);
  assert.match(sql, /image_comments/);
  assert.match(sql, /field_reports/);
  assert.match(sql, /user_achievements/);
});

test("the owner-fill migration keeps the default off and only returns urls", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261111153000_public_showcase_owner_fill.sql", import.meta.url), "utf8");
  assert.match(sql, /cf99ddfd-5e79-4a01-b1f6-2ec9200db881/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /grant execute on function public\.public_showcase_photos\(\) to anon, service_role/);
  assert.match(sql, /revoke all on function public\.public_showcase_photos\(\) from public, anon, authenticated/);
  assert.equal(/update\s+public\.profiles/i.test(sql), false);
  assert.equal(/public_showcase\s*=\s*true/i.test(sql), false);
  assert.equal(sql.includes("pg_catalog.least"), false);
  assert.equal(sql.includes("pg_catalog.coalesce"), false);
  assert.match(sql, /if available < 5 then/);
  assert.match(sql, /returns table \(image_url text, avatar_url text\)/);
  assert.equal(sql.toLowerCase().includes("grant select on public.profiles to anon"), false);
});

test("the hide-setting migration defaults to shown and only returns urls", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261111163300_public_showcase_hide_setting.sql", import.meta.url), "utf8");
  assert.match(sql, /hide_from_public_showcase boolean not null default false/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /grant execute on function public\.public_showcase_photos\(\) to anon, service_role/);
  assert.match(sql, /revoke all on function public\.public_showcase_photos\(\) from public, anon, authenticated/);
  assert.match(sql, /grant update \(hide_from_public_showcase\) on public.profiles to authenticated/);
  assert.match(sql, /revoke all on public.member_profiles from public, anon/);
  assert.equal(/hide_from_public_showcase\s*=\s*true/i.test(sql), false);
  assert.equal(/public_showcase\s*=\s*not/i.test(sql), false);
  assert.equal(sql.includes("pg_catalog.least"), false);
  assert.equal(sql.includes("pg_catalog.coalesce"), false);
  assert.match(sql, /if available < 1 then/);
  assert.match(sql, /if available < 5 then/);
  assert.match(sql, /not p.hide_from_public_showcase/);
  assert.match(sql, /returns table \(image_url text, avatar_url text\)/);
  assert.equal(sql.toLowerCase().includes("grant select on public.profiles to anon"), false);
  assert.equal(sql.toLowerCase().includes("grant select on public.member_profiles to anon"), false);
});

test("the print-pile migration keeps url-only rows and raises the cap to nine", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261111164500_public_showcase_print_pile.sql", import.meta.url), "utf8");
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /grant execute on function public\.public_showcase_photos\(\) to anon, service_role/);
  assert.match(sql, /revoke all on function public\.public_showcase_photos\(\) from public, anon, authenticated/);
  assert.match(sql, /least\(available, 9\)/);
  assert.match(sql, /not p.hide_from_public_showcase/);
  assert.match(sql, /returns table \(image_url text, avatar_url text\)/);
  assert.equal(sql.includes("pg_catalog.least"), false);
  assert.equal(sql.includes("pg_catalog.coalesce"), false);
  assert.equal(sql.toLowerCase().includes("grant select on public.profiles to anon"), false);
});

test("capture years fill the gaps so a sparkline stays continuous", () => {
  assert.deepEqual(
    fillCaptureYears([{ year: 2020, n: 2 }, { year: 2022, n: 5 }], 2023),
    [
      { year: 2020, n: 2 },
      { year: 2021, n: 0 },
      { year: 2022, n: 5 },
      { year: 2023, n: 0 },
    ],
  );
  assert.deepEqual(
    fillCaptureYears([{ year: 2018, n: 0 }, { year: 2019, n: 0 }, { year: 2020, n: 2 }, { year: 2021, n: 4 }]),
    [
      { year: 2020, n: 2 },
      { year: 2021, n: 4 },
    ],
  );
});

test("peak years are the local highs and the overall high", () => {
  const rows = [
    { year: 2015, n: 1 },
    { year: 2016, n: 6 },
    { year: 2017, n: 4 },
    { year: 2018, n: 7 },
    { year: 2019, n: 15 },
    { year: 2020, n: 11 },
    { year: 2024, n: 15 },
    { year: 2025, n: 9 },
    { year: 2026, n: 28 },
  ];
  assert.deepEqual(
    peakCaptureYears(rows).map((row) => row.year),
    [2016, 2019, 2024, 2026],
  );
  assert.deepEqual(peakCaptureYears([{ year: 2020, n: 2 }, { year: 2021, n: 0 }]).map((row) => row.year), [2020]);
});

test("the counts infographic migration stays a public aggregate function for anon", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261111223000_public_guild_counts_infographic.sql", import.meta.url), "utf8");
  assert.match(sql, /create or replace function public\.public_guild_counts\(\)/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = ''/);
  assert.match(sql, /grant execute on function public\.public_guild_counts\(\) to anon, service_role/);
  assert.match(sql, /revoke all on function public\.public_guild_counts\(\) from public, anon, authenticated/);
  assert.match(sql, /'members'/);
  assert.match(sql, /'reactions'/);
  assert.match(sql, /'regions'/);
  assert.match(sql, /'week_pics'/);
  assert.match(sql, /'honor_categories'/);
  assert.match(sql, /'places'/);
  assert.match(sql, /'us_states'/);
  assert.match(sql, /'capture_years'/);
  assert.match(sql, /image_comments/);
  assert.match(sql, /field_reports/);
  assert.match(sql, /user_achievements/);
  assert.match(sql, /image_reactions/);
  assert.equal(sql.includes("pg_catalog.least"), false);
  assert.equal(sql.includes("pg_catalog.coalesce"), false);
  assert.equal(sql.toLowerCase().includes("grant select on public.profiles to anon"), false);
  assert.equal(sql.toLowerCase().includes("display_name"), false);
  assert.equal(sql.toLowerCase().includes("email"), false);
});

test("the places list and the map keep distinct, accurate labels", () => {
  const stats = readFileSync(new URL("../components/PublicGuildStats.tsx", import.meta.url), "utf8");
  assert.match(stats, /Top places photographed/);
  assert.match(stats, /Photos made in \$\{counts\.length\} US states/);
  const listAt = stats.indexOf("Top places photographed");
  const mapAt = stats.indexOf("Photos made in ${counts.length} US states");
  assert.ok(mapAt > 0 && listAt > mapAt);
});

test("the regions line is a single nowrap phrase", () => {
  const stats = readFileSync(new URL("../components/PublicGuildStats.tsx", import.meta.url), "utf8");
  assert.match(stats, /regions, \$\{formatShowcaseCount\(countries\)\} countries/);
  assert.match(stats, /mw-stats-regions-line/);
  assert.equal(stats.includes("regions across"), false);
});
