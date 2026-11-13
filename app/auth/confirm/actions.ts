"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { asOtpType, defaultNext, parseConfirmType, safeNextPath } from "@/lib/auth-confirm";

/**
 * Runs only when the member taps the button, so mail scanners that prefetch the
 * email link (GET) never spend the single-use token.
 */
export async function confirmEmailLink(formData: FormData) {
  const tokenHash = formData.get("token_hash");
  const type = parseConfirmType(formData.get("type"));
  if (typeof tokenHash !== "string" || !tokenHash || !type) redirect("/auth/confirm?error=missing");

  const next = safeNextPath(formData.get("next"), defaultNext(type));
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: asOtpType(type) });
  if (error) {
    const params = new URLSearchParams({ error: "expired", type });
    redirect(`/auth/confirm?${params.toString()}`);
  }
  redirect(next);
}
