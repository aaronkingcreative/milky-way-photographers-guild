import { getAuthCallbackUrl } from "@/lib/site-url";
import { HONEYPOT_FIELD } from "@/lib/signup-guard";
import { decideSignup } from "@/lib/signup-flow";
import { CHECK_EMAIL_MESSAGE } from "@/lib/signup-messages";
import { randomUUID } from "node:crypto";
import { sendCapiEvent } from "@/lib/analytics/meta-capi";

export type SignupResult = { ok: true; message: string; eventId?: string } | { ok: false; message: string };

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
  const eventId = randomUUID();
  // Lead goes to Meta only after a real signup. Honeypot "success" returns earlier and is not sent.
  // eventId is also returned so the browser pixel can fire the same event for dedupe.
  await reportSignupLead({ eventId, email: decision.email, firstName: decision.name.split(/\s+/)[0] || null });
  if (data?.session) return { ok: true, message: "signed_in", eventId };
  return { ok: true, message: CHECK_EMAIL_MESSAGE, eventId };
}

async function reportSignupLead(input: { eventId: string; email: string; firstName: string | null }) {
  try {
    const meta = await readRequestMeta();
    await sendCapiEvent({
      name: "Lead",
      eventId: input.eventId,
      sourceUrl: "https://milkywayphotographersguild.com/signup",
      email: input.email,
      firstName: input.firstName,
      ip: meta.ip,
      userAgent: meta.userAgent,
      fbp: meta.fbp,
      fbc: meta.fbc,
    });
  } catch {
    /* CAPI must never block signup */
  }
}

async function readRequestMeta() {
  try {
    const { cookies, headers } = await import("next/headers");
    const h = await headers();
    const c = await cookies();
    return {
      userAgent: h.get("user-agent") || "",
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      fbp: c.get("_fbp")?.value ?? null,
      fbc: c.get("_fbc")?.value ?? null,
    };
  } catch {
    return { userAgent: "", ip: null, fbp: null, fbc: null };
  }
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
