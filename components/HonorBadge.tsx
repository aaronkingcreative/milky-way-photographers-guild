"use client";
import { useEffect, useId, useRef, useState } from "react";

export type HonorView = { id: string; name: string; glyph?: string | null; description?: string | null; earned_at?: string | null; status?: string | null };

function formatEarned(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Denver" });
}

export function HonorBadge({ honor, size = "md", filled = true }: { honor: HonorView; size?: "sm" | "md"; filled?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const tipId = useId();
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  const earned = formatEarned(honor.earned_at);
  const pending = honor.status === "auto_awarded_pending_review";
  const dim = size === "sm" ? "h-9 w-9 text-base" : "h-14 w-14 text-xl";
  return (
    <span ref={ref} className={`mw-honor-tip-wrap ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className={`honor-hex grid ${dim} place-items-center font-display ${filled ? "bg-[#e79f2b] text-[#091625]" : "border border-[#e79f2b]/45 bg-[#0d1e30] text-[#f0bd66]"}`}
        aria-label={`${honor.name}. ${honor.description || ""}${earned ? ` Earned ${earned}.` : ""}`}
        aria-describedby={tipId}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">{honor.glyph || "✦"}</span>
      </button>
      <span id={tipId} role="tooltip" className="mw-honor-tip">
        <strong>{honor.name}</strong>
        {honor.description && <span className="block">{honor.description}</span>}
        {earned && <span className="mw-honor-tip-date">Earned {earned}{pending ? " · pending Guild review" : ""}</span>}
      </span>
    </span>
  );
}
