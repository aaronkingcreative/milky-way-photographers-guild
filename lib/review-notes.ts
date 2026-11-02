/**
 * Claim review notes are private: a member reads only notes on their own claims, admins read all.
 * The review_notes column is not directly readable; it comes from the claim_review_notes() function.
 */
export async function fetchReviewNotes(supabase: any, ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const out = new Map<string, string>();
  if (!unique.length) return out;
  const { data, error } = await supabase.rpc("claim_review_notes", { p_ids: unique });
  if (error) { console.error("claim_review_notes failed", error); return out; }
  for (const row of Array.isArray(data) ? data : []) if (row?.claim_id && row.review_notes) out.set(row.claim_id, row.review_notes);
  return out;
}

export async function withReviewNotes<T extends { id: string }>(supabase: any, rows: T[] | null | undefined): Promise<(T & { review_notes: string | null })[]> {
  const list = rows || [];
  const notes = await fetchReviewNotes(supabase, list.map((r) => r.id));
  return list.map((r) => ({ ...r, review_notes: notes.get(r.id) ?? null }));
}
