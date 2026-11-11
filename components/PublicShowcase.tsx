import { KeepTail } from "@/components/KeepTail";
import { fieldHonorsPublicLine } from "@/lib/public-copy";
import { getPublicShowcase } from "@/lib/public-showcase-data";
import { formatShowcaseCount, PUBLIC_SHOWCASE_STATS } from "@/lib/public-showcase";

const photoAlt = "Night sky photograph from a Guild member";

/** Live totals, and a nameless photo strip when at least one photo qualifies. */
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
        <ul className="mw-showcase-strip">
          {photos.map((photo) => (
            <li className="mw-showcase-tile" key={`${photo.imageUrl}|${photo.avatarUrl}`}>
              <img className="mw-showcase-photo" src={photo.imageUrl} alt={photoAlt} loading="lazy" decoding="async" />
              <img className="mw-showcase-avatar" src={photo.avatarUrl} alt="Profile picture" loading="lazy" decoding="async" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
