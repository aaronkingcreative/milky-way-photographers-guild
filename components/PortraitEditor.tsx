"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePortrait } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";
import { PROFILE_AVATAR_BUCKET } from "@/lib/storage";
import { resolveAvatarUrl } from "@/lib/avatar";
import { DEFAULT_CROP, PORTRAIT_ORIGINAL_MAX, PORTRAIT_OUTPUT, circleFromPill, placeCrop, sanitizeCrop, type PortraitCrop, type PortraitShape } from "@/lib/portrait";

// Two frames, each with its own position and zoom. The pill is the header portrait, the circle is used everywhere else.
const FRAMES: Record<PortraitShape, { w: number; h: number; label: string; note: string }> = {
  pill: { w: 120, h: 210, label: "Header pill", note: "Top of the site header" },
  circle: { w: 150, h: 150, label: "Circle", note: "Posts, comments and the Hall" },
};
const SMALL_CIRCLE = 40;
/** A fresh photo starts with the circle as wide as it can go, centered a little above the middle where a face usually is. */
function freshCrop(): PortraitCrop { return { pill: { ...DEFAULT_CROP.pill }, circle: { x: 0.5, y: 0.42, zoom: 1 }, pillShape: "vertical" }; }
const MAX_INPUT_BYTES = 40 * 1024 * 1024;

type Source = { url: string; w: number; h: number; fresh: boolean };

function loadImage(url: string, crossOrigin = false) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode"));
    img.src = url;
  });
}

function canvasBlob(canvas: HTMLCanvasElement, quality = 0.9) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", quality));
}

/** Draws one shape's crop of the source into a canvas of the given size. */
function renderShape(img: HTMLImageElement, w: number, h: number, crop: PortraitCrop[PortraitShape]) {
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  const p = placeCrop(img.naturalWidth, img.naturalHeight, w, h, crop);
  ctx.drawImage(img, p.left, p.top, img.naturalWidth * p.scale, img.naturalHeight * p.scale);
  return canvas;
}

/** Downscales a fresh photo so the stored original stays light. Browsers apply EXIF rotation when drawing. */
function renderOriginal(img: HTMLImageElement) {
  const ratio = Math.min(1, PORTRAIT_ORIGINAL_MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * ratio); canvas.height = Math.round(img.naturalHeight * ratio);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function PortraitEditor({ profile, initials, onSaved }: { profile: any; initials: string; onSaved?: (profile: any) => void }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ shape: PortraitShape; x: number; y: number } | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [crop, setCrop] = useState<PortraitCrop>(() => (profile?.avatar_crop?.pillShape === "vertical" ? sanitizeCrop(profile.avatar_crop) : DEFAULT_CROP));
  const [changed, setChanged] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [, startTransition] = useTransition();

  // Start from the stored original (or the older single avatar) so a member can re-frame without uploading again.
  useEffect(() => {
    const url = resolveAvatarUrl(profile?.avatar_original_path || profile?.avatar_path || profile?.avatar_url);
    if (!url) return;
    let alive = true;
    loadImage(url, true).then((img) => { if (alive) setSource({ url, w: img.naturalWidth, h: img.naturalHeight, fresh: false }); }).catch(() => {});
    return () => { alive = false; };
  }, [profile?.avatar_original_path, profile?.avatar_path, profile?.avatar_url]);

  async function choose(file?: File) {
    if (!file) return;
    if (file.size > MAX_INPUT_BYTES) { setNotice({ text: "That photo is over 40 MB. Export a smaller copy and try again.", error: true }); return; }
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      setSource({ url, w: img.naturalWidth, h: img.naturalHeight, fresh: true });
      setCrop(freshCrop());
      setChanged(true);
      setNotice(null);
    } catch {
      URL.revokeObjectURL(url);
      setNotice({ text: "That file did not open in this browser. Try a JPG, PNG or WebP.", error: true });
    }
  }

  function onPointerDown(shape: PortraitShape, e: React.PointerEvent<HTMLDivElement>) {
    if (!source) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { shape, x: e.clientX, y: e.clientY };
  }
  function onPointerMove(shape: PortraitShape, e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.shape !== shape || !source) return;
    const f = FRAMES[shape];
    const p = placeCrop(source.w, source.h, f.w, f.h, crop[shape]);
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    drag.current = { shape, x: e.clientX, y: e.clientY };
    const next = placeCrop(source.w, source.h, f.w, f.h, { ...crop[shape], x: p.x - dx / (source.w * p.scale), y: p.y - dy / (source.h * p.scale) });
    setCrop((c) => ({ ...c, [shape]: { ...c[shape], x: next.x, y: next.y } }));
    setChanged(true);
  }
  function onKey(shape: PortraitShape, e: React.KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 0.05 : 0.01;
    const move: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const m = move[e.key];
    if (!m || !source) return;
    e.preventDefault();
    const f = FRAMES[shape];
    const p = placeCrop(source.w, source.h, f.w, f.h, { ...crop[shape], x: crop[shape].x + m[0], y: crop[shape].y + m[1] });
    setCrop((c) => ({ ...c, [shape]: { ...c[shape], x: p.x, y: p.y } }));
    setChanged(true);
  }
  function setZoom(shape: PortraitShape, zoom: number) {
    if (!source) return;
    const f = FRAMES[shape];
    const p = placeCrop(source.w, source.h, f.w, f.h, { ...crop[shape], zoom });
    setCrop((c) => ({ ...c, [shape]: { x: p.x, y: p.y, zoom } }));
    setChanged(true);
  }

  async function save() {
    if (!source) return;
    setBusy(true);
    setNotice({ text: "Saving your portrait..." });
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) throw new Error("Sign in again before saving your portrait.");
      const img = await loadImage(source.url, !source.fresh);
      const original = renderOriginal(img);
      const base = await loadImage(original.toDataURL("image/jpeg", 0.92));
      const stamp = Date.now().toString(36);
      const circleCrop = crop.circle;
      const files: [string, HTMLCanvasElement][] = [
        [`users/${userId}/avatar-${stamp}.jpg`, renderShape(base, PORTRAIT_OUTPUT.circle.w, PORTRAIT_OUTPUT.circle.h, circleCrop)],
        [`users/${userId}/avatar-pill-${stamp}.jpg`, renderShape(base, PORTRAIT_OUTPUT.pill.w, PORTRAIT_OUTPUT.pill.h, crop.pill)],
        [`users/${userId}/avatar-original-${stamp}.jpg`, original],
      ];
      for (const [path, canvas] of files) {
        const blob = await canvasBlob(canvas);
        const { error } = await supabase.storage.from(PROFILE_AVATAR_BUCKET).upload(path, blob, { contentType: "image/jpeg", upsert: true, cacheControl: "31536000" });
        if (error) { console.error("Portrait upload failed", error); throw new Error("We could not upload your portrait. Try again."); }
      }
      const result = await savePortrait({ circlePath: files[0][0], pillPath: files[1][0], originalPath: files[2][0], crop: { pill: crop.pill, circle: circleCrop, pillShape: "vertical", circleMode: "independent" } });
      if (!result.ok) throw new Error(result.message);
      setChanged(false);
      setSaved(true);
      setNotice({ text: result.message });
      onSaved?.(result.profile);
      startTransition(() => router.refresh());
    } catch (err: any) {
      const text = err?.message && !/decode|encode|tainted|security/i.test(err.message) ? err.message : "We could not save your portrait. Try again.";
      setNotice({ text, error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mw-portrait-editor">
      <div className="mw-portrait-stage">
        {(["pill", "circle"] as PortraitShape[]).map((shape) => {
          const f = FRAMES[shape];
          const c = crop[shape];
          const p = source ? placeCrop(source.w, source.h, f.w, f.h, c) : null;
          return (
            <div key={shape} className={`mw-portrait-shape is-${shape}`}>
              <span className="mw-portrait-name">{f.label}</span>
              <div
                className={`mw-portrait-frame is-${shape}`}
                role={source ? "slider" : "button"}
                tabIndex={0}
                aria-label={source ? `${f.label} position. Drag or use the arrow keys.` : "Choose a portrait photo"}
                aria-valuetext={source ? `${Math.round(c.x * 100)} percent across, ${Math.round(c.y * 100)} percent down` : undefined}
                onClick={() => { if (!source) fileRef.current?.click(); }}
                onPointerDown={(e) => onPointerDown(shape, e)}
                onPointerMove={(e) => onPointerMove(shape, e)}
                onPointerUp={() => { drag.current = null; }}
                onPointerCancel={() => { drag.current = null; }}
                onKeyDown={(e) => { if (!source && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); fileRef.current?.click(); } else onKey(shape, e); }}
              >
                {source && p ? <img src={source.url} alt="" draggable={false} style={{ width: source.w * p.scale, height: source.h * p.scale, left: p.left, top: p.top }} /> : <span className="mw-portrait-empty">{initials}</span>}
              </div>
              <label className="mw-portrait-zoom-label">
                <span>Zoom</span>
                <input className="mw-portrait-zoom" type="range" min={1} max={4} step={0.01} value={c.zoom} disabled={!source} aria-label={`${f.label} zoom`} onChange={(e) => setZoom(shape, Number(e.target.value))} />
              </label>
              <span className="mw-portrait-note">{f.note}</span>
              {shape === "circle" && source && (
                <div className="mw-portrait-circle-tools">
                  <span className="mw-portrait-mini" aria-hidden="true">{(() => { const k = SMALL_CIRCLE / f.w; return p ? <img src={source.url} alt="" style={{ width: source.w * p.scale * k, height: source.h * p.scale * k, left: p.left * k, top: p.top * k }} /> : null; })()}</span>
                  <button type="button" className="mw-portrait-link" onClick={() => { setCrop((x) => ({ ...x, circle: circleFromPill(source.w, source.h, x.pill) })); setChanged(true); }}>Match top of pill</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="profile-avatar-help">{source ? "Frame each shape on its own. Drag inside a shape to move the photo, slide to zoom. Zoom the circle all the way out for head and shoulders." : "Pick a photo of you. Any size works, and it is resized for\u00A0you."}</p>
      <input ref={fileRef} className="sr-only" type="file" accept="image/*" onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="mw-portrait-actions">
        <button className="profile-avatar-button" type="button" disabled={busy} onClick={() => fileRef.current?.click()}>{source ? "New photo" : "Choose photo"}</button>
        <button className="mw-portrait-save" type="button" disabled={!source || !changed || busy} aria-busy={busy} onClick={save}>{busy ? "Saving..." : saved && !changed ? "Saved" : "Save portrait"}</button>
      </div>
      {notice && <p className={`profile-save-message ${notice.error ? "profile-save-message-error" : ""}`} role={notice.error ? "alert" : "status"}>{notice.text}</p>}
    </div>
  );
}
