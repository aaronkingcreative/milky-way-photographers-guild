import { createHmac, timingSafeEqual } from "crypto";

/** Minimum time a person needs to fill the signup form. Bots usually submit instantly. */
export const MIN_FILL_MS = 3000;
/** A form token older than this is treated as stale and the person just needs to resubmit. */
const MAX_TOKEN_AGE_MS = 1000 * 60 * 60 * 6;
/** Name of the hidden honeypot input. Real people never see or fill it. */
export const HONEYPOT_FIELD = "mw_extra";

function secret() {
  return process.env.SIGNUP_GUARD_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mwpg-signup-guard";
}

function sign(issuedAt: number) {
  return createHmac("sha256", secret()).update(`mwpg-signup:${issuedAt}`).digest("base64url");
}

/** Issued when the signup page renders on the server, so the fill timer cannot be set by the browser. */
export function issueFormToken(now = Date.now()) {
  return `${now}.${sign(now)}`;
}

export type FormTokenCheck = "ok" | "too_fast" | "invalid" | "stale";

export function checkFormToken(token: unknown, now = Date.now()): FormTokenCheck {
  if (typeof token !== "string") return "invalid";
  const [issuedRaw, mac] = token.split(".");
  const issuedAt = Number(issuedRaw);
  if (!Number.isFinite(issuedAt) || !mac) return "invalid";
  const expected = Buffer.from(sign(issuedAt));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return "invalid";
  const age = now - issuedAt;
  if (age < MIN_FILL_MS) return "too_fast";
  if (age > MAX_TOKEN_AGE_MS) return "stale";
  return "ok";
}

/**
 * Random-string names like the ones bots used ("mWQJyHpgMUeHeuQlYGodD").
 * Deliberately narrow so real names such as "JeanPierreDuBois" or "McDonald" pass:
 * one unbroken run of 16+ letters, mixed case, with 5 or more capitals after the first letter.
 */
export function looksLikeBotName(value: string) {
  const name = value.trim();
  if (!/^[A-Za-z]{16,}$/.test(name)) return false;
  const innerCaps = (name.slice(1).match(/[A-Z]/g) || []).length;
  const lower = (name.match(/[a-z]/g) || []).length;
  // Mixed case scramble only. An all caps name typed with caps lock on is a person.
  return innerCaps >= 5 && lower >= 3;
}

/** Well known throwaway inbox services. Kept short on purpose so no real provider is caught. */
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "sharklasers.com", "grr.la",
  "10minutemail.com", "10minutemail.net", "temp-mail.org", "tempmail.com", "tempmail.net", "temp-mail.io",
  "yopmail.com", "yopmail.net", "trashmail.com", "trashmail.de", "getnada.com", "nada.email", "dispostable.com",
  "maildrop.cc", "throwawaymail.com", "fakeinbox.com", "mintemail.com", "mohmal.com", "emailondeck.com",
  "mailnesia.com", "spamgourmet.com", "tempinbox.com", "discard.email", "mailcatch.com", "moakt.com",
  "tempr.email", "burnermail.io", "1secmail.com", "1secmail.net", "1secmail.org", "mail.tm", "mail.gw",
]);

export function isDisposableEmail(email: string) {
  const domain = email.trim().toLowerCase().split("@")[1] || "";
  return DISPOSABLE_DOMAINS.has(domain);
}
