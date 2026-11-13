import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { KeepTail } from "@/components/KeepTail";
import { confirmCopy, defaultNext, parseConfirmType, safeNextPath } from "@/lib/auth-confirm";
import { confirmEmailLink } from "./actions";
import { ConfirmButton } from "./ConfirmButton";

export const metadata: Metadata = { title: "Continue | Milky Way Photographers Guild", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Search = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function Page({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const type = parseConfirmType(one(params.type)) ?? "email";
  const tokenHash = one(params.token_hash) ?? "";
  const error = one(params.error);
  const copy = confirmCopy(type);
  const next = safeNextPath(one(params.next), defaultNext(type));

  if (error || !tokenHash) {
    const isReset = type === "recovery";
    return (
      <AuthShell fitCopy eyebrow={copy.eyebrow} title="That link has run out" intro="Email links work once and expire after an hour. Grab a fresh one and you'll be right back.">
        <div className="mw-auth-card">
          <h2 className="mw-auth-card-title"><KeepTail text="Get a fresh link" /></h2>
          <p className="mt-4 text-base leading-7 text-[#e7eef6]">
            <KeepTail text={isReset ? "On the sign in page, enter your email and tap Forgot password." : type === "email" || type === "signup" ? "Try signing in. If your email still needs confirming, you'll get the option to send a fresh one." : "Head to the sign in page and ask for a new link."} />
          </p>
          <Link href="/login" className="mw-btn-primary mt-6 w-full">Go to sign in</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell fitCopy eyebrow={copy.eyebrow} title={copy.title} intro={copy.intro}>
      <form action={confirmEmailLink} className="mw-auth-card">
        <h2 className="mw-auth-card-title"><KeepTail text="One tap to finish" /></h2>
        <p className="mt-4 text-base leading-7 text-[#e7eef6]"><KeepTail text="This extra step keeps email scanners from using up your link before you do." /></p>
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="next" value={next} />
        <ConfirmButton label={copy.button} />
      </form>
    </AuthShell>
  );
}
