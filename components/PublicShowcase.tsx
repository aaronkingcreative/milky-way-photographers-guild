import { KeepTail } from "@/components/KeepTail";
import { PublicPrintPile } from "@/components/PublicPrintPile";
import { fieldHonorsPublicLine, pileLead } from "@/lib/public-copy";
import { getPublicShowcase } from "@/lib/public-showcase-data";
import { formatShowcaseCount, PUBLIC_SHOWCASE_STATS } from "@/lib/public-showcase";

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
      <dl className="mw-showcase-stats">
        {PUBLIC_SHOWCASE_STATS.map((stat) => (
          <div className="card mw-showcase-stat" key={stat.key}>
            <dt>{stat.label}</dt>
            <dd>{formatShowcaseCount(counts[stat.key])}</dd>
          </div>
        ))}
      </dl>
      <p className="mw-showcase-honors"><KeepTail text={fieldHonorsPublicLine} /></p>
      {photos.length > 0 && (
        <>
          <p className="mw-showcase-pile-lead"><KeepTail text={pileLead} /></p>
          <PublicPrintPile photos={photos} />
        </>
      )}
    </section>
  );
}
