"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

type Zoom = "fit" | "actual";

// Vendor-prefixed Fullscreen API (older Safari, iPadOS).
type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
type FsDocument = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void; webkitFullscreenEnabled?: boolean };

function fullscreenElement() {
  const d = document as FsDocument;
  return d.fullscreenElement || d.webkitFullscreenElement || null;
}

function canUseFullscreen() {
  const d = document as FsDocument;
  return Boolean(d.fullscreenEnabled || d.webkitFullscreenEnabled);
}

/**
 * Field report image.
 * On the page it sits fitted to the window so the story below stays one scroll away.
 * Click opens it full screen (Fullscreen API, or a fixed overlay where that is missing, like iPhone Safari).
 * In full screen, click flips between fitted and actual size. Esc, the X or the black backdrop closes it.
 */
export function ImageViewer({ src, alt, className, width, height, blurred = false }: { src: string; alt: string; className?: string; width?: number | null; height?: number | null; blurred?: boolean }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState<Zoom>("fit");
  const [native, setNative] = useState(false);
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const focusPoint = useRef<{ rx: number; ry: number } | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setZoom("fit");
    if (fullscreenElement()) {
      const d = document as FsDocument;
      const exit = d.exitFullscreen ? d.exitFullscreen.bind(d) : d.webkitExitFullscreen?.bind(d);
      try { const p = exit?.(); if (p && typeof (p as Promise<void>).catch === "function") (p as Promise<void>).catch(() => {}); } catch {}
    }
  }, []);

  const openViewer = () => {
    if (blurred) return;
    flushSync(() => { setZoom("fit"); setOpen(true); });
    const el = overlayRef.current as FsElement | null;
    if (!el || !canUseFullscreen()) { setNative(false); return; }
    try {
      const req = el.requestFullscreen ? el.requestFullscreen.bind(el) : el.webkitRequestFullscreen?.bind(el);
      const result = req?.();
      setNative(Boolean(req));
      if (result && typeof (result as Promise<void>).catch === "function") (result as Promise<void>).catch(() => setNative(false));
    } catch { setNative(false); }
  };

  // Browser Esc in native full screen fires fullscreenchange, not keydown. Close and reset either way.
  useEffect(() => {
    if (!open) return;
    const onChange = () => { if (!fullscreenElement()) { setOpen(false); setZoom("fit"); } };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  // When switching to actual size, keep the spot that was clicked under the pointer.
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    if (zoom === "fit") { el.scrollTo(0, 0); return; }
    const point = focusPoint.current;
    requestAnimationFrame(() => {
      const img = imgRef.current;
      if (!img || !el) return;
      const rx = point?.rx ?? 0.5, ry = point?.ry ?? 0.5;
      el.scrollTo(Math.max(0, img.offsetLeft + img.offsetWidth * rx - el.clientWidth / 2), Math.max(0, img.offsetTop + img.offsetHeight * ry - el.clientHeight / 2));
    });
  }, [zoom]);

  const onImagePointerDown = (event: React.PointerEvent<HTMLImageElement>) => {
    const el = overlayRef.current;
    if (!el) return;
    drag.current = { x: event.clientX, y: event.clientY, left: el.scrollLeft, top: el.scrollTop, moved: false };
  };
  const onImagePointerMove = (event: React.PointerEvent<HTMLImageElement>) => {
    const d = drag.current, el = overlayRef.current;
    if (!d || !el || zoom !== "actual" || event.pointerType !== "mouse" || !(event.buttons & 1)) return;
    const dx = event.clientX - d.x, dy = event.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    el.scrollLeft = d.left - dx; el.scrollTop = d.top - dy;
  };
  const onImageClick = (event: React.MouseEvent<HTMLImageElement>) => {
    event.stopPropagation();
    if (drag.current?.moved) { drag.current = null; return; }
    drag.current = null;
    const rect = event.currentTarget.getBoundingClientRect();
    focusPoint.current = { rx: (event.clientX - rect.left) / rect.width, ry: (event.clientY - rect.top) / rect.height };
    setZoom((z) => (z === "fit" ? "actual" : "fit"));
  };

  return (
    <>
      <button type="button" className="mw-viewer-trigger" onClick={openViewer} aria-label={`View ${alt || "image"} full screen`} disabled={blurred}>
        <img src={src} alt={alt} width={width || undefined} height={height || undefined} className={className} />
      </button>
      <div
        ref={overlayRef}
        className={`mw-viewer ${open ? "is-open" : ""} ${zoom === "actual" ? "is-actual" : "is-fit"} ${native ? "is-native" : "is-fallback"}`}
        role="dialog"
        aria-modal="true"
        aria-label={alt || "Image"}
        aria-hidden={!open}
        onClick={() => { if (zoom === "fit") close(); }}
      >
        {open && (
          <>
            <img
              ref={imgRef}
              src={src}
              alt={alt}
              draggable={false}
              onPointerDown={onImagePointerDown}
              onPointerMove={onImagePointerMove}
              onClick={onImageClick}
            />
            <button type="button" className="mw-viewer-close" aria-label="Close full screen" onClick={(event) => { event.stopPropagation(); close(); }}>
              <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
            </button>
            <p key={zoom} className="mw-viewer-hint" aria-hidden="true">{zoom === "fit" ? "Click the image for full size. Esc to close." : "Drag or scroll to look around. Click to fit."}</p>
          </>
        )}
      </div>
    </>
  );
}
