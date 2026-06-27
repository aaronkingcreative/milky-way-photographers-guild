"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function UpdatePasswordForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const errorDescription = hash.get("error_description");
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    if (errorDescription) {
      setMessage(errorDescription);
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    if (accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
        if (error) {
          setMessage(error.message);
          return;
        }
        window.history.replaceState(null, "", window.location.pathname);
      });
    }
  }, [supabase]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/guild-hall");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card mx-auto max-w-md rounded-3xl p-8">
      <h1 className="text-3xl font-bold">Update your password</h1>
      <p className="mt-3 text-sm text-[#b8c4d4]">Enter a new password for your Milky Way Photographers Guild account.</p>
      <label className="mt-6 block text-sm">
        New password
        <input type="password" required minLength={6} className="input mt-2" value={password} onChange={(event) => setPassword(event.target.value)} />
      </label>
      <label className="mt-4 block text-sm">
        Confirm new password
        <input type="password" required minLength={6} className="input mt-2" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
      </label>
      {message && <p className="mt-4 text-[#f4bd61]">{message}</p>}
      <button className="btn btn-primary mt-6 w-full" disabled={isSubmitting}>{isSubmitting ? "Updating..." : "Update password"}</button>
    </form>
  );
}
