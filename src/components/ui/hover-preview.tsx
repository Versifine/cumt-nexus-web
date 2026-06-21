"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

type HoverPreviewProps = {
  align?: "start" | "end";
  children: ReactNode;
  className?: string;
  onOpen?: () => void;
  panelClassName?: string;
  side?: "bottom" | "top";
  trigger: ReactNode;
};

const VIEWPORT_PADDING = 16;
const PANEL_GAP = 8;
const CLOSE_DELAY_MS = 90;

export function HoverPreview({
  align = "start",
  children,
  className,
  onOpen,
  panelClassName,
  side = "bottom",
  trigger,
}: HoverPreviewProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLSpanElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const closePreview = useCallback(() => {
    clearCloseTimer();
    setIsOpen(false);
    setPanelStyle(null);
  }, [clearCloseTimer]);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(closePreview, CLOSE_DELAY_MS);
  }, [clearCloseTimer, closePreview]);

  const updatePosition = useCallback(() => {
    const triggerElement = triggerRef.current;

    if (!triggerElement) {
      return;
    }

    const triggerRect = triggerElement.getBoundingClientRect();
    const panelElement = panelRef.current;
    const maxWidth = Math.max(0, window.innerWidth - VIEWPORT_PADDING * 2);
    const panelWidth = Math.min(
      panelElement?.offsetWidth || 288,
      maxWidth || 288,
    );
    const panelHeight = panelElement?.offsetHeight || 0;
    const bottomTop = triggerRect.bottom + PANEL_GAP;
    const topTop = triggerRect.top - panelHeight - PANEL_GAP;
    const canShowBelow =
      bottomTop + panelHeight <= window.innerHeight - VIEWPORT_PADDING;
    const canShowAbove = topTop >= VIEWPORT_PADDING;
    const resolvedSide =
      side === "top"
        ? canShowAbove || !canShowBelow
          ? "top"
          : "bottom"
        : canShowBelow || !canShowAbove
          ? "bottom"
          : "top";
    const preferredTop = resolvedSide === "top" ? topTop : bottomTop;
    const maxTop = Math.max(
      VIEWPORT_PADDING,
      window.innerHeight - VIEWPORT_PADDING - panelHeight,
    );
    const top = clamp(preferredTop, VIEWPORT_PADDING, maxTop);
    const preferredLeft =
      align === "end" ? triggerRect.right - panelWidth : triggerRect.left;
    const maxLeft = Math.max(
      VIEWPORT_PADDING,
      window.innerWidth - VIEWPORT_PADDING - panelWidth,
    );
    const left = clamp(preferredLeft, VIEWPORT_PADDING, maxLeft);

    setPanelStyle({
      left,
      maxWidth,
      position: "fixed",
      top,
      zIndex: 1000,
    });
  }, [align, side]);

  const openPreview = useCallback(() => {
    clearCloseTimer();
    setIsOpen(true);
    onOpen?.();
  }, [clearCloseTimer, onOpen]);

  const handleBlur = useCallback(() => {
    window.requestAnimationFrame(() => {
      const activeElement = document.activeElement;

      if (
        !triggerRef.current?.contains(activeElement) &&
        !panelRef.current?.contains(activeElement)
      ) {
        scheduleClose();
      }
    });
  }, [scheduleClose]);

  useEffect(() => {
    return clearCloseTimer;
  }, [clearCloseTimer]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen || !panelRef.current) {
      return;
    }

    const frameId = window.requestAnimationFrame(updatePosition);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [children, isOpen, updatePosition]);

  return (
    <span
      ref={triggerRef}
      className={cn("relative inline-flex min-w-0 align-middle", className)}
      onBlurCapture={handleBlur}
      onFocusCapture={openPreview}
      onMouseEnter={openPreview}
      onMouseLeave={scheduleClose}
    >
      {trigger}
      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <span
              ref={panelRef}
              className={cn(
                "fixed z-[1000] hidden max-w-[calc(100vw-2rem)] scale-[0.98] opacity-0 transition duration-150 ease-out sm:block motion-reduce:transform-none motion-reduce:transition-none",
                panelStyle && "scale-100 opacity-100",
                side === "bottom" && "origin-top",
                side === "top" && "origin-bottom",
                panelClassName,
              )}
              onBlurCapture={handleBlur}
              onFocusCapture={openPreview}
              onMouseEnter={openPreview}
              onMouseLeave={scheduleClose}
              style={panelStyle ?? { left: 0, position: "fixed", top: 0 }}
            >
              {children}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}

function clamp(value: number, min: number, max: number) {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}
