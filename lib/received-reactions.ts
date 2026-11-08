/**
 * Reactions received on the signed-in member's own reports.
 * Counted on the server with an exact count so a PostgREST row cap cannot
 * drop reactions that belong to this member. RLS still decides which rows
 * the member is allowed to read. Deleted reports are excluded.
 */
export async function countReceivedReactions(
  supabase: { from: (table: string) => any },
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("image_reactions")
    .select("id, guild_images!inner(user_id, deleted_at)", { count: "exact", head: true })
    .eq("guild_images.user_id", userId)
    .is("guild_images.deleted_at", null);
  if (error || count == null) return 0;
  return count;
}
