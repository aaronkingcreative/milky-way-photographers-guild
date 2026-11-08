"use client";

import Link from "next/link";
import { useRef, useState, type UIEvent } from "react";
import { loadMoreOwnReports } from "@/app/field-desk/own-reports-action";
import { ownReportsShowsEmpty, ownReportsStatus, type OwnReportCard, type OwnReportCursor } from "@/lib/own-reports";

export function OwnReportsPanel({
  initial,
  initialNext,
  initialError,
}: {
  initial: OwnReportCard[];
  initialNext: OwnReportCursor | null;
  initialError: boolean;
}) {
  const [reports, setReports] = useState(initial);
  const [next, setNext] = useState<OwnReportCursor | null>(initialNext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError ? "Those reports did not load. Try again." : "");
  const busy = useRef(false);

  async function more(cursor: OwnReportCursor | null) {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError("");
    const result = await loadMoreOwnReports(cursor).catch(() => ({ ok: false as const, error: "Those reports did not load. Try again.", reports: [] as OwnReportCard[], next: null }));
    setLoading(false);
    busy.current = false;
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setReports((current) => cursor ? [...current, ...result.reports] : result.reports);
    setNext(result.next);
  }

  function onScroll(event: UIEvent<HTMLDivElement>) {
    if (!next || loading || error) return;
    const el = event.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) more(next);
  }

  const showEmpty = ownReportsShowsEmpty(reports.length, loading, error);
  const status = ownReportsStatus(reports.length, loading, error, Boolean(next));

  return (
    <section className="fd-panel fd-recent" aria-labelledby="own-reports-label">
      <span id="own-reports-label" className="fd-label fd-label-muted">Your Recent Reports</span>
      {showEmpty ? (
        <div className="fd-recent-empty">
          <p>You have not filed a report yet.</p>
          <Link className="fd-outline-button" href="/submit">File a Field Report</Link>
        </div>
      ) : (
        <div className="fd-recent-scroll" tabIndex={0} role="region" aria-label="Your recent reports" aria-busy={loading} onScroll={onScroll}>
          {reports.map((report) => (
            <Link key={report.id} href={`/images/${report.id}`}>
              {report.imageUrl ? <img src={report.imageUrl} alt="" /> : <span className="fd-recent-blank" aria-hidden="true" />}
              <span><strong>{report.title}</strong><small>{report.meta}</small></span>
            </Link>
          ))}
          <p className="fd-recent-status" aria-live="polite">{status}</p>
          {(next || error) && (
            <button type="button" className="fd-recent-more" onClick={() => more(next)} disabled={loading} aria-busy={loading}>
              {error ? "Try again" : "Load more reports"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
