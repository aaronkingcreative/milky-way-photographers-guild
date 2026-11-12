import { requireAccess } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { forumCategory } from "@/lib/forum";
import { fetchOwnPhotos } from "@/lib/forum-photos";
import { ForumCrumbs, ForumHead } from "@/components/forum/ForumHead";
import { NewThreadForm } from "@/components/forum/NewThreadForm";

export const metadata = { title: "Start a Discussion | Guild Forum" };

export default async function NewThreadPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { user } = await requireAccess();
  const category = forumCategory((await searchParams).category) || forumCategory("general")!;
  const supabase = await createServerSupabaseClient();
  const photos = await fetchOwnPhotos(supabase, user?.id);
  return (
    <section className="mw-forum-shell">
      <ForumCrumbs items={[{ label: "Forum", href: "/forum" }, { label: category.label, href: `/forum/${category.slug}` }, { label: category.private ? "New trip" : "New discussion" }]} />
      <ForumHead eyebrow="The Guild Forum" title={category.private ? "Plan a Trip" : "Start a Discussion"} subtitle={category.private ? <>Members see your title, teaser and name. Only the people you let in see the&nbsp;posts.</> : <>Every reply shows in order under your opening post, so give the Guild enough to work&nbsp;with.</>} />
      <NewThreadForm category={category.slug} photos={photos} />
    </section>
  );
}
