"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { KeepTail } from "@/components/KeepTail";
import { fieldHonorsPublicLine } from "@/lib/public-copy";
import {
  HONOR_CATEGORY_LABELS,
  fillCaptureYears,
  formatShowcaseCount,
  peakCaptureYears,
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
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 280, height: 42 });
  const filled = fillCaptureYears(years);

  useLayoutEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const apply = () => {
      const box = el.getBoundingClientRect();
      if (box.width > 0 && box.height > 0) {
        setSize({ width: box.width, height: box.height });
      }
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, [filled.length]);

  if (filled.length < 4) return null;
  const width = size.width;
  const height = size.height;
  const padX = 8;
  const padTop = 8;
  const padBottom = 4;
  const max = Math.max(...filled.map((row) => row.n), 1);
  const innerW = Math.max(width - padX * 2, 1);
  const innerH = Math.max(height - padTop - padBottom, 1);
  const coords = filled.map((row, index) => {
    const x = padX + (filled.length === 1 ? innerW / 2 : (index / (filled.length - 1)) * innerW);
    const y = padTop + innerH - (row.n / max) * innerH;
    return { ...row, x, y };
  });
  const pointAttr = coords.map((row) => `${row.x.toFixed(1)},${row.y.toFixed(1)}`).join(" ");
  const area = `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)} L${pointAttr} V${height - padBottom} H${padX} Z`;
  const first = filled[0].year;
  const last = filled[filled.length - 1].year;
  const peak = filled.reduce((best, row) => (row.n > best.n ? row : best), filled[0]);
  const midIndex = Math.round((filled.length - 1) / 2);
  const mid = filled[midIndex].year;
  const ticks = [first, mid, last].filter((year, index, all) => all.indexOf(year) === index);
  const peaks = peakCaptureYears(filled);
  const gridLevels = [0, 0.5, 1];
  const yearGuides = ticks
    .map((year) => coords.find((row) => row.year === year))
    .filter((row): row is (typeof coords)[number] => Boolean(row));

  return (
    <figure className="mw-stats-spark" aria-labelledby={captionId}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width.toFixed(1)} ${height.toFixed(1)}`}
        preserveAspectRatio="none"
        role="img"
        aria-hidden="true"
      >
        {gridLevels.map((level) => {
          const y = padTop + innerH * (1 - level);
          return <line key={level} x1={padX} x2={width - padX} y1={y} y2={y} className="mw-stats-spark-grid" />;
        })}
        {yearGuides.map((row) => (
          <line
            key={row.year}
            x1={row.x}
            x2={row.x}
            y1={padTop}
            y2={height - padBottom}
            className="mw-stats-spark-year"
          />
        ))}
        <path d={area} className="mw-stats-spark-area" />
        <polyline points={pointAttr} className="mw-stats-spark-line" />
        {peaks.map((row) => {
          const point = coords.find((item) => item.year === row.year);
          if (!point) return null;
          return <circle key={row.year} cx={point.x} cy={point.y} r="3.2" className="mw-stats-spark-peak" />;
        })}
      </svg>
      <div className="mw-stats-spark-ticks" aria-hidden="true">
        {ticks.map((year) => (
          <span key={year}>{year}</span>
        ))}
      </div>
      <figcaption id={captionId} className="mw-stats-caption">
        <KeepTail text={`Years the photos were made, peak in ${peak.year}`} keep={5} />
      </figcaption>
    </figure>
  );
}

function FieldMap({ counts }: { counts: { code: string; n: number }[] }) {
  const byCode = new Map(counts.map((row) => [row.code, row.n]));
  const max = Math.max(...counts.map((row) => row.n), 1);
  const captionId = useId();
  const showAlaska = (byCode.get("AK") ?? 0) > 0;
  const showHawaii = (byCode.get("HI") ?? 0) > 0;

  return (
    <div
      className="mw-stats-map-art"
      aria-labelledby={captionId}
      data-ak={showAlaska ? "true" : "false"}
      data-hi={showHawaii ? "true" : "false"}
    >
      <svg viewBox={US_MAP_VIEWBOX} role="img" aria-hidden="true">
        <path d={US_LAND_PATHS.continent} className="mw-stats-land" />
        <path d={US_LAND_PATHS.lakes} className="mw-stats-lakes" />
        <path d={US_LAND_PATHS.alaska} className="mw-stats-land is-ak" />
        <path d={US_LAND_PATHS.hawaii} className="mw-stats-land is-hi" />
        {US_STATE_ANCHORS.map((anchor) => {
          const n = byCode.get(anchor.code) ?? 0;
          const inset = anchor.code === "AK" ? " is-ak" : anchor.code === "HI" ? " is-hi" : "";
          const t = n / max;
          const r = n > 0 ? 10 + Math.sqrt(t) * 22 : 0;
          const opacity = n > 0 ? 0.22 + t * 0.72 : 0;
          const compactR = n > 0 && (anchor.code === "AK" || anchor.code === "HI") ? Math.max(8, r * 0.72) : r;
          return (
            <g key={anchor.code} className={(n > 0 ? "is-active" : "is-empty") + inset}>
              {n > 0 ? <circle cx={anchor.x} cy={anchor.y} r={compactR} fill="#e79f2b" fillOpacity={opacity} /> : null}
              <text
                x={anchor.x}
                y={anchor.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={anchor.size === "s" || anchor.code === "HI" || anchor.code === "AK" ? 13 : 16}
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
  const regions = counts.regions ?? 0;
  const countries = counts.countries ?? 0;

  return (
    <div className="mw-stats">
      <div className="mw-stats-main">
        <div className="mw-stats-hero">
          <div className="mw-stats-hero-pair">
            <div className="mw-stats-hero-figure">
              <p className="mw-stats-hero-value">
                <CountUp value={counts.honors} />
              </p>
              <p className="mw-stats-label mw-stats-hero-label">Field Honors</p>
            </div>
            {categories.length > 1 ? <RankedBars items={categories} /> : null}
            <p className="mw-showcase-honors">
              <KeepTail text={fieldHonorsPublicLine} />
            </p>
          </div>
        </div>
        <div className="mw-stats-pics">
          <div className="mw-stats-pics-lead">
            <p className="mw-stats-supporting-value">
              <CountUp value={counts.pics} />
            </p>
            <p className="mw-stats-label">Pics shared</p>
            {showWeek ? (
              <p className="mw-stats-note mw-stats-nowrap">{formatShowcaseCount(counts.weekPics ?? 0)} shared this week</p>
            ) : null}
          </div>
          {counts.captureYears && counts.captureYears.length >= 4 ? (
            <YearSparkline years={counts.captureYears} />
          ) : null}
        </div>
      </div>

      {showRegions ? (
        <div className="mw-stats-places">
          <p className="mw-stats-kicker">Where the photos were made</p>
          <p className="mw-stats-regions-line">
            <span className="mw-stats-place-value">
              <CountUp value={regions} />
            </span>
            <span className="mw-stats-label mw-stats-place-label">
              {countries > 1
                ? `regions, ${formatShowcaseCount(countries)} countries`
                : "regions"}
            </span>
          </p>
          {usStates.length >= 3 ? <FieldMap counts={usStates} /> : null}
          {places.length >= 3 ? (
            <>
              <p className="mw-stats-kicker mw-stats-places-list-label mw-stats-nowrap">
                Top places photographed
              </p>
              <RankedBars
                items={places.map((row) => ({ key: row.name, label: row.name, n: row.n }))}
              />
            </>
          ) : null}
        </div>
      ) : null}

      <div className="mw-stats-band">
        <div className="mw-stats-band-left">
          {showReactions ? (
            <div className="mw-stats-side">
              <p className="mw-stats-side-value">
                <CountUp value={counts.reactions ?? 0} />
              </p>
              <p className="mw-stats-label">Reactions</p>
            </div>
          ) : null}
        </div>
        <div className="mw-stats-band-right">
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
    </div>
  );
}
