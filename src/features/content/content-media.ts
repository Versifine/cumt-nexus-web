import {
  getAttachmentIdsFromMarkdownUrl,
  isAttachmentGalleryMarkdownUrl,
  isAttachmentMarkdownUrl,
} from "@/features/content/attachment-markdown";
import {
  isWhitelistedMediaAutolink,
  resolveWhitelistedMediaEmbed,
  type WhitelistedMediaEmbed,
} from "@/features/content/media-embed";
import type { MediaAttachment } from "@/features/media/types";

export type ImageAspectKind = "normal" | "small" | "tall" | "wide";

export type ResolvedImageMediaBlock = {
  attachments: MediaAttachment[];
  caption?: string;
  kind: "image-gallery";
  source: "gallery" | "image";
};

export type ResolvedEmbedMediaBlock = {
  embed: WhitelistedMediaEmbed;
  kind: "embed";
};

export type ResolvedContentMediaBlock =
  | ResolvedEmbedMediaBlock
  | ResolvedImageMediaBlock;

type MediaOccurrence = {
  block: ResolvedContentMediaBlock;
  index: number;
};

const markdownImagePattern =
  /!\[((?:\\.|[^\]\\])*)\]\(\s*([^\s)]+)(?:\s+(?:"[^"]*"|'[^']*'|[^\s)]+))?\s*\)/g;
const markdownLinkPattern =
  /\[((?:\\.|[^\]\\])*)\]\(\s*([^\s)]+)(?:\s+(?:"[^"]*"|'[^']*'|[^\s)]+))?\s*\)/g;
const bareUrlPattern = /\bhttps?:\/\/[^\s<>"'`]+/gi;

export function resolveFirstContentMediaBlock({
  attachments = [],
  markdown,
}: {
  attachments?: MediaAttachment[];
  markdown?: string | null;
}) {
  const normalizedMarkdown = markdown?.trim();

  if (!normalizedMarkdown) {
    return null;
  }

  const attachmentById = new Map(
    attachments.map((attachment) => [attachment.id, attachment] as const),
  );
  const scannableMarkdown = stripMarkdownCodeSegments(normalizedMarkdown);
  const occurrences = [
    ...getImageMediaOccurrences(scannableMarkdown, attachmentById),
    ...getEmbedMediaOccurrences(scannableMarkdown),
  ].sort((left, right) => left.index - right.index);

  return occurrences[0]?.block ?? null;
}

export function resolveImageMediaBlockFromMarkdownUrl({
  attachmentById,
  caption,
  src,
}: {
  attachmentById: Map<string, MediaAttachment>;
  caption?: string;
  src?: string | null;
}): ResolvedImageMediaBlock | null {
  if (!src) {
    return null;
  }

  if (!isAttachmentMarkdownUrl(src) && !isAttachmentGalleryMarkdownUrl(src)) {
    return null;
  }

  const attachments = getAttachmentIdsFromMarkdownUrl(src)
    .map((id) => attachmentById.get(id))
    .filter(isVisibleImageAttachment);

  if (attachments.length === 0) {
    return null;
  }

  return {
    attachments,
    ...(caption ? { caption } : {}),
    kind: "image-gallery",
    source: isAttachmentGalleryMarkdownUrl(src) ? "gallery" : "image",
  };
}

export function isVisibleImageAttachment(
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

export function getImageAspectKind(attachment: MediaAttachment): ImageAspectKind {
  const width = normalizeDimension(attachment.width);
  const height = normalizeDimension(attachment.height);

  if (width > 0 && height > 0 && (width < 300 || height < 300)) {
    return "small";
  }

  if (width <= 0 || height <= 0) {
    return "normal";
  }

  const ratio = width / height;

  if (ratio < 0.6) {
    return "tall";
  }

  if (ratio > 2.2) {
    return "wide";
  }

  return "normal";
}

export function getMediaAttachmentUrl(
  attachment: MediaAttachment,
  target: "detail" | "lightbox" | "preview",
) {
  switch (target) {
    case "preview":
      return attachment.thumbnail_url || attachment.medium_url || attachment.url;
    case "detail":
      return attachment.medium_url || attachment.url;
    case "lightbox":
    default:
      return attachment.original_url || attachment.url;
  }
}

export function getAttachmentCaption(
  attachment: MediaAttachment,
  fallback = "内容图片",
) {
  return attachment.alt_text.trim() || fallback;
}

export function formatFileSize(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return "--";
  }

  if (sizeBytes < 1024 * 1024) {
    return `${Math.ceil(sizeBytes / 1024)} KB`;
  }

  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

function getImageMediaOccurrences(
  markdown: string,
  attachmentById: Map<string, MediaAttachment>,
) {
  const occurrences: MediaOccurrence[] = [];

  for (const match of markdown.matchAll(markdownImagePattern)) {
    if (isEscapedMarkdownToken(markdown, match.index ?? 0)) {
      continue;
    }

    const block = resolveImageMediaBlockFromMarkdownUrl({
      attachmentById,
      caption: unescapeMarkdownLabel(match[1]).trim(),
      src: match[2],
    });

    if (!block) {
      continue;
    }

    occurrences.push({
      block,
      index: match.index ?? 0,
    });
  }

  return occurrences;
}

function getEmbedMediaOccurrences(markdown: string) {
  const occurrences: MediaOccurrence[] = [];
  const markdownWithoutInlineResources = stripMarkdownInlineResources(markdown);

  for (const match of markdown.matchAll(markdownLinkPattern)) {
    const matchIndex = match.index ?? 0;

    if (
      markdown[Math.max(0, matchIndex - 1)] === "!" ||
      isEscapedMarkdownToken(markdown, matchIndex)
    ) {
      continue;
    }

    const href = stripTrailingUrlPunctuation(match[2]);
    const label = unescapeMarkdownLabel(match[1]).trim();

    if (!isWhitelistedMediaAutolink(href, label)) {
      continue;
    }

    const embed = resolveWhitelistedMediaEmbed(href);

    if (embed) {
      occurrences.push({
        block: { embed, kind: "embed" },
        index: matchIndex,
      });
    }
  }

  for (const match of markdownWithoutInlineResources.matchAll(bareUrlPattern)) {
    const href = stripTrailingUrlPunctuation(match[0]);
    const embed = resolveWhitelistedMediaEmbed(href);

    if (embed) {
      occurrences.push({
        block: { embed, kind: "embed" },
        index: match.index ?? 0,
      });
    }
  }

  return occurrences;
}

function normalizeDimension(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stripMarkdownCodeSegments(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  let fenceMarker: "`" | "~" | null = null;

  return lines
    .map((line) => {
      const fenceMatch = line.trimStart().match(/^(`{3,}|~{3,})/);

      if (fenceMatch) {
        const marker = fenceMatch[1].startsWith("`") ? "`" : "~";

        if (!fenceMarker) {
          fenceMarker = marker;
          return blankLike(line);
        }

        if (fenceMarker === marker) {
          fenceMarker = null;
          return blankLike(line);
        }
      }

      if (fenceMarker) {
        return blankLike(line);
      }

      return line.replace(/`[^`\n]*`/g, (match) => blankLike(match));
    })
    .join("\n");
}

function stripMarkdownInlineResources(markdown: string) {
  return markdown.replace(/!?\[((?:\\.|[^\]\\])*)\]\([^)]+\)/g, (match) =>
    blankLike(match),
  );
}

function blankLike(value: string) {
  return " ".repeat(value.length);
}

function stripTrailingUrlPunctuation(value: string) {
  return value.replace(/[),.!?:;\uFF0C\u3002\uFF01\uFF1F\uFF1B\uFF1A]+$/u, "");
}

function isEscapedMarkdownToken(markdown: string, index: number) {
  let slashCount = 0;

  for (let position = index - 1; position >= 0; position -= 1) {
    if (markdown[position] !== "\\") {
      break;
    }

    slashCount += 1;
  }

  return slashCount % 2 === 1;
}

function unescapeMarkdownLabel(value: string) {
  return value.replace(/\\([\\[\]])/g, "$1");
}
