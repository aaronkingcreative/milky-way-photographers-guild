"use client";

import { useEffect, useState } from "react";

export function ImageLightbox({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [open]);
  return <>
    <button type="button" className="block w-full cursor-zoom-in" onClick={() => setOpen(true)} aria-label="Open image fullscreen"><img src={src} alt={alt} className={className} /></button>
    {open && <div className="mw-lightbox" role="dialog" aria-modal="true" onClick={() => setOpen(false)}><img src={src} alt={alt} onClick={(e) => e.stopPropagation()} /></div>}
  </>;
}
