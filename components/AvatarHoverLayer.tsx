"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Hover any member's profile picture to see it about 3x larger (Aaron, Nov 26).
 * One delegated listener serves every avatar on the site, so each list keeps its own markup.
 * The enlarged picture is portaled to <body>, so no card or scroll container can clip it,
 * and it ignores the pointer, so a click still lands on the avatar underneath (an Ascent face
 * still opens the profile). Profile pictures never open full screen.
 * Ascent faces also carry the member's caption and Field Honors, which ring the large circle.
 */
const AVATAR_SELECTOR = [
  "[data-avatar-hover]",
  ".mw-ascent-face",
  ".mw-feed-avatar",
  ".mw-member-profile-avatar",
  ".mw-avatar-circle",
  ".mw-forum-avatar",
  ".mw-forum-thread-avatar",
  ".mw-forum-mini-avatar",
  ".mw-forum-top-avatar",
  ".mw-winners-avatar",
].join(",");
// Avatars inside these never enlarge: the account menu button and the reactor list popover.
const SKIP_SELECTOR = ".mw-app-header, .mw-burst, [data-avatar-hover='off']";
const SHOW_DELAY = 90;
const EDGE = 12;

type Honor = { g: string; n: string };
type HoverState = { src: string | null; initials: string; size: number; cx: number; cy: number; name: string; meta: string; honors: Honor[] };

function readHonors(raw: string | undefined): Honor[] {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((h) => h && typeof h.g === "string") : [];
  } catch {
    return [];
  }
}

function stateFor(el: HTMLElement): HoverState | null {
  const host = (el.closest("[data-avatar-hover]") as HTMLElement | null) || el;
  const img = el.querySelector("img") as HTMLImageElement | null;
  const src = host.dataset.avatarHoverSrc || img?.currentSrc || img?.src || null;
  const name = host.dataset.avatarHoverName || "";
  const honors = readHonors(host.dataset.avatarHoverHonors);
  // Initials-only circles enlarge only where they carry a caption (The Ascent).
  if (!src && !name) return null;
  const rect = el.getBoundingClientRect();
  if (!rect.width) return null;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // Stay below the sticky header so the enlarged picture never covers the nav.
  const headerBottom = Math.max(0, document.querySelector(".mw-app-header")?.getBoundingClientRect().bottom || 0);
  const topEdge = headerBottom + EDGE;
  const room = Math.min(vw - EDGE * 2, vh - topEdge - EDGE) - (honors.length ? 90 : 0) - (name ? 84 : 0);
  const size = Math.round(Math.max(110, Math.min(rect.width * 3, 384, room)));
  const ring = honors.length ? 38 : 0;
  const halfW = size / 2 + ring;
  const captionH = name ? 74 : 0;
  const top = size / 2 + ring;
  const bottom = size / 2 + ring + (captionH ? captionH + 10 : 0);
  let cx = rect.left + rect.width / 2;
  let cy = rect.top + rect.height / 2;
  cx = Math.min(Math.max(cx, EDGE + halfW), vw - EDGE - halfW);
  cy = Math.min(Math.max(cy, topEdge + top), vh - EDGE - bottom);
  const initials = (el.textContent || "").trim().slice(0, 3);
  return { src, initials, size, cx, cy, name, meta: host.dataset.avatarHoverMeta || "", honors };
}

export function AvatarHoverLayer() {
  const [hover, setHover] = useState<HoverState | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const current = useRef<HTMLElement | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const clear = () => { if (timer.current) window.clearTimeout(timer.current); timer.current = null; };
    const hide = () => { clear(); current.current = null; setOpen(false); };
    const show = (el: HTMLElement, delay: number) => {
      if (current.current === el) return;
      clear();
      current.current = el;
      timer.current = window.setTimeout(() => {
        const next = stateFor(el);
        if (!next || current.current !== el) return;
        setHover(next);
        setOpen(false);
        requestAnimationFrame(() => requestAnimationFrame(() => { if (current.current === el) setOpen(true); }));
      }, delay);
    };
    const find = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return null;
      const el = target.closest(AVATAR_SELECTOR) as HTMLElement | null;
      if (!el || el.closest(SKIP_SELECTOR)) return null;
      return el;
    };
    const onOver = (event: PointerEvent) => {
      if (!fine.matches || event.pointerType === "touch") return;
      const el = find(event.target);
      if (el) show(el, SHOW_DELAY);
      else if (current.current) hide();
    };
    const onOut = (event: PointerEvent) => {
      const el = current.current;
      if (!el) return;
      const to = event.relatedTarget as Node | null;
      if (to && el.contains(to)) return;
      hide();
    };
    const onFocus = (event: FocusEvent) => {
      const el = find(event.target);
      if (el && (event.target as Element).matches?.(":focus-visible")) show(el, 0);
    };
    const onBlur = () => { if (current.current) hide(); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") hide(); };
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("pointerout", onOut, { passive: true });
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", hide, { passive: true, capture: true });
    window.addEventListener("resize", hide);
    window.addEventListener("pointerdown", hide, { passive: true });
    return () => {
      clear();
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onBlur);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", hide, { capture: true });
      window.removeEventListener("resize", hide);
      window.removeEventListener("pointerdown", hide);
    };
  }, []);

  if (!mounted || !hover) return null;
  const { size, honors } = hover;
  const medal = honors.length ? Math.max(20, Math.min(34, Math.floor((2 * Math.PI * (size / 2 + 18)) / Math.max(honors.length, 1)) - 4)) : 0;
  const orbit = size / 2 + medal / 2 + 4;
  // Up to 12 honors fan over the top of the circle; more go all the way around.
  const span = honors.length <= 1 ? 0 : honors.length <= 12 ? Math.min(300, (honors.length - 1) * 27) : 360 - 360 / honors.length;
  const angle = (i: number) => (honors.length <= 1 ? 0 : -span / 2 + (span / (honors.length - 1)) * i);
  return createPortal(
    <div
      className={`mw-avatar-pop ${open ? "is-open" : ""} ${honors.length ? "has-honors" : ""}`}
      style={{ left: hover.cx, top: hover.cy, ["--pop-size" as string]: `${size}px`, ["--medal" as string]: `${medal}px`, ["--orbit" as string]: `${orbit}px` }}
      aria-hidden="true"
    >
      <span className="mw-avatar-pop-circle">{hover.src ? <img src={hover.src} alt="" /> : <span>{hover.initials}</span>}</span>
      {honors.length ? (
        <span className="mw-avatar-pop-ring">
          {honors.map((h, i) => <span key={`${h.n}-${i}`} className="mw-avatar-pop-medal" style={{ ["--a" as string]: `${angle(i)}deg`, ["--i" as string]: i }}>{h.g}</span>)}
        </span>
      ) : null}
      {hover.name ? (
        <span className="mw-avatar-pop-caption" style={{ top: `calc(50% + ${honors.length ? orbit + medal / 2 + 8 : size / 2 + 12}px)` }}>
          <b>{hover.name}</b>
          {hover.meta ? <span>{hover.meta}</span> : null}
        </span>
      ) : null}
    </div>,
    document.body,
  );
}
