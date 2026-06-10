"use client";

/* eslint-disable @next/next/no-img-element */

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
} from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";

import {
  formatFileSize,
  getAttachmentCaption,
  getImageAspectKind,
  getMediaAttachmentUrl,
} from "@/features/content/content-media";
import type { MediaAttachment } from "@/features/media/types";
import { cn } from "@/lib/utils";

type ContentImageGalleryProps = {
  attachments: MediaAttachment[];
  caption?: string;
  className?: string;
  href?: string;
  onNavigate?: () => void;
  variant: "detail" | "preview";
};

type PointerPoint = {
  x: number;
  y: number;
};

type GestureState =
  | {
      kind: "pan";
      offsetX: number;
      offsetY: number;
      startX: number;
      startY: number;
    }
  | {
      distance: number;
      kind: "pinch";
      scale: number;
    }
  | null;

const lightboxMinScale = 1;
const lightboxMaxScale = 5;

export function ContentImageGallery({
  attachments,
  caption,
  className,
  href,
  onNavigate,
  variant,
}: ContentImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const maxIndex = Math.max(attachments.length - 1, 0);
  const clampedActiveIndex = Math.min(activeIndex, maxIndex);
  const activeAttachment = attachments[clampedActiveIndex];

  if (!activeAttachment) {
    return null;
  }

  const isDetail = variant === "detail";
  const canNavigate = attachments.length > 1;
  const activeKind = getImageAspectKind(activeAttachment);
  const activeCaption = caption || getAttachmentCaption(activeAttachment);

  function showPrevious() {
    setActiveIndex((current) => {
      const currentIndex = Math.min(current, maxIndex);

      return currentIndex === 0 ? maxIndex : currentIndex - 1;
    });
  }

  function showNext() {
    setActiveIndex((current) => {
      const currentIndex = Math.min(current, maxIndex);

      return currentIndex === maxIndex ? 0 : currentIndex + 1;
    });
  }

  return (
    <>
      <span
        className={cn(
          "block min-w-0 overflow-hidden border border-border bg-background-soft",
          isDetail ? "my-4 max-w-full" : "max-w-[640px]",
          className,
        )}
      >
        <span className="relative block bg-black">
          {href && !isDetail ? (
            <Link
              href={href}
              onClick={onNavigate}
              className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ImageStage
                attachment={activeAttachment}
                isExpanded={isExpanded}
                onOpenLightbox={null}
                variant="preview"
              />
            </Link>
          ) : (
            <ImageStage
              attachment={activeAttachment}
              isExpanded={isExpanded}
              onOpenLightbox={() => setLightboxIndex(clampedActiveIndex)}
              variant={variant}
            />
          )}

          {activeKind === "tall" && !isDetail ? (
            <span className="absolute left-2 top-2 border border-border bg-black/75 px-2 py-1 text-xs font-semibold text-foreground">
              长图
            </span>
          ) : null}

          {isDetail && activeKind === "tall" ? (
            <button
              type="button"
              className="absolute bottom-2 left-2 border border-border bg-black/75 px-2 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setIsExpanded((current) => !current)}
            >
              {isExpanded ? "收起长图" : "展开长图"}
            </button>
          ) : null}

          {canNavigate ? (
            <>
              <ImageNavButton
                ariaLabel="上一张图片"
                className="left-2"
                icon={<ChevronLeft className="size-4" aria-hidden="true" />}
                onClick={showPrevious}
              />
              <ImageNavButton
                ariaLabel="下一张图片"
                className="right-2"
                icon={<ChevronRight className="size-4" aria-hidden="true" />}
                onClick={showNext}
              />
            </>
          ) : null}
        </span>

        <span className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border px-3 py-2 text-xs text-muted-foreground">
          <span className="min-w-0 truncate">
            {canNavigate
              ? `${activeCaption} · ${clampedActiveIndex + 1}/${attachments.length}`
              : activeCaption}
          </span>
          <span className="flex items-center gap-2">
            <span className="font-mono">
              {formatFileSize(activeAttachment.size_bytes)}
            </span>
            {isDetail ? (
              <button
                type="button"
                className="inline-flex size-7 items-center justify-center text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => setLightboxIndex(clampedActiveIndex)}
                title="查看完整图片"
                aria-label="查看完整图片"
              >
                <Maximize2 className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </span>
        </span>

        {canNavigate ? (
          <span className="flex gap-2 overflow-x-auto border-t border-border bg-background px-2 py-2 [scrollbar-width:thin]">
            {attachments.slice(0, 4).map((attachment, index) => {
              const hiddenCount = attachments.length - 4;
              const showOverflow = index === 3 && hiddenCount > 0;

              return (
                <button
                  key={attachment.id}
                  type="button"
                  className={cn(
                    "relative size-14 shrink-0 overflow-hidden border bg-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    index === clampedActiveIndex
                      ? "border-primary"
                      : "border-border hover:border-primary/60",
                  )}
                  onClick={() => setActiveIndex(index)}
                  aria-label={`查看第 ${index + 1} 张图片`}
                >
                  <img
                    src={getMediaAttachmentUrl(attachment, "preview")}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="size-full object-cover"
                  />
                  {showOverflow ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/70 font-mono text-sm font-semibold text-foreground">
                      +{hiddenCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </span>
        ) : null}
      </span>

      {lightboxIndex !== null ? (
        createPortal(
          <ImageLightbox
            attachments={attachments}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />,
          document.body,
        )
      ) : null}
    </>
  );
}

function ImageStage({
  attachment,
  isExpanded,
  onOpenLightbox,
  variant,
}: {
  attachment: MediaAttachment;
  isExpanded: boolean;
  onOpenLightbox: (() => void) | null;
  variant: "detail" | "preview";
}) {
  const aspectKind = getImageAspectKind(attachment);
  const isDetail = variant === "detail";
  const imageUrl = getMediaAttachmentUrl(
    attachment,
    isDetail ? "detail" : "preview",
  );

  return (
    <span
      className={cn(
        "flex min-w-0 items-center justify-center bg-black",
        !isDetail && "max-h-[320px] sm:max-h-[420px]",
        !isDetail &&
          aspectKind === "tall" &&
          "mx-auto aspect-[4/5] w-full max-w-[256px] sm:max-w-[336px]",
        !isDetail && aspectKind === "wide" && "aspect-video w-full",
        !isDetail && aspectKind === "normal" && "w-full",
        !isDetail && aspectKind === "small" && "min-h-36 p-4",
        isDetail && "w-full",
      )}
    >
      <img
        src={imageUrl}
        alt={getAttachmentCaption(attachment)}
        loading="lazy"
        decoding="async"
        className={cn(
          "block",
          !isDetail &&
            aspectKind === "tall" &&
            "size-full object-cover object-top",
          !isDetail && aspectKind === "wide" && "size-full object-contain",
          !isDetail &&
            (aspectKind === "normal" || aspectKind === "small") &&
            "h-auto max-h-[320px] w-auto max-w-full object-contain sm:max-h-[420px]",
          isDetail &&
            "h-auto w-auto max-w-full object-contain",
          isDetail && !isExpanded && "max-h-[80vh]",
        )}
        onClick={onOpenLightbox ?? undefined}
      />
    </span>
  );
}

function ImageNavButton({
  ariaLabel,
  className,
  icon,
  onClick,
}: {
  ariaLabel: string;
  className: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "absolute top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center border border-border bg-black/70 text-foreground transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className,
      )}
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      {icon}
    </button>
  );
}

function ImageLightbox({
  attachments,
  initialIndex,
  onClose,
}: {
  attachments: MediaAttachment[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [scale, setScale] = useState(lightboxMinScale);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const pointersRef = useRef(new Map<number, PointerPoint>());
  const gestureRef = useRef<GestureState>(null);
  const activeAttachment = attachments[activeIndex] ?? attachments[0];

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "ArrowLeft") {
        setActiveIndex((current) =>
          current === 0 ? attachments.length - 1 : current - 1,
        );
      }

      if (event.key === "ArrowRight") {
        setActiveIndex((current) =>
          current === attachments.length - 1 ? 0 : current + 1,
        );
      }

      if (event.key === "+" || event.key === "=") {
        setScale((current) => clampScale(current + 0.25));
      }

      if (event.key === "-") {
        setScale((current) => clampScale(current - 0.25));
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [attachments.length, onClose]);

  useEffect(() => {
    resetTransform();
  }, [activeIndex]);

  if (!activeAttachment) {
    return null;
  }

  const lightboxUrl = getMediaAttachmentUrl(activeAttachment, "lightbox");
  const originalUrl = activeAttachment.original_url || activeAttachment.url;

  function resetTransform() {
    setScale(lightboxMinScale);
    setOffset({ x: 0, y: 0 });
    pointersRef.current.clear();
    gestureRef.current = null;
  }

  function showPrevious() {
    setActiveIndex((current) =>
      current === 0 ? attachments.length - 1 : current - 1,
    );
  }

  function showNext() {
    setActiveIndex((current) =>
      current === attachments.length - 1 ? 0 : current + 1,
    );
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.2 : 0.2;
    setScale((current) => clampScale(current + delta));
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointersRef.current.size >= 2) {
      const [first, second] = [...pointersRef.current.values()];
      gestureRef.current = {
        distance: getDistance(first, second),
        kind: "pinch",
        scale,
      };
      return;
    }

    gestureRef.current = {
      kind: "pan",
      offsetX: offset.x,
      offsetY: offset.y,
      startX: event.clientX,
      startY: event.clientY,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.has(event.pointerId)) {
      return;
    }

    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    const gesture = gestureRef.current;

    if (pointersRef.current.size >= 2 && gesture?.kind === "pinch") {
      const [first, second] = [...pointersRef.current.values()];
      const nextDistance = getDistance(first, second);
      const nextScale = gesture.distance
        ? gesture.scale * (nextDistance / gesture.distance)
        : scale;

      setScale(clampScale(nextScale));
      return;
    }

    if (gesture?.kind !== "pan") {
      return;
    }

    if (scale <= 1) {
      return;
    }

    setOffset({
      x: gesture.offsetX + event.clientX - gesture.startX,
      y: gesture.offsetY + event.clientY - gesture.startY,
    });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    const wasSinglePointer = pointersRef.current.size === 1;
    const point = pointersRef.current.get(event.pointerId);

    pointersRef.current.delete(event.pointerId);

    if (wasSinglePointer && gesture?.kind === "pan" && point && scale <= 1.05) {
      const deltaX = point.x - gesture.startX;
      const deltaY = point.y - gesture.startY;

      if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
        if (deltaX > 0) {
          showPrevious();
        } else {
          showNext();
        }
      }
    }

    if (pointersRef.current.size === 0) {
      gestureRef.current = null;
      return;
    }

    const [remaining] = [...pointersRef.current.values()];
    gestureRef.current = {
      kind: "pan",
      offsetX: offset.x,
      offsetY: offset.y,
      startX: remaining.x,
      startY: remaining.y,
    };
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="图片查看器"
      className="fixed inset-0 z-50 grid grid-rows-[auto_minmax(0,1fr)_auto] bg-black/95 text-foreground"
    >
      <header className="flex min-h-14 items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {getAttachmentCaption(activeAttachment)}
          </p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {activeIndex + 1}/{attachments.length} ·{" "}
            {formatFileSize(activeAttachment.size_bytes)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <LightboxToolButton
            label="缩小"
            onClick={() => setScale((current) => clampScale(current - 0.25))}
          >
            <Minus className="size-4" aria-hidden="true" />
          </LightboxToolButton>
          <span className="min-w-12 text-center font-mono text-xs text-muted-foreground">
            {Math.round(scale * 100)}%
          </span>
          <LightboxToolButton
            label="放大"
            onClick={() => setScale((current) => clampScale(current + 0.25))}
          >
            <Plus className="size-4" aria-hidden="true" />
          </LightboxToolButton>
          <LightboxToolButton label="重置" onClick={resetTransform}>
            <RotateCcw className="size-4" aria-hidden="true" />
          </LightboxToolButton>
          <a
            href={originalUrl}
            target="_blank"
            rel="nofollow ugc noopener noreferrer"
            className="inline-flex size-9 items-center justify-center transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="打开原图"
            aria-label="打开原图"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
          <LightboxToolButton label="关闭" onClick={onClose}>
            <X className="size-5" aria-hidden="true" />
          </LightboxToolButton>
        </div>
      </header>

      <div
        className="relative min-h-0 touch-none select-none overflow-hidden"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={() =>
          scale > 1 ? resetTransform() : setScale(Math.min(2, lightboxMaxScale))
        }
      >
        <img
          src={lightboxUrl}
          alt={getAttachmentCaption(activeAttachment)}
          draggable={false}
          className="absolute left-1/2 top-1/2 max-h-[calc(100vh-8rem)] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 object-contain will-change-transform"
          style={{
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
          }}
        />

        {attachments.length > 1 ? (
          <>
            <LightboxSideButton
              label="上一张图片"
              side="left"
              onClick={showPrevious}
            />
            <LightboxSideButton
              label="下一张图片"
              side="right"
              onClick={showNext}
            />
          </>
        ) : null}
      </div>

      {attachments.length > 1 ? (
        <footer className="flex gap-2 overflow-x-auto border-t border-white/10 px-3 py-2 [scrollbar-width:thin]">
          {attachments.map((attachment, index) => (
            <button
              key={attachment.id}
              type="button"
              className={cn(
                "size-14 shrink-0 overflow-hidden border bg-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                index === activeIndex
                  ? "border-primary"
                  : "border-white/20 hover:border-primary/60",
              )}
              onClick={() => setActiveIndex(index)}
              aria-label={`查看第 ${index + 1} 张图片`}
            >
              <img
                src={getMediaAttachmentUrl(attachment, "preview")}
                alt=""
                loading="lazy"
                decoding="async"
                className="size-full object-cover"
              />
            </button>
          ))}
        </footer>
      ) : null}
    </div>
  );
}

function LightboxToolButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex size-9 items-center justify-center transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function LightboxSideButton({
  label,
  onClick,
  side,
}: {
  label: string;
  onClick: () => void;
  side: "left" | "right";
}) {
  return (
    <button
      type="button"
      className={cn(
        "absolute top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center border border-white/10 bg-black/60 text-foreground transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:inline-flex",
        side === "left" ? "left-3" : "right-3",
      )}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {side === "left" ? (
        <ChevronLeft className="size-5" aria-hidden="true" />
      ) : (
        <ChevronRight className="size-5" aria-hidden="true" />
      )}
    </button>
  );
}

function clampScale(value: number) {
  return Math.min(Math.max(value, lightboxMinScale), lightboxMaxScale);
}

function getDistance(first: PointerPoint, second: PointerPoint) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}
