"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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
import { Fragment, type Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import { Markdown } from "@tiptap/markdown";
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
  useEditor,
  useEditorState,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Code,
  CodeXml,
  EyeOff,
  GalleryHorizontal,
  Heading2,
  ImagePlus,
  ImageOff,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Quote,
  Strikethrough,
  Table as TableIcon,
  Ungroup,
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
  ATTACHMENT_GALLERY_MARKDOWN_URL_PREFIX,
  createAttachmentGalleryMarkdown,
  createAttachmentMarkdown,
  getAttachmentIdFromMarkdownUrl,
  getGalleryAttachmentIdsFromMarkdownUrl,
  getReferencedAttachmentIds,
  getReferencedAttachmentIdsForSubmit,
  hasUnsupportedMarkdownImageReferences,
} from "@/features/content/attachment-markdown";
import { ContentImageGallery } from "@/features/content/content-image-gallery";
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
  autoFocusKey?: number;
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

type InlineImageInsertion = "cursor" | "end" | number;
type AttachmentImageOptions = ImageOptions & {
  getAttachmentById: (id: string) => MediaAttachment | null;
};
type AttachmentGalleryOptions = {
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
    const galleryAttachmentIds = getGalleryAttachmentIdsFromMarkdownUrl(src);

    if (galleryAttachmentIds.length > 0) {
      return helpers.createNode("attachmentGallery", {
        attachmentIds: galleryAttachmentIds,
        attachmentSnapshots: [],
        caption: token.text || "图片轮播",
      });
    }

    const attachmentId = getAttachmentIdFromMarkdownUrl(src);

    return helpers.createNode("image", {
      alt: token.text,
      attachmentId,
      displaySrc: null,
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
            "my-4 block border-l border-border px-3 py-2 text-sm text-muted-foreground",
        },
        "图片附件不存在或尚未随内容返回。",
      ];
    }

    return [
      "span",
      {
        class:
          "my-4 block border-l border-border px-3 py-2 text-sm text-muted-foreground",
      },
      "外部图片不会直接渲染；请上传图片后放入正文。",
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AttachmentImageEditorView);
  },

  renderMarkdown(node) {
    const attachmentId =
      typeof node.attrs?.attachmentId === "string"
        ? node.attrs.attachmentId
        : getAttachmentIdFromMarkdownUrl(node.attrs?.src);
    const src = attachmentId
      ? `${ATTACHMENT_MARKDOWN_URL_PREFIX}${encodeAttachmentIdForMarkdown(
          attachmentId,
        )}`
      : node.attrs?.src ?? "";
    const alt = node.attrs?.alt ?? "";
    const title = node.attrs?.title ?? "";

    return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`;
  },
});

const AttachmentGalleryNode = TiptapNode.create<AttachmentGalleryOptions>({
  name: "attachmentGallery",

  atom: true,
  group: "block",
  selectable: true,

  addOptions() {
    return {
      getAttachmentById: () => null,
    };
  },

  addAttributes() {
    return {
      attachmentIds: {
        default: [],
      },
      attachmentSnapshots: {
        default: [],
        rendered: false,
      },
      caption: {
        default: "图片轮播",
      },
    };
  },

  parseHTML() {
    return [
      {
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) {
            return false;
          }

          const ids = element.dataset.attachmentIds
            ?.split(",")
            .map((id) => id.trim())
            .filter(Boolean);

          return ids?.length
            ? {
                attachmentIds: ids,
                caption: element.dataset.caption || "图片轮播",
              }
            : false;
        },
        tag: "div[data-attachment-gallery]",
      },
    ];
  },

  renderHTML({ node }) {
    const attachmentIds = normalizeAttachmentIds(node.attrs.attachmentIds);
    const caption =
      typeof node.attrs.caption === "string" && node.attrs.caption.trim()
        ? node.attrs.caption.trim()
        : "图片轮播";

    return [
      "div",
      {
        "data-attachment-gallery": "true",
        "data-attachment-ids": attachmentIds.join(","),
        "data-caption": caption,
      },
      caption,
    ];
  },

  parseMarkdown(token, helpers) {
    const src = typeof token.href === "string" ? token.href : "";
    const attachmentIds = getGalleryAttachmentIdsFromMarkdownUrl(src);

    if (attachmentIds.length === 0) {
      return [];
    }

    return helpers.createNode("attachmentGallery", {
      attachmentIds,
      attachmentSnapshots: [],
      caption: token.text || "图片轮播",
    });
  },

  renderMarkdown(node) {
    const attachmentIds = normalizeAttachmentIds(node.attrs?.attachmentIds);
    const caption =
      typeof node.attrs?.caption === "string" && node.attrs.caption.trim()
        ? node.attrs.caption.trim()
        : "图片轮播";

    return `![${escapeMarkdownAltText(caption)}](${ATTACHMENT_GALLERY_MARKDOWN_URL_PREFIX}${attachmentIds
      .map(encodeAttachmentIdForMarkdown)
      .join(",")})`;
  },

  addNodeView() {
    return ReactNodeViewRenderer(AttachmentGalleryEditorView);
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

function AttachmentImageEditorView({
  editor,
  extension,
  getPos,
  node,
  selected,
}: ReactNodeViewProps) {
  const options = extension.options as AttachmentImageOptions;
  const src = typeof node.attrs.src === "string" ? node.attrs.src : "";
  const attachmentId =
    typeof node.attrs.attachmentId === "string" && node.attrs.attachmentId
      ? node.attrs.attachmentId
      : getAttachmentIdFromMarkdownUrl(src);
  const attachment = attachmentId
    ? options.getAttachmentById(attachmentId)
    : null;
  const caption =
    typeof node.attrs.alt === "string" && node.attrs.alt.trim()
      ? node.attrs.alt.trim()
      : attachment?.alt_text.trim() || "内容图片";
  const position = getNodeViewPosition(getPos);
  const canMergeAdjacent =
    editor.isEditable &&
    attachmentId !== null &&
    position !== null &&
    canMergeAdjacentAttachmentMedia(editor, position);

  return (
    <NodeViewWrapper
      as="div"
      className={cn(
        "group/media-node my-4 block outline-offset-2",
        selected && "outline outline-1 outline-primary",
      )}
      contentEditable={false}
      data-attachment-id={attachmentId ?? undefined}
    >
      {isVisibleImageAttachmentForEditor(attachment) ? (
        <ContentImageGallery
          attachments={[attachment]}
          caption={caption}
          variant="detail"
        />
      ) : !attachmentId ? (
        <span className="block border-l border-border px-3 py-2 text-sm text-muted-foreground">
          外部图片不会直接渲染；请上传图片后放入正文。
        </span>
      ) : (
        <span className="block border-l border-border px-3 py-2 text-sm text-muted-foreground">
          图片附件不存在、尚未随内容返回或当前不可显示。
        </span>
      )}
      {canMergeAdjacent && position !== null ? (
        <AttachmentEditorActionBar>
          <AttachmentEditorActionButton
            icon={<GalleryHorizontal aria-hidden="true" />}
            onClick={() => mergeAdjacentAttachmentMedia(editor, position)}
          >
            合并为轮播
          </AttachmentEditorActionButton>
        </AttachmentEditorActionBar>
      ) : null}
    </NodeViewWrapper>
  );
}

function AttachmentGalleryEditorView({
  editor,
  extension,
  getPos,
  node,
  selected,
}: ReactNodeViewProps) {
  const attachmentIds = normalizeAttachmentIds(node.attrs.attachmentIds);
  const caption =
    typeof node.attrs.caption === "string" && node.attrs.caption.trim()
      ? node.attrs.caption.trim()
      : "图片轮播";
  const options = extension.options as AttachmentGalleryOptions;
  const attachmentSnapshots = normalizeAttachmentSnapshots(
    node.attrs.attachmentSnapshots,
  );
  const attachmentSnapshotById = new Map(
    attachmentSnapshots.map((attachment) => [attachment.id, attachment] as const),
  );
  const attachments = attachmentIds
    .map((id) => options.getAttachmentById(id) ?? attachmentSnapshotById.get(id))
    .filter(isVisibleImageAttachmentForEditor);
  const position = getNodeViewPosition(getPos);
  const canSplitGallery =
    editor.isEditable && attachmentIds.length > 1 && position !== null;

  return (
    <NodeViewWrapper
      as="div"
      className={cn(
        "group/media-node my-4 block outline-offset-2",
        selected && "outline outline-1 outline-primary",
      )}
      contentEditable={false}
      data-attachment-gallery="true"
      data-attachment-ids={attachmentIds.join(",")}
      data-caption={caption}
    >
      {attachments.length > 0 ? (
        <ContentImageGallery
          attachments={attachments}
          caption={caption}
          variant="detail"
        />
      ) : (
        <span className="block border-l border-border px-3 py-2 text-sm text-muted-foreground">
          图片轮播里的附件不存在或尚未随内容返回。
        </span>
      )}
      {canSplitGallery && position !== null ? (
        <AttachmentEditorActionBar>
          <AttachmentEditorActionButton
            icon={<Ungroup aria-hidden="true" />}
            onClick={() =>
              splitAttachmentGalleryMedia(
                editor,
                position,
                options.getAttachmentById,
              )
            }
          >
            拆分为单图
          </AttachmentEditorActionButton>
        </AttachmentEditorActionBar>
      ) : null}
    </NodeViewWrapper>
  );
}

function AttachmentEditorActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      {children}
    </div>
  );
}

function AttachmentEditorActionButton({
  children,
  icon,
  onClick,
}: {
  children: ReactNode;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex h-8 items-center gap-1.5 border-b border-transparent px-1 font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      contentEditable={false}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      <span className="[&_svg]:size-3.5">{icon}</span>
      <span>{children}</span>
    </button>
  );
}

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

const minimumInlineImageUploadNoticeMs = 650;

export function MarkdownComposerField({
  autoFocusKey,
  boundAttachments,
  className,
  disabled = false,
  fieldProps,
  imageUpload,
  maxReferencedAttachments,
  onChange,
  value,
}: MarkdownComposerFieldProps) {
  const attachmentUrlToIdRef = useRef<Map<string, string>>(new Map());
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<Editor | null>(null);
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
  const attachmentUrlToId = useMemo(
    () => createAttachmentUrlToIdMap(previewAttachments),
    [previewAttachments],
  );
  const normalizedValue = useMemo(
    () =>
      normalizeEditorMarkdown(
        rewriteAttachmentImageUrlsToMarkdown(value, attachmentUrlToId),
      ),
    [attachmentUrlToId, value],
  );
  const referencedAttachmentIds = getReferencedAttachmentIds(normalizedValue);
  const maxReferencedImageAttachments =
    maxReferencedAttachments ?? imageUpload?.maxCount;
  const hasUnreferencedUploadedImages = (imageUpload?.attachments ?? []).some(
    (attachment) => !referencedAttachmentIds.has(attachment.id),
  );
  const hasUnreferencedBoundImages = (boundAttachments ?? []).some(
    (attachment) => !referencedAttachmentIds.has(attachment.id),
  );
  const unreferencedUploadedImageNotice =
    "未留在正文里的上传图片不会随内容发布或保存；保存后会从当前内容解绑，对象清理以后端合同为准。";
  const unreferencedBoundImageNotice =
    "已从正文删除的历史图片不会随本次保存继续绑定；如果只是想调整位置，请重新插入或撤销后再保存。";
  const hasUnsupportedMarkdownImages =
    hasUnsupportedMarkdownImageReferences(normalizedValue);
  const unsupportedMarkdownImageNotice =
    "外部图片不会作为正文图片保存；请用“添加图片”或粘贴、拖拽图片文件上传到正文当前位置。";
  const isEditorDisabled = disabled || Boolean(fieldProps?.disabled);

  useEffect(() => {
    latestValueRef.current = normalizedValue;
  }, [normalizedValue]);

  useEffect(() => {
    attachmentUrlToIdRef.current = attachmentUrlToId;
  }, [attachmentUrlToId]);

  useEffect(() => {
    if (normalizedValue === value) {
      return;
    }

    latestValueRef.current = normalizedValue;
    onChange(normalizedValue);
  }, [normalizedValue, onChange, value]);

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
      AttachmentGalleryNode.configure({
        getAttachmentById: (id: string) => attachmentById.get(id) ?? null,
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
      content: normalizedValue,
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
        handlePaste: (view, event) => {
          const insertionPosition = view.state.selection.from;

          return handleInlineImagePaste(event, insertionPosition);
        },
      },
      immediatelyRender: false,
      onCreate: ({ editor: createdEditor }) => {
        scheduleMediaEmbedSync(createdEditor);
      },
      onUpdate: ({ editor: updatedEditor }) => {
        scheduleMediaEmbedSync(updatedEditor);

        const nextMarkdown = normalizeEditorMarkdown(
          rewriteAttachmentImageUrlsToMarkdown(
            updatedEditor.getMarkdown(),
            attachmentUrlToIdRef.current,
          ),
        );

        if (nextMarkdown !== latestValueRef.current) {
          latestValueRef.current = nextMarkdown;
          onChange(nextMarkdown);
        }
      },
    },
    [editorExtensions],
  );

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (!autoFocusKey || !editor || isEditorDisabled) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      if (!editor.isDestroyed) {
        editor.commands.focus("end");
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [autoFocusKey, editor, isEditorDisabled]);

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
    const currentEditor = editor;
    const nextMarkdown = normalizedValue;

    if (
      !currentEditor ||
      currentEditor.isDestroyed ||
      typeof currentEditor.commands?.setContent !== "function"
    ) {
      latestValueRef.current = nextMarkdown;
      return;
    }

    const currentMarkdown = normalizeEditorMarkdown(
      rewriteAttachmentImageUrlsToMarkdown(
        currentEditor.getMarkdown(),
        attachmentUrlToIdRef.current,
      ),
    );

    if (currentMarkdown !== nextMarkdown) {
      latestValueRef.current = nextMarkdown;
      currentEditor.commands.setContent(nextMarkdown, {
        contentType: "markdown",
        emitUpdate: false,
      });
      scheduleMediaEmbedSync(currentEditor);
    }
  }, [editor, normalizedValue, scheduleMediaEmbedSync]);

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

    await uploadInlineImageFiles(imageFiles);
  }

  function handleInlineImagePaste(
    event: ClipboardEvent,
    insertion: InlineImageInsertion,
  ) {
    if (event.defaultPrevented || !imageUpload) {
      return false;
    }

    const clipboardData = event.clipboardData;

    if (!clipboardData) {
      return false;
    }

    const dataImageTextPaste = getDataImageTextPasteFromTransferText(
      clipboardData,
    );

    if (dataImageTextPaste) {
      event.preventDefault();

      if (isEditorDisabled) {
        return true;
      }

      void uploadInlineDataImageTextPaste(dataImageTextPaste, { insertion });
      return true;
    }

    const imageFiles = getImageFilesFromDataTransfer(clipboardData);

    if (imageFiles.length === 0) {
      return false;
    }

    event.preventDefault();

    if (isEditorDisabled) {
      return true;
    }

    const remainingUploadSlots =
      imageUpload.maxCount - getReferencedUploadedAttachments().length;
    const remainingReferenceSlots = getRemainingReferenceSlots();

    if (remainingUploadSlots <= 0) {
      setImageUploadError(
        `当前最多上传 ${imageUpload.maxCount} 张图片，先移除一张再继续。`,
      );
      return true;
    }

    if (remainingReferenceSlots <= 0) {
      setImageUploadError(getReferenceLimitMessage());
      return true;
    }

    const remainingSlots = Math.min(remainingUploadSlots, remainingReferenceSlots);

    if (imageFiles.length > remainingSlots) {
      setImageUploadError(
        `当前还能放入 ${remainingSlots} 张图片，请减少数量后再试。`,
      );
      return true;
    }

    void uploadInlineImageFiles(imageFiles);
    return true;
  }

  async function handleImageFileChange(files: FileList | null) {
    if (!files || !imageUpload) {
      return;
    }

    const imageFiles = Array.from(files).filter(isImageFile);

    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = "";
    }

    if (imageFiles.length === 0) {
      return;
    }

    await uploadInlineImageFiles(imageFiles);
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
    const uploadNoticeSettled = createMinimumInlineImageUploadNoticePromise();
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
        markdownByPlaceholder.set(
          getClipboardDataImagePlaceholder(index),
          createAttachmentMarkdown(result.attachment),
        );
      }

      const pastedMarkdown = replaceClipboardDataImagePlaceholders(
        paste.text,
        markdownByPlaceholder,
      );

      syncImageUploadAttachments(nextAttachments);
      insertMarkdownIntoEditor(pastedMarkdown, options.insertion ?? "cursor");
    } catch (error) {
      setImageUploadError(getUploadError(error));
    } finally {
      await uploadNoticeSettled;
      setIsUploadingInlineImage(false);
      imageUpload.onUploadingChange?.(false);
    }
  }

  async function uploadInlineImageFiles(imageFiles: File[]) {
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
    const uploadNoticeSettled = createMinimumInlineImageUploadNoticePromise();
    setIsUploadingInlineImage(true);
    imageUpload.onUploadingChange?.(true);

    try {
      let nextAttachments = referencedUploadAttachments;
      const uploadedAttachments: MediaAttachment[] = [];

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
        uploadedAttachments.push(result.attachment);
      }

      syncImageUploadAttachments(nextAttachments);
      insertUploadedAttachmentsIntoValue(uploadedAttachments);
    } catch (error) {
      setImageUploadError(getUploadError(error));
    } finally {
      await uploadNoticeSettled;
      setIsUploadingInlineImage(false);
      imageUpload.onUploadingChange?.(false);
    }
  }

  function getCurrentMarkdown() {
    return normalizeEditorMarkdown(
      rewriteAttachmentImageUrlsToMarkdown(
        editorRef.current?.getMarkdown() ?? normalizedValue,
        attachmentUrlToIdRef.current,
      ),
    );
  }

  function syncImageUploadAttachments(nextAttachments: MediaAttachment[]) {
    if (!imageUpload) {
      return;
    }

    const nextPreviewAttachments = dedupeAttachments([
      ...(boundAttachments ?? []),
      ...nextAttachments,
    ]);

    attachmentUrlToIdRef.current = createAttachmentUrlToIdMap(
      nextPreviewAttachments,
    );
    imageUpload.onChange(nextAttachments);
  }

  function insertUploadedAttachmentsIntoValue(attachments: MediaAttachment[]) {
    if (attachments.length === 0) {
      return;
    }

    const markdown =
      attachments.length === 1
        ? createAttachmentMarkdown(attachments[0])
        : createAttachmentGalleryMarkdown(attachments);

    setBodyValue(appendMarkdownBlock(getCurrentMarkdown(), markdown));
  }

  function insertMarkdownIntoEditor(
    markdown: string,
    insertion: InlineImageInsertion,
  ) {
    const currentEditor = editorRef.current;

    if (!currentEditor) {
      setBodyValue(`${normalizedValue}${markdown}`);
      return;
    }

    if (insertion === "end") {
      currentEditor
        .chain()
        .setTextSelection(currentEditor.state.doc.content.size)
        .insertContent(markdown, { contentType: "markdown" })
        .run();
      return;
    }

    if (typeof insertion === "number") {
      const insertPosition = clampEditorInsertionPosition(currentEditor, insertion);

      currentEditor
        .chain()
        .setTextSelection(insertPosition)
        .insertContent(markdown, { contentType: "markdown" })
        .run();
      return;
    }

    currentEditor.chain().insertContent(markdown, { contentType: "markdown" }).run();
  }

  function renderImageTool() {
    if (!imageUpload) {
      return null;
    }

    const canAddImage =
      !isEditorDisabled &&
      !isUploadingInlineImage &&
      getReferencedUploadedAttachments(normalizedValue).length <
        imageUpload.maxCount &&
      getRemainingReferenceSlots(normalizedValue) > 0;

    return (
      <>
        <input
          ref={imageFileInputRef}
          type="file"
          accept={IMAGE_UPLOAD_ACCEPT}
          multiple={imageUpload.maxCount > 1}
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
      className={cn("min-w-0 space-y-2", className)}
      onDragOver={handleComposerDragOver}
      onDrop={handleComposerDrop}
    >
      <section
        className={cn(
          "min-w-0 overflow-hidden border border-border bg-background",
          isEditorDisabled && "opacity-70",
        )}
      >
        <RichMarkdownToolbar
          disabled={isEditorDisabled}
          editor={editor}
          renderImageTool={renderImageTool}
          state={toolbarState}
        />
        <div className="min-w-0 max-w-full overflow-x-auto border-t border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <EditorContent editor={editor} />
        </div>
      </section>

      {isUploadingInlineImage ||
      hasUnreferencedUploadedImages ||
      hasUnreferencedBoundImages ||
      hasUnsupportedMarkdownImages ? (
        <div className="space-y-2" aria-live="polite">
          {isUploadingInlineImage ? (
            <ComposerNotice
              icon={<Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            >
              正在上传图片，保存按钮会暂时禁用；完成后会放入正文当前位置。
            </ComposerNotice>
          ) : null}
          {hasUnreferencedUploadedImages ? (
            <ComposerNotice icon={<ImageOff className="size-4" aria-hidden="true" />}>
              {unreferencedUploadedImageNotice}
            </ComposerNotice>
          ) : null}
          {hasUnreferencedBoundImages ? (
            <ComposerNotice tone="warning" icon={<ImageOff className="size-4" aria-hidden="true" />}>
              {unreferencedBoundImageNotice}
            </ComposerNotice>
          ) : null}
          {hasUnsupportedMarkdownImages ? (
            <ComposerNotice tone="warning" icon={<ImageOff className="size-4" aria-hidden="true" />}>
              {unsupportedMarkdownImageNotice}
            </ComposerNotice>
          ) : null}
        </div>
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
      role="toolbar"
      className="min-w-0 max-w-full overflow-x-auto bg-background-soft [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="正文格式工具栏"
    >
      <div className="flex min-w-max items-center gap-1 p-1">
        <span className="shrink-0 px-2 font-mono text-[11px] text-muted-foreground">
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
    </div>
  );
}

function ComposerNotice({
  children,
  icon,
  tone = "primary",
}: {
  children: ReactNode;
  icon: ReactNode;
  tone?: "primary" | "warning";
}) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 border-l px-3 py-2 text-sm leading-6 text-muted-foreground",
        tone === "warning"
          ? "border-amber-400/60 bg-amber-400/5"
          : "border-primary bg-primary/5",
      )}
    >
      <span
        className={cn(
          "mt-1 shrink-0",
          tone === "warning" ? "text-amber-300" : "text-primary",
        )}
      >
        {icon}
      </span>
      <span>{children}</span>
    </p>
  );
}

function createMinimumInlineImageUploadNoticePromise() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, minimumInlineImageUploadNoticeMs);
  });
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
      variant="ghost"
      className={cn(
        "size-9 shrink-0 rounded-none border-b border-transparent hover:bg-transparent hover:text-primary",
        active && "border-primary text-primary",
      )}
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

function createAttachmentUrlToIdMap(attachments: MediaAttachment[]) {
  const urlToId = new Map<string, string>();

  for (const attachment of attachments) {
    for (const url of [
      attachment.url,
      attachment.thumbnail_url,
      attachment.medium_url,
      attachment.original_url,
    ]) {
      for (const key of getAttachmentUrlLookupKeys(url)) {
        urlToId.set(key, attachment.id);
      }
    }
  }

  return urlToId;
}

function getAttachmentUrlLookupKeys(value?: string | null) {
  if (!value) {
    return [];
  }

  const keys = new Set<string>();
  addAttachmentUrlLookupKey(keys, value);
  addAttachmentUrlLookupKey(keys, safelyDecodeUri(value));

  for (const key of [...keys]) {
    addParsedAttachmentUrlLookupKeys(keys, key);
  }

  return [...keys];
}

function addAttachmentUrlLookupKey(keys: Set<string>, value: string) {
  const normalized = normalizeMarkdownHref(value);

  if (normalized) {
    keys.add(normalized);
  }
}

function addParsedAttachmentUrlLookupKeys(keys: Set<string>, value: string) {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    return;
  }

  const pathWithQuery = `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;

  addAttachmentUrlLookupKey(keys, parsedUrl.href);
  addAttachmentUrlLookupKey(keys, pathWithQuery);
  addAttachmentUrlLookupKey(keys, safelyDecodeUri(parsedUrl.href));
  addAttachmentUrlLookupKey(keys, safelyDecodeUri(pathWithQuery));
}

function safelyDecodeUri(value: string) {
  try {
    return decodeURI(value);
  } catch {
    return value;
  }
}

function rewriteAttachmentImageUrlsToMarkdown(
  markdown: string,
  attachmentUrlToId: Map<string, string>,
) {
  if (attachmentUrlToId.size === 0) {
    return markdown;
  }

  return markdown.replace(
    /!\[((?:\\.|[^\]\\])*)\]\(\s*([^\s)]+)((?:\s+(?:"[^"]*"|'[^']*'|[^\s)]+))?\s*)\)/g,
    (match, alt: string, src: string, suffix: string) => {
      const attachmentId = getAttachmentIdByImageSource(
        src,
        attachmentUrlToId,
      );

      if (!attachmentId) {
        return match;
      }

      return `![${alt}](${ATTACHMENT_MARKDOWN_URL_PREFIX}${encodeAttachmentIdForMarkdown(
        attachmentId,
      )}${suffix})`;
    },
  );
}

function getAttachmentIdByImageSource(
  src: string,
  attachmentUrlToId: Map<string, string>,
) {
  for (const key of getAttachmentUrlLookupKeys(src)) {
    const attachmentId = attachmentUrlToId.get(key);

    if (attachmentId) {
      return attachmentId;
    }
  }

  return null;
}

type AttachmentMediaItem = {
  from: number;
  ids: string[];
  node: ProseMirrorNode;
  to: number;
};

function getNodeViewPosition(getPos: ReactNodeViewProps["getPos"]) {
  if (typeof getPos !== "function") {
    return null;
  }

  try {
    const position = getPos();

    return typeof position === "number" ? position : null;
  } catch {
    return null;
  }
}

function canMergeAdjacentAttachmentMedia(editor: Editor, position: number) {
  const run = getAttachmentMediaRunAtPosition(editor, position);

  return Boolean(run && run.items.length > 1 && run.ids.length > 1);
}

function mergeAdjacentAttachmentMedia(editor: Editor, position: number) {
  const run = getAttachmentMediaRunAtPosition(editor, position);
  const galleryType = editor.state.schema.nodes.attachmentGallery;

  if (!run || !galleryType || run.items.length < 2 || run.ids.length < 2) {
    return;
  }

  editor.view.dispatch(
    editor.state.tr
      .replaceWith(
        run.from,
        run.to,
        galleryType.create({
          attachmentIds: run.ids,
          attachmentSnapshots: [],
          caption: "图片轮播",
        }),
      )
      .scrollIntoView(),
  );
}

function splitAttachmentGalleryMedia(
  editor: Editor,
  position: number,
  getAttachmentById: (id: string) => MediaAttachment | null,
) {
  const item = getAttachmentMediaItemAtPosition(editor, position);
  const imageType = editor.state.schema.nodes.image;

  if (!item || item.node.type.name !== "attachmentGallery" || !imageType) {
    return;
  }

  const attachmentIds = dedupeStrings(
    normalizeAttachmentIds(item.node.attrs.attachmentIds),
  );

  if (attachmentIds.length < 2) {
    return;
  }

  const imageNodes = attachmentIds.map((attachmentId) => {
    const attachment = getAttachmentById(attachmentId);

    return imageType.create({
      alt: attachment?.alt_text.trim() || "图片附件",
      attachmentId,
      displaySrc: null,
      src: `${ATTACHMENT_MARKDOWN_URL_PREFIX}${encodeAttachmentIdForMarkdown(
        attachmentId,
      )}`,
    });
  });

  editor.view.dispatch(
    editor.state.tr
      .replaceWith(item.from, item.to, Fragment.fromArray(imageNodes))
      .scrollIntoView(),
  );
}

function getAttachmentMediaRunAtPosition(editor: Editor, position: number) {
  const items = getTopLevelAttachmentMediaItems(editor);
  const currentIndex = items.findIndex(
    (item) => position >= item.from && position < item.to,
  );

  if (currentIndex < 0) {
    return null;
  }

  let firstIndex = currentIndex;
  let lastIndex = currentIndex;

  while (
    firstIndex > 0 &&
    items[firstIndex - 1]?.to === items[firstIndex]?.from
  ) {
    firstIndex -= 1;
  }

  while (
    lastIndex < items.length - 1 &&
    items[lastIndex]?.to === items[lastIndex + 1]?.from
  ) {
    lastIndex += 1;
  }

  const runItems = items.slice(firstIndex, lastIndex + 1);

  return {
    from: runItems[0].from,
    ids: dedupeStrings(runItems.flatMap((item) => item.ids)),
    items: runItems,
    to: runItems[runItems.length - 1].to,
  };
}

function getAttachmentMediaItemAtPosition(editor: Editor, position: number) {
  return (
    getTopLevelAttachmentMediaItems(editor).find(
      (item) => position >= item.from && position < item.to,
    ) ?? null
  );
}

function getTopLevelAttachmentMediaItems(editor: Editor) {
  const items: AttachmentMediaItem[] = [];

  editor.state.doc.forEach((node, offset) => {
    const ids = getAttachmentIdsFromEditorNode(node);

    if (ids.length === 0) {
      return;
    }

    items.push({
      from: offset,
      ids,
      node,
      to: offset + node.nodeSize,
    });
  });

  return items;
}

function getAttachmentIdsFromEditorNode(node: ProseMirrorNode) {
  if (node.type.name === "attachmentGallery") {
    return dedupeStrings(normalizeAttachmentIds(node.attrs.attachmentIds));
  }

  if (node.type.name !== "image") {
    return [];
  }

  const src = typeof node.attrs.src === "string" ? node.attrs.src : "";
  const attachmentId =
    typeof node.attrs.attachmentId === "string" && node.attrs.attachmentId
      ? node.attrs.attachmentId
      : getAttachmentIdFromMarkdownUrl(src);

  return attachmentId ? [attachmentId] : [];
}

function dedupeStrings(values: string[]) {
  return [...new Set(values)];
}

function createMediaFallbackLink(originalUrl: string) {
  const link = document.createElement("a");

  link.href = originalUrl;
  link.rel = "nofollow ugc noopener noreferrer";
  link.target = "_blank";
  link.className =
    "block border-l border-border px-3 py-2 text-sm text-primary underline decoration-primary/40 underline-offset-4";
  link.textContent = originalUrl;

  return link;
}

function normalizeAttachmentIds(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeAttachmentSnapshots(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isMediaAttachmentSnapshot);
}

function isMediaAttachmentSnapshot(value: unknown): value is MediaAttachment {
  if (!value || typeof value !== "object") {
    return false;
  }

  const attachment = value as Partial<MediaAttachment>;

  return Boolean(
    typeof attachment.id === "string" &&
      typeof attachment.kind === "string" &&
      typeof attachment.url === "string" &&
      typeof attachment.status === "string",
  );
}

function isVisibleImageAttachmentForEditor(
  attachment?: MediaAttachment | null,
): attachment is MediaAttachment {
  return Boolean(
    attachment &&
      attachment.kind === "image" &&
      attachment.status !== "blocked" &&
      attachment.status !== "failed" &&
      attachment.url,
  );
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

function clampEditorInsertionPosition(editor: Editor, position: number) {
  const docEnd = editor.state.doc.content.size;

  return Math.min(Math.max(position, 0), docEnd);
}

function appendMarkdownBlock(markdown: string, block: string) {
  const trimmedMarkdown = markdown.trimEnd();
  const trimmedBlock = block.trim();

  return trimmedMarkdown
    ? `${trimmedMarkdown}\n\n${trimmedBlock}`
    : trimmedBlock;
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

  return Boolean(
    normalized &&
      !normalized.startsWith(ATTACHMENT_MARKDOWN_URL_PREFIX) &&
      !normalized.startsWith(ATTACHMENT_GALLERY_MARKDOWN_URL_PREFIX),
  );
}

function encodeAttachmentIdForMarkdown(value: string) {
  return encodeURIComponent(value).replace(/[()]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function escapeMarkdownAltText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\r?\n/g, " ");
}
