import Link from "next/link";
import { AccessNeededPanel } from "@/components/Cards";
import { requireLogin } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { REACTION_TYPES } from "@/lib/images";

const ranks = ["Unranked", "Beginner", "Amateur", "Novice", "Veteran", "Master"];
const sortChips = ["Most Recent", "Most Reactions", "IOTW Contenders", "Best Stories"];
const reactionIcons: Record<string, string> = { love: "♥", wow: "✦", helpful: "◎", composition: "◫", processing: "✧", story: "☄" };

function reactionCounts(reactions: any[], imageId: string) {
  const counts = new Map<string, number>();
  reactions.filter((r) => r.image_id === imageId).forEach((r) => counts.set(r.reaction_type, (counts.get(r.reaction_type) || 0) + 1));
  return counts;
}

function authorName(image: any, index: number) {
  return image?.profiles?.display_name || ["Aaron King", "Garrett Briggs", "Josie & Jaeden", "Mabel P."][index % 4];
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "GM";
}

export default async function Page() {
  const { hasAccess } = await requireLogin();
  const supabase = await createServerSupabaseClient();
  let images: any[] = [];
  let reactions: any[] = [];

  if (hasAccess) {
    const [{ data: imgs }, { data: rx }] = await Promise.all([
      supabase.from("guild_images").select("*").is("hidden_at", null).is("deleted_at", null).not("moderation_status", "in", '("hidden","deleted")').order("created_at", { ascending: false }).limit(12),
      supabase.from("image_reactions").select("image_id,reaction_type"),
    ]);
    images = imgs || [];
    reactions = rx || [];
  }

  return (
    <section className="mw-page-wide">
      {hasAccess ? (
        <>
          <div className="mb-8">
            <p className="mw-eyebrow">The Guild Hall</p>
            <h1 className="mt-2 mw-page-title">The Hall is Open</h1>
            <p className="mt-3 mw-page-subtitle">Field reports from across the Guild. React with intent, leave feedback that teaches.</p>
          </div>

          <section className="mw-card-gold mb-10 p-7">
            <div className="mb-8 flex flex-wrap items-center gap-3"><p className="mw-eyebrow">The Ascent</p><p className="text-white/55">Every guildie's climb toward Master — hover a face</p></div>
            <div className="relative min-h-28 px-4">
              <div className="absolute left-8 right-8 top-10 h-px bg-[#e79f2b]/35" />
              <div className="relative z-10 flex justify-between">
                {ranks.map((rank, index) => {
                  const image = images[index];
                  const name = image ? authorName(image, index) : rank;
                  return <div key={rank} className="flex flex-col items-center gap-2 text-center"><div className={`${image ? "h-14 w-14 border-2" : "mt-4 h-4 w-4 border"} grid place-items-center rounded-full border-[#e79f2b] bg-[#0b1a2b] text-[#f0bd66] shadow-lg shadow-black/35`}>{image ? <img src={image.image_url} alt="" className="h-full w-full rounded-full object-cover" /> : null}</div><span className="font-display text-sm uppercase tracking-[.08em] text-[#f0bd66]">{rank}</span><span className="max-w-24 truncate text-xs text-white/45">{image ? name : ""}</span></div>;
                })}
              </div>
            </div>
          </section>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h2 className="mw-section-label">Recent Activity</h2>
            <div className="flex flex-wrap items-center gap-2"><span className="mw-meta">Sort</span>{sortChips.map((chip, i) => <button key={chip} className={`mw-filter-chip rounded-none px-4 py-2 ${i === 0 ? "border-[#e79f2b] text-[#f0bd66]" : ""}`}>{chip}</button>)}</div>
          </div>

          <div className="mx-auto max-w-[1120px] space-y-8">
            {images.map((image, index) => {
              const name = authorName(image, index);
              const counts = reactionCounts(reactions, image.id);
              const total = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
              return <article key={image.id} className="mw-card-soft overflow-hidden"><div className="flex items-center gap-3 p-5"><div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full border border-[#e79f2b]/65 bg-[#e79f2b]/10 font-display text-[#f0bd66]"><span>{initials(name)}</span></div><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold text-white">{name}</h3><span className="mw-chip-text text-[#f0bd66]">Veteran</span>{index === 0 && <span className="rounded-full border border-[#e79f2b]/60 px-2 py-0.5 mw-chip-text text-[.68rem] text-[#f0bd66]">☄ 10y</span>}</div><p className="text-sm text-white/55">{new Date(image.created_at).toLocaleDateString()} · {[image.specific_location_name, image.state_or_province, image.country].filter(Boolean).join(", ") || "Dark sky field report"}</p></div></div><Link href={`/images/${image.id}`}><img src={image.image_url} alt={image.title || "Guild image"} className="max-h-[720px] w-full object-cover" /></Link><div className="space-y-4 p-5"><h3 className="mw-section-title text-white">{image.title}</h3><p className="mw-body line-clamp-3">{image.short_story || image.what_went_well || "A fresh field report from under the Milky Way, ready for thoughtful reactions and craft feedback."}</p><div className="flex flex-wrap items-center gap-2">{REACTION_TYPES.slice(0, 4).map(([type, label]) => <span key={type} className="mw-reaction-chip"><span className="text-[#f0bd66]">{reactionIcons[type]}</span>{label}<span className="opacity-70">{counts.get(type) || 0}</span></span>)}<span className="ml-auto text-sm text-white/55">{total} total reactions</span></div><Link href={`/images/${image.id}`} className="mw-btn-secondary rounded-sm">Open &amp; Comment</Link></div></article>;
            })}
            {images.length === 0 && <div className="mw-card-soft p-8 text-center text-white/60">The Hall is ready. Community field reports will appear here after members submit images.</div>}
          </div>
        </>
      ) : <div className="mt-8"><AccessNeededPanel /></div>}
    </section>
  );
}
