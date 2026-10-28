import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/guild-hall");
  return (
    <section className="px-5 py-20">
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </section>
  );
}
