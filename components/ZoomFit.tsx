"use client";

import { useEffect } from "react";

/**
 * Browser zoom that scales the laid-out page without shrinking the layout
 * viewport paints only the left slice, so lines end mid-word. When that zoom
 * is in effect, lay the page out at the visible width so text wraps inside it.
 * A zoom of 1 leaves the layout alone. Pinch-zoom is a different property and
 * is not treated as page zoom.
 */
export function ZoomFit() {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const htmlZoom = Number.parseFloat(getComputedStyle(root).zoom || "1");
      const bodyZoom = Number.parseFloat(getComputedStyle(document.body).zoom || "1");
      const zoom = Math.max(
        Number.isFinite(htmlZoom) && htmlZoom > 0 ? htmlZoom : 1,
        Number.isFinite(bodyZoom) && bodyZoom > 0 ? bodyZoom : 1,
      );
      if (zoom > 1.01) {
        const visible = Math.max(1, Math.floor(window.innerWidth / zoom));
        root.classList.add("mw-zoom-fit");
        root.style.setProperty("--mw-zoom-w", `${visible}px`);
      } else {
        root.classList.remove("mw-zoom-fit");
        root.style.removeProperty("--mw-zoom-w");
      }
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);
  return null;
}
