import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function isSafeNextPath(next: string | null) {
  return Boolean(next?.startsWith("/") && !next.startsWith("//"));
}

function redirectWithLoginError(requestUrl: URL, message: string) {
  const redirectUrl = new URL("/login", requestUrl.origin);
  redirectUrl.searchParams.set("error", message);
  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return redirectWithLoginError(requestUrl, "auth_callback_failed");
    }

    const next = requestUrl.searchParams.get("next");
    return NextResponse.redirect(new URL(isSafeNextPath(next) ? next! : "/guild-hall", requestUrl.origin));
  }

  if (error || errorDescription) {
    return redirectWithLoginError(requestUrl, errorDescription || error || "auth_callback_failed");
  }

  return redirectWithLoginError(requestUrl, "auth_callback_missing_code");
}
