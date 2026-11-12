import { requireAccess } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loadForumIndex } from "@/lib/forum-index";
import { ForumHomeView } from "@/components/forum/ForumViews";

export const metadata = { title: "Forum | Milky Way Photographers Guild" };

export default async function ForumHome({ searchParams }: { searchParams: Promise<{ removed?: string }> }) {
  const [, { removed }, supabase] = await Promise.all([requireAccess(), searchParams, createServerSupabaseClient()]);
  const data = await loadForumIndex(supabase);
  return <ForumHomeView data={data} removed={Boolean(removed)} />;
}
