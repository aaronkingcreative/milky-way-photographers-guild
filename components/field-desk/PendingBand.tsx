import Link from "next/link";
import { keepLastTwo } from "@/lib/keep-last-two";

export function PendingBand({
  label,
  message,
  actionHref,
  actionLabel,
  footnote,
}: {
  label: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
  footnote?: string;
}) {
  return (
    <section className="fd-panel fd-pending">
      <div className="fd-pending-row">
        <div className="fd-pending-copy">
          <span className="fd-label">{label}</span>
          <p className="mw-copy-natural">{keepLastTwo(message)}</p>
          {footnote ? <p className="fd-pending-note mw-copy-natural">{keepLastTwo(footnote)}</p> : null}
        </div>
        {actionHref && actionLabel ? (
          <Link href={actionHref} className="fd-outline-button">{actionLabel}</Link>
        ) : null}
      </div>
    </section>
  );
}
