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
  const encodedId = encodeAttachmentIdForMarkdown(id);
  const imagePattern = new RegExp(
    `!\\[(?:\\\\.|[^\\]\\\\])*\\]\\(\\s*${escapeRegExp(
      ATTACHMENT_MARKDOWN_URL_PREFIX,
    )}${escapeRegExp(encodedId)}(?:\\s+(?:"[^"]*"|'[^']*'|[^\\s)]+))?\\s*\\)\\r?\\n?`,
    "g",
  );

  return replaceMarkdownOutsideCodeSegments(markdown, (segment) =>
    segment.replace(imagePattern, (matched, offset: number) =>
      isEscapedMarkdownToken(segment, offset) ? matched : "",
    ),
  )
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
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

function replaceMarkdownOutsideCodeSegments(
  markdown: string,
  replaceSegment: (segment: string) => string,
) {
  const lines = markdown.split(/\r?\n/);
  let fenceMarker: "`" | "~" | null = null;
  const replacedLines: string[] = [];

  for (const line of lines) {
    const fenceMatch = line.trimStart().match(/^(`{3,}|~{3,})/);

    if (fenceMatch) {
      const marker = fenceMatch[1].startsWith("`") ? "`" : "~";

      if (!fenceMarker) {
        fenceMarker = marker;
        replacedLines.push(line);
        continue;
      }

      if (fenceMarker === marker) {
        fenceMarker = null;
        replacedLines.push(line);
        continue;
      }
    }

    if (fenceMarker) {
      replacedLines.push(line);
      continue;
    }

    const replacedLine = replaceLineOutsideInlineCode(line, replaceSegment);

    if (replacedLine !== null) {
      replacedLines.push(replacedLine);
    }
  }

  return replacedLines.join("\n");
}

function replaceLineOutsideInlineCode(
  line: string,
  replaceSegment: (segment: string) => string,
) {
  let changed = false;
  const replacedLine = line
    .split(/(`[^`\n]*`)/g)
    .map((segment) => {
      if (segment.startsWith("`") && segment.endsWith("`")) {
        return segment;
      }

      const nextSegment = replaceSegment(segment);
      changed ||= nextSegment !== segment;
      return nextSegment;
    })
    .join("");

  if (changed && replacedLine.trim() === "") {
    return null;
  }

  return replacedLine;
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
