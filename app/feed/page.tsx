import Image from "next/image";
import Link from "next/link";
import { ImageGrid } from "@/components/images/ImageGrid";
import { requireAccess } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchHonorCounts, fetchWinningImageIds, rankLabelForCount } from "@/lib/ranks";

const filters = [
  ["all", "All Submissions"],
  ["contenders", "IOTW Contenders"],
  ["winners", "Image of the Week"],
  ["mine", "My Field Reports"],
] as const;

export default async function Page({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { user } = await requireAccess();
  const { filter: rawFilter } = await searchParams;
  const filter = filters.some(([key]) => key === rawFilter) ? rawFilter! : "all";
  const supabase = await createServerSupabaseClient();
  const [{ data: images }, { data: reactions }, winners] = await Promise.all([
    supabase
      .from("guild_images")
      .select("*, profiles:member_profiles(display_name,full_name,avatar_url,avatar_path)")
      .is("hidden_at", null)
      .is("deleted_at", null)
      .not("moderation_status", "in", '("hidden","deleted")')
      .order("created_at", { ascending: false })
      .limit(60),
    supabase.from("image_reactions").select("image_id,reaction_type"),
    fetchWinningImageIds(supabase),
  ]);
  const all = images || [];
  const visible = all.filter((image: any) => {
    if (filter === "contenders") return image.is_weekly_candidate;
    if (filter === "winners") return winners.has(image.id);
    if (filter === "mine") return image.user_id === user.id;
    return true;
  });
  const honorCounts = await fetchHonorCounts(supabase, [...new Set(visible.map((image: any) => image.user_id).filter(Boolean))] as string[]);
  const decorated = visible.map((image: any) => ({
    ...image,
    is_iotw_winner: winners.has(image.id),
    photographer_rank: rankLabelForCount(honorCounts.get(image.user_id) || 0),
  }));

  return (
    <section className="mw-page-wide">
      <div className="mb-[30px] flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mw-prototype-eyebrow mb-2">
            <Image src="/launch/mwpg/MWPG_Logo_FAVICON.png" alt="" width={20} height={20} />
            <span>The Guild Gallery</span>
          </div>
          <h1 className="mw-prototype-title">Field Reports from the Dark</h1>
          <p className="mw-prototype-subtitle">Every image is a night under the Milky Way.</p>
          <nav className="mt-6 flex flex-wrap gap-2.5" aria-label="Filter the gallery">
            {filters.map(([key, label]) => (
              <Link key={key} href={key === "all" ? "/feed" : `/feed?filter=${key}`} aria-current={filter === key ? "page" : undefined} className={`mw-filter-chip px-4 py-2 ${filter === key ? "is-active" : ""}`}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <Link className="mw-btn-primary rounded-sm" href="/submit">
          + New Field Report
        </Link>
      </div>
      <ImageGrid images={decorated} reactions={reactions || []} emptyLabel={filter === "all" ? undefined : "Nothing here yet. Try another filter."} />
    </section>
  );
}
