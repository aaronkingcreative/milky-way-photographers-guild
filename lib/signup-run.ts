import { getAuthCallbackUrl } from "@/lib/site-url";
import { HONEYPOT_FIELD } from "@/lib/signup-guard";
import { decideSignup } from "@/lib/signup-flow";
import { CHECK_EMAIL_MESSAGE } from "@/lib/signup-messages";

export type SignupResult = { ok: true; message: string } | { ok: false; message: string };

type SignUpArgs = {
  email: string;
  password: string;
  options: { data: { full_name: string }; emailRedirectTo: string };
};

export type SignupRunnerDeps = {
  /** Test clock only. The server action never accepts this from the browser. */
  now?: number;
  userAgent?: string;
  signUp?: (args: SignUpArgs) => Promise<{ data: { session: unknown } | null; error: { message: string } | null }>;
};

/** Runs the signup decision, then calls Supabase only when the decision says proceed. */
export async function runSignup(formData: FormData, deps?: SignupRunnerDeps): Promise<SignupResult> {
  const decision = decideSignup({
    name: String(formData.get("name") || ""),
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
    honeypot: String(formData.get(HONEYPOT_FIELD) || ""),
    token: formData.get("form_token"),
    now: deps?.now,
  });

  if (decision.outcome === "silent") {
    const ua = deps?.userAgent ?? (await readUserAgent());
    console.info("[signup-guard] dropped", { reason: decision.reason, ua: ua.slice(0, 120) });
    return { ok: true, message: decision.message };
  }
  if (decision.outcome === "reject") return { ok: false, message: decision.message };

  const signUp = deps?.signUp ?? defaultSignUp;

  const { data, error } = await signUp({
    email: decision.email,
    password: decision.password,
    options: { data: { full_name: decision.name }, emailRedirectTo: getAuthCallbackUrl() },
  });
  if (error) return { ok: false, message: error.message };
  if (data?.session) return { ok: true, message: "signed_in" };
  return { ok: true, message: CHECK_EMAIL_MESSAGE };
}

async function readUserAgent() {
  const { headers } = await import("next/headers");
  return (await headers()).get("user-agent") || "";
}

async function defaultSignUp(args: SignUpArgs) {
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp(args);
  return { data, error };
}
