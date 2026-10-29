"use server";

import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAuthCallbackUrl } from "@/lib/site-url";
import { HONEYPOT_FIELD, checkFormToken, isDisposableEmail, looksLikeBotName } from "@/lib/signup-guard";

export type SignupResult = { ok: true; message: string } | { ok: false; message: string };

const CHECK_EMAIL = "Check your email to confirm your account, then sign in.";

export async function signUpMember(formData: FormData): Promise<SignupResult> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const honeypot = String(formData.get(HONEYPOT_FIELD) || "");
  const tokenCheck = checkFormToken(formData.get("form_token"));

  // Bots: filled the hidden field, skipped the page, or submitted faster than a person can type.
  // Pretend it worked and create nothing, so they get no signal to adapt.
  if (honeypot || tokenCheck === "invalid" || tokenCheck === "too_fast") {
    const ua = (await headers()).get("user-agent") || "";
    console.info("[signup-guard] dropped", { reason: honeypot ? "honeypot" : tokenCheck, ua: ua.slice(0, 120) });
    return { ok: true, message: CHECK_EMAIL };
  }
  if (tokenCheck === "stale") return { ok: false, message: "This page was open a long time. Please refresh and try again." };

  if (name.length < 2 || name.length > 80) return { ok: false, message: "Please enter your name." };
  if (looksLikeBotName(name)) return { ok: false, message: "Please enter the name you want members to see." };
  if (!email.includes("@")) return { ok: false, message: "Please enter a valid email address." };
  if (isDisposableEmail(email)) return { ok: false, message: "Please use a permanent email address so you can receive Guild updates." };
  if (password.length < 6) return { ok: false, message: "Password should be at least 6 characters." };

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name }, emailRedirectTo: getAuthCallbackUrl() },
  });
  if (error) return { ok: false, message: error.message };
  if (data.session) return { ok: true, message: "signed_in" };
  return { ok: true, message: CHECK_EMAIL };
}
