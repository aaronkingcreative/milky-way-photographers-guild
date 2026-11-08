import assert from "node:assert/strict";
import test from "node:test";
import { countReceivedReactions } from "../lib/received-reactions.ts";
import { countReactionsOnReports } from "../lib/member-labels.ts";

type ImageRow = { id: string; user_id: string; deleted_at: string | null };
type ReactionRow = { image_id: string };

/**
 * A stand-in for PostgREST. An exact head count ignores the row cap.
 * A plain select returns only the first `cap` rows, which is the old bug.
 */
function client(images: ImageRow[], reactions: ReactionRow[], cap = 1000) {
  const calls: { select: string; options: { count?: string; head?: boolean }; filters: { op: string; col: string; val: unknown }[] }[] = [];
  return {
    calls,
    from() {
      const q = { select: "", options: {} as { count?: string; head?: boolean }, filters: [] as { op: string; col: string; val: unknown }[] };
      const api = {
        select(cols: string, options?: { count?: string; head?: boolean }) {
          q.select = cols;
          q.options = options || {};
          return api;
        },
        eq(col: string, val: unknown) {
          q.filters.push({ op: "eq", col, val });
          return api;
        },
        is(col: string, val: unknown) {
          q.filters.push({ op: "is", col, val });
          return api;
        },
        then(resolve: (value: { count: number | null; data: ReactionRow[] | null; error: null }) => void) {
          calls.push(q);
          const ownIds = new Set(
            images
              .filter((image) => {
                const user = q.filters.find((filter) => filter.op === "eq" && filter.col === "guild_images.user_id");
                const notDeleted = q.filters.some((filter) => filter.op === "is" && filter.col === "guild_images.deleted_at" && filter.val === null);
                return Boolean(user && image.user_id === user.val && notDeleted && image.deleted_at === null);
              })
              .map((image) => image.id),
          );
          const matched = reactions.filter((row) => ownIds.has(row.image_id));
          const exact = q.options.count === "exact" && q.options.head === true && q.select.includes("guild_images!inner");
          if (exact) {
            resolve({ count: matched.length, data: null, error: null });
            return;
          }
          resolve({ count: null, data: matched.slice(0, cap), error: null });
        },
      };
      return api;
    },
  };
}

const mine = { id: "mine", user_id: "member", deleted_at: null };
const deleted = { id: "gone", user_id: "member", deleted_at: "2026-01-01" };
const theirs = { id: "theirs", user_id: "other", deleted_at: null };

test("a member with no reports has zero reactions received", async () => {
  const db = client([], [{ image_id: "theirs" }]);
  assert.equal(await countReceivedReactions(db, "member"), 0);
  assert.equal(db.calls[0].options.head, true);
  assert.equal(db.calls[0].options.count, "exact");
});

test("reactions on the member's own report count, and other reports do not", async () => {
  const db = client([mine, theirs], [
    { image_id: "mine" },
    { image_id: "mine" },
    { image_id: "theirs" },
    { image_id: "theirs" },
    { image_id: "theirs" },
  ]);
  assert.equal(await countReceivedReactions(db, "member"), 2);
  assert.equal(await countReceivedReactions(db, "other"), 3);
});

test("reactions on a deleted report are not received", async () => {
  const db = client([mine, deleted], [{ image_id: "mine" }, { image_id: "gone" }, { image_id: "gone" }]);
  assert.equal(await countReceivedReactions(db, "member"), 1);
});

test("an exact count survives a row cap that would drop the member's reactions", async () => {
  const images = [mine];
  const reactions = Array.from({ length: 1200 }, () => ({ image_id: "mine" }));
  const capped = reactions.slice(0, 1000);
  assert.equal(countReactionsOnReports(["mine"], capped), 1000);
  const db = client(images, reactions, 1000);
  assert.equal(await countReceivedReactions(db, "member"), 1200);
  assert.equal(db.calls[0].select.includes("guild_images!inner"), true);
  assert.equal(db.calls.some((call) => call.options.head !== true), false);
});
