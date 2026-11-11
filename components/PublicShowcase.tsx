import { KeepTail } from "@/components/KeepTail";
import { PublicGuildStats } from "@/components/PublicGuildStats";
import { PublicPrintPile } from "@/components/PublicPrintPile";
import { pileLead } from "@/lib/public-copy";
import { getPublicShowcase } from "@/lib/public-showcase-data";

/** Live totals, and a nameless pile of Guild prints when at least one photo qualifies. */
export async function PublicShowcase() {
  const showcase = await getPublicShowcase();
  if (!showcase) return null;
  const { counts, photos } = showcase;

  return (
    <section className="mw-public mw-showcase" aria-labelledby="guild-so-far">
      <p id="guild-so-far" className="mw-balance mw-showcase-kicker">
        The Guild so far
      </p>
      <PublicGuildStats counts={counts} />
      {photos.length > 0 && (
        <>
          <p className="mw-showcase-pile-lead"><KeepTail text={pileLead} keep={6} /></p>
          <PublicPrintPile photos={photos} />
        </>
      )}
    </section>
  );
}
