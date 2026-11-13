export const CHECK_EMAIL_MESSAGE = "Check your email to confirm your account, then sign in.";

/** Shown when a real person submits before the anti-bot pause. Not a success. */
export const TOO_FAST_MESSAGE =
  "The form needs a short pause before I can create the account. Wait a few seconds, then press Create account again.";

export const STALE_FORM_MESSAGE = "This page was open a long time. Please refresh and try again.";

export const DISPOSABLE_EMAIL_MESSAGE =
  "Please use a permanent email address so the confirmation and sign-in messages can reach you.";

export const SIGNUP_REASSURANCE =
  "I use your email to confirm the account and to send sign-in and password reset links. Members with Guild access can see images you submit. Details are in the";

export const EMAIL_NOT_CONFIRMED_LOGIN_MESSAGE =
  "Your email is not confirmed yet. I can send the confirmation email again.";

export function isEmailNotConfirmedError(message: string) {
  return /email not confirmed/i.test(message);
}
