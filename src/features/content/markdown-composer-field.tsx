"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import {
  mergeAttributes,
  Mark,
  Node as TiptapNode,
  type Editor,
} from "@tiptap/core";
import Image, { type ImageOptions } from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import { Markdown } from "@tiptap/markdown";
import {
  EditorContent,
  useEditor,
  useEditorState,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Code,
  CodeXml,
  EyeOff,
  Heading2,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Table as TableIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
  ATTACHMENT_MARKDOWN_URL_PREFIX,
  createAttachmentMarkdown,
  getAttachmentIdFromMarkdownUrl,
  getReferencedAttachmentIds,
  getReferencedAttachmentIdsForSubmit,
  hasUnsupportedMarkdownImageReferences,
} from "@/features/content/attachment-markdown";
import { normalizeMarkdownHref } from "@/features/content/markdown-url";
import { resolveWhitelistedMediaEmbed } from "@/features/content/media-embed";
import { createMediaEmbedPlayerElement } from "@/features/content/media-embed-player";
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
  disabled?: boolean;
  fieldProps?: {
    "aria-invalid"?: boolean;
    "aria-label"?: string;
    className?: string;
    disabled?: boolean;
    id?: string;
    name?: string;
    placeholder?: string;
  };
  imageUpload?: {
    attachments: MediaAttachment[];
    maxCount: number;
    onChange: (attachments: MediaAttachment[]) => void;
    onUploadingChange?: (isUploading: boolean) => void;
  };
  maxReferencedAttachments?: number;
  onChange: (value: string) => void;
  value: string;
};

type InlineImageInsertion = "cursor" | "end";
type AttachmentImageOptions = ImageOptions & {
  getAttachmentById: (id: string) => MediaAttachment | null;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    spoiler: {
      toggleSpoiler: () => ReturnType;
    };
  }
}

const SpoilerMark = Mark.create({
  name: "spoiler",

  parseHTML() {
    return [{ tag: "span[data-spoiler]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-spoiler": "true",
        class:
          "rounded-sm bg-zinc-950 px-1 text-zinc-950 outline outline-1 outline-zinc-700 transition-colors hover:text-foreground",
      }),
      0,
    ];
  },

  renderMarkdown: (node, helpers) =>
    `>!${helpers.renderChildren(node).trim()}!<`,

  addCommands() {
    return {
      toggleSpoiler:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },
});

const AttachmentImage = Image.extend<AttachmentImageOptions>({
  addOptions() {
    const parentOptions = this.parent?.() ?? {
      allowBase64: false,
      HTMLAttributes: {},
      inline: false,
      resize: false,
    };

    return {
      ...parentOptions,
      getAttachmentById: () => null,
      HTMLAttributes: {
        class:
          "my-4 block h-auto max-h-[520px] max-w-full border border-border bg-background-soft object-contain",
      },
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      attachmentId: {
        default: null,
        rendered: false,
      },
      displaySrc: {
        default: null,
        rendered: false,
      },
    };
  },

  parseMarkdown(token, helpers) {
    const src = token.href;
    const attachmentId = getAttachmentIdFromMarkdownUrl(src);
    const attachment = attachmentId
      ? this.options.getAttachmentById(attachmentId)
      : null;

    return helpers.createNode("image", {
      alt: token.text,
      attachmentId,
      displaySrc: attachment?.url ?? null,
      src,
      title: token.title,
    });
  },

  renderHTML({ HTMLAttributes, node }) {
    const src = typeof node.attrs.src === "string" ? node.attrs.src : "";
    const attachmentId =
      typeof node.attrs.attachmentId === "string"
        ? node.attrs.attachmentId
        : getAttachmentIdFromMarkdownUrl(src);
    const attachment = attachmentId
      ? this.options.getAttachmentById(attachmentId)
      : null;
    const displaySrc =
      typeof node.attrs.displaySrc === "string" && node.attrs.displaySrc
        ? node.attrs.displaySrc
        : attachment?.url;

    if (attachmentId && displaySrc) {
      return [
        "img",
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          alt: HTMLAttributes.alt || attachment?.alt_text || "内容图片",
          "data-attachment-id": attachmentId,
          src: displaySrc,
        }),
      ];
    }

    if (attachmentId) {
      return [
        "span",
        {
          class:
            "my-4 block border border-border bg-background-soft px-3 py-2 text-sm text-muted-foreground",
        },
        "图片附件不存在或尚未随内容返回。",
      ];
    }

    return [
      "span",
      {
        class:
          "my-4 block border border-border bg-background-soft px-3 py-2 text-sm text-muted-foreground",
      },
      "外部图片不会直接渲染；请上传图片后放入正文。",
    ];
  },

  renderMarkdown(node) {
    const src = node.attrs?.src ?? "";
    const alt = node.attrs?.alt ?? "";
    const title = node.attrs?.title ?? "";

    return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`;
  },
});

const MediaEmbedNode = TiptapNode.create({
  name: "mediaEmbed",

  atom: true,
  group: "block",
  selectable: true,

  addAttributes() {
    return {
      originalUrl: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "a[data-media-embed]",
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const originalUrl =
      typeof node.attrs.originalUrl === "string" ? node.attrs.originalUrl : "";

    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        "data-media-embed": "true",
        href: originalUrl,
        rel: "nofollow ugc noopener noreferrer",
        target: "_blank",
      }),
      originalUrl,
    ];
  },

  renderMarkdown(node) {
    return typeof node.attrs?.originalUrl === "string"
      ? node.attrs.originalUrl
      : "";
  },

  addNodeView() {
    return ({ node }) => {
      const originalUrl =
        typeof node.attrs.originalUrl === "string" ? node.attrs.originalUrl : "";
      const embed = resolveWhitelistedMediaEmbed(originalUrl);
      const dom = document.createElement("div");

      dom.className = "my-4 block outline-offset-2";
      dom.setAttribute("data-media-editor-node", "true");

      if (embed) {
        dom.append(createMediaEmbedPlayerElement(embed));
      } else {
        dom.append(createMediaFallbackLink(originalUrl));
      }

      return {
        deselectNode() {
          dom.classList.remove("outline", "outline-1", "outline-primary");
        },
        dom,
        selectNode() {
          dom.classList.add("outline", "outline-1", "outline-primary");
        },
      };
    };
  },
});

const emptyToolbarState = {
  blockquote: false,
  bold: false,
  bulletList: false,
  code: false,
  codeBlock: false,
  heading: false,
  italic: false,
  link: false,
  orderedList: false,
  spoiler: false,
  strike: false,
};

export function MarkdownComposerField({
  boundAttachments,
  className,
  disabled = false,
  fieldProps,
  imageUpload,
  maxReferencedAttachments,
  onChange,
  value,
}: MarkdownComposerFieldProps) {
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const latestValueRef = useRef(value);
  const mediaEmbedSyncFrameRef = useRef<number | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [isUploadingInlineImage, setIsUploadingInlineImage] = useState(false);
  const inlineImageUploadMutation = useUploadImageMutation();
  const previewAttachments = useMemo(
    () =>
      dedupeAttachments([
        ...(boundAttachments ?? []),
        ...(imageUpload?.attachments ?? []),
      ]),
    [boundAttachments, imageUpload?.attachments],
  );
  const attachmentById = useMemo(
    () =>
      new Map(
        previewAttachments.map((attachment) => [attachment.id, attachment] as const),
      ),
    [previewAttachments],
  );
  const referencedAttachmentIds = getReferencedAttachmentIds(value);
  const maxReferencedImageAttachments =
    maxReferencedAttachments ?? imageUpload?.maxCount;
  const hasUnreferencedUploadedImages = (imageUpload?.attachments ?? []).some(
    (attachment) => !referencedAttachmentIds.has(attachment.id),
  );
  const unreferencedUploadedImageNotice =
    "未留在正文里的上传图片不会随内容发布；需要时请重新添加到正文当前位置。";
  const hasUnsupportedMarkdownImages =
    hasUnsupportedMarkdownImageReferences(value);
  const unsupportedMarkdownImageNotice =
    "外部图片不会作为正文图片保存；请用“添加图片”或粘贴、拖拽图片文件上传到正文当前位置。";
  const isEditorDisabled = disabled || Boolean(fieldProps?.disabled);

  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  useEffect(
    () => () => {
      if (mediaEmbedSyncFrameRef.current !== null) {
        window.cancelAnimationFrame(mediaEmbedSyncFrameRef.current);
      }
    },
    [],
  );

  const scheduleMediaEmbedSync = useCallback((targetEditor: Editor) => {
    if (mediaEmbedSyncFrameRef.current !== null) {
      return;
    }

    mediaEmbedSyncFrameRef.current = window.requestAnimationFrame(() => {
      mediaEmbedSyncFrameRef.current = null;

      if (!targetEditor.isDestroyed) {
        syncWhitelistedMediaEmbeds(targetEditor);
      }
    });
  }, []);

  const editorExtensions = useMemo(
    () => [
      StarterKit.configure({
        link: false,
      }),
      Link.configure({
        autolink: true,
        enableClickSelection: true,
        linkOnPaste: true,
        openOnClick: false,
        HTMLAttributes: {
          class:
            "text-primary underline decoration-primary/40 underline-offset-4",
          rel: "nofollow ugc noopener noreferrer",
          target: "_blank",
        },
        isAllowedUri: (url) => isSafeEditorLink(url),
        shouldAutoLink: (url) => isSafeEditorLink(url),
      }),
      Placeholder.configure({
        placeholder:
          fieldProps?.placeholder ||
          "直接在这里写正文，选中文字后用工具栏设置格式。",
      }),
      AttachmentImage.configure({
        getAttachmentById: (id: string) => attachmentById.get(id) ?? null,
      }),
      MediaEmbedNode,
      Table.configure({
        resizable: false,
      }),
      TableRow,
      TableHeader,
      TableCell,
      SpoilerMark,
      Markdown.configure({
        markedOptions: {
          gfm: true,
        },
      }),
    ],
    [attachmentById, fieldProps?.placeholder],
  );

  const editor = useEditor(
    {
      content: value,
      contentType: "markdown",
      editable: !isEditorDisabled,
      extensions: editorExtensions,
      editorProps: {
        attributes: {
          ...(fieldProps?.["aria-invalid"] ? { "aria-invalid": "true" } : {}),
          ...(fieldProps?.id ? { id: fieldProps.id } : {}),
          "aria-label":
            typeof fieldProps?.["aria-label"] === "string"
              ? fieldProps["aria-label"]
              : "正文内容",
          class: cn(
            "min-h-40 px-3 py-3 text-sm leading-7 text-foreground outline-none",
            "prose-headings:tracking-normal",
            "data-[placeholder]:before:pointer-events-none data-[placeholder]:before:float-left data-[placeholder]:before:h-0 data-[placeholder]:before:text-muted-foreground data-[placeholder]:before:content-[attr(data-placeholder)]",
            "[&_a]:text-primary [&_a]:underline [&_a]:decoration-primary/40 [&_a]:underline-offset-4",
            "[&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/50 [&_blockquote]:bg-primary/5 [&_blockquote]:px-4 [&_blockquote]:py-2 [&_blockquote]:text-muted-foreground",
            "[&_code]:border [&_code]:border-border [&_code]:bg-background-soft [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.92em]",
            "[&_h1]:mb-2 [&_h1]:mt-5 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:leading-7",
            "[&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:leading-7",
            "[&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:leading-6",
            "[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-6",
            "[&_p]:my-3 [&_p]:whitespace-pre-wrap [&_p]:leading-7 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
            "[&_pre]:my-4 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-border [&_pre]:bg-background-soft [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-sm [&_pre]:leading-6",
            "[&_pre_code]:border-0 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
            "[&_table]:my-4 [&_table]:w-full [&_table]:min-w-[560px] [&_table]:border-collapse [&_table]:text-sm",
            "[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:align-top",
            "[&_th]:border [&_th]:border-border [&_th]:bg-background-soft [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:text-muted-foreground",
            "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6",
            fieldProps?.className,
          ),
        },
      },
      immediatelyRender: false,
      onCreate: ({ editor: createdEditor }) => {
        scheduleMediaEmbedSync(createdEditor);
      },
      onUpdate: ({ editor: updatedEditor }) => {
        scheduleMediaEmbedSync(updatedEditor);

        const nextMarkdown = normalizeEditorMarkdown(updatedEditor.getMarkdown());

        if (nextMarkdown !== latestValueRef.current) {
          latestValueRef.current = nextMarkdown;
          onChange(nextMarkdown);
        }
      },
    },
    [editorExtensions],
  );

  const toolbarState =
    useEditorState({
      editor,
      selector: ({ editor: currentEditor }) => ({
        blockquote: currentEditor?.isActive("blockquote") ?? false,
        bold: currentEditor?.isActive("bold") ?? false,
        bulletList: currentEditor?.isActive("bulletList") ?? false,
        code: currentEditor?.isActive("code") ?? false,
        codeBlock: currentEditor?.isActive("codeBlock") ?? false,
        heading: currentEditor?.isActive("heading", { level: 2 }) ?? false,
        italic: currentEditor?.isActive("italic") ?? false,
        link: currentEditor?.isActive("link") ?? false,
        orderedList: currentEditor?.isActive("orderedList") ?? false,
        spoiler: currentEditor?.isActive("spoiler") ?? false,
        strike: currentEditor?.isActive("strike") ?? false,
      }),
    }) ?? emptyToolbarState;

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(!isEditorDisabled);
  }, [editor, isEditorDisabled]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const currentMarkdown = normalizeEditorMarkdown(editor.getMarkdown());
    const nextMarkdown = normalizeEditorMarkdown(value);

    if (currentMarkdown !== nextMarkdown) {
      latestValueRef.current = nextMarkdown;
      editor.commands.setContent(nextMarkdown, {
        contentType: "markdown",
        emitUpdate: false,
      });
      scheduleMediaEmbedSync(editor);
    }
  }, [editor, scheduleMediaEmbedSync, value]);

  function setBodyValue(nextValue: string) {
    latestValueRef.current = nextValue;
    onChange(nextValue);
  }

  function getRemainingReferenceSlots(markdown = getCurrentMarkdown()) {
    if (maxReferencedImageAttachments === undefined) {
      return Number.POSITIVE_INFINITY;
    }

    return Math.max(
      0,
      maxReferencedImageAttachments -
        getReferencedAttachmentIdsForSubmit(markdown, previewAttachments).length,
    );
  }

  function getReferencedUploadedAttachments(markdown = getCurrentMarkdown()) {
    if (!imageUpload) {
      return [];
    }

    const referencedIds = getReferencedAttachmentIds(markdown);

    return imageUpload.attachments.filter((attachment) =>
      referencedIds.has(attachment.id),
    );
  }

  function getReferenceLimitMessage() {
    if (maxReferencedImageAttachments === undefined) {
      return "正文图片数量已达到上限，先从正文移除一张再继续。";
    }

    return `正文最多放入 ${maxReferencedImageAttachments} 张图片，先从正文移除一张再继续。`;
  }

  async function handleComposerPaste(event: ClipboardEvent<HTMLDivElement>) {
    await handleInlineImagePaste(event, "cursor");
  }

  function handleComposerDragOver(event: DragEvent<HTMLDivElement>) {
    if (!hasImageFileData(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect =
      imageUpload && !isEditorDisabled ? "copy" : "none";
  }

  async function handleComposerDrop(event: DragEvent<HTMLDivElement>) {
    const imageFiles = getImageFilesFromDataTransfer(event.dataTransfer);

    if (imageFiles.length === 0) {
      return;
    }

    event.preventDefault();

    if (!imageUpload || isEditorDisabled) {
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

      if (isEditorDisabled) {
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

    if (isEditorDisabled) {
      return;
    }

    const remainingUploadSlots =
      imageUpload.maxCount - getReferencedUploadedAttachments().length;
    const remainingReferenceSlots = getRemainingReferenceSlots();

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
      insertion: "cursor",
    });
  }

  async function uploadInlineDataImageTextPaste(
    paste: ClipboardDataImageTextPaste,
    options: { insertion?: InlineImageInsertion } = {},
  ) {
    if (!imageUpload) {
      return;
    }

    const currentValue = getCurrentMarkdown();
    const referencedUploadAttachments =
      getReferencedUploadedAttachments(currentValue);
    const remainingUploadSlots =
      imageUpload.maxCount - referencedUploadAttachments.length;
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
        currentCount: referencedUploadAttachments.length + files.length,
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
      let nextAttachments = referencedUploadAttachments;
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

      insertMarkdownIntoEditor(pastedMarkdown, options.insertion ?? "cursor");
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

    const referencedUploadAttachments = getReferencedUploadedAttachments();
    const remainingUploadSlots =
      imageUpload.maxCount - referencedUploadAttachments.length;
    const remainingReferenceSlots = getRemainingReferenceSlots();

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
      let nextAttachments = referencedUploadAttachments;

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
        insertAttachmentIntoEditor(
          editor,
          result.attachment,
          options.insertion ?? "cursor",
        );
      }
    } catch (error) {
      setImageUploadError(getUploadError(error));
    } finally {
      setIsUploadingInlineImage(false);
      imageUpload.onUploadingChange?.(false);
    }
  }

  function getCurrentMarkdown() {
    return normalizeEditorMarkdown(editor?.getMarkdown() ?? value);
  }

  function insertMarkdownIntoEditor(
    markdown: string,
    insertion: InlineImageInsertion,
  ) {
    if (!editor) {
      setBodyValue(`${value}${markdown}`);
      return;
    }

    const chain =
      insertion === "end" ? editor.chain().focus("end") : editor.chain().focus();

    chain.insertContent(markdown, { contentType: "markdown" }).run();
  }

  function renderImageTool() {
    if (!imageUpload) {
      return null;
    }

    const canAddImage =
      !isEditorDisabled &&
      !isUploadingInlineImage &&
      getReferencedUploadedAttachments(value).length < imageUpload.maxCount &&
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
        <ToolbarButton
          active={false}
          disabled={!canAddImage}
          icon={<ImagePlus aria-hidden="true" />}
          label="添加图片"
          onClick={() => imageFileInputRef.current?.click()}
        />
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
      <section
        className={cn(
          "overflow-hidden border border-border bg-background",
          isEditorDisabled && "opacity-70",
        )}
      >
        <RichMarkdownToolbar
          disabled={isEditorDisabled}
          editor={editor}
          renderImageTool={renderImageTool}
          state={toolbarState}
        />
        <div className="max-w-full overflow-x-auto border-t border-border">
          <EditorContent editor={editor} />
        </div>
      </section>

      {isUploadingInlineImage ? (
        <div className="border-l border-primary px-3 py-2 text-sm text-muted-foreground">
          正在上传图片，完成后会放入正文当前位置。
        </div>
      ) : null}
      {hasUnreferencedUploadedImages ? (
        <p className="border-l border-primary px-3 py-2 text-sm text-muted-foreground">
          {unreferencedUploadedImageNotice}
        </p>
      ) : null}
      {hasUnsupportedMarkdownImages ? (
        <p className="border-l border-amber-400/50 bg-amber-400/5 px-3 py-2 text-sm text-muted-foreground">
          {unsupportedMarkdownImageNotice}
        </p>
      ) : null}
      {imageUploadError ? (
        <Alert variant="destructive">
          <AlertTitle>添加图片失败</AlertTitle>
          <AlertDescription>{imageUploadError}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

function RichMarkdownToolbar({
  disabled,
  editor,
  renderImageTool,
  state,
}: {
  disabled: boolean;
  editor: Editor | null;
  renderImageTool: () => ReactNode;
  state: typeof emptyToolbarState;
}) {
  function run(command: (editor: Editor) => void) {
    if (!editor || disabled) {
      return;
    }

    command(editor);
  }

  function setLink() {
    if (!editor || disabled) {
      return;
    }

    const currentHref = editor.getAttributes("link").href;
    const nextHref = window.prompt("输入链接地址", currentHref || "https://");

    if (nextHref === null) {
      return;
    }

    const normalizedHref = normalizeMarkdownHref(nextHref);

    if (!normalizedHref) {
      return;
    }

    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: normalizedHref })
      .run();
  }

  const tools = [
    {
      active: state.bold,
      icon: <Bold aria-hidden="true" />,
      label: "加粗",
      onClick: () => run((currentEditor) => currentEditor.chain().focus().toggleBold().run()),
    },
    {
      active: state.italic,
      icon: <Italic aria-hidden="true" />,
      label: "斜体",
      onClick: () => run((currentEditor) => currentEditor.chain().focus().toggleItalic().run()),
    },
    {
      active: state.heading,
      icon: <Heading2 aria-hidden="true" />,
      label: "标题",
      onClick: () =>
        run((currentEditor) =>
          currentEditor.chain().focus().toggleHeading({ level: 2 }).run(),
        ),
    },
    {
      active: state.strike,
      icon: <Strikethrough aria-hidden="true" />,
      label: "删除线",
      onClick: () => run((currentEditor) => currentEditor.chain().focus().toggleStrike().run()),
    },
    {
      active: state.blockquote,
      icon: <Quote aria-hidden="true" />,
      label: "引用",
      onClick: () =>
        run((currentEditor) => currentEditor.chain().focus().toggleBlockquote().run()),
    },
    {
      active: state.bulletList,
      icon: <List aria-hidden="true" />,
      label: "无序列表",
      onClick: () =>
        run((currentEditor) => currentEditor.chain().focus().toggleBulletList().run()),
    },
    {
      active: state.orderedList,
      icon: <ListOrdered aria-hidden="true" />,
      label: "有序列表",
      onClick: () =>
        run((currentEditor) => currentEditor.chain().focus().toggleOrderedList().run()),
    },
    {
      active: state.code,
      icon: <Code aria-hidden="true" />,
      label: "代码",
      onClick: () => run((currentEditor) => currentEditor.chain().focus().toggleCode().run()),
    },
    {
      active: state.codeBlock,
      icon: <CodeXml aria-hidden="true" />,
      label: "代码块",
      onClick: () =>
        run((currentEditor) => currentEditor.chain().focus().toggleCodeBlock().run()),
    },
    {
      active: state.link,
      icon: <LinkIcon aria-hidden="true" />,
      label: "链接",
      onClick: setLink,
    },
    {
      active: state.spoiler,
      icon: <EyeOff aria-hidden="true" />,
      label: "涂黑",
      onClick: () =>
        run((currentEditor) => currentEditor.chain().focus().toggleSpoiler().run()),
    },
    {
      active: false,
      icon: <TableIcon aria-hidden="true" />,
      label: "表格",
      onClick: () =>
        run((currentEditor) =>
          currentEditor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run(),
        ),
    },
  ];

  return (
    <div
      className="flex flex-wrap items-center gap-1 bg-background-soft p-1"
      aria-label="正文格式工具栏"
    >
      <span className="px-2 font-mono text-[11px] text-muted-foreground">
        格式
      </span>
      {tools.map((tool) => (
        <ToolbarButton
          key={tool.label}
          active={tool.active}
          disabled={disabled}
          icon={tool.icon}
          label={tool.label}
          onClick={tool.onClick}
        />
      ))}
      {renderImageTool()}
    </div>
  );
}

function ToolbarButton({
  active,
  disabled,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      size="icon"
      title={label}
      type="button"
      variant={active ? "secondary" : "ghost"}
      className="size-9 rounded-md"
    >
      {icon}
    </Button>
  );
}

function dedupeAttachments(attachments: MediaAttachment[]) {
  const attachmentById = new Map<string, MediaAttachment>();

  for (const attachment of attachments) {
    attachmentById.set(attachment.id, attachment);
  }

  return [...attachmentById.values()];
}

function createMediaFallbackLink(originalUrl: string) {
  const link = document.createElement("a");

  link.href = originalUrl;
  link.rel = "nofollow ugc noopener noreferrer";
  link.target = "_blank";
  link.className =
    "block border border-border bg-background-soft px-3 py-2 text-sm text-primary underline decoration-primary/40 underline-offset-4";
  link.textContent = originalUrl;

  return link;
}

function syncWhitelistedMediaEmbeds(editor: Editor) {
  const mediaEmbedType = editor.state.schema.nodes.mediaEmbed;

  if (!mediaEmbedType) {
    return false;
  }

  const replacements: Array<{
    from: number;
    originalUrl: string;
    to: number;
  }> = [];

  editor.state.doc.descendants((node, position) => {
    if (node.type.name !== "paragraph") {
      return;
    }

    const originalUrl = node.textContent.trim();

    if (
      !originalUrl ||
      node.textContent !== originalUrl ||
      !resolveWhitelistedMediaEmbed(originalUrl)
    ) {
      return;
    }

    replacements.push({
      from: position,
      originalUrl,
      to: position + node.nodeSize,
    });
  });

  if (replacements.length === 0) {
    return false;
  }

  let transaction = editor.state.tr;

  for (const replacement of [...replacements].reverse()) {
    transaction = transaction.replaceWith(
      replacement.from,
      replacement.to,
      mediaEmbedType.create({
        originalUrl: replacement.originalUrl,
      }),
    );
  }

  editor.view.dispatch(transaction);
  return true;
}

function insertAttachmentIntoEditor(
  editor: Editor | null,
  attachment: MediaAttachment,
  insertion: InlineImageInsertion,
) {
  if (!editor) {
    return;
  }

  const imageNode = {
    attrs: {
      alt: attachment.alt_text || "内容图片",
      attachmentId: attachment.id,
      displaySrc: attachment.url,
      src: `${ATTACHMENT_MARKDOWN_URL_PREFIX}${encodeAttachmentIdForMarkdown(
        attachment.id,
      )}`,
    },
    type: "image",
  };
  const chain =
    insertion === "end" ? editor.chain().focus("end") : editor.chain().focus();

  chain.insertContent(imageNode).run();
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

function normalizeEditorMarkdown(value: string) {
  return value.replace(/\n{3,}/g, "\n\n").trimEnd();
}

function isSafeEditorLink(value: string | undefined) {
  const normalized = normalizeMarkdownHref(value);

  return Boolean(normalized && !normalized.startsWith(ATTACHMENT_MARKDOWN_URL_PREFIX));
}

function encodeAttachmentIdForMarkdown(value: string) {
  return encodeURIComponent(value).replace(/[()]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}
