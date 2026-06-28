import Image from "next/image";
import Link from "next/link";
import { AccessNeededPanel } from "@/components/Cards";
import { requireLogin } from "@/lib/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { REACTION_TYPES } from "@/lib/images";

const faviconUrl =
  "https://lzeljgbudkqpbmbbbsex.supabase.co/storage/v1/object/public/site-assets/logos/MWPG_Logo_FAVICON.png";

const ranks = [
  { label: "Unranked", count: 0, position: 6 },
  { label: "Beginner", count: 1, position: 24 },
  { label: "Amateur", count: 8, position: 42 },
  { label: "Novice", count: 18, position: 60 },
  { label: "Veteran", count: 25, position: 78 },
  { label: "Master", count: 33, position: 95 },
];
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

function achievementCount(image: any, index: number) {
  const value = image?.achievement_count ?? image?.achievementCount ?? image?.achievements_count;
  if (typeof value === "number") return value;
  return [0, 3, 7, 13, 20, 28, 34, 10, 24, 31, 1, 17][index % 12];
}

function rankPosition(count: number) {
  if (count <= 0) return 12;
  if (count >= 33) return Math.min(98, 95 + Math.min(count - 33, 3));
  return 24 + ((count - 1) / 32) * (95 - 24);
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
            <p className="mw-guild-eyebrow"><Image src={faviconUrl} alt="" width={18} height={18} />The Guild Hall</p>
            <h1 className="mw-guild-page-title">The Hall is Open</h1>
            <p className="mw-guild-page-subtitle">Field reports from across the Guild. React with intent, leave feedback that teaches.</p>
          </div>

          <section className="mw-ascent-board mb-10">
            <div className="mw-ascent-heading"><p className="mw-ascent-label">The Ascent</p><p className="mw-ascent-helper">Every guildie's climb toward Master — hover a face to see their username &amp; progress.</p></div>
            <div className="mw-rank-map">
              <div className="mw-rank-line" />
              {ranks.map((rank) => (
                <div key={rank.label} className="mw-rank-marker" style={{ left: `${rank.position}%` }}>
                  <span className={`mw-rank-dot ${rank.count === 0 ? "mw-rank-dot-unranked" : ""}`} />
                  <span className={`mw-rank-label ${rank.count === 0 ? "mw-rank-label-unranked" : ""}`}>{rank.label}</span>
                </div>
              ))}
              {images.slice(0, 10).map((image, index) => {
                const name = authorName(image, index);
                const count = achievementCount(image, index);
                const top = 34 + (index % 3) * 6;
                return (
                  <div key={image.id} className={`mw-rank-avatar ${count === 0 ? "mw-rank-avatar-unranked" : ""}`} style={{ left: `${rankPosition(count)}%`, top: `${top}px` }} title={`${name} · ${count} achievements`}>
                    <img src={image.image_url} alt="" />
                    <span>{initials(name)}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h2 className="mw-recent-activity-label">Recent Activity</h2>
            <div className="flex flex-wrap items-center gap-2"><span className="mw-sort-label">Sort</span>{sortChips.map((chip, i) => <button key={chip} className={`mw-sort-chip ${i === 0 ? "mw-sort-chip-selected" : ""}`}>{chip}</button>)}</div>
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
