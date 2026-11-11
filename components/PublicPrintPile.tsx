"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { KeepTail } from "@/components/KeepTail";
import { nextPrintLabel, previousPrintLabel, putPrintBackLabel, shufflePileLabel } from "@/lib/public-copy";
import { DRAG_THRESHOLD_PX, clampPose, scatterPrints, seedFromKeys, type PrintPose } from "@/lib/print-pile";
import type { ShowcasePhoto } from "@/lib/public-showcase";

const photoAlt = "Guild member photo";

type DragState = {
  index: number;
  pointerId: number;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  moved: boolean;
};

export function PublicPrintPile({ photos }: { photos: ShowcasePhoto[] }) {
  const keys = useMemo(() => photos.map((photo) => photo.imageUrl), [photos]);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const baseSeed = useMemo(() => seedFromKeys(keys), [keys]);
  const layouts = useMemo(() => scatterPrints(photos.length, (baseSeed + shuffleSeed) >>> 0), [photos.length, baseSeed, shuffleSeed]);
  const [overrides, setOverrides] = useState<Record<number, PrintPose>>({});
  const [order, setOrder] = useState(() => photos.map((_, index) => index));
  const [dragging, setDragging] = useState<number | null>(null);
  const [focus, setFocus] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setOverrides({});
    setOrder(photos.map((_, index) => index));
  }, [layouts, photos]);

  const poses = layouts.map((pose, index) => overrides[index] ?? pose);

  const bringToFront = useCallback((index: number) => {
    setOrder((current) => {
      if (current[current.length - 1] === index) return current;
      return [...current.filter((item) => item !== index), index];
    });
  }, []);

  const openFocus = useCallback((index: number) => {
    setFocus(index);
    bringToFront(index);
  }, [bringToFront]);

  const closeFocus = useCallback(() => setFocus(null), []);

  const stepFocus = useCallback((delta: number) => {
    setFocus((current) => {
      if (current === null || photos.length < 2) return current;
      return (current + delta + photos.length) % photos.length;
    });
  }, [photos.length]);

  useEffect(() => {
    if (focus === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeFocus();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        stepFocus(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        stepFocus(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [closeFocus, focus, stepFocus]);

  function onPointerDown(event: PointerEvent<HTMLButtonElement>, index: number) {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    const table = tableRef.current;
    if (!table) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const pose = poses[index];
    dragRef.current = {
      index,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origX: pose.x,
      origY: pose.y,
      moved: false,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    const table = tableRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !table) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    if (!drag.moved) {
      drag.moved = true;
      setDragging(drag.index);
      bringToFront(drag.index);
    }
    const rect = table.getBoundingClientRect();
    const next = clampPose({
      x: drag.origX + (dx / rect.width) * 100,
      y: drag.origY + (dy / rect.height) * 100,
      rotate: poses[drag.index].rotate,
    });
    setOverrides((current) => ({ ...current, [drag.index]: next }));
  }

  function onPointerUp(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // The pointer was already released.
    }
    const wasDrag = drag.moved;
    const index = drag.index;
    dragRef.current = null;
    setDragging(null);
    if (!wasDrag) openFocus(index);
  }

  function shuffle() {
    setOverrides({});
    setShuffleSeed((current) => current + 1 + Math.floor(Math.random() * 1000));
  }

  function onFocusPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    swipeRef.current = { x: event.clientX, y: event.clientY };
  }

  function onFocusPointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = swipeRef.current;
    swipeRef.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    stepFocus(dx < 0 ? 1 : -1);
  }

  const focusedPhoto = focus !== null ? photos[focus] : null;

  return (
    <div className="mw-print-pile">
      <div ref={tableRef} className="mw-print-table" aria-label="A pile of Guild prints">
        {photos.map((photo, index) => {
          const pose = poses[index];
          const z = order.indexOf(index) + 1;
          const isDragging = dragging === index;
          return (
            <button
              key={photo.imageUrl}
              type="button"
              className={`mw-print${isDragging ? " is-dragging" : ""}`}
              style={{
                left: `${pose.x}%`,
                top: `${pose.y}%`,
                zIndex: isDragging ? 80 : z,
                "--rot": `${pose.rotate}deg`,
              } as CSSProperties}
              onPointerDown={(event) => onPointerDown(event, index)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openFocus(index);
                }
              }}
            >
              <span className="mw-print-frame">
                <img className="mw-print-photo" src={photo.imageUrl} alt={photoAlt} loading="lazy" decoding="async" draggable={false} />
                <img className="mw-print-avatar" src={photo.avatarUrl} alt="" loading="lazy" decoding="async" draggable={false} />
              </span>
            </button>
          );
        })}
      </div>
      <button type="button" className="mw-print-shuffle" onClick={shuffle}>
        <KeepTail text={shufflePileLabel} />
      </button>

      {mounted && focusedPhoto && focus !== null && createPortal(
        <div className="mw-print-focus" role="dialog" aria-modal="true" aria-label="Guild print" onClick={closeFocus}>
          <div className="mw-print-focus-inner" onClick={(event) => event.stopPropagation()}>
            <button ref={closeRef} type="button" className="mw-print-focus-close" onClick={closeFocus}>
              <KeepTail text={putPrintBackLabel} />
            </button>
            <div
              className="mw-print-focus-stage"
              onPointerDown={onFocusPointerDown}
              onPointerUp={onFocusPointerUp}
            >
              {photos.length > 1 && (
                <button type="button" className="mw-print-focus-nav is-prev" aria-label={previousPrintLabel} onClick={() => stepFocus(-1)}>
                  <span aria-hidden="true">‹</span>
                </button>
              )}
              <figure className="mw-print mw-print-focused">
                <span className="mw-print-frame">
                  <img className="mw-print-photo" src={focusedPhoto.imageUrl} alt={photoAlt} decoding="async" draggable={false} />
                  <img className="mw-print-avatar" src={focusedPhoto.avatarUrl} alt="" decoding="async" draggable={false} />
                </span>
              </figure>
              {photos.length > 1 && (
                <button type="button" className="mw-print-focus-nav is-next" aria-label={nextPrintLabel} onClick={() => stepFocus(1)}>
                  <span aria-hidden="true">›</span>
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
