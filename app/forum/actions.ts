"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAccess, requireAdmin } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { forumCategory, forumErrorMessage, forumPostHref } from "@/lib/forum";
import { forumCooldownLeft, isForumCooldownError } from "@/lib/forum-cooldown";

/** retryAfter is the whole seconds left on the post cooldown. postId and href point at a reply that just saved. */
export type ForumFormState = { error?: string; ok?: boolean; nonce?: number; retryAfter?: number; postId?: string; href?: string };

function field(formData: FormData, key: string) { return String(formData.get(key) || ""); }
/** A rejected post. On the cooldown it also says how many seconds are left, read from the member's last post. */
async function rejected(supabase: any, userId: string | null | undefined, error: any): Promise<ForumFormState> {
  const message = forumErrorMessage(error);
  if (!isForumCooldownError(message) || !userId) return { error: message, nonce: Date.now() };
  const { data } = await supabase.from("forum_posts").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return { error: message, retryAfter: forumCooldownLeft(data?.created_at ?? null), nonce: Date.now() };
}

function optionalId(formData: FormData, key: string) {
  const v = field(formData, key).trim();
  return /^[0-9a-f-]{36}$/i.test(v) ? v : null;
}

export async function createThread(_prev: ForumFormState, formData: FormData): Promise<ForumFormState> {
  const { user } = await requireAccess();
  const category = forumCategory(field(formData, "category"));
  if (!category) return { error: "Pick a category.", nonce: Date.now() };
  const title = field(formData, "title").trim();
  const body = field(formData, "body").trim();
  if (title.length < 4) return { error: "Give your discussion a title of at least 4 characters.", nonce: Date.now() };
  if (!body) return { error: "Write something to open the discussion.", nonce: Date.now() };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("forum_create_thread", { p_category: category.slug, p_title: title, p_body: body, p_image_id: optionalId(formData, "image_id") });
  if (error || !data) return rejected(supabase, user?.id, error);
  revalidatePath("/forum");
  revalidatePath("/guild-hall");
  redirect(`/forum/t/${data}`);
}

export async function replyToThread(_prev: ForumFormState, formData: FormData): Promise<ForumFormState> {
  const { user } = await requireAccess();
  const threadId = optionalId(formData, "thread_id");
  const body = field(formData, "body").trim();
  if (!threadId) return { error: "That discussion is gone.", nonce: Date.now() };
  if (!body) return { error: "Write your reply first.", nonce: Date.now() };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("forum_reply", { p_thread_id: threadId, p_body: body, p_quote_post_id: optionalId(formData, "quote_post_id"), p_image_id: optionalId(formData, "image_id") });
  if (error || !data) return rejected(supabase, user?.id, error);
  const { count } = await supabase.from("forum_posts").select("id", { count: "exact", head: true }).eq("thread_id", threadId).is("deleted_at", null);
  // Only this thread re-renders in the reply's response. No redirect, so the page does not load twice.
  revalidatePath(`/forum/t/${threadId}`);
  revalidatePath("/forum");
  revalidatePath("/guild-hall");
  return { ok: true, postId: String(data), href: forumPostHref(threadId, String(data), Math.max(0, (count || 1) - 1)), nonce: Date.now() };
}

export async function editPost(_prev: ForumFormState, formData: FormData): Promise<ForumFormState> {
  await requireAccess();
  const postId = optionalId(formData, "post_id");
  const body = field(formData, "body").trim();
  if (!postId) return { error: "That post is gone.", nonce: Date.now() };
  if (!body) return { error: "A post cannot be empty. Use Delete to remove it.", nonce: Date.now() };
  const title = formData.has("title") ? field(formData, "title").trim() : null;
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("forum_edit_post", { p_post_id: postId, p_body: body, p_image_id: optionalId(formData, "image_id"), p_title: title });
  if (error) return { error: forumErrorMessage(error), nonce: Date.now() };
  revalidatePath("/forum", "layout");
  return { ok: true, nonce: Date.now() };
}

export async function deletePost(formData: FormData) {
  await requireAccess();
  const postId = optionalId(formData, "post_id");
  const threadId = optionalId(formData, "thread_id");
  if (!postId) return;
  const supabase = await createServerSupabaseClient();
  const { data: stillThread, error } = await supabase.rpc("forum_delete_post", { p_post_id: postId });
  revalidatePath("/forum", "layout");
  revalidatePath("/guild-hall");
  if (error) redirect(threadId ? `/forum/t/${threadId}?error=delete` : "/forum");
  redirect(stillThread ? `/forum/t/${stillThread}` : "/forum?removed=1");
}

export async function flagPost(_prev: ForumFormState, formData: FormData): Promise<ForumFormState> {
  await requireAccess();
  const postId = optionalId(formData, "post_id");
  if (!postId) return { error: "That post is gone.", nonce: Date.now() };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("forum_flag_post", { p_post_id: postId, p_reason: field(formData, "reason").trim() || null });
  if (error) return { error: forumErrorMessage(error), nonce: Date.now() };
  return { ok: true, nonce: Date.now() };
}

export async function moderateThread(formData: FormData) {
  await requireAdmin();
  const threadId = optionalId(formData, "thread_id");
  const action = field(formData, "action");
  if (!threadId) return;
  const supabase = await createServerSupabaseClient();
  await supabase.rpc("forum_moderate_thread", { p_thread_id: threadId, p_action: action });
  revalidatePath("/forum", "layout");
  revalidatePath("/guild-hall");
  if (action === "remove") redirect("/forum?removed=1");
  redirect(`/forum/t/${threadId}`);
}

export async function resolveFlag(formData: FormData) {
  await requireAdmin();
  const flagId = optionalId(formData, "flag_id");
  if (!flagId) return;
  const supabase = await createServerSupabaseClient();
  await supabase.rpc("forum_resolve_flag", { p_flag_id: flagId });
  revalidatePath("/admin/forum");
}
