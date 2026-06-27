import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export default function Page() {
  return (
    <section className="px-5 py-20">
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </section>
  );
}
