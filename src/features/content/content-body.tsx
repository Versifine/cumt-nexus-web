"use client";

import { useState } from "react";

import { parseSpoilerSegments } from "@/features/content/spoiler-segments";
import { cn } from "@/lib/utils";

type ContentBodyProps = {
  className?: string;
  value: string;
};

export function ContentBody({ className, value }: ContentBodyProps) {
  const segments = parseSpoilerSegments(value);

  return (
    <div
      className={cn(
        "whitespace-pre-wrap break-words text-foreground",
        className,
      )}
    >
      {segments.map((segment, index) =>
        segment.type === "spoiler" ? (
          <SpoilerText key={`${segment.type}-${index}`} text={segment.text} />
        ) : (
          <span key={`${segment.type}-${index}`}>{segment.text}</span>
        ),
      )}
    </div>
  );
}

function SpoilerText({ text }: { text: string }) {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <button
      type="button"
      aria-label={isRevealed ? "隐藏内容" : "显示隐藏内容"}
      className={cn(
        "mx-1 inline-flex min-h-7 items-center border px-2 py-0.5 text-left align-baseline text-[0.92em] leading-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isRevealed
          ? "border-primary/40 bg-primary/10 text-foreground hover:bg-primary/15"
          : "border-zinc-700 bg-zinc-950 text-zinc-500 hover:border-primary/50 hover:bg-zinc-900 hover:text-primary",
      )}
      onClick={() => setIsRevealed((current) => !current)}
    >
      {isRevealed ? text : "显示隐藏内容"}
    </button>
  );
}
