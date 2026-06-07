"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { CornerDownLeft, ImagePlus, RotateCcw, X } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusToken, type StatusTokenTone } from "@/components/ui/data-display";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import { useUploadImageMutation } from "./queries";
import {
  IMAGE_UPLOAD_ACCEPT,
  IMAGE_UPLOAD_LIMITS,
  type MediaAttachment,
} from "./types";

type ImageAttachmentUploaderProps = {
  attachments: MediaAttachment[];
  disabled?: boolean;
  idPrefix?: string;
  isAttachmentInserted?: (attachment: MediaAttachment) => boolean;
  maxCount?: number;
  onChange: (attachments: MediaAttachment[]) => void;
  onInsertAttachment?: (attachment: MediaAttachment) => void;
  onRemoveAttachment?: (attachment: MediaAttachment) => void;
  onUploadingChange?: (isUploading: boolean) => void;
};

type PendingUpload = {
  error?: string;
  file: File;
  status: "uploading" | "failed";
};

export function ImageAttachmentUploader({
  attachments,
  disabled = false,
  idPrefix = "image-attachment",
  isAttachmentInserted,
  maxCount = IMAGE_UPLOAD_LIMITS.maxCountPerPost,
  onChange,
  onInsertAttachment,
  onRemoveAttachment,
  onUploadingChange,
}: ImageAttachmentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [altText, setAltText] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const [removedNoticeVisible, setRemovedNoticeVisible] = useState(false);
  const uploadMutation = useUploadImageMutation();
  const canAddMore = attachments.length < maxCount;
  const canUpload = !disabled && !uploadMutation.isPending && canAddMore;
  const altTextId = `${idPrefix}-alt-text`;
  const uploadInputId = `${idPrefix}-upload`;
  const policyText = `支持 JPEG、PNG、WebP；单张不超过 ${formatFileSize(
    IMAGE_UPLOAD_LIMITS.maxBytes,
  )}，最多 ${maxCount} 张。`;

  useEffect(() => {
    onUploadingChange?.(uploadMutation.isPending);
  }, [onUploadingChange, uploadMutation.isPending]);

  function uploadSelectedFile(file: File | null) {
    if (!file) {
      return;
    }

    const nextAltText = altText.trim();
    const validationError = validateImageUpload(file, {
      altText: nextAltText,
      currentCount: attachments.length,
      maxCount,
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (validationError) {
      uploadMutation.reset();
      setPendingUpload(null);
      setLocalError(validationError);
      return;
    }

    startUpload(file, nextAltText);
  }

  function startUpload(file: File, nextAltText: string) {
    uploadMutation.reset();
    setLocalError(null);
    setRemovedNoticeVisible(false);
    setPendingUpload({
      file,
      status: "uploading",
    });
    uploadMutation.mutate(
      {
        alt_text: nextAltText || undefined,
        file,
      },
      {
        onSuccess: (result) => {
          onChange([...attachments, result.attachment]);
          onInsertAttachment?.(result.attachment);
          setAltText("");
          setPendingUpload(null);
        },
        onError: (error) => {
          setPendingUpload({
            error: getUploadError(error),
            file,
            status: "failed",
          });
        },
      },
    );
  }

  function removeAttachment(id: string) {
    const removedAttachment = attachments.find((attachment) => attachment.id === id);

    onChange(attachments.filter((attachment) => attachment.id !== id));
    if (removedAttachment) {
      onRemoveAttachment?.(removedAttachment);
    }
    setRemovedNoticeVisible(true);
    setLocalError(null);
  }

  function retryPendingUpload() {
    if (!pendingUpload || pendingUpload.status !== "failed") {
      return;
    }

    const nextAltText = altText.trim();
    const validationError = validateImageUpload(pendingUpload.file, {
      altText: nextAltText,
      currentCount: attachments.length,
      maxCount,
    });

    if (validationError) {
      setLocalError(validationError);
      return;
    }

    startUpload(pendingUpload.file, nextAltText);
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 border border-border bg-background-soft p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground" htmlFor={altTextId}>
            图片说明
          </label>
          <Input
            id={altTextId}
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
            placeholder="可选，用于说明图片内容"
            maxLength={IMAGE_UPLOAD_LIMITS.altTextMaxLength}
            disabled={!canUpload}
            className="rounded-none"
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground" htmlFor={uploadInputId}>
            选择图片
          </label>
          <Input
            ref={fileInputRef}
            id={uploadInputId}
            type="file"
            accept={IMAGE_UPLOAD_ACCEPT}
            disabled={!canUpload}
            className="rounded-none"
            onChange={(event) => uploadSelectedFile(event.target.files?.[0] ?? null)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground md:col-span-2">
          <ImagePlus className="size-4 text-primary" aria-hidden="true" />
          <span>{policyText}</span>
          <StatusToken tone={canAddMore ? "primary" : "warning"}>
            {attachments.length}/{maxCount}
          </StatusToken>
        </div>
      </div>

      {!canAddMore ? (
        <p className="border-l border-amber-400/40 px-3 py-2 text-sm text-amber-200">
          已达到当前表单的图片数量上限，移除一张后才能继续上传。
        </p>
      ) : null}

      {localError ? (
        <Alert variant="destructive">
          <AlertTitle>无法上传图片</AlertTitle>
          <AlertDescription>{localError}</AlertDescription>
        </Alert>
      ) : null}

      {pendingUpload?.status === "uploading" ? (
        <div className="flex items-center gap-3 border-l border-primary px-3 py-2 text-sm text-muted-foreground">
          <StatusToken tone="warning">上传中</StatusToken>
          <span className="min-w-0 truncate">{pendingUpload.file.name}</span>
        </div>
      ) : null}

      {pendingUpload?.status === "failed" ? (
        <Alert variant="destructive">
          <AlertTitle>图片上传失败</AlertTitle>
          <AlertDescription>
            <div className="space-y-3">
              <p>{pendingUpload.error ?? "请求失败，请稍后重试。"}</p>
              <p className="truncate text-xs text-muted-foreground">
                待重试：{pendingUpload.file.name}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled || uploadMutation.isPending || !canAddMore}
                  onClick={retryPendingUpload}
                >
                  <RotateCcw className="size-4" aria-hidden="true" />
                  重试上传
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPendingUpload(null)}
                >
                  取消这张
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {removedNoticeVisible ? (
        <Alert>
          <AlertTitle>已移除待提交图片</AlertTitle>
          <AlertDescription>
            这张图片不会随正文发布；已上传但未绑定的对象由后端清理策略回收。
          </AlertDescription>
        </Alert>
      ) : null}

      {attachments.length > 0 ? (
        <div className="divide-y divide-border border-y border-border">
          <div className="flex items-center justify-between gap-3 py-2 text-xs text-muted-foreground">
            <span>待提交图片</span>
            <span className="font-mono">
              {attachments.length}/{maxCount}
            </span>
          </div>
          {attachments.map((attachment) => (
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
                  {isAttachmentInserted ? (
                    <StatusToken
                      tone={isAttachmentInserted(attachment) ? "primary" : "warning"}
                    >
                      {isAttachmentInserted(attachment) ? "已插入正文" : "未插入正文"}
                    </StatusToken>
                  ) : null}
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
              {onInsertAttachment ? (
                <button
                  type="button"
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 border border-border px-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={disabled || isAttachmentInserted?.(attachment)}
                  onClick={() => onInsertAttachment(attachment)}
                >
                  <CornerDownLeft className="size-3.5" aria-hidden="true" />
                  插入正文
                </button>
              ) : null}
              <button
                type="button"
                className="inline-flex size-9 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={disabled}
                onClick={() => removeAttachment(attachment.id)}
                aria-label="移除图片"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function MediaAttachmentGallery({
  attachments,
  className,
}: {
  attachments?: MediaAttachment[];
  className?: string;
}) {
  const visibleAttachments = (attachments ?? []).filter(
    (attachment) => attachment.kind === "image" && attachment.status !== "blocked",
  );

  if (visibleAttachments.length === 0) {
    return null;
  }

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {visibleAttachments.map((attachment) => (
        <MediaAttachmentFigure key={attachment.id} attachment={attachment} />
      ))}
    </div>
  );
}

export function InlineImageAttachmentReferences({
  attachments,
  className,
  disabled = false,
  isAttachmentInserted,
  onInsertAttachment,
}: {
  attachments?: MediaAttachment[];
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
        <span>已绑定图片</span>
        <span>选择图片可插入到当前正文光标位置。</span>
      </div>
      {visibleAttachments.map((attachment) => {
        const inserted = isAttachmentInserted(attachment);

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
                <StatusToken tone={inserted ? "primary" : "warning"}>
                  {inserted ? "已插入正文" : "未插入正文"}
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
              disabled={disabled || inserted}
              onClick={() => onInsertAttachment(attachment)}
            >
              <CornerDownLeft className="size-3.5" aria-hidden="true" />
              插入正文
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function MediaAttachmentFigure({
  attachment,
  caption,
  className,
}: {
  attachment: MediaAttachment;
  caption?: string;
  className?: string;
}) {
  return (
    <figure className={cn("border border-border bg-background-soft", className)}>
      <img
        src={attachment.url}
        alt={caption || attachment.alt_text || "内容图片"}
        loading="lazy"
        decoding="async"
        className="max-h-[520px] w-full object-contain"
      />
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground">
        <span className="truncate">
          {caption || formatPublishedAttachmentCaption(attachment)}
        </span>
        <span className="font-mono">{formatFileSize(attachment.size_bytes)}</span>
      </figcaption>
    </figure>
  );
}

function isVisibleImageAttachment(attachment: MediaAttachment) {
  return (
    attachment.kind === "image" &&
    attachment.status !== "blocked" &&
    Boolean(attachment.url)
  );
}

function validateImageUpload(
  file: File,
  {
    altText,
    currentCount,
    maxCount,
  }: {
    altText: string;
    currentCount: number;
    maxCount: number;
  },
) {
  if (currentCount >= maxCount) {
    return `当前最多上传 ${maxCount} 张图片，先移除一张再继续。`;
  }

  if (!IMAGE_UPLOAD_LIMITS.allowedMimeTypes.some((mimeType) => mimeType === file.type)) {
    return "只能上传 JPEG、PNG 或 WebP 图片。";
  }

  if (file.size > IMAGE_UPLOAD_LIMITS.maxBytes) {
    return `单张图片不能超过 ${formatFileSize(IMAGE_UPLOAD_LIMITS.maxBytes)}。`;
  }

  if (altText.length > IMAGE_UPLOAD_LIMITS.altTextMaxLength) {
    return `图片说明不能超过 ${IMAGE_UPLOAD_LIMITS.altTextMaxLength} 个字符。`;
  }

  return null;
}

function getUploadError(error: unknown) {
  if (!error) {
    return "请求失败，请稍后重试。";
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}

function formatFileSize(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return "--";
  }

  if (sizeBytes < 1024 * 1024) {
    return `${Math.ceil(sizeBytes / 1024)} KB`;
  }

  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
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

function formatPublishedAttachmentCaption(attachment: MediaAttachment) {
  if (attachment.alt_text.trim()) {
    return attachment.alt_text;
  }

  switch (attachment.status) {
    case "ready":
      return "图片附件";
    case "pending":
      return "等待处理";
    case "processing":
      return "处理中";
    case "blocked":
      return "已拦截";
    case "failed":
      return "图片不可用";
    default:
      return attachment.status;
  }
}

function formatAttachmentStatus(status: string) {
  switch (status) {
    case "ready":
      return "待提交";
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
