"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

type ContentBodyProps = {
  className?: string;
  value: string;
};

type ContentSegment =
  | {
      text: string;
      type: "text";
    }
  | {
      text: string;
      type: "spoiler";
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

function parseSpoilerSegments(value: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let cursor = 0;

  while (cursor < value.length) {
    const start = value.indexOf(">!", cursor);

    if (start === -1) {
      pushTextSegment(segments, value.slice(cursor));
      break;
    }

    const end = value.indexOf("!<", start + 2);

    if (end === -1) {
      pushTextSegment(segments, value.slice(cursor));
      break;
    }

    pushTextSegment(segments, value.slice(cursor, start));
    segments.push({
      text: normalizeSpoilerText(value.slice(start + 2, end)),
      type: "spoiler",
    });
    cursor = end + 2;
  }

  if (segments.length === 0) {
    return [{ text: value, type: "text" }];
  }

  return segments;
}

function pushTextSegment(segments: ContentSegment[], text: string) {
  if (text) {
    segments.push({ text, type: "text" });
  }
}

function normalizeSpoilerText(text: string) {
  const normalizedText = text.trim();

  return normalizedText || "隐藏内容";
}
