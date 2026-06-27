"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthHashHandler() {
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    if (!hash.size) return;

    const errorDescription = hash.get("error_description");
    if (errorDescription) {
      const loginUrl = new URL("/login", window.location.origin);
      loginUrl.searchParams.set("error", errorDescription);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      window.location.assign(loginUrl.toString());
      return;
    }

    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    if (!accessToken || !refreshToken) return;

    createClient()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);

        if (error) {
          const loginUrl = new URL("/login", window.location.origin);
          loginUrl.searchParams.set("error", error.message);
          window.location.assign(loginUrl.toString());
          return;
        }

        window.location.assign(hash.get("type") === "recovery" ? "/update-password" : "/field-desk");
      });
  }, []);

  return null;
}
