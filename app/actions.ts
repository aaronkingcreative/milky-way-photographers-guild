"use server";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function signOut() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/");
}
