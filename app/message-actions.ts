"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAccess, requireAdmin } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { MESSAGE_MAX as MAX_MESSAGE, sameMessageVersion } from "@/lib/guild-message";
function value(formData: FormData, key: string) { return String(formData.get(key) || "").trim(); }

/** Marks this version of the Message from Aaron as read. A later edit is a new version. */
export async function markGuildMessageRead(messageId: string, messageUpdatedAt: string): Promise<{ ok: boolean }> {
  const { user } = await requireAccess();
  if (!messageId || !messageUpdatedAt) return { ok: false };
  const supabase = await createServerSupabaseClient();
  const { data: message } = await supabase.from("guild_messages").select("id,updated_at").eq("id", messageId).is("archived_at", null).maybeSingle();
  if (!message || !sameMessageVersion(message.updated_at, messageUpdatedAt)) return { ok: false };
  const { error } = await supabase.from("guild_message_reads").upsert(
    { user_id: user.id, message_id: messageId, message_updated_at: message.updated_at, read_at: new Date().toISOString() },
    { onConflict: "user_id,message_id" },
  );
  if (error) { console.error("Message read mark failed", error); return { ok: false }; }
  return { ok: true };
}

/** Admin. Posts a new message (it re-opens for every member), fixes the current wording, or takes it down. */
export async function adminSaveGuildMessage(formData: FormData) {
  const { user } = await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const mode = value(formData, "mode");
  const body = value(formData, "body");
  const currentId = value(formData, "current_id");
  let status = "saved";
  if (mode === "archive") {
    if (currentId) await supabase.from("guild_messages").update({ archived_at: new Date().toISOString() }).eq("id", currentId);
    status = "removed";
  } else {
    if (!body) redirect("/admin/message?status=empty");
    if (body.length > MAX_MESSAGE) redirect("/admin/message?status=long");
    if (mode === "edit" && currentId) {
      const { error } = await supabase.from("guild_messages").update({ body }).eq("id", currentId);
      if (error) redirect("/admin/message?status=error");
      status = "edited";
    } else {
      const { error } = await supabase.from("guild_messages").insert({ body, created_by: user.id });
      if (error) redirect("/admin/message?status=error");
      if (currentId) await supabase.from("guild_messages").update({ archived_at: new Date().toISOString() }).eq("id", currentId);
      status = "posted";
    }
  }
  revalidatePath("/guild-hall");
  revalidatePath("/admin/message");
  redirect(`/admin/message?status=${status}`);
}
