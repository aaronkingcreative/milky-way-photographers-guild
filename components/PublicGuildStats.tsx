"use client";

import { useEffect, useId, useRef, useState } from "react";
import { KeepTail } from "@/components/KeepTail";
import { fieldHonorsPublicLine } from "@/lib/public-copy";
import {
  HONOR_CATEGORY_LABELS,
  fillCaptureYears,
  formatShowcaseCount,
  type PublicCounts,
  type YearCount,
} from "@/lib/public-showcase";
import { US_LAND_PATHS, US_MAP_VIEWBOX, US_STATE_ANCHORS } from "@/lib/us-field-map";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function CountUp({ value, className }: { value: number; className?: string }) {
  const formatted = formatShowcaseCount(value);
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);

  useEffect(() => {
    shownRef.current = shown;
  }, [shown]);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const from = 0;
    const duration = 900;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const next = Math.round(from + (value - from) * eased);
      if (next !== shownRef.current) setShown(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span className={["mw-stats-count", className].filter(Boolean).join(" ")}>
      <span className="mw-stats-count-sizer" aria-hidden="true">
        {formatted}
      </span>
      <span className="mw-stats-count-value">{formatShowcaseCount(shown)}</span>
    </span>
  );
}

function RankedBars({
  items,
  labeledBy,
}: {
  items: { key: string; label: string; n: number }[];
  labeledBy?: string;
}) {
  const max = Math.max(...items.map((item) => item.n), 1);
  return (
    <ul className="mw-stats-bars" aria-labelledby={labeledBy}>
      {items.map((item) => (
        <li key={item.key}>
          <span className="mw-stats-bar-label">{item.label}</span>
          <span className="mw-stats-bar-track" aria-hidden="true">
            <span className="mw-stats-bar-fill" style={{ width: `${Math.max(4, (item.n / max) * 100)}%` }} />
          </span>
          <span className="mw-stats-bar-n">{formatShowcaseCount(item.n)}</span>
        </li>
      ))}
    </ul>
  );
}

function YearSparkline({ years }: { years: YearCount[] }) {
  const captionId = useId();
  const filled = fillCaptureYears(years);
  if (filled.length < 4) return null;
  const width = 280;
  const height = 42;
  const padX = 2;
  const padY = 4;
  const max = Math.max(...filled.map((row) => row.n), 1);
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const points = filled.map((row, index) => {
    const x = padX + (filled.length === 1 ? innerW / 2 : (index / (filled.length - 1)) * innerW);
    const y = padY + innerH - (row.n / max) * innerH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const area = `M${points[0]} L${points.join(" L")} V${height - padY} H${padX} Z`;
  const first = filled[0].year;
  const last = filled[filled.length - 1].year;
  const peak = filled.reduce((best, row) => (row.n > best.n ? row : best), filled[0]);
  const midIndex = Math.round((filled.length - 1) / 2);
  const mid = filled[midIndex].year;
  const ticks = [first, mid, last].filter((year, index, all) => all.indexOf(year) === index);

  return (
    <figure className="mw-stats-spark" aria-labelledby={captionId}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-hidden="true">
        <path d={area} className="mw-stats-spark-area" />
        <polyline points={points.join(" ")} className="mw-stats-spark-line" />
      </svg>
      <div className="mw-stats-spark-ticks" aria-hidden="true">
        {ticks.map((year) => (
          <span key={year}>{year}</span>
        ))}
      </div>
      <figcaption id={captionId} className="mw-stats-caption">
        <KeepTail text={`Years the photos were made, peak in ${peak.year}`} keep={4} />
      </figcaption>
    </figure>
  );
}

function FieldMap({ counts }: { counts: { code: string; n: number }[] }) {
  const byCode = new Map(counts.map((row) => [row.code, row.n]));
  const max = Math.max(...counts.map((row) => row.n), 1);
  const captionId = useId();

  return (
    <div className="mw-stats-map-art" aria-labelledby={captionId}>
      <svg viewBox={US_MAP_VIEWBOX} role="img" aria-hidden="true">
        <path d={US_LAND_PATHS.continent} className="mw-stats-land" />
        <path d={US_LAND_PATHS.lakes} className="mw-stats-lakes" />
        <path d={US_LAND_PATHS.alaska} className="mw-stats-land" />
        <path d={US_LAND_PATHS.hawaii} className="mw-stats-land" />
        {US_STATE_ANCHORS.map((anchor) => {
          const n = byCode.get(anchor.code) ?? 0;
          const t = n / max;
          const r = n > 0 ? 10 + Math.sqrt(t) * 22 : 0;
          const opacity = n > 0 ? 0.22 + t * 0.72 : 0;
          return (
            <g key={anchor.code} className={n > 0 ? "is-active" : "is-empty"}>
              {n > 0 ? <circle cx={anchor.x} cy={anchor.y} r={r} fill="#e79f2b" fillOpacity={opacity} /> : null}
              <text
                x={anchor.x}
                y={anchor.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={anchor.size === "s" ? 13 : 16}
              >
                {anchor.code}
              </text>
            </g>
          );
        })}
      </svg>
      <p id={captionId} className="mw-stats-caption">
        <KeepTail text={`Photos made in ${counts.length} US states`} keep={4} />
      </p>
    </div>
  );
}

export function PublicGuildStats({ counts }: { counts: PublicCounts }) {
  const categories = (counts.honorCategories ?? [])
    .filter((row) => row.n >= 3)
    .map((row) => ({ key: row.key, label: HONOR_CATEGORY_LABELS[row.key], n: row.n }));
  const places = (counts.places ?? []).filter((row) => row.n > 0);
  const usStates = counts.usStates ?? [];
  const showWeek = (counts.weekPics ?? 0) >= 3;
  const showMembers = (counts.members ?? 0) > 0;
  const showReactions = (counts.reactions ?? 0) > 0;
  const showRegions = (counts.regions ?? 0) > 0;
  const regionLine = (() => {
    const regions = counts.regions ?? 0;
    const countries = counts.countries ?? 0;
    if (regions && countries > 1) return `${formatShowcaseCount(regions)} regions across ${formatShowcaseCount(countries)} countries`;
    if (regions) return `${formatShowcaseCount(regions)} regions`;
    return "";
  })();

  return (
    <div className="mw-stats">
      <div className="mw-stats-hero">
        <div className="mw-stats-hero-pair">
          <div className="mw-stats-hero-figure">
            <p className="mw-stats-hero-value">
              <CountUp value={counts.honors} />
            </p>
            <p className="mw-stats-label">Field Honors</p>
          </div>
          {categories.length > 1 ? <RankedBars items={categories} /> : null}
        </div>
        <p className="mw-showcase-honors">
          <KeepTail text={fieldHonorsPublicLine} />
        </p>
      </div>

      {showRegions ? (
        <div className="mw-stats-places">
          <p className="mw-stats-kicker">Where the photos were made</p>
          <div className="mw-stats-places-head">
            <p className="mw-stats-place-value">
              <CountUp value={counts.regions ?? 0} />
            </p>
            <p className="mw-stats-label mw-stats-place-label">
              <KeepTail text={regionLine.replace(/^\d+\s/, "")} keep={4} />
            </p>
          </div>
          {usStates.length >= 3 ? <FieldMap counts={usStates} /> : null}
          {places.length >= 3 ? (
            <RankedBars
              items={places.map((row) => ({ key: row.name, label: row.name, n: row.n }))}
            />
          ) : null}
        </div>
      ) : null}

      <div className="mw-stats-pics">
        <p className="mw-stats-supporting-value">
          <CountUp value={counts.pics} />
        </p>
        <p className="mw-stats-label">Pics shared</p>
        {showWeek ? (
          <p className="mw-stats-note">{formatShowcaseCount(counts.weekPics ?? 0)} shared this week</p>
        ) : null}
        {counts.captureYears && counts.captureYears.length >= 4 ? (
          <YearSparkline years={counts.captureYears} />
        ) : null}
      </div>

      <div className="mw-stats-band">
        {showReactions ? (
          <div className="mw-stats-side">
            <p className="mw-stats-side-value">
              <CountUp value={counts.reactions ?? 0} />
            </p>
            <p className="mw-stats-label">Reactions</p>
          </div>
        ) : null}
        <div className="mw-stats-side">
          <p className="mw-stats-side-value">
            <CountUp value={counts.comments} />
          </p>
          <p className="mw-stats-label">Comments</p>
        </div>
        {showMembers ? (
          <div className="mw-stats-side">
            <p className="mw-stats-side-value">
              <CountUp value={counts.members ?? 0} />
            </p>
            <p className="mw-stats-label">Members</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
