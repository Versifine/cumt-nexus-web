"use client";

/* eslint-disable @next/next/no-img-element */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Images,
  Maximize2,
} from "lucide-react";
import Lightbox from "yet-another-react-lightbox";
import type { SlideImage } from "yet-another-react-lightbox";
import Download from "yet-another-react-lightbox/plugins/download";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";

import {
  formatFileSize,
  getAttachmentCaption,
  getImageAspectKind,
  getMediaAttachmentThumbnailUrl,
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

type EmblaApi = NonNullable<ReturnType<typeof useEmblaCarousel>[1]>;

export function ContentImageGallery({
  attachments,
  caption,
  className,
  href,
  onNavigate,
  variant,
}: ContentImageGalleryProps) {
  const visibleAttachments = useMemo(
    () => attachments.filter((attachment) => attachment.url),
    [attachments],
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isTallExpandedMode, setIsTallExpandedMode] = useState(false);
  const [activeStageHeight, setActiveStageHeight] = useState<number | null>(
    null,
  );
  const galleryRef = useRef<HTMLSpanElement | null>(null);
  const [viewportRef, emblaApi] = useEmblaCarousel({
    align: "center",
    containScroll: "trimSnaps",
    dragFree: false,
    loop: visibleAttachments.length > 1,
  });
  const activeAttachment =
    visibleAttachments[Math.min(selectedIndex, visibleAttachments.length - 1)];
  const isDetail = variant === "detail";
  const canNavigate = visibleAttachments.length > 1;
  const isActiveTall = activeAttachment
    ? getImageAspectKind(activeAttachment) === "tall"
    : false;
  const isActiveTallExpanded = isDetail && isActiveTall && isTallExpandedMode;
  const lightboxSlides = useMemo(
    () => visibleAttachments.map(createLightboxSlide),
    [visibleAttachments],
  );

  const getActiveStageNode = useCallback(
    () =>
      galleryRef.current?.querySelector<HTMLElement>(
        '[data-media-stage="active"]',
      ) ?? null,
    [],
  );

  const measureActiveStage = useCallback(() => {
    if (!isDetail) {
      setActiveStageHeight(null);
      return;
    }

    const nextHeight = Math.ceil(
      getActiveStageNode()?.getBoundingClientRect().height ?? 0,
    );

    if (nextHeight <= 0) {
      return;
    }

    setActiveStageHeight((currentHeight) =>
      currentHeight === nextHeight ? currentHeight : nextHeight,
    );
  }, [getActiveStageNode, isDetail]);

  const syncSelected = useCallback(
    (api: EmblaApi) => {
      const nextIndex = api.selectedScrollSnap();

      setSelectedIndex(nextIndex);

      if (!isTallAttachment(visibleAttachments[nextIndex])) {
        setIsTallExpandedMode(false);
      }
    },
    [visibleAttachments],
  );

  useEffect(() => {
    if (!emblaApi) {
      return;
    }

    emblaApi.on("select", syncSelected);
    emblaApi.on("reInit", syncSelected);

    return () => {
      emblaApi.off("select", syncSelected);
      emblaApi.off("reInit", syncSelected);
    };
  }, [emblaApi, syncSelected]);

  useEffect(() => {
    const lastIndex = Math.max(visibleAttachments.length - 1, 0);

    emblaApi?.reInit();
    emblaApi?.scrollTo(Math.min(emblaApi.selectedScrollSnap(), lastIndex));
  }, [emblaApi, visibleAttachments.length]);

  useLayoutEffect(() => {
    if (!isDetail) {
      return;
    }

    const frameId = window.requestAnimationFrame(measureActiveStage);

    const activeStage = getActiveStageNode();

    if (!activeStage || typeof ResizeObserver === "undefined") {
      return () => window.cancelAnimationFrame(frameId);
    }

    const observer = new ResizeObserver(measureActiveStage);
    observer.observe(activeStage);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [
    getActiveStageNode,
    isDetail,
    isTallExpandedMode,
    measureActiveStage,
    selectedIndex,
    visibleAttachments.length,
  ]);

  useEffect(() => {
    if (!emblaApi || !isDetail) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      emblaApi.reInit();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeStageHeight, emblaApi, isDetail]);

  if (!activeAttachment) {
    return null;
  }

  const activeCaption = caption || getAttachmentCaption(activeAttachment);

  function scrollTo(index: number) {
    setSelectedIndex(index);

    if (!isTallAttachment(visibleAttachments[index])) {
      setIsTallExpandedMode(false);
    }

    emblaApi?.scrollTo(index);
  }

  function openLightbox(index: number) {
    setLightboxIndex(index);
  }

  function scrollAdjacent(delta: -1 | 1) {
    if (visibleAttachments.length === 0) {
      return;
    }

    scrollTo(
      (selectedIndex + delta + visibleAttachments.length) %
        visibleAttachments.length,
    );
  }

  function toggleActiveTallImage() {
    if (!isActiveTall) {
      return;
    }

    setIsTallExpandedMode((current) => !current);
  }

  return (
    <span
      ref={galleryRef}
      data-media-gallery="true"
      className={cn(
        "block min-w-0 overflow-hidden border border-border bg-background-soft",
        isDetail ? "my-5 w-full" : "w-full max-w-[720px]",
        className,
      )}
    >
      <span className="relative block bg-black">
        <span
          ref={viewportRef}
          className="block overflow-hidden"
          style={
            isDetail && activeStageHeight
              ? { height: `${activeStageHeight}px` }
              : undefined
          }
        >
          <span className="flex touch-pan-y">
            {visibleAttachments.map((attachment, index) => (
              <span key={attachment.id} className="min-w-0 flex-[0_0_100%]">
                {href && !isDetail ? (
                  <Link
                    href={href}
                    onClick={onNavigate}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <ImageStage
                      attachment={attachment}
                      isExpanded={false}
                      isActive={index === selectedIndex}
                      onLoad={measureActiveStage}
                      variant="preview"
                    />
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="block w-full cursor-zoom-in text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() => openLightbox(index)}
                    aria-label={`查看第 ${index + 1} 张完整图片`}
                  >
                    <ImageStage
                      attachment={attachment}
                      isExpanded={
                        index === selectedIndex &&
                        isTallExpandedMode &&
                        isTallAttachment(attachment)
                      }
                      isActive={index === selectedIndex}
                      onLoad={measureActiveStage}
                      variant={variant}
                    />
                  </button>
                )}
              </span>
            ))}
          </span>
        </span>

        <MediaBadges
          attachment={activeAttachment}
          count={visibleAttachments.length}
          variant={variant}
        />

        {canNavigate ? (
          <>
            <CarouselButton
              label="上一张图片"
              side="left"
              onClick={() => scrollAdjacent(-1)}
            />
            <CarouselButton
              label="下一张图片"
              side="right"
              onClick={() => scrollAdjacent(1)}
            />
          </>
        ) : null}

        {isDetail ? (
          <span
            className={cn(
              "absolute inset-x-2 flex flex-wrap justify-end gap-2",
              isActiveTallExpanded ? "top-2 items-start" : "bottom-2 items-end",
            )}
          >
            {isActiveTall ? (
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 border border-white/15 bg-black/70 px-2 text-xs font-semibold text-foreground transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={toggleActiveTallImage}
              >
                {isActiveTallExpanded ? "收起长图" : "展开长图"}
              </button>
            ) : null}
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 border border-white/15 bg-black/70 px-2 text-xs font-semibold text-foreground transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => openLightbox(selectedIndex)}
            >
              <Maximize2 className="size-4" aria-hidden="true" />
              查看完整图片
            </button>
          </span>
        ) : null}
      </span>

      <span className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border px-3 py-2 text-xs text-muted-foreground">
        <span className="min-w-0 truncate">
          {canNavigate
            ? `${activeCaption} · ${selectedIndex + 1}/${visibleAttachments.length}`
            : activeCaption}
        </span>
        <span className="flex items-center gap-2">
          <span className="font-mono">
            {formatFileSize(activeAttachment.size_bytes)}
          </span>
          {isDetail ? (
            <a
              href={activeAttachment.original_url || activeAttachment.url}
              target="_blank"
              rel="nofollow ugc noopener noreferrer"
              className="inline-flex size-7 items-center justify-center transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              title="打开原图"
              aria-label="打开原图"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          ) : null}
        </span>
      </span>

      {canNavigate ? (
        <ThumbnailRail
          attachments={visibleAttachments}
          selectedIndex={selectedIndex}
          onSelect={scrollTo}
        />
      ) : null}

      <Lightbox
        open={lightboxIndex !== null}
        close={() => setLightboxIndex(null)}
        index={lightboxIndex ?? 0}
        slides={lightboxSlides}
        plugins={[Download, Thumbnails, Zoom]}
        carousel={{ imageFit: "contain" }}
        controller={{ closeOnBackdropClick: true }}
        thumbnails={{
          border: 1,
          borderColor: "rgb(63 63 70)",
          borderRadius: 0,
          gap: 8,
          imageFit: "cover",
          padding: 0,
          width: 64,
          height: 64,
        }}
        zoom={{
          maxZoomPixelRatio: 2,
          scrollToZoom: true,
          zoomInMultiplier: 1.8,
        }}
        download={{
          download: ({ slide }) => {
            const downloadUrl =
              typeof slide.download === "string"
                ? slide.download
                : typeof slide.download === "object"
                  ? slide.download.url
                  : slide.src;

            window.open(downloadUrl, "_blank", "noopener,noreferrer");
          },
        }}
        labels={{
          Close: "关闭",
          Download: "打开原图",
          Next: "下一张图片",
          Previous: "上一张图片",
          "Zoom in": "放大",
          "Zoom out": "缩小",
          "Show thumbnails": "显示缩略图",
          "Hide thumbnails": "隐藏缩略图",
        }}
      />
    </span>
  );
}

function ImageStage({
  attachment,
  isExpanded,
  isActive,
  onLoad,
  variant,
}: {
  attachment: MediaAttachment;
  isExpanded: boolean;
  isActive: boolean;
  onLoad: () => void;
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
      data-media-stage={isActive ? "active" : "idle"}
      className={cn(
        "relative flex min-w-0 items-center justify-center bg-black",
        (!isDetail || aspectKind !== "tall" || !isExpanded) && "overflow-hidden",
        !isDetail && "h-[min(320px,76vw)] sm:h-[420px]",
        isDetail && "w-full",
        isDetail &&
          aspectKind === "tall" &&
          (isExpanded ? "h-auto" : "h-[min(80vh,760px)]"),
        isDetail && aspectKind === "small" && "min-h-60",
        !isDetail && aspectKind === "wide" && "h-auto aspect-video",
        !isDetail && aspectKind === "small" && "h-60 p-4",
      )}
    >
      <img
        src={imageUrl}
        alt={getAttachmentCaption(attachment)}
        loading={isActive ? "eager" : "lazy"}
        decoding="async"
        onLoad={onLoad}
        className={cn(
          "block max-w-full",
          !isDetail && aspectKind === "tall" && "h-full w-full object-cover object-top",
          !isDetail && aspectKind === "wide" && "h-full w-full object-contain",
          !isDetail &&
            aspectKind === "normal" &&
            "h-full w-full object-contain",
          !isDetail && aspectKind === "small" && "h-auto w-auto object-contain",
          isDetail &&
            aspectKind === "tall" &&
            (isExpanded
              ? "h-auto w-full object-contain object-top"
              : "h-full w-full object-cover object-top"),
          isDetail && aspectKind === "wide" && "h-auto w-full object-contain",
          isDetail &&
            aspectKind === "normal" &&
            "h-auto w-auto object-contain",
          isDetail && aspectKind === "small" && "h-auto w-auto",
        )}
      />
      {isDetail && aspectKind === "tall" && !isExpanded ? (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/85 to-transparent" />
      ) : null}
    </span>
  );
}

function MediaBadges({
  attachment,
  count,
  variant,
}: {
  attachment: MediaAttachment;
  count: number;
  variant: "detail" | "preview";
}) {
  const aspectKind = getImageAspectKind(attachment);

  return (
    <span className="pointer-events-none absolute left-2 top-2 flex flex-wrap gap-2">
      {count > 1 ? (
        <span className="inline-flex h-7 items-center gap-1 border border-white/15 bg-black/70 px-2 text-xs font-semibold text-foreground">
          <Images className="size-3.5" aria-hidden="true" />
          {count} 图
        </span>
      ) : null}
      {aspectKind === "tall" ? (
        <span className="inline-flex h-7 items-center border border-white/15 bg-black/70 px-2 text-xs font-semibold text-foreground">
          {variant === "detail" ? "长图 · 点击完整查看" : "长图"}
        </span>
      ) : null}
    </span>
  );
}

function CarouselButton({
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
        "absolute top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center border border-white/15 bg-black/70 text-foreground transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        side === "left" ? "left-2" : "right-2",
      )}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {side === "left" ? (
        <ChevronLeft className="size-4" aria-hidden="true" />
      ) : (
        <ChevronRight className="size-4" aria-hidden="true" />
      )}
    </button>
  );
}

function ThumbnailRail({
  attachments,
  onSelect,
  selectedIndex,
}: {
  attachments: MediaAttachment[];
  onSelect: (index: number) => void;
  selectedIndex: number;
}) {
  return (
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
              index === selectedIndex
                ? "border-primary"
                : "border-border hover:border-primary/60",
            )}
            onClick={() => onSelect(index)}
            aria-label={`查看第 ${index + 1} 张图片`}
          >
            <img
              src={getMediaAttachmentThumbnailUrl(attachment)}
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
  );
}

function createLightboxSlide(attachment: MediaAttachment): SlideImage {
  const width = normalizeDimension(attachment.width);
  const height = normalizeDimension(attachment.height);
  const fullSizeUrl = getMediaAttachmentUrl(attachment, "lightbox");
  const thumbnail = getMediaAttachmentThumbnailUrl(attachment);

  return {
    alt: getAttachmentCaption(attachment),
    download: fullSizeUrl,
    height,
    src: fullSizeUrl,
    thumbnail,
    width,
  };
}

function normalizeDimension(value?: number | null) {
  return Number.isFinite(value) && value && value > 0 ? value : undefined;
}

function isTallAttachment(attachment?: MediaAttachment | null) {
  return Boolean(attachment && getImageAspectKind(attachment) === "tall");
}
