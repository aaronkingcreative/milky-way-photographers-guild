"use server";

import { runSignup, type SignupResult } from "@/lib/signup-run";

export type { SignupResult };

/** Browser entry. One argument only, so the client cannot override the fill timer or the auth call. */
export async function signUpMember(formData: FormData): Promise<SignupResult> {
  return runSignup(formData);
}
