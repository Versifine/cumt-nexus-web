"use client";

import type { ComponentProps } from "react";
import { useRef } from "react";

import { Textarea } from "@/components/ui/textarea";
import {
  createAttachmentMarkdown,
  getReferencedAttachmentIds,
  removeAttachmentMarkdownReferences,
} from "@/features/content/attachment-markdown";
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
  const referencedAttachmentIds = getReferencedAttachmentIds(value);

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
