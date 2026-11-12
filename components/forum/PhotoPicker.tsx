"use client";
import { useState } from "react";

export type OwnPhoto = { id: string; title: string; image_url: string | null };

/** Optional: attach one of your own Guild photos. A plain select, with a small preview. */
export function PhotoPicker({ photos, initial = null }: { photos: OwnPhoto[]; initial?: string | null }) {
  const [picked, setPicked] = useState<string>(initial || "");
  if (!photos.length) return null;
  const photo = photos.find((p) => p.id === picked);
  return (
    <div className="mw-forum-photo-pick">
      <label className="mw-field-label" htmlFor={`photo-${initial || "new"}`}>Attach one of your Guild photos <span className="mw-forum-optional">(optional)</span></label>
      <div className="mw-forum-photo-row">
        <select id={`photo-${initial || "new"}`} name="image_id" className="mw-select" value={picked} onChange={(e) => setPicked(e.target.value)}>
          <option value="">No photo</option>
          {photos.map((p) => <option key={p.id} value={p.id}>{p.title || "Untitled"}</option>)}
        </select>
        {photo?.image_url ? <img src={photo.image_url} alt="" className="mw-forum-photo-preview" /> : null}
      </div>
    </div>
  );
}
