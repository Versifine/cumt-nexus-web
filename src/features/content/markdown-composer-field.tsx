"use client";

import type { ClipboardEvent, ComponentProps } from "react";
import { useMemo, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
  InlineImageAttachmentManager,
  InlineImageAttachmentReferences,
} from "@/features/media/media-attachments";
import {
  getUploadError,
  validateImageUploadFile,
} from "@/features/media/image-upload-rules";
import { useUploadImageMutation } from "@/features/media/queries";
import type { MediaAttachment } from "@/features/media/types";
import { IMAGE_UPLOAD_ACCEPT } from "@/features/media/types";
import { cn } from "@/lib/utils";

type MarkdownComposerFieldProps = {
  boundAttachments?: MediaAttachment[];
  className?: string;
  defaultMode?: ComposerMode;
  disabled?: boolean;
  imageUpload?: {
    attachments: MediaAttachment[];
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
  defaultMode = "edit",
  disabled = false,
  imageUpload,
  onChange,
  textareaProps,
  textareaRef,
  value,
}: MarkdownComposerFieldProps) {
  const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<ComposerMode>(defaultMode);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [isUploadingInlineImage, setIsUploadingInlineImage] = useState(false);
  const inlineImageUploadMutation = useUploadImageMutation();
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
      value: bodyTextareaRef.current?.value ?? value,
    });
  }

  function removeAttachmentMarkdown(attachment: MediaAttachment) {
    setBodyValue(removeAttachmentMarkdownReferences(value, attachment.id));
  }

  function removeInlineImageAttachment(attachment: MediaAttachment) {
    if (!imageUpload) {
      return;
    }

    imageUpload.onChange(
      imageUpload.attachments.filter((item) => item.id !== attachment.id),
    );
    removeAttachmentMarkdown(attachment);
  }

  function bindTextareaRef(element: HTMLTextAreaElement | null) {
    bodyTextareaRef.current = element;
    textareaRef?.(element);
  }

  async function handleTextareaPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    textareaProps.onPaste?.(event);

    if (event.defaultPrevented || !imageUpload) {
      return;
    }

    const imageFiles = getImageFilesFromClipboard(event.clipboardData);

    if (imageFiles.length === 0) {
      return;
    }

    event.preventDefault();

    if (disabled || textareaProps.disabled) {
      return;
    }

    const remainingSlots = imageUpload.maxCount - imageUpload.attachments.length;

    if (remainingSlots <= 0) {
      setImageUploadError(
        `当前最多上传 ${imageUpload.maxCount} 张图片，先移除一张再继续。`,
      );
      return;
    }

    if (imageFiles.length > remainingSlots) {
      setImageUploadError(
        `当前还能粘贴 ${remainingSlots} 张图片，请减少数量后再试。`,
      );
      return;
    }

    await uploadInlineImageFiles(imageFiles);
  }

  async function handleImageFileChange(files: FileList | null) {
    if (!files || !imageUpload) {
      return;
    }

    const [file] = Array.from(files);

    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = "";
    }

    if (!file) {
      return;
    }

    await uploadInlineImageFiles([file]);
  }

  async function uploadInlineImageFiles(imageFiles: File[]) {
    if (!imageUpload) {
      return;
    }

    const remainingSlots = imageUpload.maxCount - imageUpload.attachments.length;

    if (remainingSlots <= 0) {
      setImageUploadError(
        `当前最多上传 ${imageUpload.maxCount} 张图片，先移除一张再继续。`,
      );
      return;
    }

    if (imageFiles.length > remainingSlots) {
      setImageUploadError(
        `当前还能添加 ${remainingSlots} 张图片，请减少数量后再试。`,
      );
      return;
    }

    setImageUploadError(null);
    setIsUploadingInlineImage(true);
    imageUpload.onUploadingChange?.(true);

    try {
      let nextAttachments = imageUpload.attachments;

      for (const file of imageFiles) {
        const altText = getPastedImageAltText(file);
        const validationError = validateImageUploadFile(file, {
          altText,
          currentCount: nextAttachments.length,
          maxCount: imageUpload.maxCount,
        });

        if (validationError) {
          setImageUploadError(validationError);
          return;
        }

        const result = await inlineImageUploadMutation.mutateAsync({
          alt_text: altText,
          file,
        });

        nextAttachments = [...nextAttachments, result.attachment];
        imageUpload.onChange(nextAttachments);
        insertAttachmentMarkdown(result.attachment);
      }
    } catch (error) {
      setImageUploadError(getUploadError(error));
    } finally {
      setIsUploadingInlineImage(false);
      imageUpload.onUploadingChange?.(false);
    }
  }

  function renderImageTool() {
    if (!imageUpload) {
      return null;
    }

    const canAddImage =
      !disabled &&
      !textareaProps.disabled &&
      !isUploadingInlineImage &&
      imageUpload.attachments.length < imageUpload.maxCount;

    return (
      <>
        <input
          ref={imageFileInputRef}
          type="file"
          accept={IMAGE_UPLOAD_ACCEPT}
          className="hidden"
          disabled={!canAddImage}
          onChange={(event) => handleImageFileChange(event.target.files)}
        />
        <Button
          aria-label="添加图片"
          disabled={!canAddImage}
          onClick={() => imageFileInputRef.current?.click()}
          onMouseDown={(event) => event.preventDefault()}
          size="icon"
          title="添加图片"
          type="button"
          variant="ghost"
          className="size-9 rounded-md"
        >
          <ImagePlus aria-hidden="true" />
        </Button>
      </>
    );
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
            trailingTools={renderImageTool()}
            value={value}
          />
          <Textarea
            {...textareaProps}
            disabled={disabled || textareaProps.disabled}
            onPaste={handleTextareaPaste}
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
      {imageUpload && mode === "edit" ? (
        <>
          {isUploadingInlineImage ? (
            <div className="border-l border-primary px-3 py-2 text-sm text-muted-foreground">
              正在上传图片，完成后会插入到正文当前位置。
            </div>
          ) : null}
          {imageUploadError ? (
            <Alert variant="destructive">
              <AlertTitle>添加图片失败</AlertTitle>
              <AlertDescription>{imageUploadError}</AlertDescription>
            </Alert>
          ) : null}
          <InlineImageAttachmentManager
            attachments={imageUpload.attachments}
            disabled={disabled || isUploadingInlineImage}
            isAttachmentInserted={(attachment) =>
              referencedAttachmentIds.has(attachment.id)
            }
            maxCount={imageUpload.maxCount}
            onInsertAttachment={insertAttachmentMarkdown}
            onRemoveAttachment={removeInlineImageAttachment}
          />
        </>
      ) : null}
      {boundAttachments && mode === "edit" ? (
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

function getImageFilesFromClipboard(clipboardData: DataTransfer) {
  const files = Array.from(clipboardData.files).filter(isImageFile);

  if (files.length > 0) {
    return files;
  }

  return Array.from(clipboardData.items)
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter(isImageFile);
}

function getPastedImageAltText(file: File) {
  const name = file.name.trim().replace(/\.[^.]+$/, "");

  return name || "粘贴图片";
}

function isImageFile(file: File | null): file is File {
  return Boolean(file?.type.startsWith("image/"));
}
