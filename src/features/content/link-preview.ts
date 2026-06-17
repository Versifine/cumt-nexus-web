export type BackendLinkPreview = {
  description?: string | null;
  image_url?: string | null;
  site_name?: string | null;
  thumbnail_url?: string | null;
  title?: string | null;
  url?: string | null;
};

export type ResolvedLinkPreview = {
  description?: string;
  host: string;
  imageUrl?: string;
  source: "backend" | "markdown";
  title: string;
  url: string;
};

type ResolveLinkPreviewInput = {
  backendPreview?: BackendLinkPreview | null;
  markdown?: string | null;
};

const markdownLinkPattern = /\[((?:\\.|[^\]\\])*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const bareUrlPattern = /\bhttps?:\/\/[^\s<>"'`]+/gi;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

export function resolveLinkPreview({
  backendPreview,
  markdown,
}: ResolveLinkPreviewInput) {
  const backendLinkPreview = resolveBackendLinkPreview(backendPreview);

  if (backendLinkPreview) {
    return backendLinkPreview;
  }

  return resolveMarkdownLinkPreview(markdown);
}

export function resolveMarkdownLinkPreview(markdown?: string | null) {
  const normalizedMarkdown = markdown?.trim();

  if (!normalizedMarkdown) {
    return null;
  }

  const scannableMarkdown = stripMarkdownCodeSegments(
    stripReferenceDefinitions(normalizedMarkdown),
  );
  const markdownLink = findFirstMarkdownLink(scannableMarkdown);

  if (markdownLink) {
    return markdownLink;
  }

  return findFirstBareLink(stripMarkdownInlineResources(scannableMarkdown));
}

function resolveBackendLinkPreview(preview?: BackendLinkPreview | null) {
  const safeUrl = normalizeExternalHttpUrl(preview?.url);

  if (!safeUrl) {
    return null;
  }

  const parsedUrl = new URL(safeUrl);
  const host = formatUrlHost(parsedUrl);
  const title = normalizePreviewText(preview?.title) || host;
  const description = normalizePreviewText(preview?.description);
  const imageUrl = normalizeExternalHttpUrl(
    preview?.thumbnail_url || preview?.image_url,
  );

  return {
    ...(description ? { description } : {}),
    host,
    ...(imageUrl ? { imageUrl } : {}),
    source: "backend" as const,
    title,
    url: safeUrl,
  };
}

function findFirstMarkdownLink(markdown: string) {
  for (const match of markdown.matchAll(markdownLinkPattern)) {
    const matchIndex = match.index ?? 0;

    if (markdown[Math.max(0, matchIndex - 1)] === "!") {
      continue;
    }

    const safeUrl = normalizeExternalHttpUrl(match[2]);
    if (!safeUrl) {
      continue;
    }

    const parsedUrl = new URL(safeUrl);
    const host = formatUrlHost(parsedUrl);
    const label = unescapeMarkdownLabel(match[1]).trim();

    return {
      host,
      source: "markdown" as const,
      title: label && !isUrlLikeText(label) ? label : host,
      url: safeUrl,
    };
  }

  return null;
}

function findFirstBareLink(markdown: string) {
  for (const match of markdown.matchAll(bareUrlPattern)) {
    const safeUrl = normalizeExternalHttpUrl(stripTrailingUrlPunctuation(match[0]));

    if (!safeUrl) {
      continue;
    }

    const parsedUrl = new URL(safeUrl);
    const host = formatUrlHost(parsedUrl);

    return {
      host,
      source: "markdown" as const,
      title: host,
      url: safeUrl,
    };
  }

  return null;
}

function normalizeExternalHttpUrl(value?: string | null) {
  const safeHref = value?.trim();

  if (!safeHref || controlCharacterPattern.test(safeHref)) {
    return "";
  }

  if (safeHref.startsWith("//")) {
    return "";
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(safeHref);
  } catch {
    return "";
  }

  return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:"
    ? safeHref
    : "";
}

function formatUrlHost(url: URL) {
  return url.hostname.replace(/^www\./i, "");
}

function normalizePreviewText(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim() || "";
}

function isUrlLikeText(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function unescapeMarkdownLabel(value: string) {
  return value.replace(/\\([\\[\]])/g, "$1");
}

function stripTrailingUrlPunctuation(value: string) {
  return value.replace(/[),.!?:;\uFF0C\u3002\uFF01\uFF1F\uFF1B\uFF1A]+$/u, "");
}

function stripMarkdownCodeSegments(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  let insideFence = false;

  return lines
    .map((line) => {
      if (/^\s*```/.test(line)) {
        insideFence = !insideFence;
        return "";
      }

      if (insideFence) {
        return "";
      }

      return line.replace(/`[^`\n]*`/g, " ");
    })
    .join("\n");
}

function stripReferenceDefinitions(markdown: string) {
  return markdown.replace(/^\s*\[[^\]]+\]:\s+\S+.*$/gm, " ");
}

function stripMarkdownInlineResources(markdown: string) {
  return markdown.replace(/!?\[((?:\\.|[^\]\\])*)\]\([^)]+\)/g, " ");
}
