import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/guild-hall");
  return (
    <AuthShell eyebrow="Join the Guild" title="Shoot the night with people who get it" intro="Share field reports, earn honors, and climb the Ascent.">
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </AuthShell>
  );
}
