import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultNext, parseConfirmType, safeNextPath } from "../lib/auth-confirm.ts";

test("only known email link types are accepted", () => {
  assert.equal(parseConfirmType("recovery"), "recovery");
  assert.equal(parseConfirmType("email_change"), "email_change");
  assert.equal(parseConfirmType("admin"), null);
  assert.equal(parseConfirmType(undefined), null);
});

test("next must be a same-site path", () => {
  assert.equal(safeNextPath("/update-password", "/field-desk"), "/update-password");
  assert.equal(safeNextPath("//evil.example", "/field-desk"), "/field-desk");
  assert.equal(safeNextPath("https://evil.example", "/field-desk"), "/field-desk");
  assert.equal(safeNextPath("/\\evil.example", "/field-desk"), "/field-desk");
  assert.equal(safeNextPath(null, "/field-desk"), "/field-desk");
});

test("reset links land on the password page by default", () => {
  assert.equal(defaultNext("recovery"), "/update-password");
  assert.equal(defaultNext("email"), "/field-desk");
});
