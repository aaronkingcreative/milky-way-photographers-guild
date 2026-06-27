import { redirect } from "next/navigation";import { getSessionState } from "@/lib/supabase/server";
export async function requireLogin(){const state=await getSessionState();if(!state.user) redirect("/login");return state}
export async function requireAccess(){const state=await requireLogin();if(!state.hasAccess) redirect("/guild-hall");return state}
export async function requireAdmin(){const state=await requireLogin();if(!state.isAdmin) redirect("/guild-hall");return state}
