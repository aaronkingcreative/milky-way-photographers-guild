import { notFound } from "next/navigation";
import { ImageDetail } from "@/components/images/ImageDetail";
import { requireAccess } from "@/lib/guards";
import { getMemberStats } from "@/lib/member-stats";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function Page({ params, searchParams }: { params: Promise<{ imageId: string }>, searchParams: Promise<{ from?: string }> }) {
  const { user } = await requireAccess();
  const { imageId } = await params;
  const { from } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const [{ data: image }, { data: reactions }, { data: comments }] = await Promise.all([
    supabase.from("guild_images").select("*, profiles(display_name,avatar_url,avatar_path,full_name,email)").eq("id", imageId).maybeSingle(),
    supabase.from("image_reactions").select("*").eq("image_id", imageId),
    supabase.from("image_comments").select("*").eq("image_id", imageId).is("deleted_at", null).order("created_at", { ascending: true }),
  ]);
  if (!image || image.deleted_at || image.hidden_at) notFound();
  const authorStats = await getMemberStats(supabase, { id: image.user_id, email: image.profiles?.email, user_metadata: { full_name: image.profiles?.full_name, name: image.profiles?.display_name } });
  return <ImageDetail image={image} authorStats={authorStats} reactions={reactions || []} comments={comments || []} canEditCandidate={image.user_id === user.id} from={from} />;
}
