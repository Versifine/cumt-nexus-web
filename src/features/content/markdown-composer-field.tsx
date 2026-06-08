"use client";

import type { ClipboardEvent, ComponentProps, DragEvent } from "react";
import { useMemo, useRef, useState } from "react";
import { Eye, ImagePlus, PencilLine } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  type ClipboardDataImageSource,
  type ClipboardDataImageTextPaste,
  extractDataImageSourcesFromClipboardHtml,
  extractDataImageSourcesFromClipboardText,
  extractDataImageTextPaste,
  getClipboardDataImagePlaceholder,
  getClipboardImageFileName,
} from "@/features/content/clipboard-image";
import {
  createAttachmentMarkdown,
  getReferencedAttachmentIds,
  getReferencedAttachmentIdsForSubmit,
  hasUnsupportedMarkdownImageReferences,
  removeAttachmentMarkdownReferences,
  removeAttachmentMarkdownReferencesWithSelection,
} from "@/features/content/attachment-markdown";
import { ContentBody } from "@/features/content/content-body";
import { applyMarkdownInsert } from "@/features/content/markdown-insert";
import { MarkdownToolbar } from "@/features/content/markdown-toolbar";
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
  defaultMode = "preview",
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
  const isSourceOpen = mode === "edit";
  const hasPreviewContent = value.trim().length > 0;
  const hasDetachedPreviewImages = previewAttachments.some(
    (attachment) => !referencedAttachmentIds.has(attachment.id),
  );
  const detachedPreviewImageNotice =
    "有图片还没有放入正文；打开正文编辑，把图片放到当前位置后才会出现在发布内容里。";
  const hasUnsupportedMarkdownImages =
    hasUnsupportedMarkdownImageReferences(value);
  const unsupportedMarkdownImageNotice =
    "外部 Markdown 图片不会作为正文图片保存；请用“添加图片”或粘贴、拖拽图片文件上传后插入正文。";
  const sourceToggleLabel = isSourceOpen
    ? "收起编辑"
    : hasPreviewContent
      ? "编辑正文"
      : "开始写作";
  const imageInsertionLabels = isSourceOpen
    ? {
        inserted: "移动到光标处",
        notInserted: "放到光标处",
      }
    : {
        inserted: "移到正文末尾",
        notInserted: "放到正文末尾",
      };

  function setBodyValue(nextValue: string) {
    onChange(nextValue);
  }

  function insertAttachmentMarkdown(attachment: MediaAttachment) {
    if (!canInsertAttachmentReference(attachment)) {
      setImageUploadError(getReferenceLimitMessage());
      return;
    }

    const currentValue = bodyTextareaRef.current?.value ?? value;
    const currentSelection = {
      end: bodyTextareaRef.current?.selectionEnd ?? currentValue.length,
      start: bodyTextareaRef.current?.selectionStart ?? currentValue.length,
    };
    const nextBodyState = referencedAttachmentIds.has(attachment.id)
      ? removeAttachmentMarkdownReferencesWithSelection(
          currentValue,
          attachment.id,
          currentSelection,
        )
      : {
          markdown: currentValue,
          selection: currentSelection,
        };
    const result = applyMarkdownInsert({
      end: nextBodyState.selection.end,
      insert: {
        block: true,
        text: createAttachmentMarkdown(attachment),
      },
      start: nextBodyState.selection.start,
      value: nextBodyState.markdown,
    });

    setImageUploadError(null);
    setBodyValue(result.value);
    focusTextareaSelection(result.selection.start, result.selection.end);
    return result;
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

    const dataImageTextPaste = getDataImageTextPasteFromTransferText(
      event.clipboardData,
    );

    if (dataImageTextPaste) {
      event.preventDefault();

      if (disabled || textareaProps.disabled) {
        return;
      }

      await uploadInlineDataImageTextPaste(dataImageTextPaste, { insertion });
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

    await uploadInlineImageFiles([file], {
      insertion: isSourceOpen ? "cursor" : "end",
    });
  }

  async function uploadInlineDataImageTextPaste(
    paste: ClipboardDataImageTextPaste,
    options: { insertion?: InlineImageInsertion } = {},
  ) {
    if (!imageUpload) {
      return;
    }

    const currentValue = bodyTextareaRef.current?.value ?? value;
    const insertionStart =
      options.insertion === "end"
        ? currentValue.length
        : bodyTextareaRef.current?.selectionStart ?? currentValue.length;
    const insertionEnd =
      options.insertion === "end"
        ? insertionStart
        : bodyTextareaRef.current?.selectionEnd ?? insertionStart;
    const remainingUploadSlots =
      imageUpload.maxCount - imageUpload.attachments.length;
    const remainingReferenceSlots = getRemainingReferenceSlots(currentValue);

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

    if (paste.sources.length > remainingSlots) {
      setImageUploadError(
        `当前还能放入 ${remainingSlots} 张图片，请减少数量后再试。`,
      );
      return;
    }

    const files: File[] = [];

    for (const [index, source] of paste.sources.entries()) {
      const file = createFileFromDataImageSource(source, index);

      if (!file) {
        setImageUploadError("剪贴板图片数据无法读取，请重新复制后再试。");
        return;
      }

      const validationError = validateImageUploadFile(file, {
        altText: getPastedImageAltText(file),
        currentCount: imageUpload.attachments.length + files.length,
        maxCount: imageUpload.maxCount,
      });

      if (validationError) {
        setImageUploadError(validationError);
        return;
      }

      files.push(file);
    }

    setImageUploadError(null);
    setIsUploadingInlineImage(true);
    imageUpload.onUploadingChange?.(true);

    try {
      let nextAttachments = imageUpload.attachments;
      const markdownByPlaceholder = new Map<string, string>();

      for (const [index, file] of files.entries()) {
        const altText = getPastedImageAltText(file);
        const result = await inlineImageUploadMutation.mutateAsync({
          alt_text: altText,
          file,
        });

        nextAttachments = [...nextAttachments, result.attachment];
        imageUpload.onChange(nextAttachments);
        markdownByPlaceholder.set(
          getClipboardDataImagePlaceholder(index),
          createAttachmentMarkdown(result.attachment),
        );
      }

      const pastedMarkdown = replaceClipboardDataImagePlaceholders(
        paste.text,
        markdownByPlaceholder,
      );
      const result = applyMarkdownInsert({
        end: insertionEnd,
        insert: pastedMarkdown,
        start: insertionStart,
        value: currentValue,
      });

      setBodyValue(result.value);
      focusTextareaSelection(result.selection.start, result.selection.end);
    } catch (error) {
      setImageUploadError(getUploadError(error));
    } finally {
      setIsUploadingInlineImage(false);
      imageUpload.onUploadingChange?.(false);
    }
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
      <section className="overflow-hidden border border-border bg-background">
        <div className="flex flex-col gap-3 border-b border-border bg-background-soft px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Eye className="size-4 text-primary" aria-hidden="true" />
              发布效果
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {isSourceOpen
                ? "正文效果会在这里实时渲染。"
                : "默认显示发布后的正文效果；需要改内容时再打开正文编辑。"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {renderImageTool()}
            <Button
              type="button"
              variant={isSourceOpen ? "secondary" : "outline"}
              size="sm"
              className="h-9 rounded-md"
              disabled={disabled || textareaProps.disabled}
              onClick={() => setMode(isSourceOpen ? "preview" : "edit")}
            >
              <PencilLine className="size-4" aria-hidden="true" />
              {sourceToggleLabel}
            </Button>
          </div>
        </div>

        <div className="min-h-32 px-3 py-3">
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
            <p className="text-sm leading-6 text-muted-foreground">
              {hasDetachedPreviewImages
                ? detachedPreviewImageNotice
                : "正文效果会显示在这里。"}
            </p>
          )}
        </div>
      </section>

      {isSourceOpen ? (
        <section className="space-y-2 border border-border bg-background-soft p-2">
          <div className="flex items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
            <span>正文编辑</span>
            <span>常用格式用工具栏插入；图片会进入正文位置。</span>
          </div>
          <MarkdownToolbar
            disabled={disabled}
            onChange={setBodyValue}
            textareaRef={bodyTextareaRef}
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
          {hasUnsupportedMarkdownImages ? (
            <p className="border-l border-amber-400/50 bg-amber-400/5 px-3 py-2 text-sm text-muted-foreground">
              {unsupportedMarkdownImageNotice}
            </p>
          ) : null}
        </section>
      ) : null}

      {imageUpload ? (
        <>
          {isUploadingInlineImage ? (
            <div className="border-l border-primary px-3 py-2 text-sm text-muted-foreground">
              正在上传图片，完成后会插入到正文{isSourceOpen ? "当前位置" : "末尾"}。
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
            insertActionLabels={imageInsertionLabels}
            maxCount={imageUpload.maxCount}
            onInsertAttachment={insertAttachmentMarkdown}
            onRemoveAttachment={removeInlineImageAttachment}
          />
        </>
      ) : null}
      {boundAttachments ? (
        <InlineImageAttachmentReferences
          attachments={boundAttachments}
          canInsertAttachment={canInsertAttachmentReference}
          disabled={disabled}
          isAttachmentInserted={(attachment) =>
            referencedAttachmentIds.has(attachment.id)
          }
          insertActionLabels={imageInsertionLabels}
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

  const itemFiles = Array.from(dataTransfer.items)
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter(isImageFile);

  if (itemFiles.length > 0) {
    return itemFiles;
  }

  const htmlImageFiles = getDataImageFilesFromTransferHtml(dataTransfer);

  if (htmlImageFiles.length > 0) {
    return htmlImageFiles;
  }

  return getDataImageFilesFromTransferText(dataTransfer);
}

function hasImageFileData(dataTransfer: DataTransfer) {
  return (
    Array.from(dataTransfer.files).some(isImageFile) ||
    Array.from(dataTransfer.items).some(
      (item) => item.kind === "file" && item.type.startsWith("image/"),
    ) ||
    hasDataImageInTransferHtml(dataTransfer) ||
    hasDataImageInTransferText(dataTransfer)
  );
}

function getPastedImageAltText(file: File) {
  const name = file.name.trim().replace(/\.[^.]+$/, "");

  return name || "粘贴图片";
}

function isImageFile(file: File | null): file is File {
  return Boolean(file?.type.startsWith("image/"));
}

function getDataImageFilesFromTransferHtml(dataTransfer: DataTransfer) {
  const html = dataTransfer.getData("text/html");

  if (!html) {
    return [];
  }

  return extractDataImageSourcesFromClipboardHtml(html)
    .map((source, index) => createFileFromDataImageSource(source, index))
    .filter(isImageFile);
}

function hasDataImageInTransferHtml(dataTransfer: DataTransfer) {
  const html = dataTransfer.getData("text/html");

  return Boolean(
    html && extractDataImageSourcesFromClipboardHtml(html).length > 0,
  );
}

function getDataImageFilesFromTransferText(dataTransfer: DataTransfer) {
  const text = dataTransfer.getData("text/plain");

  if (!text) {
    return [];
  }

  return extractDataImageSourcesFromClipboardText(text)
    .map((source, index) => createFileFromDataImageSource(source, index))
    .filter(isImageFile);
}

function getDataImageTextPasteFromTransferText(dataTransfer: DataTransfer) {
  const text = dataTransfer.getData("text/plain");

  if (!text) {
    return null;
  }

  const paste = extractDataImageTextPaste(text);

  return paste.sources.length > 0 ? paste : null;
}

function hasDataImageInTransferText(dataTransfer: DataTransfer) {
  const text = dataTransfer.getData("text/plain");

  return Boolean(
    text && extractDataImageSourcesFromClipboardText(text).length > 0,
  );
}

function createFileFromDataImageSource(
  source: ClipboardDataImageSource,
  index: number,
) {
  const commaIndex = source.dataUrl.indexOf(",");
  const base64 = commaIndex >= 0 ? source.dataUrl.slice(commaIndex + 1) : "";
  let binary = "";

  try {
    binary = window.atob(base64);
  } catch {
    return null;
  }

  const bytes = new Uint8Array(binary.length);

  for (let byteIndex = 0; byteIndex < binary.length; byteIndex += 1) {
    bytes[byteIndex] = binary.charCodeAt(byteIndex);
  }

  return new File([bytes], getClipboardImageFileName(source, index), {
    type: source.mimeType,
  });
}

function replaceClipboardDataImagePlaceholders(
  text: string,
  markdownByPlaceholder: Map<string, string>,
) {
  let nextText = text;

  for (const [placeholder, markdown] of markdownByPlaceholder) {
    nextText = nextText.split(placeholder).join(markdown);
  }

  return nextText;
}

function isTextareaElement(value: EventTarget | null) {
  return value instanceof HTMLTextAreaElement;
}
