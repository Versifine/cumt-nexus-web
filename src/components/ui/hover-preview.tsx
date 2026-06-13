import type { ReactNode } from "react";

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

export function HoverPreview({
  align = "start",
  children,
  className,
  onOpen,
  panelClassName,
  side = "bottom",
  trigger,
}: HoverPreviewProps) {
  return (
    <span
      className={cn(
        "group/hover-preview relative inline-flex min-w-0 align-middle",
        className,
      )}
      onFocusCapture={onOpen}
      onMouseEnter={onOpen}
    >
      {trigger}
      <span
        className={cn(
          "invisible absolute z-50 hidden w-72 max-w-[calc(100vw-2rem)] opacity-0 transition duration-150",
          "pointer-events-auto sm:group-hover/hover-preview:block sm:group-focus-within/hover-preview:block",
          "group-hover/hover-preview:visible group-hover/hover-preview:translate-y-0 group-hover/hover-preview:opacity-100",
          "group-focus-within/hover-preview:visible group-focus-within/hover-preview:translate-y-0 group-focus-within/hover-preview:opacity-100",
          side === "bottom" && "top-full translate-y-1 pt-2",
          side === "top" && "bottom-full -translate-y-1 pb-2",
          align === "start" && "left-0",
          align === "end" && "right-0",
          panelClassName,
        )}
      >
        {children}
      </span>
    </span>
  );
}
