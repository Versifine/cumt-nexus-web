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
  const pattern = new RegExp(
    `${escapeRegExp(ATTACHMENT_MARKDOWN_URL_PREFIX)}([^\\s)]+)`,
    "g",
  );

  for (const match of markdown.matchAll(pattern)) {
    const id = getAttachmentIdFromMarkdownUrl(
      `${ATTACHMENT_MARKDOWN_URL_PREFIX}${match[1]}`,
    );

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
  const referencedIds = getReferencedAttachmentIds(markdown);

  return attachments
    .map((attachment) => attachment.id)
    .filter((id) => referencedIds.has(id));
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
