"use client";

import type { ComponentProps } from "react";
import { useMemo, useRef, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  createAttachmentMarkdown,
  getReferencedAttachmentIds,
  removeAttachmentMarkdownReferences,
} from "@/features/content/attachment-markdown";
import { ContentBody } from "@/features/content/content-body";
import {
  insertMarkdownAtCursor,
  MarkdownToolbar,
} from "@/features/content/markdown-toolbar";
import {
  ImageAttachmentUploader,
  InlineImageAttachmentReferences,
} from "@/features/media/media-attachments";
import type { MediaAttachment } from "@/features/media/types";
import { cn } from "@/lib/utils";

type MarkdownComposerFieldProps = {
  boundAttachments?: MediaAttachment[];
  className?: string;
  disabled?: boolean;
  imageUpload?: {
    attachments: MediaAttachment[];
    idPrefix: string;
    maxCount: number;
    onChange: (attachments: MediaAttachment[]) => void;
    onUploadingChange?: (isUploading: boolean) => void;
  };
  onChange: (value: string) => void;
  textareaProps: Omit<ComponentProps<typeof Textarea>, "ref" | "value">;
  textareaRef?: (element: HTMLTextAreaElement | null) => void;
  value: string;
};

type ComposerMode = "edit" | "preview";

export function MarkdownComposerField({
  boundAttachments,
  className,
  disabled = false,
  imageUpload,
  onChange,
  textareaProps,
  textareaRef,
  value,
}: MarkdownComposerFieldProps) {
  const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [mode, setMode] = useState<ComposerMode>("edit");
  const referencedAttachmentIds = getReferencedAttachmentIds(value);
  const previewAttachments = useMemo(
    () =>
      dedupeAttachments([
        ...(boundAttachments ?? []),
        ...(imageUpload?.attachments ?? []),
      ]),
    [boundAttachments, imageUpload?.attachments],
  );
  const hasPreviewContent =
    value.trim().length > 0 || previewAttachments.length > 0;

  function setBodyValue(nextValue: string) {
    onChange(nextValue);
  }

  function insertAttachmentMarkdown(attachment: MediaAttachment) {
    insertMarkdownAtCursor({
      insert: {
        block: true,
        text: createAttachmentMarkdown(attachment),
      },
      onChange: setBodyValue,
      textarea: bodyTextareaRef.current,
      value,
    });
  }

  function removeAttachmentMarkdown(attachment: MediaAttachment) {
    setBodyValue(removeAttachmentMarkdownReferences(value, attachment.id));
  }

  function bindTextareaRef(element: HTMLTextAreaElement | null) {
    bodyTextareaRef.current = element;
    textareaRef?.(element);
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Tabs
        className="gap-2"
        value={mode}
        onValueChange={(nextMode) => setMode(nextMode as ComposerMode)}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList className="h-8 rounded-none bg-background-soft p-0">
            <TabsTrigger className="h-7 rounded-none px-3 text-xs" value="edit">
              编辑
            </TabsTrigger>
            <TabsTrigger className="h-7 rounded-none px-3 text-xs" value="preview">
              预览
            </TabsTrigger>
          </TabsList>
          <span className="text-xs text-muted-foreground">
            预览按发布后的正文样式渲染。
          </span>
        </div>
        <TabsContent
          className={cn("mt-0 space-y-2", mode !== "edit" && "hidden")}
          forceMount
          value="edit"
        >
          <MarkdownToolbar
            disabled={disabled}
            onChange={setBodyValue}
            textareaRef={bodyTextareaRef}
            value={value}
          />
          <Textarea
            {...textareaProps}
            disabled={disabled || textareaProps.disabled}
            ref={bindTextareaRef}
            value={value}
          />
        </TabsContent>
        <TabsContent
          className={cn("mt-0", mode !== "preview" && "hidden")}
          forceMount
          value="preview"
        >
          <div className="min-h-32 border border-border bg-background px-3 py-3">
            {hasPreviewContent ? (
              <ContentBody
                attachments={previewAttachments}
                className="text-sm"
                value={value}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                正文预览会显示在这里。
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
      {imageUpload ? (
        <ImageAttachmentUploader
          attachments={imageUpload.attachments}
          disabled={disabled}
          idPrefix={imageUpload.idPrefix}
          isAttachmentInserted={(attachment) =>
            referencedAttachmentIds.has(attachment.id)
          }
          maxCount={imageUpload.maxCount}
          onChange={imageUpload.onChange}
          onInsertAttachment={insertAttachmentMarkdown}
          onRemoveAttachment={removeAttachmentMarkdown}
          onUploadingChange={imageUpload.onUploadingChange}
        />
      ) : null}
      {boundAttachments ? (
        <InlineImageAttachmentReferences
          attachments={boundAttachments}
          disabled={disabled}
          isAttachmentInserted={(attachment) =>
            referencedAttachmentIds.has(attachment.id)
          }
          onInsertAttachment={insertAttachmentMarkdown}
        />
      ) : null}
    </div>
  );
}

function dedupeAttachments(attachments: MediaAttachment[]) {
  const attachmentById = new Map<string, MediaAttachment>();

  for (const attachment of attachments) {
    attachmentById.set(attachment.id, attachment);
  }

  return [...attachmentById.values()];
}
