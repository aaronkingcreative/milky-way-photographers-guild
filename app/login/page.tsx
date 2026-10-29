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
    <AuthShell eyebrow="Welcome back" title="The sky is waiting" intro="Sign in to see what the Guild shot this week.">
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}
