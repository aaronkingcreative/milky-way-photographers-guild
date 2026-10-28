import { WinnerPlaceholder } from "@/components/Cards";
import { requireAccess } from "@/lib/guards";
import { formatMountainDeadline } from "@/lib/iotw";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Pick = { id: string; title: string; image_url: string | null; photographer: string; location: string };

function WinnerCard({ label, pick, large = false }: { label: string; pick: Pick | null; large?: boolean }) {
  if (!pick) return <WinnerPlaceholder title={label} />;
  return (
    <div className="card overflow-hidden rounded-3xl">
      {pick.image_url && <img src={pick.image_url} alt={pick.title} className={`w-full object-cover ${large ? "h-[420px]" : "h-56"}`} />}
      <div className="p-6">
        <p className="eyebrow">{label}</p>
        <h3 className="mt-2 font-display text-2xl uppercase text-[#f0bd66]">{pick.title}</h3>
        <p className="mt-1 text-white/68">{[pick.photographer, pick.location].filter(Boolean).join(" · ")}</p>
      </div>
    </div>
  );
}

export default async function Page() {
  await requireAccess();
  const supabase = await createServerSupabaseClient();
  const { data: ballot } = await supabase.from("iotw_ballots").select("*").eq("status", "finalized").order("period_start", { ascending: false }).limit(1).maybeSingle();
  const ids = ballot ? [ballot.winner_field_report_id, ballot.second_place_field_report_id, ballot.third_place_field_report_id, ballot.photog_phavorite_field_report_id].filter(Boolean) : [];
  const picks = new Map<string, Pick>();
  if (ids.length) {
    const { data: reports } = await supabase.from("field_reports").select("id,title,country,region,guild_images(image_url),profiles(display_name,full_name)").in("id", ids);
    (reports || []).forEach((r: any) => picks.set(r.id, { id: r.id, title: r.title || "Untitled", image_url: r.guild_images?.image_url || null, photographer: r.profiles?.display_name || r.profiles?.full_name || "Guild photographer", location: [r.region, r.country].filter(Boolean).join(", ") }));
  }
  const get = (id?: string | null) => (id ? picks.get(id) || null : null);
  return (
    <section className="mx-auto max-w-7xl px-5 py-14">
      <p className="eyebrow">Guild Honors</p>
      <h1 className="mt-2 font-display text-5xl uppercase">Image of the Week</h1>
      <p className="mt-3 max-w-3xl text-white/68">
        {ballot ? `Crowned for the ballot that closed ${formatMountainDeadline(ballot.voting_closes_at)}.` : "Winners are celebrated like guild honors, with Aaron’s Photog Phavorite reserved for the Monday Moment of Envy."}
      </p>
      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2"><WinnerCard label="Winner's Throne" pick={get(ballot?.winner_field_report_id)} large /></div>
        <WinnerCard label="Aaron’s Photog Phavorite" pick={get(ballot?.photog_phavorite_field_report_id)} />
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {([["#1 Crowned Image", ballot?.winner_field_report_id], ["#2 Runner Up", ballot?.second_place_field_report_id], ["#3 Runner Up", ballot?.third_place_field_report_id]] as const).map(([label, id]) => {
          const pick = get(id);
          return pick ? <WinnerCard key={label} label={label} pick={pick} /> : <div key={label} className="card rounded-lg p-6"><p className="eyebrow">Coming soon</p><h2 className="mt-12 font-display text-2xl uppercase text-[#f0bd66]">{label}</h2></div>;
        })}
      </div>
    </section>
  );
}
