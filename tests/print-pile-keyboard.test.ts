import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const pile = readFileSync(new URL("../components/PublicPrintPile.tsx", import.meta.url), "utf8");

test("closing the focus view returns keyboard focus to the print it came from", () => {
  assert.match(pile, /returnFocusIndex/);
  assert.match(pile, /printRefs/);
  assert.match(pile, /if \(button\) button\.focus\(\)/);
});

test("pile controls keep public accessible names without photographer names", () => {
  assert.match(pile, /aria-label=\{previousPrintLabel\}/);
  assert.match(pile, /aria-label=\{nextPrintLabel\}/);
  assert.match(pile, /Previous photo/);
  assert.match(pile, /Next photo/);
  assert.match(pile, /aria-label="Put the print back"/);
  assert.match(pile, /Open a Guild print/);
  assert.doesNotMatch(pile, /photographer/i);
  assert.doesNotMatch(pile, /display_name|full_name|author/);
});
