"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

/** Star detail opens on hover, keyboard focus, and tap. Tap keeps it open until the next tap. */
export function HonorStar({
  className,
  style,
  label,
  children,
}: {
  className: string;
  style: CSSProperties;
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      className={`${className}${open ? " is-open" : ""}`}
      style={style}
      aria-label={label}
      aria-expanded={open}
      onClick={() => setOpen((current) => !current)}
    >
      {children}
    </button>
  );
}
