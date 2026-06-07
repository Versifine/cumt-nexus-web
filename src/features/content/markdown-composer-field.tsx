"use client";

import type { ClipboardEvent, ComponentProps, DragEvent } from "react";
import { useMemo, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  createAttachmentMarkdown,
  getReferencedAttachmentIds,
  getReferencedAttachmentIdsForSubmit,
  removeAttachmentMarkdownReferences,
} from "@/features/content/attachment-markdown";
import { ContentBody } from "@/features/content/content-body";
import { applyMarkdownInsert } from "@/features/content/markdown-insert";
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
  maxReferencedAttachments?: number;
  onChange: (value: string) => void;
  textareaProps: Omit<ComponentProps<typeof Textarea>, "ref" | "value">;
  textareaRef?: (element: HTMLTextAreaElement | null) => void;
  value: string;
};

type ComposerMode = "edit" | "preview";
type InlineImageInsertion = "cursor" | "end";

export function MarkdownComposerField({
  boundAttachments,
  className,
  defaultMode = "edit",
  disabled = false,
  imageUpload,
  maxReferencedAttachments,
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
  const referencedKnownAttachmentIds = useMemo(
    () => getReferencedAttachmentIdsForSubmit(value, previewAttachments),
    [previewAttachments, value],
  );
  const maxReferencedImageAttachments =
    maxReferencedAttachments ?? imageUpload?.maxCount;
  const hasPreviewContent = value.trim().length > 0;
  const hasDetachedPreviewImages = previewAttachments.some(
    (attachment) => !referencedAttachmentIds.has(attachment.id),
  );
  const detachedPreviewImageNotice =
    "有图片还没有放入正文；切回编辑，把图片放到光标处后才会出现在预览和发布内容里。";

  function setBodyValue(nextValue: string) {
    onChange(nextValue);
  }

  function insertAttachmentMarkdown(attachment: MediaAttachment) {
    if (!canInsertAttachmentReference(attachment)) {
      setImageUploadError(getReferenceLimitMessage());
      return;
    }

    setImageUploadError(null);
    return insertMarkdownAtCursor({
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

  function canInsertAttachmentReference(attachment: MediaAttachment) {
    if (referencedAttachmentIds.has(attachment.id)) {
      return true;
    }

    if (maxReferencedImageAttachments === undefined) {
      return true;
    }

    return referencedKnownAttachmentIds.length < maxReferencedImageAttachments;
  }

  function getRemainingReferenceSlots(
    markdown: string,
    attachments = previewAttachments,
  ) {
    if (maxReferencedImageAttachments === undefined) {
      return Number.POSITIVE_INFINITY;
    }

    return Math.max(
      0,
      maxReferencedImageAttachments -
        getReferencedAttachmentIdsForSubmit(markdown, attachments).length,
    );
  }

  function getReferenceLimitMessage() {
    if (maxReferencedImageAttachments === undefined) {
      return "正文图片数量已达到上限，先从正文移除一张再继续。";
    }

    return `正文最多放入 ${maxReferencedImageAttachments} 张图片，先从正文移除一张再继续。`;
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

    await handleInlineImagePaste(event, "cursor");
  }

  async function handleComposerPaste(event: ClipboardEvent<HTMLDivElement>) {
    if (isTextareaElement(event.target)) {
      return;
    }

    await handleInlineImagePaste(event, "end");
  }

  function handleComposerDragOver(event: DragEvent<HTMLDivElement>) {
    if (isTextareaElement(event.target)) {
      return;
    }

    if (!hasImageFileData(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect =
      imageUpload && !disabled && !textareaProps.disabled ? "copy" : "none";
  }

  async function handleComposerDrop(event: DragEvent<HTMLDivElement>) {
    if (isTextareaElement(event.target)) {
      return;
    }

    const imageFiles = getImageFilesFromDataTransfer(event.dataTransfer);

    if (imageFiles.length === 0) {
      return;
    }

    event.preventDefault();

    if (!imageUpload || disabled || textareaProps.disabled) {
      return;
    }

    setMode("edit");
    await uploadInlineImageFiles(imageFiles, { insertion: "end" });
  }

  function handleTextareaDragOver(event: DragEvent<HTMLTextAreaElement>) {
    if (!hasImageFileData(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect =
      imageUpload && !disabled && !textareaProps.disabled ? "copy" : "none";
  }

  async function handleTextareaDrop(event: DragEvent<HTMLTextAreaElement>) {
    const imageFiles = getImageFilesFromDataTransfer(event.dataTransfer);

    if (imageFiles.length === 0) {
      return;
    }

    event.preventDefault();

    if (!imageUpload || disabled || textareaProps.disabled) {
      return;
    }

    await uploadInlineImageFiles(imageFiles, { insertion: "cursor" });
  }

  async function handleInlineImagePaste(
    event: ClipboardEvent<Element>,
    insertion: InlineImageInsertion,
  ) {
    if (event.defaultPrevented || !imageUpload) {
      return;
    }

    const imageFiles = getImageFilesFromDataTransfer(event.clipboardData);

    if (imageFiles.length === 0) {
      return;
    }

    event.preventDefault();

    if (disabled || textareaProps.disabled) {
      return;
    }

    if (insertion === "end") {
      setMode("edit");
    }

    const remainingUploadSlots =
      imageUpload.maxCount - imageUpload.attachments.length;
    const remainingReferenceSlots = getRemainingReferenceSlots(
      bodyTextareaRef.current?.value ?? value,
    );

    if (remainingUploadSlots <= 0) {
      setImageUploadError(
        `当前最多上传 ${imageUpload.maxCount} 张图片，先移除一张再继续。`,
      );
      return;
    }

    if (remainingReferenceSlots <= 0) {
      setImageUploadError(getReferenceLimitMessage());
      return;
    }

    const remainingSlots = Math.min(remainingUploadSlots, remainingReferenceSlots);

    if (imageFiles.length > remainingSlots) {
      setImageUploadError(
        `当前还能放入 ${remainingSlots} 张图片，请减少数量后再试。`,
      );
      return;
    }

    await uploadInlineImageFiles(imageFiles, { insertion });
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

  async function uploadInlineImageFiles(
    imageFiles: File[],
    options: { insertion?: InlineImageInsertion } = {},
  ) {
    if (!imageUpload) {
      return;
    }

    const remainingUploadSlots =
      imageUpload.maxCount - imageUpload.attachments.length;
    const remainingReferenceSlots = getRemainingReferenceSlots(
      bodyTextareaRef.current?.value ?? value,
    );

    if (remainingUploadSlots <= 0) {
      setImageUploadError(
        `当前最多上传 ${imageUpload.maxCount} 张图片，先移除一张再继续。`,
      );
      return;
    }

    if (remainingReferenceSlots <= 0) {
      setImageUploadError(getReferenceLimitMessage());
      return;
    }

    const remainingSlots = Math.min(remainingUploadSlots, remainingReferenceSlots);

    if (imageFiles.length > remainingSlots) {
      setImageUploadError(
        `当前还能放入 ${remainingSlots} 张图片，请减少数量后再试。`,
      );
      return;
    }

    setImageUploadError(null);
    setIsUploadingInlineImage(true);
    imageUpload.onUploadingChange?.(true);

    try {
      let nextAttachments = imageUpload.attachments;
      let nextBodyValue = bodyTextareaRef.current?.value ?? value;
      let insertionStart =
        options.insertion === "end"
          ? nextBodyValue.length
          : bodyTextareaRef.current?.selectionStart ?? nextBodyValue.length;
      let insertionEnd =
        options.insertion === "end"
          ? insertionStart
          : bodyTextareaRef.current?.selectionEnd ?? insertionStart;

      for (const file of imageFiles) {
        const altText = getPastedImageAltText(file);
        const nextKnownAttachments = dedupeAttachments([
          ...(boundAttachments ?? []),
          ...nextAttachments,
        ]);
        const remainingReferenceSlots = getRemainingReferenceSlots(
          nextBodyValue,
          nextKnownAttachments,
        );

        if (remainingReferenceSlots <= 0) {
          setImageUploadError(getReferenceLimitMessage());
          return;
        }

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
        const bodyInsertion = applyMarkdownInsert({
          end: insertionEnd,
          insert: {
            block: true,
            text: createAttachmentMarkdown(result.attachment),
          },
          start: insertionStart,
          value: nextBodyValue,
        });
        nextBodyValue = bodyInsertion.value;
        insertionStart = bodyInsertion.selection.end;
        insertionEnd = bodyInsertion.selection.end;
        setBodyValue(nextBodyValue);
      }

      focusTextareaSelection(insertionStart, insertionEnd);
    } catch (error) {
      setImageUploadError(getUploadError(error));
    } finally {
      setIsUploadingInlineImage(false);
      imageUpload.onUploadingChange?.(false);
    }
  }

  function focusTextareaSelection(start: number, end: number) {
    window.requestAnimationFrame(() => {
      const textarea = bodyTextareaRef.current;

      textarea?.focus();
      textarea?.setSelectionRange(start, end);
    });
  }

  function renderImageTool() {
    if (!imageUpload) {
      return null;
    }

    const canAddImage =
      !disabled &&
      !textareaProps.disabled &&
      !isUploadingInlineImage &&
      imageUpload.attachments.length < imageUpload.maxCount &&
      getRemainingReferenceSlots(value) > 0;

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
    <div
      className={cn("space-y-2", className)}
      onDragOver={handleComposerDragOver}
      onDrop={handleComposerDrop}
      onPaste={handleComposerPaste}
    >
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
            onDragOver={handleTextareaDragOver}
            onDrop={handleTextareaDrop}
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
              <>
                <ContentBody
                  attachments={previewAttachments}
                  className="text-sm"
                  value={value}
                />
                {hasDetachedPreviewImages ? (
                  <p className="mt-3 border-l border-primary px-3 py-2 text-sm text-muted-foreground">
                    {detachedPreviewImageNotice}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {hasDetachedPreviewImages
                  ? detachedPreviewImageNotice
                  : "正文预览会显示在这里。"}
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
            canInsertAttachment={canInsertAttachmentReference}
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
          canInsertAttachment={canInsertAttachmentReference}
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

function getImageFilesFromDataTransfer(dataTransfer: DataTransfer) {
  const files = Array.from(dataTransfer.files).filter(isImageFile);

  if (files.length > 0) {
    return files;
  }

  return Array.from(dataTransfer.items)
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter(isImageFile);
}

function hasImageFileData(dataTransfer: DataTransfer) {
  return (
    Array.from(dataTransfer.files).some(isImageFile) ||
    Array.from(dataTransfer.items).some(
      (item) => item.kind === "file" && item.type.startsWith("image/"),
    )
  );
}

function getPastedImageAltText(file: File) {
  const name = file.name.trim().replace(/\.[^.]+$/, "");

  return name || "粘贴图片";
}

function isImageFile(file: File | null): file is File {
  return Boolean(file?.type.startsWith("image/"));
}

function isTextareaElement(value: EventTarget | null) {
  return value instanceof HTMLTextAreaElement;
}
