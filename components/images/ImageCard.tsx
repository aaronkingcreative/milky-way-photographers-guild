"use client";
import Link from "next/link";
import { getAvatarDisplay, publicMemberName } from "@/lib/avatar";

const glyphs: Record<string, string> = { love: "♥", wow: "✦", helpful: "◎", composition: "◫", processing: "✧", story: "☄" };

function Placeholder() {
  return (
    <div className="grid aspect-[4/3] place-items-center bg-[#06101c] text-center">
      <div>
        <p className="font-display text-3xl text-[#f0bd66]">✦</p>
        <p className="mt-2 text-sm text-white/45">Image pending</p>
      </div>
    </div>
  );
}

function aspectFor(image: any) {
  const w = Number(image.image_width) || 0;
  const h = Number(image.image_height) || 0;
  if (!w || !h) return undefined;
  return Math.min(2.2, Math.max(0.62, w / h));
}

function placeLine(image: any) {
  return [image.state_or_province, image.country].filter(Boolean).join(", ");
}

export function ImageCard({ image, reactions }: { image: any; reactions?: any[] }) {
  const mine = reactions?.filter((r) => r.image_id === image.id) || [];
  const total = mine.length;
  const top = [...new Set(mine.map((r) => r.reaction_type))].slice(0, 3);
  const name = publicMemberName(image.profiles?.display_name, image.profiles?.full_name, image.display_name, image.photographer_name);
  const avatar = getAvatarDisplay({ avatarPath: image.profiles?.avatar_path, avatarUrl: image.profiles?.avatar_url, displayName: name });
  const src = image.image_url;
  const ratio = aspectFor(image);
  const date = image.capture_date ? new Date(image.capture_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
  return (
    <article className="group relative mw-image-card">
      <Link href={`/images/${image.id}`} className="absolute inset-0 z-[1]" aria-label={`Open ${image.title || "field report"}`} />
      <div className="relative bg-[#06101c]" style={ratio ? { aspectRatio: String(ratio) } : undefined}>
        {src ? (
          <img
            src={src}
            alt={image.title}
            loading="lazy"
            className={`block w-full ${ratio ? "h-full object-cover" : "h-auto"} transition duration-500 group-hover:brightness-110 ${image.moderation_blur_required ? "blur-xl" : ""}`}
            onError={(event) => { event.currentTarget.style.display = "none"; }}
          />
        ) : <Placeholder />}
        <div className="mw-card-gradient" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h2 className="mw-gallery-card-title">{image.title}</h2>
          <Link href={`/members/${image.user_id}`} className="relative z-[2] mt-2 inline-flex items-center gap-2 hover:underline">
            <span className="grid h-6 w-6 place-items-center overflow-hidden rounded-full border border-[#e79f2b]/55 bg-[#e79f2b]/15 font-display text-[.7rem] text-[#f0bd66]">
              {avatar.avatarUrl ? <img src={avatar.avatarUrl} alt="" className="h-full w-full object-cover" /> : avatar.initials || "G"}
            </span>
            <span className="text-sm font-bold text-white/90">{name}</span>
            {image.photographer_rank && <span className="mw-gallery-rank">{image.photographer_rank}</span>}
          </Link>
        </div>
        {image.moderation_blur_required && <div className="absolute inset-0 grid place-items-center bg-black/45 p-4 text-center font-display">Blurred pending moderation review</div>}
        {image.is_iotw_winner ? (
          <span className="mw-card-ribbon mw-card-ribbon-winner">✪ Image of the Week</span>
        ) : image.is_weekly_candidate ? (
          <span className="mw-card-ribbon">IOTW Contender</span>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <p className="truncate mw-muted text-sm">{[placeLine(image), date].filter(Boolean).join(" · ")}</p>
        <div className="flex shrink-0 items-center gap-1">
          {top.map((t) => <span key={t} className="text-sm text-[#f0bd66]">{glyphs[t] || "✦"}</span>)}
          <span className="ml-1 text-sm text-white/60">{total ? `${total} ${total === 1 ? "reaction" : "reactions"}` : "View →"}</span>
        </div>
      </div>
    </article>
  );
}
