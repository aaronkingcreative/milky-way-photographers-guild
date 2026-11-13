import type { EmailOtpType } from "@supabase/supabase-js";

/** Link types the Guild's auth emails send to /auth/confirm. */
export const CONFIRM_TYPES = ["email", "signup", "recovery", "invite", "email_change", "magiclink"] as const;
export type ConfirmType = (typeof CONFIRM_TYPES)[number];

export function parseConfirmType(value: unknown): ConfirmType | null {
  return typeof value === "string" && (CONFIRM_TYPES as readonly string[]).includes(value) ? (value as ConfirmType) : null;
}

export function safeNextPath(value: unknown, fallback: string) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : fallback;
}

export function defaultNext(type: ConfirmType) {
  return type === "recovery" ? "/update-password" : "/field-desk";
}

/** Copy for the tap-to-continue page. No colons or em dashes (Guild voice rules). */
export function confirmCopy(type: ConfirmType) {
  switch (type) {
    case "recovery":
      return { eyebrow: "Password help", title: "Choose a new password", intro: "Tap below and I'll take you to the page where you set your new password.", button: "Choose a new password" };
    case "invite":
      return { eyebrow: "You're invited", title: "Join the Guild", intro: "Tap below to accept your invite and come on in.", button: "Accept my invite" };
    case "email_change":
      return { eyebrow: "New email", title: "Confirm your new email", intro: "Tap below to confirm the switch to your new address.", button: "Confirm new email" };
    case "magiclink":
      return { eyebrow: "Sign in", title: "Sign in to the Guild", intro: "Tap below and you're in. No password needed.", button: "Sign me in" };
    default:
      return { eyebrow: "One last step", title: "Confirm your email", intro: "Tap below to confirm your email and finish joining the Guild.", button: "Confirm my email" };
  }
}

export function asOtpType(type: ConfirmType): EmailOtpType {
  return type as EmailOtpType;
}
