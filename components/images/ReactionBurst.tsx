"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

export type Reactor = { id: string; name: string; avatarUrl: string | null; initials: string };

const MAX_SHOWN = 48;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/**
 * A cloud of the members who gave one reaction, bursting out from the count button.
 * Circles sit on a golden-angle spiral so 3 or 300 reactions both look full. Past MAX_SHOWN the last circle is "+N".
 * Rendered in a portal so card overflow never clips it. Each circle links to the member and shows their name on hover or focus.
 */
export function ReactionBurst({ anchor, people, total, label, icon, onEnter, onLeave }: { anchor: HTMLElement; people: Reactor[]; total: number; label: string; icon: string; onEnter: () => void; onLeave: () => void }) {
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null);
  const shown = people.slice(0, total > MAX_SHOWN ? MAX_SHOWN - 1 : MAX_SHOWN);
  const extra = Math.max(0, total - shown.length);
  const n = shown.length + (extra ? 1 : 0);
  const size = n <= 6 ? 40 : n <= 16 ? 34 : n <= 30 ? 30 : 27;
  const spacing = size * 0.58;
  const r0 = size * 0.95 + 22;
  const points = useMemo(() => Array.from({ length: n }, (_, i) => {
    const r = r0 + spacing * Math.sqrt(i) * (n <= 6 ? 0.35 : 1);
    const a = -Math.PI / 2 + i * (n <= 6 ? (2 * Math.PI) / Math.max(n, 1) : GOLDEN);
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  }), [n, r0, spacing]);
  const reach = Math.max(r0, ...points.map((p) => Math.hypot(p.x, p.y))) + size / 2 + 8;

  const place = () => {
    const rect = anchor.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const x = Math.min(Math.max(rect.left + rect.width / 2, Math.min(reach, vw / 2)), vw - Math.min(reach, vw / 2));
    const y = Math.min(Math.max(rect.top + rect.height / 2, Math.min(reach, vh / 2)), vh - Math.min(reach, vh / 2));
    setCenter({ x, y });
  };
  useLayoutEffect(place, [anchor, reach]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onMove = () => place();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => { window.removeEventListener("resize", onMove); window.removeEventListener("scroll", onMove, true); };
  }); // eslint-disable-line react-hooks/exhaustive-deps

  if (!center) return null;
  const scale = Math.min(1, (Math.min(window.innerWidth, window.innerHeight) / 2 - 6) / reach);
  return createPortal(
    <div className="mw-burst" role="dialog" aria-label={`${total} ${label}`} style={{ left: center.x, top: center.y, ["--burst-scale" as any]: scale }} onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <span className="mw-burst-glow" style={{ width: reach * 2, height: reach * 2 }} aria-hidden="true" onPointerDown={onLeave} />
      <span className="mw-burst-core"><b>{icon}</b>{total} {label}</span>
      {shown.map((p, i) => (
        <Link key={p.id} href={`/members/${p.id}`} className="mw-burst-dot" data-name={p.name} aria-label={p.name}
          style={{ width: size, height: size, ["--x" as any]: `${points[i].x}px`, ["--y" as any]: `${points[i].y}px`, animationDelay: `${Math.min(i * (n > 20 ? 9 : 28), 420)}ms` }}>
          {p.avatarUrl ? <img src={p.avatarUrl} alt="" /> : <span>{p.initials}</span>}
        </Link>
      ))}
      {extra > 0 && (
        <span className="mw-burst-dot is-more" style={{ width: size, height: size, ["--x" as any]: `${points[n - 1].x}px`, ["--y" as any]: `${points[n - 1].y}px`, animationDelay: `${Math.min((n - 1) * 9, 420)}ms` }} data-name={`${extra} more`}>+{extra}</span>
      )}
    </div>,
    document.body,
  );
}

/** Open/close timing shared by hover (desktop) and tap (touch). */
export function useBurst() {
  const [open, setOpen] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const cancel = () => { if (timer.current) window.clearTimeout(timer.current); timer.current = null; };
  const show = (type: string, delay = 90) => { cancel(); timer.current = window.setTimeout(() => setOpen(type), delay); };
  const hide = (delay = 180) => { cancel(); timer.current = window.setTimeout(() => setOpen(null), delay); };
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (t?.closest?.(".mw-burst") || t?.closest?.(`[data-burst-type="${open}"]`)) return;
      setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); window.removeEventListener("keydown", onKey); };
  }, [open]);
  return { open, setOpen, show, hide, cancel };
}
