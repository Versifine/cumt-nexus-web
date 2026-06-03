"use client";

/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { StatusToken, type StatusTokenTone } from "@/components/ui/data-display";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import { useUploadImageMutation } from "./queries";
import type { MediaAttachment } from "./types";

type ImageAttachmentUploaderProps = {
  attachments: MediaAttachment[];
  disabled?: boolean;
  idPrefix?: string;
  onChange: (attachments: MediaAttachment[]) => void;
  onUploadingChange?: (isUploading: boolean) => void;
};

export function ImageAttachmentUploader({
  attachments,
  disabled = false,
  idPrefix = "image-attachment",
  onChange,
  onUploadingChange,
}: ImageAttachmentUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [altText, setAltText] = useState("");
  const uploadMutation = useUploadImageMutation();
  const canUpload = !disabled && !uploadMutation.isPending;
  const altTextId = `${idPrefix}-alt-text`;
  const uploadInputId = `${idPrefix}-upload`;

  function uploadSelectedFile(file: File | null) {
    if (!file) {
      return;
    }

    onUploadingChange?.(true);
    uploadMutation.mutate(
      {
        alt_text: altText.trim() || undefined,
        file,
      },
      {
        onSuccess: (result) => {
          onChange([...attachments, result.attachment]);
          setAltText("");
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        },
        onSettled: () => {
          onUploadingChange?.(false);
        },
      },
    );
  }

  function removeAttachment(id: string) {
    onChange(attachments.filter((attachment) => attachment.id !== id));
  }

  const uploadError = getUploadError(uploadMutation.error);

  return (
    <div className="space-y-3">
      <div className="grid gap-2 border border-border bg-background-soft p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
        <div className="min-w-0 space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground" htmlFor={altTextId}>
            图片说明
          </label>
          <Input
            id={altTextId}
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
            placeholder="可选，用于说明图片内容"
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
            accept="image/*"
            disabled={!canUpload}
            className="rounded-none"
            onChange={(event) => uploadSelectedFile(event.target.files?.[0] ?? null)}
          />
        </div>
        <div className="hidden items-center gap-2 pb-2 text-xs text-muted-foreground md:flex">
          <ImagePlus className="size-4 text-primary" aria-hidden="true" />
          上传后随正文提交
        </div>
      </div>

      {uploadError ? (
        <Alert variant="destructive">
          <AlertTitle>图片上传失败</AlertTitle>
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      ) : null}

      {uploadMutation.isPending ? (
        <p className="border-l border-primary px-3 py-2 text-sm text-muted-foreground">
          正在上传图片...
        </p>
      ) : null}

      {attachments.length > 0 ? (
        <div className="divide-y divide-border border-y border-border">
          {attachments.map((attachment) => (
            <div key={attachment.id} className="flex items-center gap-3 py-3">
              <img
                src={attachment.url}
                alt={attachment.alt_text || "已上传图片"}
                className="size-14 shrink-0 border border-border object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusToken tone={getAttachmentStatusTone(attachment.status)}>
                    {formatAttachmentStatus(attachment.status)}
                  </StatusToken>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatFileSize(attachment.size_bytes)}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {attachment.alt_text || attachment.mime_type}
                </p>
              </div>
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
        <figure key={attachment.id} className="border border-border bg-background-soft">
          <img
            src={attachment.url}
            alt={attachment.alt_text || "内容图片"}
            className="max-h-[420px] w-full object-contain"
          />
          <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground">
            <span className="truncate">
              {attachment.alt_text || formatAttachmentStatus(attachment.status)}
            </span>
            <span className="font-mono">{formatFileSize(attachment.size_bytes)}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function getUploadError(error: Error | null) {
  if (!error) {
    return null;
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

function formatAttachmentStatus(status: string) {
  switch (status) {
    case "ready":
      return "已就绪";
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
