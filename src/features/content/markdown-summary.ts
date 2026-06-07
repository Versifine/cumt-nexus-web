const attachmentImagePattern =
  /!\[((?:\\.|[^\]\\])*)\]\(nexus-attachment:[^)]+\)/g;

export function getMarkdownPlainTextSummary(
  value?: string | null,
  fallback = "暂无摘要。",
) {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return fallback;
  }

  const withoutRedditTokens = normalizedValue
    .replace(/>!([\s\S]*?)!</g, (_match, text: string) => ` ${text.trim()} `)
    .replace(
      /\^\(([^)\n]+)\)|\^([^\s^]+)/g,
      (
        _match,
        parenthesized: string | undefined,
        bare: string | undefined,
      ) => ` ${(parenthesized ?? bare ?? "").trim()} `,
    );
  const withoutAttachments = withoutRedditTokens.replace(
    attachmentImagePattern,
    (_match, label: string) => {
      const altText = unescapeMarkdownLabel(label).trim();

      return altText ? ` 图片：${altText} ` : " 图片 ";
    },
  );
  const withoutCodeFences = withoutAttachments.replace(/```[\s\S]*?```/g, (match) =>
    ` ${match.replace(/```/g, " ")} `,
  );
  const withoutInlineImages = withoutCodeFences.replace(
    /!\[((?:\\.|[^\]\\])*)\]\([^)]+\)/g,
    (_match, label: string) => {
      const altText = unescapeMarkdownLabel(label).trim();

      return altText ? ` 图片：${altText} ` : " 图片 ";
    },
  );
  const withoutLinks = withoutInlineImages.replace(
    /\[((?:\\.|[^\]\\])*)\]\([^)]+\)/g,
    (_match, label: string) => ` ${unescapeMarkdownLabel(label)} `,
  );
  const withoutReferenceLinks = withoutLinks
    .replace(/^\s*\[[^\]]+\]:\s+\S+.*$/gm, " ")
    .replace(
      /\[((?:\\.|[^\]\\])*)\]\[[^\]]+\]/g,
      (_match, label: string) => ` ${unescapeMarkdownLabel(label)} `,
    );

  const plainText = withoutReferenceLinks
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[*_~`|\\]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return plainText || fallback;
}

function unescapeMarkdownLabel(value: string) {
  return value.replace(/\\([\\[\]])/g, "$1");
}
