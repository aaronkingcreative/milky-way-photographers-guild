"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAuthCallbackUrl } from "@/lib/site-url";
import { signUpMember } from "@/app/signup/actions";
import { emailFieldError } from "@/lib/email-address";
import { KeepTail } from "@/components/KeepTail";
import { CHECK_EMAIL_MESSAGE, SIGNUP_REASSURANCE } from "@/lib/signup-messages";

const errorMessages: Record<string, string> = {
  auth_callback_failed: "We could not finish signing you in. Please request a new email link and try again.",
  auth_callback_missing_code: "The sign-in link was missing a required code. Please request a new email link.",
};

export function AuthForm({ mode, formToken }: { mode: "login" | "signup"; formToken?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [messageTone, setMessageTone] = useState<"error" | "status">("status");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  const authError = searchParams.get("error");
  const queryMessage = authError ? errorMessages[authError] || authError : "";
  const displayMessage = msg || queryMessage;
  const displayTone = msg ? messageTone : queryMessage ? "error" : "status";

  function show(message: string, tone: "error" | "status") {
    setMsg(message);
    setMessageTone(tone);
  }

  function syncEmailError(value: string) {
    const problem = emailFieldError(value);
    setEmailError(problem ?? "");
    return problem;
  }

  function syncPasswordError(value: string) {
    if (mode !== "signup") return null;
    const problem = value.length < 6 ? "Use at least 6 characters." : null;
    setPasswordError(problem ?? "");
    return problem;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const trimmedEmail = email.trim();
    const problem = syncEmailError(trimmedEmail);
    if (problem) {
      emailRef.current?.focus();
      return;
    }
    if (syncPasswordError(password)) return;

    setIsSubmitting(true);

    if (mode === "signup") {
      const formData = new FormData();
      formData.set("name", name.trim());
      formData.set("email", trimmedEmail);
      formData.set("password", password);
      formData.set("mw_extra", honeypot);
      formData.set("form_token", formToken || "");
      const result = await signUpMember(formData);
      if (!result.ok || result.message !== "signed_in") {
        setIsSubmitting(false);
        show(result.message, result.ok ? "status" : "error");
        return;
      }
    } else {
      const res = await createClient().auth.signInWithPassword({ email: trimmedEmail, password });
      if (res.error) {
        setIsSubmitting(false);
        show(res.error.message, "error");
        return;
      }
    }

    window.location.assign("/guild-hall");
  }

  async function sendMagicLink() {
    setMsg("");
    const trimmedEmail = email.trim();
    const problem = syncEmailError(trimmedEmail);
    if (problem) {
      emailRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    const { error } = await createClient().auth.signInWithOtp({
      email: trimmedEmail,
      options: { emailRedirectTo: getAuthCallbackUrl(), shouldCreateUser: false },
    });
    setIsSubmitting(false);

    if (error && !/signups? not allowed|user not found/i.test(error.message)) {
      show(error.message, "error");
      return;
    }
    show("If that email has a Guild account, a magic sign-in link is on its way.", "status");
  }

  async function sendPasswordReset() {
    setMsg("");
    const trimmedEmail = email.trim();
    const problem = syncEmailError(trimmedEmail);
    if (problem) {
      emailRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    const { error } = await createClient().auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: getAuthCallbackUrl("/update-password"),
    });
    setIsSubmitting(false);

    show(error ? error.message : "Check your email for a password reset link.", error ? "error" : "status");
  }

  async function resendConfirmation() {
    setMsg("");
    const trimmedEmail = email.trim();
    const problem = syncEmailError(trimmedEmail);
    if (problem) {
      emailRef.current?.focus();
      return;
    }
    setIsSubmitting(true);
    const { error } = await createClient().auth.resend({
      type: "signup",
      email: trimmedEmail,
      options: { emailRedirectTo: getAuthCallbackUrl() },
    });
    setIsSubmitting(false);
    show(error ? error.message : "I sent another confirmation email. Check your inbox.", error ? "error" : "status");
  }

  const emailErrorId = "auth-email-error";
  const statusId = "auth-status";

  return (
    <form onSubmit={submit} noValidate className="mw-auth-card">
      <h2 className="mw-auth-card-title"><KeepTail text={mode === "login" ? "Sign in" : "Create your account"} /></h2>
      {mode === "signup" && (
        <p className="mt-4 text-base leading-7 text-[#e7eef6]">
          {SIGNUP_REASSURANCE} <Link className="mw-auth-link" href="/privacy">privacy&nbsp;notes</Link> <span className="mw-keep">and the <Link className="mw-auth-link" href="/terms">terms</Link>.</span>
        </p>
      )}
      {mode === "signup" && (
        <label className="mt-6 block text-base" htmlFor="auth-name">
          Your name
          <input
            id="auth-name"
            name="name"
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            className="input mt-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <span className="mw-auth-helper">Shown beside your field reports. You can change it later.</span>
        </label>
      )}
      <label className="mt-6 block text-base" htmlFor="auth-email">
        Email
        <input
          ref={emailRef}
          id="auth-email"
          name="email"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="email"
          required
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? emailErrorId : undefined}
          className="input mt-2"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) syncEmailError(e.target.value);
          }}
          onBlur={() => syncEmailError(email)}
        />
      </label>
      {emailError ? (
        <p id={emailErrorId} className="mw-field-error" role="alert">
          {emailError}
        </p>
      ) : null}
      <label className="mt-4 block text-base" htmlFor="auth-password">
        Password
        <input
          id="auth-password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={mode === "signup" ? "auth-password-help" : undefined}
          className="input mt-2"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (passwordError) syncPasswordError(e.target.value);
          }}
          onBlur={() => syncPasswordError(password)}
        />
      </label>
      {mode === "signup" ? (
        <span id="auth-password-help" className="mt-2 block text-base leading-6 text-[#d5deea]">At least 6 characters.</span>
      ) : null}
      {passwordError ? (
        <p className="mw-field-error" role="alert">{passwordError}</p>
      ) : null}
      {mode === "signup" && (
        <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", top: "auto", width: 1, height: 1, overflow: "hidden" }}>
          <label>
            Leave this field empty
            <input type="text" name="mw_extra" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
          </label>
        </div>
      )}
      <div aria-live="assertive" aria-atomic="true">
        {displayMessage ? (
          <p id={statusId} className={displayTone === "error" ? "mw-form-error" : "mw-form-success"} role={displayTone === "error" ? "alert" : "status"}>
            {displayMessage}
          </p>
        ) : null}
      </div>
      <button className="btn btn-primary mt-6 w-full" disabled={isSubmitting} aria-busy={isSubmitting}>
        {isSubmitting ? (mode === "login" ? "Signing you in..." : "Please wait...") : mode === "login" ? "Sign in" : "Create account"}
      </button>
      {mode === "signup" && displayMessage === CHECK_EMAIL_MESSAGE ? (
        <button type="button" className="mw-auth-link mt-4 text-left" onClick={resendConfirmation} disabled={isSubmitting}>
          Resend the confirmation email
        </button>
      ) : null}
      {mode === "login" && (
        <div className="mt-4 flex flex-col gap-2 text-base text-[#d5deea]">
          <button type="button" className="mw-auth-link text-left" onClick={sendPasswordReset} disabled={isSubmitting}>Forgot password?</button>
          <button type="button" className="mw-auth-link text-left" onClick={sendMagicLink} disabled={isSubmitting}>Email me a magic link</button>
        </div>
      )}
      <p className="mt-4 text-base text-[#d5deea]">
        {mode === "login" ? (
          <>Need <span className="mw-keep">an account? <Link className="mw-auth-link" href="/signup">Sign up</Link></span></>
        ) : (
          <>Already have <span className="mw-keep">access? <Link className="mw-auth-link" href="/login">Sign in</Link></span></>
        )}
      </p>
      {mode === "login" && (
        <p className="mt-4 text-base text-[#d5deea]">
          <Link className="mw-auth-link" href="/privacy">Privacy notes</Link>
          {" and the "}
          <Link className="mw-auth-link" href="/terms">terms</Link>
        </p>
      )}
    </form>
  );
}
