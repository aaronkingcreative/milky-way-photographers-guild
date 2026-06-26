import { redirect } from "next/navigation";import { getSessionState } from "@/lib/supabase/server";
export async function requireLogin(){const state=await getSessionState();if(!state.user) redirect("/login");return state}
export async function requireAccess(){const state=await requireLogin();if(!state.hasAccess) redirect("/dashboard");return state}
export async function requireAdmin(){const state=await requireLogin();if(!state.isAdmin) redirect("/dashboard");return state}
