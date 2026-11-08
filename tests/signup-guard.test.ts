import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { EMAIL_DOT_MESSAGE } from "../lib/email-address.ts";
import { decideSignup } from "../lib/signup-flow.ts";
import { CHECK_EMAIL_MESSAGE, TOO_FAST_MESSAGE } from "../lib/signup-messages.ts";
import { issueFormToken, MIN_FILL_MS } from "../lib/signup-guard.ts";
import { runSignup } from "../lib/signup-run.ts";

const ISSUED_AT = 1_700_000_000_000;

function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  data.set("name", overrides.name ?? "Ada Lovelace");
  data.set("email", overrides.email ?? "ada@example.com");
  data.set("password", overrides.password ?? "night-sky");
  data.set("mw_extra", overrides.mw_extra ?? "");
  data.set("form_token", overrides.form_token ?? issueFormToken(ISSUED_AT));
  return data;
}

test("reproduces the under-3-second token as too_fast", () => {
  const token = issueFormToken(ISSUED_AT);
  assert.equal(MIN_FILL_MS, 3000);
  assert.equal(decideSignup({ name: "Ada Lovelace", email: "ada@example.com", password: "night-sky", honeypot: "", token, now: ISSUED_AT + 400 }).outcome, "reject");
  assert.equal(decideSignup({ name: "Ada Lovelace", email: "ada@example.com", password: "night-sky", honeypot: "", token, now: ISSUED_AT + MIN_FILL_MS - 1 }).outcome, "reject");
  assert.equal(decideSignup({ name: "Ada Lovelace", email: "ada@example.com", password: "night-sky", honeypot: "", token, now: ISSUED_AT + MIN_FILL_MS }).outcome, "proceed");
});

test("a fast signup tells the person to retry and does not call auth", async () => {
  let calls = 0;
  const result = await runSignup(form(), {
    now: ISSUED_AT + 500,
    signUp: async () => {
      calls += 1;
      return { data: { session: null }, error: null };
    },
  });
  assert.equal(calls, 0);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.message, TOO_FAST_MESSAGE);
    assert.equal(result.message.includes("Check your email"), false);
  }
});

test("after the pause, a normal signup reaches the auth call and can ask the person to confirm email", async () => {
  const captured: { email?: string } = {};
  const result = await runSignup(form(), {
    now: ISSUED_AT + MIN_FILL_MS,
    signUp: async (args) => {
      captured.email = args.email;
      return { data: { session: null }, error: null };
    },
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.message, CHECK_EMAIL_MESSAGE);
  assert.equal(captured.email, "ada@example.com");
});

test("an immediate session still signs the member in", async () => {
  const result = await runSignup(form(), {
    now: ISSUED_AT + MIN_FILL_MS,
    signUp: async () => ({ data: { session: { user: { id: "local-test" } } }, error: null }),
  });
  assert.deepEqual(result, { ok: true, message: "signed_in" });
});

test("honeypot and a broken token stay silent and create nothing", async () => {
  let calls = 0;
  const signUp = async () => {
    calls += 1;
    return { data: { session: null }, error: null };
  };
  const honey = await runSignup(form({ mw_extra: "bot" }), { now: ISSUED_AT + 10_000, userAgent: "bot", signUp });
  const broken = await runSignup(form({ form_token: "not-a-token" }), { now: ISSUED_AT + 10_000, userAgent: "bot", signUp });
  assert.equal(calls, 0);
  assert.deepEqual(honey, { ok: true, message: CHECK_EMAIL_MESSAGE });
  assert.deepEqual(broken, { ok: true, message: CHECK_EMAIL_MESSAGE });
});

test("a missing domain dot is rejected before auth, on the server", async () => {
  let calls = 0;
  const result = await runSignup(form({ email: "ada@nodot" }), {
    now: ISSUED_AT + MIN_FILL_MS,
    signUp: async () => {
      calls += 1;
      return { data: { session: null }, error: null };
    },
  });
  assert.equal(calls, 0);
  assert.deepEqual(result, { ok: false, message: EMAIL_DOT_MESSAGE });
});

test("the browser action cannot take a test clock", () => {
  const source = readFileSync(new URL("../app/signup/actions.ts", import.meta.url), "utf8");
  assert.match(source, /return runSignup\(formData\)/);
  assert.equal(source.includes("deps"), false);
});
