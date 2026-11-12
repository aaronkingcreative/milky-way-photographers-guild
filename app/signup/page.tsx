import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";
import { PublicShowcase } from "@/components/PublicShowcase";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { issueFormToken } from "@/lib/signup-guard";
import { signupOffer, signupStorageNote } from "@/lib/public-copy";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/guild-hall");
  return (
    <div className="mw-public">
      <AuthShell eyebrow="Join the Guild" title="Shoot the night with people who get it" offer={signupOffer} note={signupStorageNote}>
        <Suspense>
          <AuthForm mode="signup" formToken={issueFormToken()} />
        </Suspense>
      </AuthShell>
      <Suspense fallback={null}>
        <PublicShowcase />
      </Suspense>
    </div>
  );
}
