import type { OwnPhoto } from "@/components/forum/PhotoPicker";

/** The viewer's own visible Guild photos, newest first, for the optional photo attachment. */
export async function fetchOwnPhotos(supabase: any, userId: string | null | undefined): Promise<OwnPhoto[]> {
  if (!userId) return [];
  const { data } = await supabase
    .from("guild_images")
    .select("id,title,image_url,moderation_status")
    .eq("user_id", userId)
    .is("hidden_at", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(40);
  return (data || []).filter((p: any) => !["hidden", "deleted"].includes(p.moderation_status)).map((p: any) => ({ id: p.id, title: p.title || "Untitled", image_url: p.image_url || null }));
}
