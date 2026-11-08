import { emailFieldError } from "./email-address";
import { checkFormToken, isDisposableEmail, looksLikeBotName } from "./signup-guard";
import { CHECK_EMAIL_MESSAGE, DISPOSABLE_EMAIL_MESSAGE, STALE_FORM_MESSAGE, TOO_FAST_MESSAGE } from "./signup-messages";

export type SignupDecision =
  | { outcome: "silent"; reason: "honeypot" | "invalid"; message: string }
  | { outcome: "reject"; message: string }
  | { outcome: "proceed"; name: string; email: string; password: string };

/**
 * Every check that happens before an account is created.
 * Honeypot and a broken token stay silent so a bot gets no signal.
 * A too-fast submit is a person (often a password manager) and gets an honest retry.
 */
export function decideSignup(input: {
  name: string;
  email: string;
  password: string;
  honeypot: string;
  token: unknown;
  now?: number;
}): SignupDecision {
  const name = input.name.trim();
  const email = input.email.trim();
  const tokenCheck = checkFormToken(input.token, input.now ?? Date.now());

  if (input.honeypot) return { outcome: "silent", reason: "honeypot", message: CHECK_EMAIL_MESSAGE };
  if (tokenCheck === "invalid") return { outcome: "silent", reason: "invalid", message: CHECK_EMAIL_MESSAGE };
  if (tokenCheck === "too_fast") return { outcome: "reject", message: TOO_FAST_MESSAGE };
  if (tokenCheck === "stale") return { outcome: "reject", message: STALE_FORM_MESSAGE };

  if (name.length < 2 || name.length > 80) return { outcome: "reject", message: "Please enter your name." };
  if (looksLikeBotName(name)) return { outcome: "reject", message: "Please enter the name you want members to see." };
  const emailError = emailFieldError(email);
  if (emailError) return { outcome: "reject", message: emailError };
  if (isDisposableEmail(email)) return { outcome: "reject", message: DISPOSABLE_EMAIL_MESSAGE };
  if (input.password.length < 6) return { outcome: "reject", message: "Password should be at least 6 characters." };

  return { outcome: "proceed", name, email, password: input.password };
}
