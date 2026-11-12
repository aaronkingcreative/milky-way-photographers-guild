"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAccess, requireAdmin } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { forumCategory, forumErrorMessage, forumPageCount } from "@/lib/forum";

export type ForumFormState = { error?: string; ok?: boolean; nonce?: number };

function field(formData: FormData, key: string) { return String(formData.get(key) || ""); }
function optionalId(formData: FormData, key: string) {
  const v = field(formData, key).trim();
  return /^[0-9a-f-]{36}$/i.test(v) ? v : null;
}

export async function createThread(_prev: ForumFormState, formData: FormData): Promise<ForumFormState> {
  await requireAccess();
  const category = forumCategory(field(formData, "category"));
  if (!category) return { error: "Pick a category.", nonce: Date.now() };
  const title = field(formData, "title").trim();
  const body = field(formData, "body").trim();
  if (title.length < 4) return { error: "Give your discussion a title of at least 4 characters.", nonce: Date.now() };
  if (!body) return { error: "Write something to open the discussion.", nonce: Date.now() };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("forum_create_thread", { p_category: category.slug, p_title: title, p_body: body, p_image_id: optionalId(formData, "image_id") });
  if (error || !data) return { error: forumErrorMessage(error), nonce: Date.now() };
  revalidatePath("/forum");
  revalidatePath("/guild-hall");
  redirect(`/forum/t/${data}`);
}

export async function replyToThread(_prev: ForumFormState, formData: FormData): Promise<ForumFormState> {
  await requireAccess();
  const threadId = optionalId(formData, "thread_id");
  const body = field(formData, "body").trim();
  if (!threadId) return { error: "That discussion is gone.", nonce: Date.now() };
  if (!body) return { error: "Write your reply first.", nonce: Date.now() };
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("forum_reply", { p_thread_id: threadId, p_body: body, p_quote_post_id: optionalId(formData, "quote_post_id"), p_image_id: optionalId(formData, "image_id") });
  if (error || !data) return { error: forumErrorMessage(error), nonce: Date.now() };
  const { count } = await supabase.from("forum_posts").select("id", { count: "exact", head: true }).eq("thread_id", threadId).is("deleted_at", null);
  const page = forumPageCount(count || 1);
  revalidatePath("/forum", "layout");
  revalidatePath("/guild-hall");
  redirect(`/forum/t/${threadId}${page > 1 ? `?page=${page}` : ""}#post-${data}`);
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
