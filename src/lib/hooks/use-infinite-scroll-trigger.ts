"use client";

import { useEffect, useRef } from "react";

type UseInfiniteScrollTriggerInput = {
  enabled: boolean;
  onLoadMore: () => void;
  rootMargin?: string;
};

export function useInfiniteScrollTrigger({
  enabled,
  onLoadMore,
  rootMargin = "520px 0px",
}: UseInfiniteScrollTriggerInput) {
  const triggerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === "undefined") {
      return;
    }

    const node = triggerRef.current;

    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMore();
        }
      },
      { rootMargin },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [enabled, onLoadMore, rootMargin]);

  return triggerRef;
}
