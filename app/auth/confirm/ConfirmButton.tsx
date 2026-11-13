"use client";

import { useFormStatus } from "react-dom";

export function ConfirmButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="mw-btn-primary mt-6 w-full" disabled={pending} aria-busy={pending}>
      {pending ? "One moment..." : keepTail(label)}
    </button>
  );
}

/** The button is inline-flex, so a span would eat the space. Join the last two words with a non-breaking space instead. */
function keepTail(label: string) {
  const i = label.lastIndexOf(" ");
  return i < 0 ? label : `${label.slice(0, i)}\u00A0${label.slice(i + 1)}`;
}
