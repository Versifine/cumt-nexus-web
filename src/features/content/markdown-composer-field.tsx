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
  Extension,
  InputRule,
  mergeAttributes,
  Mark,
  Node as TiptapNode,
  type Editor,
  type MarkdownTokenizer,
  type NodeViewRendererProps,
} from "@tiptap/core";
import Image, { type ImageOptions } from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Fragment,
  type Node as ProseMirrorNode,
  type NodeType,
} from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import type { ViewMutationRecord } from "@tiptap/pm/view";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import { Markdown } from "@tiptap/markdown";
import katex from "katex";
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
  Columns3,
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
  Sigma,
  Rows3,
  Strikethrough,
  Table as TableIcon,
  TableColumnsSplit,
  TableRowsSplit,
  Trash2,
  Ungroup,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { resolveContentEmbed } from "@/features/content/api";
import {
  createWhitelistedMediaEmbedFromResolvedContentEmbed,
  isBackendResolvableMediaEmbedUrl,
  resolveWhitelistedMediaEmbed,
  type WhitelistedMediaEmbed,
} from "@/features/content/media-embed";
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
type MathMarkdownReplacement = {
  from: number;
  node: ProseMirrorNode;
  to: number;
};
type TopLevelEditorNode = {
  from: number;
  node: ProseMirrorNode;
  to: number;
};

type EditorMediaEmbedReplacement = {
  afterText: string;
  beforeText: string;
  from: number;
  originalUrl: string;
  to: number;
};

const editorBareUrlPattern = /\bhttps?:\/\/[^\s<>"'`]+/gi;

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
          "rounded-sm bg-zinc-950 px-1 text-transparent outline outline-1 outline-zinc-700 transition-colors hover:text-zinc-50",
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

const InlineMathNode = TiptapNode.create({
  name: "inlineMath",

  atom: true,
  group: "inline",
  inline: true,
  selectable: true,

  addAttributes() {
    return {
      value: {
        default: "",
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

          return {
            value: element.dataset.value || element.textContent || "",
          };
        },
        tag: "span[data-inline-math]",
      },
    ];
  },

  renderHTML({ node }) {
    const value = getMathNodeValue(node);

    return [
      "span",
      {
        "data-inline-math": "true",
        "data-value": value,
      },
      value,
    ];
  },

  markdownTokenName: "inlineMath",

  markdownTokenizer: createInlineMathTokenizer(),

  parseMarkdown(token, helpers) {
    return helpers.createNode("inlineMath", {
      value: typeof token.text === "string" ? token.text : "",
    });
  },

  renderMarkdown(node) {
    const value = getMathJsonValue(node);

    return value ? `$${value}$` : "";
  },

  addInputRules() {
    return [
      new InputRule({
        find: /(?:^|\s)(\$([^$\n]+?)\$)$/,
        handler: ({ match, range, state }) => {
          const raw = match[1];
          const value = match[2]?.trim();

          if (!raw || !value || value.startsWith(" ") || value.endsWith(" ")) {
            return null;
          }

          const from = range.to - raw.length;
          const to = range.to;

          state.tr
            .replaceWith(from, to, this.type.create({ value }))
            .scrollIntoView();
          return null;
        },
      }),
    ];
  },

  addNodeView() {
    return createMathEditorNodeView(false);
  },
});

const BlockMathNode = TiptapNode.create({
  name: "math",

  atom: true,
  group: "block",
  selectable: true,

  addAttributes() {
    return {
      value: {
        default: "",
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

          return {
            value: element.dataset.value || element.textContent || "",
          };
        },
        tag: "div[data-block-math]",
      },
    ];
  },

  renderHTML({ node }) {
    const value = getMathNodeValue(node);

    return [
      "div",
      {
        "data-block-math": "true",
        "data-value": value,
      },
      value,
    ];
  },

  markdownTokenName: "math",

  markdownTokenizer: createBlockMathTokenizer(),

  parseMarkdown(token, helpers) {
    return helpers.createNode("math", {
      value: typeof token.text === "string" ? token.text : "",
    });
  },

  renderMarkdown(node) {
    const value = getMathJsonValue(node);

    return value ? `$$\n${value}\n$$` : "";
  },

  addNodeView() {
    return createMathEditorNodeView(true);
  },
});

const MathMarkdownSyncExtension = Extension.create({
  name: "mathMarkdownSync",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction(transactions, _oldState, newState) {
          if (
            !transactions.some((transaction) => transaction.docChanged) ||
            transactions.some((transaction) =>
              transaction.getMeta("mathMarkdownSync"),
            )
          ) {
            return null;
          }

          const replacements = collectMarkdownMathReplacements(newState.doc, {
            inlineMath: newState.schema.nodes.inlineMath,
            math: newState.schema.nodes.math,
          });

          if (replacements.length === 0) {
            return null;
          }

          const transaction = newState.tr;

          for (const replacement of [...replacements].sort(
            (first, second) => second.from - first.from,
          )) {
            transaction.replaceWith(
              replacement.from,
              replacement.to,
              replacement.node,
            );
          }

          transaction.setMeta("mathMarkdownSync", true);
          return transaction.docChanged ? transaction : null;
        },
      }),
    ];
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
          "my-4 block h-auto max-h-[520px] max-w-full rounded-md bg-background object-contain",
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
            "my-4 block rounded-md bg-surface-raised px-3 py-2 text-sm text-muted-foreground",
        },
        "图片附件不存在或尚未随内容返回。",
      ];
    }

    return [
      "span",
      {
        class:
          "my-4 block rounded-md bg-surface-raised px-3 py-2 text-sm text-muted-foreground",
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
      let isDestroyed = false;

      dom.className = "my-4 block rounded-lg outline-offset-2";
      dom.setAttribute("data-media-editor-node", "true");

      if (embed) {
        dom.append(createMediaEmbedPlayerElement(embed));
      } else if (isBackendResolvableEditorMediaEmbedUrl(originalUrl)) {
        dom.append(createMediaResolvingBlock(originalUrl));
        void resolveEditorMediaEmbed(originalUrl).then((resolvedEmbed) => {
          if (isDestroyed) {
            return;
          }

          dom.replaceChildren(
            resolvedEmbed
              ? createMediaEmbedPlayerElement(resolvedEmbed)
              : createMediaFallbackLink(originalUrl),
          );
        });
      } else {
        dom.append(createMediaFallbackLink(originalUrl));
      }

      return {
        deselectNode() {
          dom.style.boxShadow = "";
        },
        destroy() {
          isDestroyed = true;
        },
        dom,
        selectNode() {
          dom.style.boxShadow = "inset 3px 0 0 var(--primary)";
        },
      };
    };
  },
});

const editorMediaEmbedResolveCache = new Map<
  string,
  Promise<WhitelistedMediaEmbed | null>
>();

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
        "group/media-node my-4 block rounded-lg outline-offset-2",
        selected && "ring-2 ring-primary/35",
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
        <span className="block rounded-md bg-surface-raised px-3 py-2 text-sm text-muted-foreground">
          外部图片不会直接渲染；请上传图片后放入正文。
        </span>
      ) : (
        <span className="block rounded-md bg-surface-raised px-3 py-2 text-sm text-muted-foreground">
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
        "group/media-node my-4 block rounded-lg outline-offset-2",
        selected && "ring-2 ring-primary/35",
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
        <span className="block rounded-md bg-surface-raised px-3 py-2 text-sm text-muted-foreground">
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
  table: false,
};

type TableAction = "add-row" | "add-column" | "delete-row" | "delete-column" | "delete-table";
type TableActionMenuPlacement = "context" | "hover";
type TableNodeRange = {
  from: number;
  to: number;
};
type TableActionMenuState = {
  anchorPosition: number | null;
  left: number;
  placement: TableActionMenuPlacement;
  tableRange: TableNodeRange | null;
  top: number;
};
type TableGridSize = {
  cols: number;
  rows: number;
};

const minimumInlineImageUploadNoticeMs = 650;
const tableActionMenuWidth = 152;
const tableActionMenuHeight = 120;

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
  const tableActionMenuRef = useRef<HTMLDivElement | null>(null);
  const editorViewportRef = useRef<HTMLDivElement | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [isUploadingInlineImage, setIsUploadingInlineImage] = useState(false);
  const [tableActionMenu, setTableActionMenu] =
    useState<TableActionMenuState | null>(null);
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

  const openTableActionMenuFromPointer = useCallback(
    (
      view: Editor["view"],
      event: MouseEvent,
      placement: TableActionMenuPlacement,
    ) => {
      if (isEditorDisabled) {
        return false;
      }

      const table = getEventTableElement(event.target);
      const viewport = editorViewportRef.current;

      if (!table || !viewport || !viewport.contains(table)) {
        if (placement === "hover") {
          setTableActionMenu((current) =>
            current?.placement === "context" ? current : null,
          );
        }

        return false;
      }

      const tableRect = table.getBoundingClientRect();
      const viewportRect = viewport.getBoundingClientRect();
      const coords = view.posAtCoords({
        left: event.clientX,
        top: event.clientY,
      });
      const anchorPosition = coords?.pos ?? null;
      const tableRange = getTableRangeFromPointer(
        view,
        table,
        anchorPosition,
      );
      const minLeft = viewport.scrollLeft + 8;
      const maxLeft =
        viewport.scrollLeft +
        viewport.clientWidth -
        tableActionMenuWidth -
        8;
      const minTop = viewport.scrollTop + 8;
      const maxTop =
        viewport.scrollTop +
        viewport.clientHeight -
        tableActionMenuHeight -
        8;
      const targetLeft =
        placement === "context"
          ? event.clientX - viewportRect.left + viewport.scrollLeft
          : tableRect.left - viewportRect.left + viewport.scrollLeft + 8;
      const targetTop =
        placement === "context"
          ? event.clientY - viewportRect.top + viewport.scrollTop
          : tableRect.top - viewportRect.top + viewport.scrollTop + 8;

      setTableActionMenu({
        anchorPosition,
        left: clampNumber(targetLeft, minLeft, Math.max(minLeft, maxLeft)),
        placement,
        tableRange,
        top: clampNumber(targetTop, minTop, Math.max(minTop, maxTop)),
      });

      return true;
    },
    [isEditorDisabled],
  );

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
      InlineMathNode,
      BlockMathNode,
      MathMarkdownSyncExtension,
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
            "[&_blockquote]:my-4 [&_blockquote]:rounded-md [&_blockquote]:bg-background-soft [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:text-muted-foreground [&_blockquote]:ring-1 [&_blockquote]:ring-border/60",
            "[&_code]:rounded-sm [&_code]:bg-background-soft [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.92em]",
            "[&_h1]:mb-2 [&_h1]:mt-5 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:leading-7",
            "[&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:leading-7",
            "[&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:leading-6",
            "[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-6",
            "[&_p]:my-3 [&_p]:whitespace-pre-wrap [&_p]:leading-7 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
            "[&_pre]:my-4 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-background-soft [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-sm [&_pre]:leading-6",
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
        handleDOMEvents: {
          contextmenu: (view, event) => {
            if (
              openTableActionMenuFromPointer(view, event, "context")
            ) {
              event.preventDefault();
              return true;
            }

            return false;
          },
          mousemove: (view, event) => {
            openTableActionMenuFromPointer(view, event, "hover");
            return false;
          },
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
    if (tableActionMenu?.placement !== "context") {
      return;
    }

    function closeContextMenu(event: KeyboardEvent | PointerEvent) {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") {
          setTableActionMenu(null);
        }

        return;
      }

      const target = event.target;

      if (
        target instanceof Node &&
        tableActionMenuRef.current?.contains(target)
      ) {
        return;
      }

      setTableActionMenu(null);
    }

    window.addEventListener("keydown", closeContextMenu);
    window.addEventListener("pointerdown", closeContextMenu);

    return () => {
      window.removeEventListener("keydown", closeContextMenu);
      window.removeEventListener("pointerdown", closeContextMenu);
    };
  }, [tableActionMenu?.placement]);

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
        table: currentEditor?.isActive("table") ?? false,
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

  function runTableAction(action: TableAction) {
    const currentEditor = editorRef.current;

    if (!currentEditor || isEditorDisabled) {
      return;
    }

    if (action === "delete-table" && tableActionMenu?.tableRange) {
      currentEditor.view.dispatch(
        currentEditor.state.tr
          .delete(tableActionMenu.tableRange.from, tableActionMenu.tableRange.to)
          .scrollIntoView(),
      );
      setTableActionMenu(null);
      return;
    }

    let command = currentEditor.chain().focus();

    if (typeof tableActionMenu?.anchorPosition === "number") {
      command = command.setTextSelection(
        clampEditorInsertionPosition(
          currentEditor,
          tableActionMenu.anchorPosition,
        ),
      );
    }

    const didRun =
      action === "add-row"
        ? command.addRowAfter().run()
        : action === "add-column"
          ? command.addColumnAfter().run()
          : action === "delete-row"
            ? command.deleteRow().run()
            : action === "delete-column"
              ? command.deleteColumn().run()
              : command.deleteTable().run();

    if (didRun) {
      setTableActionMenu(null);
    }
  }

  return (
    <div
      className={cn("min-w-0 space-y-2", className)}
      onDragOver={handleComposerDragOver}
      onDrop={handleComposerDrop}
    >
      <section
        className={cn(
          "min-w-0 overflow-hidden rounded-lg bg-surface-raised p-1",
          isEditorDisabled && "opacity-70",
        )}
      >
        <RichMarkdownToolbar
          disabled={isEditorDisabled}
          editor={editor}
          renderImageTool={renderImageTool}
          state={toolbarState}
        />
        <div
          ref={editorViewportRef}
          className="relative min-w-0 max-w-full overflow-x-auto rounded-md bg-surface [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onMouseLeave={() =>
            setTableActionMenu((current) =>
              current?.placement === "context" ? current : null,
            )
          }
        >
          <EditorContent editor={editor} />
          {tableActionMenu ? (
            <TableActionMenu
              menuRef={tableActionMenuRef}
              menu={tableActionMenu}
              onAction={runTableAction}
            />
          ) : null}
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

  const [isTablePickerOpen, setIsTablePickerOpen] = useState(false);
  const [tableGridSize, setTableGridSize] = useState<TableGridSize>({
    cols: 3,
    rows: 3,
  });
  const tableTool = {
    active: false,
    icon: <TableIcon aria-hidden="true" />,
    label: "表格",
  };

  const formulaTool = {
    active: false,
    icon: <Sigma aria-hidden="true" />,
    label: "公式",
  };

  function insertFormula(formulaKind: "block" | "inline") {
    run((currentEditor) => {
      const selectedText = currentEditor.state.doc.textBetween(
        currentEditor.state.selection.from,
        currentEditor.state.selection.to,
        "\n",
      );
      const formula = selectedText.trim();

      const content =
        formulaKind === "block"
          ? {
              attrs: { value: formula },
              type: "math",
            }
          : {
              attrs: { value: formula },
              type: "inlineMath",
            };

      currentEditor
        .chain()
        .focus()
        .insertContent(content)
        .run();
    });
  }

  function insertTableBySize({ cols, rows }: TableGridSize) {
    run((currentEditor) => {
      if (cols === 3 && rows === 3) {
        currentEditor
          .chain()
          .focus()
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run();
        return;
      }

      currentEditor
        .chain()
        .focus()
        .insertTable({ rows, cols, withHeaderRow: true })
        .run();
    });
    setIsTablePickerOpen(false);
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
  ];

  return (
    <div
      role="toolbar"
      className="min-w-0 max-w-full"
      aria-label="正文格式工具栏"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-1 px-1 pb-1">
        <span className="shrink-0 px-2 font-mono text-[11px] text-subtle-foreground">
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={formulaTool.label}
              aria-pressed={formulaTool.active}
              disabled={disabled}
              size="icon"
              title={formulaTool.label}
              type="button"
              variant="ghost"
              className={cn(
                "size-9 shrink-0 rounded-md text-muted-foreground hover:bg-surface-hover hover:text-primary",
                formulaTool.active && "bg-primary-muted text-primary",
              )}
            >
              {formulaTool.icon}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuLabel>插入公式</DropdownMenuLabel>
            <DropdownMenuItem
              disabled={disabled}
              onSelect={() => insertFormula("inline")}
            >
              <Sigma className="size-4" aria-hidden="true" />
              行内公式
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={disabled}
              onSelect={() => insertFormula("block")}
            >
              <Sigma className="size-4" aria-hidden="true" />
              独立公式
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu
          open={isTablePickerOpen}
          onOpenChange={(open) => {
            setIsTablePickerOpen(open);
            if (open) {
              setTableGridSize({ cols: 3, rows: 3 });
            }
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={tableTool.label}
              aria-pressed={tableTool.active}
              disabled={disabled}
              size="icon"
              title={tableTool.label}
              type="button"
              variant="ghost"
              className={cn(
                "size-9 shrink-0 rounded-md text-muted-foreground hover:bg-surface-hover hover:text-primary",
                tableTool.active && "bg-primary-muted text-primary",
              )}
            >
              {tableTool.icon}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-auto p-3">
            <TableGridPicker
              disabled={disabled}
              selectedSize={tableGridSize}
              onHoverSize={setTableGridSize}
              onSelectSize={insertTableBySize}
            />
          </DropdownMenuContent>
        </DropdownMenu>
        {renderImageTool()}
      </div>
    </div>
  );
}

function TableGridPicker({
  disabled,
  onHoverSize,
  onSelectSize,
  selectedSize,
}: {
  disabled: boolean;
  onHoverSize: (size: TableGridSize) => void;
  onSelectSize: (size: TableGridSize) => void;
  selectedSize: TableGridSize;
}) {
  const cells = Array.from({ length: 64 }, (_, index) => {
    const row = Math.floor(index / 8) + 1;
    const col = (index % 8) + 1;
    const size = { cols: col, rows: row };
    const isSelected = row <= selectedSize.rows && col <= selectedSize.cols;

    return (
      <button
        key={`${row}-${col}`}
        type="button"
        aria-label={`插入 ${row} 行 ${col} 列表格`}
        disabled={disabled}
        className={cn(
          "size-5 rounded-[3px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          isSelected
            ? "border-primary bg-primary/20"
            : "border-border bg-surface-raised hover:border-primary/50 hover:bg-primary/10",
        )}
        onFocus={() => onHoverSize(size)}
        onMouseEnter={() => onHoverSize(size)}
        onClick={() => onSelectSize(size)}
      />
    );
  });

  return (
    <div
      className="space-y-2"
      onMouseDown={(event) => event.preventDefault()}
    >
      <div className="flex items-center justify-between gap-6 px-0.5 text-xs">
        <span className="font-medium text-foreground">插入表格</span>
        <span className="font-mono text-muted-foreground">
          {selectedSize.rows} 行 / {selectedSize.cols} 列
        </span>
      </div>
      <div className="grid grid-cols-8 gap-1">{cells}</div>
    </div>
  );
}

function TableActionMenu({
  menu,
  menuRef,
  onAction,
}: {
  menu: TableActionMenuState;
  menuRef: { current: HTMLDivElement | null };
  onAction: (action: TableAction) => void;
}) {
  const actions: Array<{
    icon: ReactNode;
    label: string;
    tone?: "danger";
    value: TableAction;
  }> = [
    {
      icon: <TableRowsSplit aria-hidden="true" />,
      label: "加行",
      value: "add-row",
    },
    {
      icon: <TableColumnsSplit aria-hidden="true" />,
      label: "加列",
      value: "add-column",
    },
    {
      icon: <Rows3 aria-hidden="true" />,
      label: "删行",
      value: "delete-row",
    },
    {
      icon: <Columns3 aria-hidden="true" />,
      label: "删列",
      value: "delete-column",
    },
    {
      icon: <Trash2 aria-hidden="true" />,
      label: "删表",
      tone: "danger",
      value: "delete-table",
    },
  ];

  return (
    <div
      ref={menuRef}
      className="absolute z-20 w-[152px] rounded-md border border-border bg-card p-1.5 text-card-foreground shadow-[0_12px_32px_rgb(0_0_0/0.22)]"
      style={{
        left: menu.left,
        top: menu.top,
      }}
      onContextMenu={(event) => event.preventDefault()}
      onMouseDown={(event) => event.preventDefault()}
    >
      <span className="block px-1 pb-1 font-mono text-[11px] text-subtle-foreground">
        表格
      </span>
      <div className="grid grid-cols-2 gap-1">
        {actions.map((action) => (
          <button
            key={action.value}
            type="button"
            className={cn(
              "inline-flex h-8 items-center justify-center gap-1 rounded px-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              action.tone === "danger" &&
                "col-span-2 text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive/40",
            )}
            onClick={() => onAction(action.value)}
          >
            <span className="[&_svg]:size-3.5">{action.icon}</span>
            <span>{action.label}</span>
          </button>
        ))}
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
        "flex items-start gap-2 rounded-md border px-3 py-2 text-sm leading-6 text-muted-foreground",
        tone === "warning"
          ? "border-amber-400/60 bg-amber-400/5"
          : "border-primary/25 bg-primary/5",
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
        "size-9 shrink-0 rounded-md text-muted-foreground hover:bg-surface-hover hover:text-primary",
        active && "bg-primary-muted text-primary",
      )}
    >
      {icon}
    </Button>
  );
}

function createMathEditorNodeView(displayMode: boolean) {
  return ({ editor, getPos, node }: NodeViewRendererProps) => {
    let currentNode = node;
    let currentValue = getMathNodeValue(node);
    let isEditing = currentValue.trim().length === 0;
    let focusFrame: number | null = null;
    const dom = document.createElement(displayMode ? "div" : "span");
    const previewButton = document.createElement("button");
    const previewContent = document.createElement(displayMode ? "div" : "span");
    const control = document.createElement(
      displayMode ? "textarea" : "input",
    ) as HTMLInputElement | HTMLTextAreaElement;

    dom.contentEditable = "false";
    dom.dataset.mathNode = displayMode ? "block" : "inline";
    dom.className = displayMode
      ? "my-4 block max-w-full overflow-x-auto rounded-md border border-border bg-background-soft px-3 py-3 text-foreground"
      : "mx-0.5 inline-flex max-w-full items-center rounded-sm border border-transparent bg-primary-muted/60 px-1 align-baseline text-foreground focus-within:border-primary/50 focus-within:bg-surface-raised";

    previewButton.type = "button";
    previewButton.className = displayMode
      ? "block w-full min-w-0 rounded text-left transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      : "inline-flex min-h-6 max-w-full items-center rounded-sm px-0.5 align-baseline transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
    previewButton.setAttribute(
      "aria-label",
      displayMode ? "编辑独立公式" : "编辑行内公式",
    );
    previewContent.className = displayMode
      ? "block max-w-full overflow-x-auto py-1"
      : "inline-block max-w-full overflow-x-auto align-baseline";

    if (control instanceof HTMLInputElement) {
      control.type = "text";
    } else {
      control.rows = 2;
      control.spellcheck = false;
    }

    control.autocomplete = "off";
    control.autocapitalize = "off";
    control.spellcheck = false;
    control.placeholder = displayMode
      ? "输入独立公式，例如 E = mc^2"
      : "输入公式";
    control.setAttribute(
      "aria-label",
      displayMode ? "独立公式内容" : "行内公式内容",
    );
    control.className = displayMode
      ? "mt-2 min-h-20 w-full resize-y rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm leading-6 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
      : "h-7 min-w-24 rounded-sm border border-primary/30 bg-surface px-2 font-mono text-sm leading-6 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

    const render = () => {
      dom.dataset.value = currentValue;

      if (control.value !== currentValue) {
        control.value = currentValue;
      }

      renderKatexIntoElement(previewContent, currentValue, displayMode);
      syncMathEditorControlSize(control);
      syncMathEditorEditingState({
        control,
        displayMode,
        dom,
        isEditing,
        previewButton,
        value: currentValue,
      });
    };

    const focusControl = (selectText = false) => {
      if (!editor.isEditable) {
        return;
      }

      if (focusFrame !== null) {
        window.cancelAnimationFrame(focusFrame);
      }

      focusFrame = window.requestAnimationFrame(() => {
        focusFrame = null;

        if (editor.isDestroyed) {
          return;
        }

        control.focus();

        if (selectText && typeof control.select === "function") {
          control.select();
          return;
        }

        const cursorPosition = control.value.length;
        control.setSelectionRange(cursorPosition, cursorPosition);
      });
    };

    const setEditing = (nextIsEditing: boolean, selectText = false) => {
      isEditing = nextIsEditing;
      syncMathEditorEditingState({
        control,
        displayMode,
        dom,
        isEditing,
        previewButton,
        value: currentValue,
      });

      if (isEditing) {
        focusControl(selectText);
      }
    };

    const deleteMathNode = () => {
      if (!editor.isEditable) {
        return false;
      }

      const position = getNodeViewPosition(getPos);

      if (position === null) {
        return false;
      }

      editor
        .chain()
        .focus()
        .deleteRange({
          from: position,
          to: position + currentNode.nodeSize,
        })
        .setTextSelection(clampEditorInsertionPosition(editor, position))
        .run();

      return true;
    };

    const updateMathValue = (nextValue: string) => {
      if (!editor.isEditable || nextValue === currentValue) {
        return;
      }

      currentValue = nextValue;
      renderKatexIntoElement(previewContent, currentValue, displayMode);
      syncMathEditorControlSize(control);

      const position = getNodeViewPosition(getPos);

      if (position === null) {
        return;
      }

      editor.view.dispatch(
        editor.state.tr
          .setNodeMarkup(position, undefined, {
            ...currentNode.attrs,
            value: nextValue,
          })
          .scrollIntoView(),
      );
    };

    const handlePreviewClick = (event: Event) => {
      if (!editor.isEditable) {
        return;
      }

      event.preventDefault();
      setEditing(true);
    };

    const handleControlInput = () => {
      if (!control.value && currentValue) {
        deleteMathNode();
        return;
      }

      updateMathValue(control.value);
    };

    const handleControlFocus = () => {
      isEditing = true;
      syncMathEditorEditingState({
        control,
        displayMode,
        dom,
        isEditing,
        previewButton,
        value: currentValue,
      });
    };

    const handleControlBlur = () => {
      const trimmedValue = control.value.trim();

      if (!trimmedValue) {
        deleteMathNode();
        return;
      }

      if (trimmedValue !== control.value) {
        control.value = trimmedValue;
        updateMathValue(trimmedValue);
      }

      setEditing(false);
    };

    const handleControlKeyDown = (event: Event) => {
      if (!(event instanceof KeyboardEvent)) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();

        if (!control.value.trim()) {
          deleteMathNode();
          return;
        }

        control.blur();
        editor.commands.focus();
        return;
      }

      if (
        (event.key === "Backspace" || event.key === "Delete") &&
        !control.value
      ) {
        event.preventDefault();
        deleteMathNode();
        return;
      }

      if (!displayMode && event.key === "Enter") {
        event.preventDefault();
        control.blur();
        editor.commands.focus();
        return;
      }

      if (
        displayMode &&
        event.key === "Enter" &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        control.blur();
        editor.commands.focus();
      }
    };

    previewButton.append(previewContent);
    dom.append(previewButton, control);
    previewButton.addEventListener("click", handlePreviewClick);
    control.addEventListener("input", handleControlInput);
    control.addEventListener("blur", handleControlBlur);
    control.addEventListener("focus", handleControlFocus);
    control.addEventListener("keydown", handleControlKeyDown);
    render();

    if (isEditing) {
      focusControl();
    }

    return {
      deselectNode() {
        dom.style.boxShadow = "";
      },
      destroy() {
        if (focusFrame !== null) {
          window.cancelAnimationFrame(focusFrame);
        }

        previewButton.removeEventListener("click", handlePreviewClick);
        control.removeEventListener("input", handleControlInput);
        control.removeEventListener("blur", handleControlBlur);
        control.removeEventListener("focus", handleControlFocus);
        control.removeEventListener("keydown", handleControlKeyDown);
      },
      dom,
      ignoreMutation(mutation: ViewMutationRecord) {
        return (
          previewContent.contains(mutation.target) ||
          control.contains(mutation.target)
        );
      },
      selectNode() {
        dom.style.boxShadow = "inset 0 0 0 2px var(--primary)";

        if (editor.isEditable) {
          setEditing(true);
        }
      },
      stopEvent(event: Event) {
        const target = event.target;

        return (
          target instanceof Node &&
          (previewButton.contains(target) || control.contains(target))
        );
      },
      update(updatedNode: ProseMirrorNode) {
        if (updatedNode.type !== currentNode.type) {
          return false;
        }

        currentNode = updatedNode;
        currentValue = getMathNodeValue(updatedNode);
        render();
        return true;
      },
    };
  };
}

function syncMathEditorEditingState({
  control,
  displayMode,
  dom,
  isEditing,
  previewButton,
  value,
}: {
  control: HTMLInputElement | HTMLTextAreaElement;
  displayMode: boolean;
  dom: HTMLElement;
  isEditing: boolean;
  previewButton: HTMLButtonElement;
  value: string;
}) {
  dom.dataset.editing = isEditing ? "true" : "false";
  previewButton.hidden = !displayMode && isEditing;
  control.hidden = !isEditing;

  if (displayMode) {
    previewButton.setAttribute(
      "aria-label",
      isEditing ? "公式预览" : "编辑独立公式",
    );
  }

  if (!value.trim()) {
    dom.dataset.empty = "true";
  } else {
    delete dom.dataset.empty;
  }
}

function syncMathEditorControlSize(
  control: HTMLInputElement | HTMLTextAreaElement,
) {
  if (control instanceof HTMLInputElement) {
    control.style.width = `${Math.max(control.value.length + 2, 8)}ch`;
    return;
  }

  control.style.height = "auto";
  control.style.height = `${Math.max(control.scrollHeight, 80)}px`;
}

function renderKatexIntoElement(
  element: HTMLElement,
  value: string,
  displayMode: boolean,
) {
  element.replaceChildren();

  if (!value.trim()) {
    element.textContent = "公式";
    return;
  }

  try {
    katex.render(value, element, {
      displayMode,
      strict: false,
      throwOnError: false,
    });
  } catch {
    element.textContent = value;
  }
}

function collectMarkdownMathReplacements(
  doc: ProseMirrorNode,
  nodeTypes: {
    inlineMath?: NodeType;
    math?: NodeType;
  },
) {
  const blockReplacements = collectBlockMathMarkdownReplacements(
    doc,
    nodeTypes.math,
  );
  const inlineReplacements = collectInlineMathMarkdownReplacements(
    doc,
    nodeTypes.inlineMath,
    blockReplacements,
  );

  return [...blockReplacements, ...inlineReplacements];
}

function collectBlockMathMarkdownReplacements(
  doc: ProseMirrorNode,
  mathType?: NodeType,
): MathMarkdownReplacement[] {
  if (!mathType) {
    return [];
  }

  const topLevelNodes: TopLevelEditorNode[] = [];
  const replacements: MathMarkdownReplacement[] = [];

  doc.forEach((node, offset) => {
    topLevelNodes.push({
      from: offset,
      node,
      to: offset + node.nodeSize,
    });
  });

  for (let index = 0; index < topLevelNodes.length; index += 1) {
    const current = topLevelNodes[index];
    const singleParagraphValue = getSingleParagraphBlockMathValue(
      current.node,
    );

    if (singleParagraphValue !== null) {
      replacements.push({
        from: current.from,
        node: mathType.create({ value: singleParagraphValue }),
        to: current.to,
      });
      continue;
    }

    if (!isBlockMathFenceParagraph(current.node)) {
      continue;
    }

    for (
      let closingIndex = index + 1;
      closingIndex < topLevelNodes.length;
      closingIndex += 1
    ) {
      const closingCandidate = topLevelNodes[closingIndex];

      if (isBlockMathFenceParagraph(closingCandidate.node)) {
        const formulaLines = topLevelNodes
          .slice(index + 1, closingIndex)
          .map((item) => item.node.textContent);

        replacements.push({
          from: current.from,
          node: mathType.create({ value: formulaLines.join("\n").trim() }),
          to: closingCandidate.to,
        });
        index = closingIndex;
        break;
      }

      if (!canReadNodeAsBlockMathLine(closingCandidate.node)) {
        break;
      }
    }
  }

  return replacements;
}

function collectInlineMathMarkdownReplacements(
  doc: ProseMirrorNode,
  inlineMathType: NodeType | undefined,
  blockReplacements: MathMarkdownReplacement[],
): MathMarkdownReplacement[] {
  if (!inlineMathType) {
    return [];
  }

  const replacements: MathMarkdownReplacement[] = [];

  doc.descendants((node, position, parent) => {
    if (node.type.name === "codeBlock") {
      return false;
    }

    if (!node.isText || typeof node.text !== "string") {
      return true;
    }

    if (
      parent?.type.name === "codeBlock" ||
      isPositionInsideMathBlockReplacement(position, blockReplacements) ||
      node.marks.some((mark) => mark.type.name === "code" || mark.type.name === "link")
    ) {
      return false;
    }

    for (const match of findInlineMathSourceRanges(node.text)) {
      replacements.push({
        from: position + match.from,
        node: inlineMathType.create({ value: match.value }),
        to: position + match.to,
      });
    }

    return false;
  });

  return replacements;
}

function getSingleParagraphBlockMathValue(node: ProseMirrorNode) {
  if (!canReadNodeAsBlockMathLine(node)) {
    return null;
  }

  const text = node.textContent.trim();

  if (!text.startsWith("$$") || !text.endsWith("$$") || text.length <= 4) {
    return null;
  }

  const value = text.slice(2, -2).trim();

  return value ? value : null;
}

function isBlockMathFenceParagraph(node: ProseMirrorNode) {
  return canReadNodeAsBlockMathLine(node) && node.textContent.trim() === "$$";
}

function canReadNodeAsBlockMathLine(node: ProseMirrorNode) {
  return node.type.name === "paragraph";
}

function isPositionInsideMathBlockReplacement(
  position: number,
  blockReplacements: MathMarkdownReplacement[],
) {
  return blockReplacements.some(
    (replacement) => position >= replacement.from && position < replacement.to,
  );
}

function findInlineMathSourceRanges(value: string) {
  const ranges: Array<{ from: number; to: number; value: string }> = [];

  for (let index = 0; index < value.length; index += 1) {
    if (
      value[index] !== "$" ||
      value[index + 1] === "$" ||
      isEscapedDelimiter(value, index)
    ) {
      continue;
    }

    const closingIndex = findClosingDollar(value, index + 1);

    if (closingIndex <= index + 1) {
      continue;
    }

    const formula = value.slice(index + 1, closingIndex);

    if (!isInlineMathSourceValue(value, formula, closingIndex)) {
      continue;
    }

    ranges.push({
      from: index,
      to: closingIndex + 1,
      value: formula,
    });
    index = closingIndex;
  }

  return ranges;
}

function isInlineMathSourceValue(
  source: string,
  value: string,
  closingIndex: number,
) {
  return (
    value.trim() === value &&
    value.length > 0 &&
    !value.includes("\n") &&
    !/\d/.test(source[closingIndex + 1] ?? "")
  );
}

function createInlineMathTokenizer(): MarkdownTokenizer {
  return {
    level: "inline",
    name: "inlineMath",
    start: "$",
    tokenize(src) {
      if (!src.startsWith("$") || src.startsWith("$$")) {
        return undefined;
      }

      const closingIndex = findClosingDollar(src, 1);

      if (closingIndex <= 1) {
        return undefined;
      }

      const value = src.slice(1, closingIndex);

      if (
        value.trim() !== value ||
        value.length === 0 ||
        value.includes("\n") ||
        /\d/.test(src[closingIndex + 1] ?? "")
      ) {
        return undefined;
      }

      return {
        raw: src.slice(0, closingIndex + 1),
        text: value,
        type: "inlineMath",
      };
    },
  };
}

function createBlockMathTokenizer(): MarkdownTokenizer {
  return {
    level: "block",
    name: "math",
    start: "$$",
    tokenize(src) {
      if (!src.startsWith("$$")) {
        return undefined;
      }

      const closingIndex = findClosingDoubleDollar(src, 2);

      if (closingIndex <= 2) {
        return undefined;
      }

      const rawEnd = closingIndex + 2;
      const suffixMatch = src.slice(rawEnd).match(/^[ \t]*(?:\n+|$)/);

      if (!suffixMatch) {
        return undefined;
      }

      return {
        raw: src.slice(0, rawEnd + suffixMatch[0].length),
        text: src.slice(2, closingIndex).trim(),
        type: "math",
      };
    },
  };
}

function findClosingDollar(value: string, startIndex: number) {
  for (let index = startIndex; index < value.length; index += 1) {
    if (value[index] === "$" && !isEscapedDelimiter(value, index)) {
      return index;
    }
  }

  return -1;
}

function findClosingDoubleDollar(value: string, startIndex: number) {
  for (let index = startIndex; index < value.length - 1; index += 1) {
    if (
      value[index] === "$" &&
      value[index + 1] === "$" &&
      !isEscapedDelimiter(value, index)
    ) {
      return index;
    }
  }

  return -1;
}

function isEscapedDelimiter(value: string, index: number) {
  let backslashCount = 0;

  for (let position = index - 1; position >= 0; position -= 1) {
    if (value[position] !== "\\") {
      break;
    }

    backslashCount += 1;
  }

  return backslashCount % 2 === 1;
}

function getMathNodeValue(node: { attrs?: Record<string, unknown> }) {
  return typeof node.attrs?.value === "string" ? node.attrs.value : "";
}

function getMathJsonValue(node: { attrs?: Record<string, unknown> }) {
  return getMathNodeValue(node).trim();
}

function getEventTableElement(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return null;
  }

  const table = target.closest("table");

  return table instanceof HTMLTableElement ? table : null;
}

function getTableRangeFromPointer(
  view: Editor["view"],
  table: HTMLTableElement,
  anchorPosition: number | null,
): TableNodeRange | null {
  const positions = [
    anchorPosition,
    safelyGetPosAtDom(view, table, 0),
    safelyGetPosAtDom(view, table, table.childNodes.length),
  ].filter((position): position is number => typeof position === "number");

  for (const position of positions) {
    for (const candidate of [position, position - 1, position + 1]) {
      const range = getTableRangeAtPosition(view.state.doc, candidate);

      if (range) {
        return range;
      }
    }
  }

  return null;
}

function safelyGetPosAtDom(
  view: Editor["view"],
  node: Node,
  offset: number,
) {
  try {
    return view.posAtDOM(node, offset);
  } catch {
    return null;
  }
}

function getTableRangeAtPosition(
  doc: ProseMirrorNode,
  position: number,
): TableNodeRange | null {
  let range: TableNodeRange | null = null;

  doc.descendants((node, nodePosition) => {
    if (range) {
      return false;
    }

    if (node.type.name !== "table") {
      return true;
    }

    const from = nodePosition;
    const to = nodePosition + node.nodeSize;

    if (position >= from && position <= to) {
      range = { from, to };
      return false;
    }

    return false;
  });

  return range;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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

function getNodeViewPosition(
  getPos: NodeViewRendererProps["getPos"] | ReactNodeViewProps["getPos"],
) {
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
    "block rounded-md bg-background-soft px-3 py-2 text-sm text-primary underline decoration-primary/40 underline-offset-4 ring-1 ring-border/60";
  link.textContent = originalUrl;

  return link;
}

function createMediaResolvingBlock(originalUrl: string) {
  const block = document.createElement("span");

  block.className =
    "block rounded-md bg-background-soft px-3 py-3 text-sm text-muted-foreground ring-1 ring-border/60";
  block.textContent = isBackendResolvableEditorMediaEmbedUrl(originalUrl)
    ? "正在解析抖音嵌入..."
    : originalUrl;

  return block;
}

function resolveEditorMediaEmbed(originalUrl: string) {
  const localEmbed = resolveWhitelistedMediaEmbed(originalUrl);

  if (localEmbed) {
    return Promise.resolve(localEmbed);
  }

  if (!isBackendResolvableEditorMediaEmbedUrl(originalUrl)) {
    return Promise.resolve(null);
  }

  const cached = editorMediaEmbedResolveCache.get(originalUrl);

  if (cached) {
    return cached;
  }

  const promise = resolveContentEmbed(originalUrl)
    .then((result) =>
      createWhitelistedMediaEmbedFromResolvedContentEmbed(result.embed),
    )
    .catch(() => null);

  editorMediaEmbedResolveCache.set(originalUrl, promise);
  return promise;
}

function isEditorMediaEmbedUrl(originalUrl: string) {
  return Boolean(
    resolveWhitelistedMediaEmbed(originalUrl) ||
      isBackendResolvableEditorMediaEmbedUrl(originalUrl),
  );
}

function isBackendResolvableEditorMediaEmbedUrl(originalUrl: string) {
  if (!isBackendResolvableMediaEmbedUrl(originalUrl)) {
    return false;
  }

  try {
    const url = new URL(originalUrl);
    const hostname = url.hostname.toLowerCase();
    const path = url.pathname;

    if (url.searchParams.has("modal_id")) {
      return true;
    }

    if (
      hostname === "v.douyin.com" ||
      hostname.endsWith(".v.douyin.com")
    ) {
      return path.replace(/\//g, "").length > 0;
    }

    return false;
  } catch {
    return false;
  }
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
  const paragraphType = editor.state.schema.nodes.paragraph;

  if (!mediaEmbedType || !paragraphType) {
    return false;
  }

  const replacements: EditorMediaEmbedReplacement[] = [];

  editor.state.doc.descendants((node, position, parent) => {
    if (node.type.name !== "paragraph" || parent?.type.name !== "doc") {
      return;
    }

    const occurrence = findEditorMediaEmbedOccurrence(node.textContent);

    if (!occurrence) {
      return;
    }

    const beforeText = node.textContent.slice(0, occurrence.from).trim();
    const afterText = node.textContent.slice(occurrence.to).trim();

    replacements.push({
      afterText,
      beforeText,
      from: position,
      originalUrl: occurrence.originalUrl,
      to: position + node.nodeSize,
    });
  });

  if (replacements.length === 0) {
    return false;
  }

  let transaction = editor.state.tr;

  for (const replacement of [...replacements].reverse()) {
    const replacementNodes = [
      ...(replacement.beforeText
        ? [paragraphType.create(null, editor.state.schema.text(replacement.beforeText))]
        : []),
      mediaEmbedType.create({
        originalUrl: replacement.originalUrl,
      }),
      ...(replacement.afterText
        ? [paragraphType.create(null, editor.state.schema.text(replacement.afterText))]
        : []),
    ];

    transaction = transaction.replaceWith(
      replacement.from,
      replacement.to,
      Fragment.fromArray(replacementNodes),
    );
  }

  editor.view.dispatch(transaction);
  return true;
}

function findEditorMediaEmbedOccurrence(text: string) {
  for (const match of text.matchAll(editorBareUrlPattern)) {
    const start = match.index ?? 0;
    const originalUrl = stripTrailingEditorUrlPunctuation(match[0]);

    if (!isEditorMediaEmbedUrl(originalUrl)) {
      continue;
    }

    return {
      from: start,
      originalUrl,
      to: start + originalUrl.length,
    };
  }

  return null;
}

function stripTrailingEditorUrlPunctuation(value: string) {
  return value.replace(/[),.!?:;\uFF0C\u3002\uFF01\uFF1F\uFF1B\uFF1A]+$/u, "");
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
