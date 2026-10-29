"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAuthCallbackUrl } from "@/lib/site-url";
import { signUpMember } from "@/app/signup/actions";

const errorMessages: Record<string, string> = {
  auth_callback_failed: "We could not finish signing you in. Please request a new email link and try again.",
  auth_callback_missing_code: "The sign-in link was missing a required code. Please request a new email link.",
};

export function AuthForm({ mode, formToken }: { mode: "login" | "signup"; formToken?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams.get("error");
  const displayMessage = msg || (authError ? errorMessages[authError] || authError : "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setIsSubmitting(true);

    const trimmedEmail = email.trim();

    if (mode === "signup") {
      const formData = new FormData();
      formData.set("name", name.trim());
      formData.set("email", trimmedEmail);
      formData.set("password", password);
      formData.set("mw_extra", honeypot);
      formData.set("form_token", formToken || "");
      const result = await signUpMember(formData);
      setIsSubmitting(false);
      if (!result.ok || result.message !== "signed_in") {
        setMsg(result.message);
        return;
      }
    } else {
      const res = await createClient().auth.signInWithPassword({ email: trimmedEmail, password });
      setIsSubmitting(false);
      if (res.error) {
        setMsg(res.error.message);
        return;
      }
    }

    router.push("/guild-hall");
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
      options: { emailRedirectTo: getAuthCallbackUrl(), shouldCreateUser: false },
    });
    setIsSubmitting(false);

    setMsg(error && !/signups? not allowed|user not found/i.test(error.message) ? error.message : "If that email has a Guild account, a magic sign-in link is on its way.");
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
    <form onSubmit={submit} className="mw-auth-card">
      <h2 className="mw-auth-card-title">{mode === "login" ? "Sign in" : "Create your account"}</h2>
      {mode === "signup" && (
        <label className="mt-6 block text-sm">
          Your name
          <input required minLength={2} maxLength={80} autoComplete="name" className="input mt-2" value={name} onChange={(e) => setName(e.target.value)} />
          <span className="mt-1 block text-xs text-[#b8c4d4]">Shown beside your field reports. You can change it later.</span>
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
      {mode === "signup" && (
        <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", top: "auto", width: 1, height: 1, overflow: "hidden" }}>
          <label>
            Leave this field empty
            <input type="text" name="mw_extra" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
          </label>
        </div>
      )}
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
