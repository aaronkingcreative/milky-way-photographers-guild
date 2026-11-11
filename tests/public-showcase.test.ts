import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { SHOWCASE_MAX, SHOWCASE_MIN, parsePublicCounts, parseShowcasePhotos } from "../lib/public-showcase.ts";

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

test("the photo strip stays hidden under five and never keeps a name", () => {
  assert.deepEqual(parseShowcasePhotos([photo(1), photo(2), photo(3), photo(4)]), []);
  const five = parseShowcasePhotos([1, 2, 3, 4, 5].map((index) => photo(index, { display_name: "Ada Lovelace", user_id: "secret" })));
  assert.equal(five.length, SHOWCASE_MIN);
  assert.deepEqual(Object.keys(five[0]).sort(), ["avatarUrl", "imageUrl"]);
  assert.equal(JSON.stringify(five).includes("Ada"), false);
  assert.equal(JSON.stringify(five).includes("secret"), false);
  const many = parseShowcasePhotos(Array.from({ length: 9 }, (_, index) => photo(index)));
  assert.equal(many.length, SHOWCASE_MAX);
  assert.deepEqual(parseShowcasePhotos([{ image_url: "http://cdn.example.com/a.jpg", avatar_url: "https://cdn.example.com/a.jpg" }, photo(2), photo(3), photo(4), photo(5)]), []);
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
  assert.equal(sql.toLowerCase().includes("display_name"), false);
  assert.equal(sql.toLowerCase().includes("grant select on public.profiles to anon"), false);
});
