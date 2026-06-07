import type { MediaAttachment } from "@/features/media/types";

export const ATTACHMENT_MARKDOWN_URL_PREFIX = "nexus-attachment:";

export function createAttachmentMarkdown(attachment: MediaAttachment) {
  const altText = escapeMarkdownAltText(
    attachment.alt_text.trim() || "图片附件",
  );

  return `![${altText}](${ATTACHMENT_MARKDOWN_URL_PREFIX}${encodeAttachmentIdForMarkdown(
    attachment.id,
  )})`;
}

export function getAttachmentIdFromMarkdownUrl(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue.startsWith(ATTACHMENT_MARKDOWN_URL_PREFIX)) {
    return null;
  }

  const encodedId = trimmedValue.slice(ATTACHMENT_MARKDOWN_URL_PREFIX.length);

  if (!encodedId) {
    return null;
  }

  try {
    return decodeURIComponent(encodedId);
  } catch {
    return encodedId;
  }
}

export function isAttachmentMarkdownUrl(value?: string | null) {
  return Boolean(getAttachmentIdFromMarkdownUrl(value));
}

export function getReferencedAttachmentIds(markdown: string) {
  const ids = new Set<string>();
  const imagePattern = new RegExp(
    `!\\[(?:\\\\.|[^\\]\\\\])*\\]\\(\\s*(${escapeRegExp(
      ATTACHMENT_MARKDOWN_URL_PREFIX,
    )}[^\\s)]+)(?:\\s+(?:"[^"]*"|'[^']*'|[^\\s)]+))?\\s*\\)`,
    "g",
  );
  const scannableMarkdown = stripMarkdownCodeSegments(markdown);

  for (const match of scannableMarkdown.matchAll(imagePattern)) {
    if (isEscapedMarkdownToken(scannableMarkdown, match.index)) {
      continue;
    }

    const id = getAttachmentIdFromMarkdownUrl(match[1]);

    if (id) {
      ids.add(id);
    }
  }

  return ids;
}

export function getReferencedAttachmentIdsForSubmit(
  markdown: string,
  attachments: Pick<MediaAttachment, "id">[],
) {
  const uploadedIds = new Set(attachments.map((attachment) => attachment.id));

  return [...getReferencedAttachmentIds(markdown)].filter((id) =>
    uploadedIds.has(id),
  );
}

export function removeAttachmentMarkdownReferences(markdown: string, id: string) {
  return removeMarkdownRanges(
    markdown,
    getAttachmentMarkdownReferenceRanges(markdown, id),
  )
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}

export function removeAttachmentMarkdownReferencesWithSelection(
  markdown: string,
  id: string,
  selection: { end: number; start: number },
) {
  const ranges = getAttachmentMarkdownReferenceRanges(markdown, id);

  return {
    markdown: removeMarkdownRanges(markdown, ranges),
    selection: {
      end: mapRemovedMarkdownOffset(selection.end, ranges),
      start: mapRemovedMarkdownOffset(selection.start, ranges),
    },
  };
}

function stripMarkdownCodeSegments(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  let fenceMarker: "`" | "~" | null = null;

  const withoutFencedCode = lines
    .map((line) => {
      const fenceMatch = line.trimStart().match(/^(`{3,}|~{3,})/);

      if (fenceMatch) {
        const marker = fenceMatch[1].startsWith("`") ? "`" : "~";

        if (!fenceMarker) {
          fenceMarker = marker;
          return "";
        }

        if (fenceMarker === marker) {
          fenceMarker = null;
          return "";
        }
      }

      return fenceMarker ? "" : line;
    })
    .join("\n");

  return withoutFencedCode.replace(/`[^`\n]*`/g, "");
}

function getAttachmentMarkdownReferenceRanges(markdown: string, id: string) {
  const encodedId = encodeAttachmentIdForMarkdown(id);
  const imagePattern = new RegExp(
    `!\\[(?:\\\\.|[^\\]\\\\])*\\]\\(\\s*${escapeRegExp(
      ATTACHMENT_MARKDOWN_URL_PREFIX,
    )}${escapeRegExp(encodedId)}(?:\\s+(?:"[^"]*"|'[^']*'|[^\\s)]+))?\\s*\\)\\r?\\n?`,
    "g",
  );
  const lines = markdown.split(/\r?\n/);
  let fenceMarker: "`" | "~" | null = null;
  const ranges: Array<{ end: number; start: number }> = [];
  let offset = 0;

  for (const line of lines) {
    const fenceMatch = line.trimStart().match(/^(`{3,}|~{3,})/);
    const lineEndLength = getLineEndLength(markdown, offset + line.length);

    if (fenceMatch) {
      const marker = fenceMatch[1].startsWith("`") ? "`" : "~";

      if (!fenceMarker) {
        fenceMarker = marker;
        offset += line.length + lineEndLength;
        continue;
      }

      if (fenceMarker === marker) {
        fenceMarker = null;
        offset += line.length + lineEndLength;
        continue;
      }
    }

    if (fenceMarker) {
      offset += line.length + lineEndLength;
      continue;
    }

    const searchableLine = markdown.slice(offset, offset + line.length + lineEndLength);

    for (const match of searchableLine.matchAll(imagePattern)) {
      const matchIndex = match.index ?? 0;

      if (
        isEscapedMarkdownToken(searchableLine, matchIndex) ||
        isInsideInlineCode(searchableLine, matchIndex)
      ) {
        continue;
      }

      ranges.push({
        end: offset + matchIndex + match[0].length,
        start: offset + matchIndex,
      });
    }

    offset += line.length + lineEndLength;
  }

  return ranges;
}

function removeMarkdownRanges(
  markdown: string,
  ranges: Array<{ end: number; start: number }>,
) {
  let nextMarkdown = markdown;

  for (const range of [...ranges].reverse()) {
    nextMarkdown = `${nextMarkdown.slice(0, range.start)}${nextMarkdown.slice(
      range.end,
    )}`;
  }

  return nextMarkdown;
}

function mapRemovedMarkdownOffset(
  offset: number,
  ranges: Array<{ end: number; start: number }>,
) {
  let nextOffset = offset;

  for (const range of ranges) {
    if (offset <= range.start) {
      break;
    }

    nextOffset -= Math.min(offset, range.end) - range.start;
  }

  return Math.max(0, nextOffset);
}

function getLineEndLength(markdown: string, index: number) {
  if (markdown[index] === "\r" && markdown[index + 1] === "\n") {
    return 2;
  }

  return markdown[index] === "\n" ? 1 : 0;
}

function isInsideInlineCode(markdown: string, index: number) {
  for (const match of markdown.matchAll(/`[^`\n]*`/g)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;

    if (index > start && index < end) {
      return true;
    }
  }

  return false;
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

function escapeMarkdownAltText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\r?\n/g, " ");
}

function encodeAttachmentIdForMarkdown(value: string) {
  return encodeURIComponent(value).replace(/[()]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
