import Image from "next/image";
import Link from "next/link";
import { ImageGrid } from "@/components/images/ImageGrid";
import { requireAccess } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function Page() {
  await requireAccess();
  const supabase = await createServerSupabaseClient();
  const [{ data: images }, { data: reactions }] = await Promise.all([
    supabase
      .from("guild_images")
      .select("*, profiles(display_name,full_name,email,avatar_url,avatar_path)")
      .is("hidden_at", null)
      .is("deleted_at", null)
      .not("moderation_status", "in", '("hidden","deleted")')
      .order("created_at", { ascending: false })
      .limit(60),
    supabase.from("image_reactions").select("image_id,reaction_type"),
  ]);

  return (
    <section className="mw-page-wide">
      <div className="mb-[30px] flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mw-prototype-eyebrow mb-2">
            <Image src="/launch/mwpg/MWPG_Logo_FAVICON.png" alt="" width={20} height={20} />
            <span>The Guild Gallery</span>
          </div>
          <h1 className="mw-prototype-title">Field Reports from the Dark</h1>
          <p className="mw-prototype-subtitle">
            Every image a night under the Milky Way. React with intent, leave feedback that teaches.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <span className="mw-filter-chip px-4 py-2">All Submissions</span>
            <span className="mw-filter-chip px-4 py-2">IOTW Contenders</span>
            <span className="mw-filter-chip px-4 py-2">Hall of Envy</span>
            <span className="mw-filter-chip px-4 py-2">My Field Reports</span>
          </div>
        </div>
        <Link className="mw-btn-primary rounded-sm" href="/submit">
          + New Field Report
        </Link>
      </div>
      <ImageGrid images={images || []} reactions={reactions || []} />
    </section>
  );
}
