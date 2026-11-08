import assert from "node:assert/strict";
import test from "node:test";
import { fetchOwnReportPage, OWN_REPORT_PAGE_SIZE, ownReportsShowsEmpty, ownReportsStatus, pageOwnReports, parseOwnReportCursor, type OwnReportCursor } from "../lib/own-reports.ts";

type Row = { id: string; user_id: string; created_at: string; deleted_at: string | null; title: string; image_url: string; capture_date: string | null };

function row(id: string, user: string, created: string, extra: Partial<Row> = {}): Row {
  return { id, user_id: user, created_at: created, deleted_at: null, title: id, image_url: `/img/${id}`, capture_date: "2026-06-01", ...extra };
}

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

test("own reports exclude other members and deleted rows", () => {
  const rows = [
    row(id(1), "me", "2026-06-03T00:00:00.000Z"),
    row(id(2), "them", "2026-06-04T00:00:00.000Z"),
    row(id(3), "me", "2026-06-02T00:00:00.000Z", { deleted_at: "2026-06-05T00:00:00.000Z" }),
    row(id(4), "me", "2026-06-01T00:00:00.000Z"),
  ];
  const { page, next } = pageOwnReports(rows, "me", null, 10);
  assert.deepEqual(page.map((item) => item.id), [id(1), id(4)]);
  assert.equal(next, null);
});

test("a member with no reports gets an empty page, not someone else's", () => {
  const rows = [row(id(1), "them", "2026-06-03T00:00:00.000Z")];
  const { page, next } = pageOwnReports(rows, "me", null, 8);
  assert.equal(page.length, 0);
  assert.equal(next, null);
});

test("same timestamps stay in id order and the cursor does not skip or repeat", () => {
  const stamp = "2026-06-03T00:00:00.000Z";
  const rows = [row(id(1), "me", stamp), row(id(3), "me", stamp), row(id(2), "me", stamp)];
  const first = pageOwnReports(rows, "me", null, 2);
  assert.deepEqual(first.page.map((item) => item.id), [id(3), id(2)]);
  const cursor: OwnReportCursor | null = first.next;
  const second = pageOwnReports(rows, "me", cursor, 2);
  assert.deepEqual(second.page.map((item) => item.id), [id(1)]);
  const seen = [...first.page, ...second.page].map((item) => item.id);
  assert.equal(new Set(seen).size, seen.length);
});

test("paging walks history past a single API cap", () => {
  const rows = Array.from({ length: 25 }, (_, index) => row(id(index + 1), "me", `2026-05-${String(25 - index).padStart(2, "0")}T00:00:00.000Z`));
  const cap = 10;
  const cappedSlice = [...rows].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, cap);
  assert.equal(cappedSlice.length, cap);
  const collected: string[] = [];
  let cursor: OwnReportCursor | null = null;
  for (let guard = 0; guard < 10; guard += 1) {
    const batch: { page: Row[]; next: OwnReportCursor | null } = pageOwnReports(rows, "me", cursor, 8);
    collected.push(...batch.page.map((item) => item.id));
    cursor = batch.next;
    if (!cursor) break;
  }
  assert.equal(collected.length, 25);
  assert.equal(new Set(collected).size, 25);
  assert.equal(cursor, null);
});

function memoryClient(rows: Row[], cap: number) {
  return {
    from(table: string) {
      const q = { table, filters: [] as { op: string; col?: string; val?: unknown; expr?: string }[], orders: [] as string[], limit: null as number | null };
      const api = {
        select() { return api; },
        eq(col: string, val: unknown) { q.filters.push({ op: "eq", col, val }); return api; },
        is(col: string, val: unknown) { q.filters.push({ op: "is", col, val }); return api; },
        in() { return api; },
        order(col: string) { q.orders.push(col); return api; },
        limit(n: number) { q.limit = n; return api; },
        or(expr: string) { q.filters.push({ op: "or", expr }); return api; },
        then(resolve: (value: { data: unknown; error: null }) => void) {
          if (table === "image_reactions") {
            resolve({ data: [], error: null });
            return;
          }
          const user = q.filters.find((filter) => filter.op === "eq" && filter.col === "user_id");
          let matched = rows.filter((item) => (!user || item.user_id === user.val) && item.deleted_at == null);
          matched.sort((a, b) => (a.created_at === b.created_at ? (a.id < b.id ? 1 : -1) : a.created_at < b.created_at ? 1 : -1));
          const orf = q.filters.find((filter) => filter.op === "or");
          if (orf?.expr) {
            const ts = orf.expr.match(/created_at\.lt\."([^"]+)"/)?.[1];
            const rid = orf.expr.match(/id\.lt\."([^"]+)"/)?.[1];
            if (ts && rid) matched = matched.filter((item) => item.created_at < ts || (item.created_at === ts && item.id < rid));
          }
          const take = q.limit == null ? cap : Math.min(q.limit, cap);
          resolve({ data: matched.slice(0, take), error: null });
        },
      };
      return api;
    },
  };
}

test("the server page walks every own report when one response is capped", async () => {
  const rows = Array.from({ length: 12 }, (_, index) => row(id(index + 1), index % 5 === 0 ? "them" : "me", `2026-04-${String(28 - index).padStart(2, "0")}T12:00:00.000Z`));
  rows.push(row(id(90), "me", "2026-04-01T12:00:00.000Z", { deleted_at: "2026-04-02T00:00:00.000Z" }));
  const db = memoryClient(rows, 5);
  const seen: string[] = [];
  let cursor: OwnReportCursor | null = null;
  for (let guard = 0; guard < 8; guard += 1) {
    const page = await fetchOwnReportPage(db, "me", cursor, 4);
    assert.equal(page.ok, true);
    if (!page.ok) return;
    assert.equal(page.reports.every((item) => item.id !== id(90)), true);
    seen.push(...page.reports.map((item) => item.id));
    cursor = page.next;
    if (!cursor) break;
  }
  const expected = rows.filter((item) => item.user_id === "me" && item.deleted_at == null).length;
  assert.equal(seen.length, expected);
  assert.equal(new Set(seen).size, expected);
  assert.equal(seen.includes(id(1)), false);
  assert.ok(expected > 5);
});

test("a failed read is an error, not an empty desk", async () => {
  const db = {
    from() {
      const api = {
        select() { return api; },
        eq() { return api; },
        is() { return api; },
        order() { return api; },
        limit() { return api; },
        then(resolve: (value: { data: null; error: { message: string } }) => void) {
          resolve({ data: null, error: { message: "unavailable" } });
        },
      };
      return api;
    },
  };
  const page = await fetchOwnReportPage(db, "me", null);
  assert.equal(page.ok, false);
  if (!page.ok) assert.equal(page.reports.length, 0);
});

test("loading and errors stay distinct from an empty desk", () => {
  assert.equal(ownReportsShowsEmpty(0, false, ""), true);
  assert.equal(ownReportsShowsEmpty(0, true, ""), false);
  assert.equal(ownReportsShowsEmpty(0, false, "Those reports did not load. Try again."), false);
  assert.equal(ownReportsStatus(0, true, "", false), "Loading more reports");
  assert.equal(ownReportsStatus(0, false, "Those reports did not load. Try again.", false), "Those reports did not load. Try again.");
  assert.equal(ownReportsStatus(0, false, "", false), "");
  assert.equal(ownReportsStatus(3, false, "", false), "That's every report.");
  assert.equal(ownReportsStatus(3, false, "", true), "");
});

test("an invalid cursor is rejected instead of looking like an empty desk", () => {
  assert.equal(parseOwnReportCursor(null), null);
  assert.equal(parseOwnReportCursor({ createdAt: "yesterday", id: id(1) }), "invalid");
  assert.equal(parseOwnReportCursor({ createdAt: "2026-06-01T00:00:00.000Z", id: "not-an-id" }), "invalid");
  assert.deepEqual(parseOwnReportCursor({ createdAt: "2026-06-03T00:00:00.123456+00:00", id: id(1) }), { createdAt: "2026-06-03T00:00:00.123456+00:00", id: id(1) });
  assert.equal(parseOwnReportCursor({ createdAt: "2026-06-03T00:00:00.000Z\",or(user_id.eq.them)", id: id(1) }), "invalid");
  assert.equal(OWN_REPORT_PAGE_SIZE < 1000, true);
});
