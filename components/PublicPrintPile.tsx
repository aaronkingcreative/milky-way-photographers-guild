"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { KeepTail } from "@/components/KeepTail";
import { nextPrintLabel, previousPrintLabel, putPrintBackLabel, shufflePileLabel } from "@/lib/public-copy";
import { DRAG_THRESHOLD_PX, PRINT_SAFE, PRINT_SAFE_WIDE, clampPose, isWidePrintSpread, scatterPrints, seedFromKeys, type PrintPose } from "@/lib/print-pile";
import type { ShowcasePhoto } from "@/lib/public-showcase";
import { DEFAULT_PRINT_AVATAR, isDefaultPrintAvatar, showcaseAvatarUrl, showcaseThumbUrl } from "@/lib/showcase-images";

type PhotoSrcStage = "webp" | "jpeg" | "original";

function pilePhotoSrc(imageUrl: string, stage: PhotoSrcStage): string {
  if (stage === "webp") return showcaseThumbUrl(imageUrl, "webp");
  if (stage === "jpeg") return showcaseThumbUrl(imageUrl);
  return imageUrl;
}

function nextPhotoStage(stage: PhotoSrcStage): PhotoSrcStage | null {
  if (stage === "webp") return "jpeg";
  if (stage === "jpeg") return "original";
  return null;
}

const photoAlt = "Guild member photo";
const DEFAULT_ASPECT = 4 / 3;

type DragState = {
  index: number;
  pointerId: number;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  origRotate: number;
  moved: boolean;
};

type PosePair = {
  narrow: PrintPose;
  wide: PrintPose;
};

function aspectFromImage(image: HTMLImageElement): number | null {
  if (!image.naturalWidth || !image.naturalHeight) return null;
  return image.naturalWidth / image.naturalHeight;
}

function avatarSrc(url: string, failed: boolean, stage: PhotoSrcStage = "webp"): string {
  if (failed || isDefaultPrintAvatar(url)) return DEFAULT_PRINT_AVATAR;
  if (stage === "original") return url;
  return showcaseAvatarUrl(url, stage === "webp" ? "webp" : undefined);
}

export function PublicPrintPile({ photos }: { photos: ShowcasePhoto[] }) {
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());
  const visible = useMemo(
    () => photos.filter((photo) => !failedUrls.has(photo.imageUrl)),
    [photos, failedUrls],
  );
  const keys = useMemo(() => visible.map((photo) => photo.imageUrl), [visible]);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const baseSeed = useMemo(() => seedFromKeys(keys), [keys]);
  const seed = (baseSeed + shuffleSeed) >>> 0;
  const narrowLayouts = useMemo(() => scatterPrints(visible.length, seed, PRINT_SAFE), [visible.length, seed]);
  const wideLayouts = useMemo(() => scatterPrints(visible.length, seed, PRINT_SAFE_WIDE), [visible.length, seed]);
  const [overrides, setOverrides] = useState<Record<number, PosePair>>({});
  const [order, setOrder] = useState(() => visible.map((_, index) => index));
  const [dragging, setDragging] = useState<number | null>(null);
  const [focus, setFocus] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [aspects, setAspects] = useState<Record<string, number>>({});
  const [readyUrls, setReadyUrls] = useState<Set<string>>(() => new Set());
  const [readyAvatars, setReadyAvatars] = useState<Set<string>>(() => new Set());
  const [failedAvatars, setFailedAvatars] = useState<Set<string>>(() => new Set());
  const [photoStages, setPhotoStages] = useState<Record<string, PhotoSrcStage>>({});
  const [avatarStages, setAvatarStages] = useState<Record<string, PhotoSrcStage>>({});
  const tableRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setOverrides({});
    setOrder(visible.map((_, index) => index));
  }, [narrowLayouts, wideLayouts, visible]);

  const narrowPoses = narrowLayouts.map((pose, index) => overrides[index]?.narrow ?? pose);
  const widePoses = wideLayouts.map((pose, index) => overrides[index]?.wide ?? pose);

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
      if (current === null || visible.length < 2) return current;
      return (current + delta + visible.length) % visible.length;
    });
  }, [visible.length]);

  const dropPhoto = useCallback((imageUrl: string) => {
    setFailedUrls((current) => {
      if (current.has(imageUrl)) return current;
      const next = new Set(current);
      next.add(imageUrl);
      return next;
    });
    setFocus((current) => {
      if (current === null) return current;
      const url = visible[current]?.imageUrl;
      return url === imageUrl ? null : current;
    });
  }, [visible]);

  const markAvatarReady = useCallback((imageUrl: string) => {
    setReadyAvatars((current) => {
      if (current.has(imageUrl)) return current;
      const next = new Set(current);
      next.add(imageUrl);
      return next;
    });
  }, []);

  const markPhotoReady = useCallback((imageUrl: string, image: HTMLImageElement) => {
    const aspect = aspectFromImage(image);
    if (aspect) {
      setAspects((current) => (current[imageUrl] === aspect ? current : { ...current, [imageUrl]: aspect }));
    }
    setReadyUrls((current) => {
      if (current.has(imageUrl)) return current;
      const next = new Set(current);
      next.add(imageUrl);
      return next;
    });
  }, []);

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
    const wide = isWidePrintSpread();
    const pose = (wide ? widePoses : narrowPoses)[index];
    dragRef.current = {
      index,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origX: pose.x,
      origY: pose.y,
      origRotate: pose.rotate,
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
    const wide = isWidePrintSpread();
    const next = clampPose({
      x: drag.origX + (dx / rect.width) * 100,
      y: drag.origY + (dy / rect.height) * 100,
      rotate: drag.origRotate,
    }, wide ? PRINT_SAFE_WIDE : PRINT_SAFE);
    const index = drag.index;
    setOverrides((current) => ({
      ...current,
      [index]: {
        narrow: wide ? (current[index]?.narrow ?? narrowLayouts[index]) : next,
        wide: wide ? next : (current[index]?.wide ?? wideLayouts[index]),
      },
    }));
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

  const focusedPhoto = focus !== null ? visible[focus] : null;
  if (visible.length === 0) return null;

  return (
    <div className="mw-print-pile">
      <div ref={tableRef} className="mw-print-table" aria-label="A pile of Guild prints">
        {visible.map((photo, index) => {
          const narrow = narrowPoses[index];
          const wide = widePoses[index];
          const z = order.indexOf(index) + 1;
          const isDragging = dragging === index;
          const aspect = aspects[photo.imageUrl] ?? DEFAULT_ASPECT;
          const ready = readyUrls.has(photo.imageUrl);
          const pileSrc = pilePhotoSrc(photo.imageUrl, photoStages[photo.imageUrl] ?? "webp");
          const priority = visible.length - z < 3;
          const avatarReady = readyAvatars.has(photo.imageUrl) || isDefaultPrintAvatar(photo.avatarUrl) || failedAvatars.has(photo.avatarUrl);
          return (
            <button
              key={photo.imageUrl}
              type="button"
              className={`mw-print${isDragging ? " is-dragging" : ""}${ready ? " is-ready" : ""}${avatarReady ? " is-avatar-ready" : ""}`}
              style={{
                zIndex: isDragging ? 80 : z,
                "--rot-narrow": `${narrow.rotate}deg`,
                "--rot-wide": `${wide.rotate}deg`,
                "--x": `${narrow.x}%`,
                "--y": `${narrow.y}%`,
                "--x-wide": `${wide.x}%`,
                "--y-wide": `${wide.y}%`,
                "--photo-aspect": String(aspect),
              } as CSSProperties}
              onPointerDown={(event) => onPointerDown(event, index)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={(event: ReactKeyboardEvent<HTMLButtonElement>) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openFocus(index);
                }
              }}
            >
              <span className="mw-print-frame">
                <span className="mw-print-slot">
                  <img
                    className="mw-print-photo"
                    src={pileSrc}
                    alt={photoAlt}
                    loading="eager"
                    decoding="async"
                    fetchPriority={priority ? "high" : "auto"}
                    draggable={false}
                    onLoad={(event) => markPhotoReady(photo.imageUrl, event.currentTarget)}
                    onError={() => {
                      const currentStage = photoStages[photo.imageUrl] ?? "webp";
                      const next = nextPhotoStage(currentStage);
                      if (next) {
                        setPhotoStages((current) => ({ ...current, [photo.imageUrl]: next }));
                        return;
                      }
                      dropPhoto(photo.imageUrl);
                    }}
                    ref={(image) => {
                      if (image && image.complete && image.naturalWidth) markPhotoReady(photo.imageUrl, image);
                    }}
                  />
                </span>
                <img
                  className="mw-print-avatar"
                  src={avatarSrc(photo.avatarUrl, failedAvatars.has(photo.avatarUrl), avatarStages[photo.avatarUrl] ?? "webp")}
                  alt=""
                  loading="eager"
                  decoding="async"
                  fetchPriority={priority ? "high" : "auto"}
                  draggable={false}
                  onLoad={() => markAvatarReady(photo.imageUrl)}
                  onError={(event) => {
                    if (event.currentTarget.src.includes(DEFAULT_PRINT_AVATAR) || event.currentTarget.getAttribute("src") === DEFAULT_PRINT_AVATAR) {
                      markAvatarReady(photo.imageUrl);
                      return;
                    }
                    const currentStage = avatarStages[photo.avatarUrl] ?? "webp";
                    const next = nextPhotoStage(currentStage);
                    if (next && next !== "original") {
                      setAvatarStages((current) => ({ ...current, [photo.avatarUrl]: next }));
                      return;
                    }
                    setFailedAvatars((current) => new Set(current).add(photo.avatarUrl));
                    markAvatarReady(photo.imageUrl);
                  }}
                  ref={(image) => {
                    if (image && image.complete && (image.naturalWidth > 0 || (image.currentSrc || image.src || "").endsWith(".svg"))) {
                      markAvatarReady(photo.imageUrl);
                    }
                  }}
                />
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
          <button ref={closeRef} type="button" className="mw-print-focus-close" onClick={closeFocus}>
            <KeepTail text={putPrintBackLabel} />
          </button>
          <div
            className="mw-print-focus-inner"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={onFocusPointerDown}
            onPointerUp={onFocusPointerUp}
          >
            {visible.length > 1 && (
              <button type="button" className="mw-print-focus-nav is-prev" aria-label={previousPrintLabel} onClick={(event) => { event.stopPropagation(); stepFocus(-1); }}>
                <span aria-hidden="true">‹</span>
              </button>
            )}
            <figure
              className={`mw-print mw-print-focused${readyUrls.has(focusedPhoto.imageUrl) ? " is-ready" : ""}${readyAvatars.has(focusedPhoto.imageUrl) || isDefaultPrintAvatar(focusedPhoto.avatarUrl) || failedAvatars.has(focusedPhoto.avatarUrl) ? " is-avatar-ready" : ""}`}
              style={{ "--photo-aspect": String(aspects[focusedPhoto.imageUrl] ?? DEFAULT_ASPECT) } as CSSProperties}
            >
              <span className="mw-print-frame">
                <span className="mw-print-slot">
                  <img
                    className="mw-print-photo"
                    src={focusedPhoto.imageUrl}
                    alt={photoAlt}
                    decoding="async"
                    fetchPriority="high"
                    draggable={false}
                    onLoad={(event) => markPhotoReady(focusedPhoto.imageUrl, event.currentTarget)}
                  />
                </span>
                <img
                  className="mw-print-avatar"
                  src={avatarSrc(focusedPhoto.avatarUrl, failedAvatars.has(focusedPhoto.avatarUrl), avatarStages[focusedPhoto.avatarUrl] ?? "webp")}
                  alt=""
                  decoding="async"
                  draggable={false}
                  onLoad={() => markAvatarReady(focusedPhoto.imageUrl)}
                  ref={(image) => {
                    if (image && image.complete && (image.naturalWidth > 0 || (image.currentSrc || image.src || "").endsWith(".svg"))) {
                      markAvatarReady(focusedPhoto.imageUrl);
                    }
                  }}
                />
              </span>
            </figure>
            {visible.length > 1 && (
              <button type="button" className="mw-print-focus-nav is-next" aria-label={nextPrintLabel} onClick={(event) => { event.stopPropagation(); stepFocus(1); }}>
                <span aria-hidden="true">›</span>
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
