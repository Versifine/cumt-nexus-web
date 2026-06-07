"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { CornerDownLeft, X } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatusToken, type StatusTokenTone } from "@/components/ui/data-display";
import { cn } from "@/lib/utils";

import { formatFileSize } from "./image-upload-rules";
import type { MediaAttachment } from "./types";

export function InlineImageAttachmentManager({
  attachments,
  canInsertAttachment,
  className,
  disabled = false,
  isAttachmentInserted,
  maxCount,
  onInsertAttachment,
  onRemoveAttachment,
}: {
  attachments: MediaAttachment[];
  canInsertAttachment?: (attachment: MediaAttachment) => boolean;
  className?: string;
  disabled?: boolean;
  isAttachmentInserted: (attachment: MediaAttachment) => boolean;
  maxCount: number;
  onInsertAttachment: (attachment: MediaAttachment) => void;
  onRemoveAttachment: (attachment: MediaAttachment) => void;
}) {
  const [removedNoticeVisible, setRemovedNoticeVisible] = useState(false);

  function removeAttachment(attachment: MediaAttachment) {
    onRemoveAttachment(attachment);
    setRemovedNoticeVisible(true);
  }

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {removedNoticeVisible ? (
        <Alert>
          <AlertTitle>已从正文移除图片</AlertTitle>
          <AlertDescription>
            这张图片不会随正文发布；已上传但未绑定的对象由后端清理策略回收。
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="divide-y divide-border border-y border-border">
        <div className="flex items-center justify-between gap-3 py-2 text-xs text-muted-foreground">
          <span>正文图片</span>
          <span className="font-mono">
            {attachments.length}/{maxCount}
          </span>
        </div>
        {attachments.map((attachment) => {
          const inserted = isAttachmentInserted(attachment);
          const canInsert = canInsertAttachment?.(attachment) ?? true;

          return (
            <div key={attachment.id} className="flex items-center gap-3 py-3">
              <img
                src={attachment.url}
                alt={attachment.alt_text || "已上传图片"}
                loading="lazy"
                decoding="async"
                className="size-14 shrink-0 border border-border object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusToken tone={getAttachmentStatusTone(attachment.status)}>
                    {formatAttachmentStatus(attachment.status)}
                  </StatusToken>
                  <StatusToken
                    tone={inserted ? "primary" : canInsert ? "warning" : "danger"}
                  >
                    {inserted
                      ? "已在正文"
                      : canInsert
                        ? "未放入正文"
                        : "已达上限"}
                  </StatusToken>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatFileSize(attachment.size_bytes)}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {attachment.alt_text || formatMimeType(attachment.mime_type)}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {formatAttachmentMeta(attachment)}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-9 shrink-0 items-center gap-1.5 border border-border px-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                disabled={disabled || inserted || !canInsert}
                onClick={() => onInsertAttachment(attachment)}
                title={!inserted && !canInsert ? "正文图片数量已达到上限" : undefined}
              >
                <CornerDownLeft className="size-3.5" aria-hidden="true" />
                放到光标处
              </button>
              <button
                type="button"
                className="inline-flex size-9 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={disabled}
                onClick={() => removeAttachment(attachment)}
                aria-label="移除图片"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function InlineImageAttachmentReferences({
  attachments,
  canInsertAttachment,
  className,
  disabled = false,
  isAttachmentInserted,
  onInsertAttachment,
}: {
  attachments?: MediaAttachment[];
  canInsertAttachment?: (attachment: MediaAttachment) => boolean;
  className?: string;
  disabled?: boolean;
  isAttachmentInserted: (attachment: MediaAttachment) => boolean;
  onInsertAttachment: (attachment: MediaAttachment) => void;
}) {
  const visibleAttachments = (attachments ?? []).filter(isVisibleImageAttachment);

  if (visibleAttachments.length === 0) {
    return null;
  }

  return (
    <div className={cn("divide-y divide-border border-y border-border", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs text-muted-foreground">
        <span>正文图片</span>
        <span>选择已有图片可放到当前光标位置。</span>
      </div>
      {visibleAttachments.map((attachment) => {
        const inserted = isAttachmentInserted(attachment);
        const canInsert = canInsertAttachment?.(attachment) ?? true;

        return (
          <div key={attachment.id} className="flex items-center gap-3 py-3">
            <img
              src={attachment.url}
              alt={attachment.alt_text || "内容图片"}
              loading="lazy"
              decoding="async"
              className="size-12 shrink-0 border border-border object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusToken
                  tone={inserted ? "primary" : canInsert ? "warning" : "danger"}
                >
                  {inserted
                    ? "已插入正文"
                    : canInsert
                      ? "未插入正文"
                      : "已达上限"}
                </StatusToken>
                <span className="font-mono text-xs text-muted-foreground">
                  {formatFileSize(attachment.size_bytes)}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {attachment.alt_text || formatMimeType(attachment.mime_type)}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 border border-border px-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              disabled={disabled || inserted || !canInsert}
              onClick={() => onInsertAttachment(attachment)}
              title={!inserted && !canInsert ? "正文图片数量已达到上限" : undefined}
            >
              <CornerDownLeft className="size-3.5" aria-hidden="true" />
              放到光标处
            </button>
          </div>
        );
      })}
    </div>
  );
}

function isVisibleImageAttachment(attachment: MediaAttachment) {
  return (
    attachment.kind === "image" &&
    attachment.status !== "blocked" &&
    Boolean(attachment.url)
  );
}

function formatMimeType(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return "JPEG";
    case "image/png":
      return "PNG";
    case "image/webp":
      return "WebP";
    default:
      return mimeType;
  }
}

function formatAttachmentMeta(attachment: MediaAttachment) {
  const parts = [formatMimeType(attachment.mime_type)];

  if (attachment.width && attachment.height) {
    parts.push(`${attachment.width} x ${attachment.height}`);
  }

  parts.push(formatFileSize(attachment.size_bytes));
  return parts.join(" / ");
}

function formatAttachmentStatus(status: string) {
  switch (status) {
    case "ready":
      return "已上传";
    case "pending":
      return "待处理";
    case "processing":
      return "处理中";
    case "blocked":
      return "已拦截";
    case "failed":
      return "失败";
    default:
      return status;
  }
}

function getAttachmentStatusTone(status: string): StatusTokenTone {
  switch (status) {
    case "ready":
      return "success";
    case "processing":
      return "warning";
    case "blocked":
    case "failed":
      return "danger";
    default:
      return "default";
  }
}
