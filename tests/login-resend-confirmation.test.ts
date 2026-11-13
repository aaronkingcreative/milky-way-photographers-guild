import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  EMAIL_NOT_CONFIRMED_LOGIN_MESSAGE,
  isEmailNotConfirmedError,
} from "../lib/signup-messages.ts";

test("detects the Supabase email not confirmed login error", () => {
  assert.equal(isEmailNotConfirmedError("Email not confirmed"), true);
  assert.equal(isEmailNotConfirmedError("email not confirmed"), true);
  assert.equal(isEmailNotConfirmedError("Invalid login credentials"), false);
  assert.equal(isEmailNotConfirmedError(""), false);
});

test("the login form offers to resend confirmation after that error", () => {
  const form = readFileSync(new URL("../components/AuthForm.tsx", import.meta.url), "utf8");
  assert.match(form, /unconfirmedLogin/);
  assert.match(form, /EMAIL_NOT_CONFIRMED_LOGIN_MESSAGE/);
  assert.match(form, /Resend the confirmation email/);
  assert.equal(EMAIL_NOT_CONFIRMED_LOGIN_MESSAGE.includes(":"), false);
  assert.equal(EMAIL_NOT_CONFIRMED_LOGIN_MESSAGE.includes("—"), false);
});
