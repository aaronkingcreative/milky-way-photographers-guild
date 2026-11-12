import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(new URL("../components/images/LocationSelects.tsx", import.meta.url), "utf8");

test("the specific location field stays empty until the member types, and uses the example placeholder", () => {
  assert.match(source, /placeholder="Example: Mesa Arch, Southern Utah"/);
  assert.match(source, /defaultValue=\{defaults\?\.specific_location_name \|\| ""\}/);
  assert.doesNotMatch(source, /Mesa Arch, Southern Utah\.\.\./);
});

test("country and state share a row, and the specific location sits on its own full-width row", () => {
  assert.match(source, /className="mw-location-fields"/);
  assert.match(source, /md:grid-cols-2/);
  assert.doesNotMatch(source, /md:grid-cols-3/);
  assert.match(source, /mw-location-specific/);
});
