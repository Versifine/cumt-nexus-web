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
    `!?\\[(?:\\\\.|[^\\]\\\\])*\\]\\(${escapeRegExp(
      ATTACHMENT_MARKDOWN_URL_PREFIX,
    )}${escapeRegExp(encodedId)}\\)\\r?\\n?`,
    "g",
  );

  return markdown.replace(imagePattern, "").replace(/\n{3,}/g, "\n\n").trimEnd();
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
