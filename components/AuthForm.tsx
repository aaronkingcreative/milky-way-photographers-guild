"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAuthCallbackUrl } from "@/lib/site-url";

const errorMessages: Record<string, string> = {
  auth_callback_failed: "We could not finish signing you in. Please request a new email link and try again.",
  auth_callback_missing_code: "The sign-in link was missing a required code. Please request a new email link.",
};

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams.get("error");
  const displayMessage = msg || (authError ? errorMessages[authError] || authError : "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setIsSubmitting(true);

    const supabase = createClient();
    const trimmedEmail = email.trim();
    const res =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email: trimmedEmail, password })
        : await supabase.auth.signUp({
            email: trimmedEmail,
            password,
            options: { data: { full_name: name }, emailRedirectTo: getAuthCallbackUrl() },
          });

    setIsSubmitting(false);

    if (res.error) {
      setMsg(res.error.message);
      return;
    }

    if (mode === "signup" && res.data.user && !res.data.session) {
      setMsg("Check your email to confirm your account, then sign in.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function sendMagicLink() {
    setMsg("");
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMsg("Enter your email address first.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await createClient().auth.signInWithOtp({
      email: trimmedEmail,
      options: { emailRedirectTo: getAuthCallbackUrl() },
    });
    setIsSubmitting(false);

    setMsg(error ? error.message : "Check your email for your magic sign-in link.");
  }

  async function sendPasswordReset() {
    setMsg("");
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setMsg("Enter your email address first.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await createClient().auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: getAuthCallbackUrl("/update-password"),
    });
    setIsSubmitting(false);

    setMsg(error ? error.message : "Check your email for a password reset link.");
  }

  return (
    <form onSubmit={submit} className="card mx-auto max-w-md rounded-3xl p-8">
      <h1 className="text-3xl font-bold">{mode === "login" ? "Sign in" : "Join the Guild"}</h1>
      {mode === "signup" && (
        <label className="mt-6 block text-sm">
          Full name
          <input className="input mt-2" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
      )}
      <label className="mt-6 block text-sm">
        Email
        <input type="email" required className="input mt-2" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="mt-4 block text-sm">
        Password
        <input type="password" required minLength={6} className="input mt-2" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {displayMessage && <p className="mt-4 text-[#f4bd61]">{displayMessage}</p>}
      <button className="btn btn-primary mt-6 w-full" disabled={isSubmitting}>
        {isSubmitting ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
      </button>
      {mode === "login" && (
        <div className="mt-4 flex flex-col gap-2 text-sm text-[#b8c4d4]">
          <button type="button" className="text-left text-[#f4bd61]" onClick={sendPasswordReset} disabled={isSubmitting}>Forgot password?</button>
          <button type="button" className="text-left text-[#f4bd61]" onClick={sendMagicLink} disabled={isSubmitting}>Email me a magic link</button>
        </div>
      )}
      <p className="mt-4 text-sm text-[#b8c4d4]">
        {mode === "login" ? (
          <>Need an account? <Link className="text-[#f4bd61]" href="/signup">Sign up</Link></>
        ) : (
          <>Already have access? <Link className="text-[#f4bd61]" href="/login">Sign in</Link></>
        )}
      </p>
    </form>
  );
}
