/** Plain-language email checks shared by the signup form and the server action. */

export const EMAIL_REQUIRED_MESSAGE = "Enter your email address.";
export const EMAIL_SHAPE_MESSAGE = "Enter an email address with one @ and a domain after it.";
export const EMAIL_DOT_MESSAGE = "Enter an email with a dot in the domain, such as name@mail.com.";

/** Returns an error string, or null when the address has a dotted domain. */
export function emailFieldError(value: string): string | null {
  const email = value.trim();
  if (!email) return EMAIL_REQUIRED_MESSAGE;
  if (/\s/.test(email)) return EMAIL_DOT_MESSAGE;
  const at = email.indexOf("@");
  if (at <= 0 || at !== email.lastIndexOf("@") || at === email.length - 1) return EMAIL_SHAPE_MESSAGE;
  const domain = email.slice(at + 1);
  if (!domain.includes(".") || domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) {
    return EMAIL_DOT_MESSAGE;
  }
  return null;
}
