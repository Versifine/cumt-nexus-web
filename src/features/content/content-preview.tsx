"use client";

import { ContentBody } from "@/features/content/content-body";
import { cn } from "@/lib/utils";

type ContentPreviewProps = {
  className?: string;
  minHeightClassName?: string;
  value: string;
};

export function ContentPreview({
  className,
  minHeightClassName = "min-h-40",
  value,
}: ContentPreviewProps) {
  const trimmedValue = value.trim();

  return (
    <div
      className={cn(
        "border border-border bg-background",
        minHeightClassName,
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="font-mono text-[11px] uppercase text-primary">
          PREVIEW / 预览
        </span>
        <span className="text-xs text-muted-foreground">
          当前仅渲染涂黑，其余保持纯文本
        </span>
      </div>
      {trimmedValue ? (
        <ContentBody value={value} className="px-3 py-3 text-sm leading-7" />
      ) : (
        <div className="flex min-h-28 items-center border-l-2 border-border px-3 py-4 text-sm text-muted-foreground">
          输入正文后在这里预览排版和涂黑内容。
        </div>
      )}
    </div>
  );
}
