import type { SVGProps } from "react";

import { cn } from "@/lib/utils";

type NexusBrandMarkProps = SVGProps<SVGSVGElement>;

export function NexusBrandMark({
  className,
  ...props
}: NexusBrandMarkProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 64 64"
      className={cn("size-5 shrink-0", className)}
      {...props}
    >
      <defs>
        <mask id="nexus-brand-pickaxe-cutout" maskUnits="userSpaceOnUse">
          <rect width="64" height="64" fill="white" />
          <path
            d="M34.2 23.4 39.6 17.9 45 23.4 39.6 28.8Z"
            fill="black"
          />
        </mask>
      </defs>
      <g mask="url(#nexus-brand-pickaxe-cutout)">
        <path
          className="fill-foreground"
          d="M8.8 27.2C17.2 16.3 31.7 11.6 49.1 14.1L56 18.4 52.6 24.1C38.1 18 24.6 21.2 14.1 32.7Z"
        />
        <path
          className="stroke-foreground"
          d="M39.6 22.8 21 53"
          fill="none"
          strokeLinecap="round"
          strokeWidth="5.8"
        />
      </g>
    </svg>
  );
}
