import test from "node:test";
import assert from "node:assert/strict";
import { NAV_ITEMS, navItemIsActive } from "../lib/nav-menu.ts";

const activeFor = (path: string) => NAV_ITEMS.filter(([, href]) => navItemIsActive(path, href)).map(([label]) => label);

test("every route lights exactly the right nav item", () => {
  const cases: [string, string[]][] = [
    ["/guild-hall", ["Guild Hall"]],
    ["/feed", ["Gallery"]], ["/gallery", ["Gallery"]], ["/images/abc", ["Gallery"]], ["/images/abc/edit", ["Gallery"]],
    ["/forum", ["Forum"]], ["/forum/gear", ["Forum"]], ["/forum/new", ["Forum"]], ["/forum/t/123", ["Forum"]],
    ["/field-desk", ["Field Desk"]], ["/winners", ["Winners"]], ["/progress", ["Progress"]],
    ["/courses", ["Learn"]], ["/resources", ["Learn"]],
    ["/profile", []], ["/submit", []], ["/members/abc", []], ["/admin", []], ["/admin/forum", []], ["/forumx", []],
  ];
  for (const [path, want] of cases) assert.deepEqual(activeFor(path), want, path);
});
