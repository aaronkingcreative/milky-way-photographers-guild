import { ImageCard } from "./ImageCard";
export function ImageGrid({ images, reactions, emptyLabel }: { images: any[]; reactions: any[]; emptyLabel?: string }) {
  if (!images?.length) return <div className="claude-section p-10 text-center text-white/65">{emptyLabel || "No Guild field reports have been filed yet."}</div>;
  return <div className="gallery-masonry">{images.map((i) => <ImageCard key={i.id} image={i} reactions={reactions} />)}</div>;
}
