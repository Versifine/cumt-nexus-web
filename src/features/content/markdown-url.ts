const internalMediaMarkdownUrlPrefixes = [
  "nexus-attachment:",
  "nexus-gallery:",
];
const allowedAbsoluteProtocols = new Set(["http:", "https:", "mailto:"]);
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

export function normalizeMarkdownHref(value?: string | null) {
  if (!value) {
    return "";
  }

  const trimmedValue = value.trim();

  if (!trimmedValue || controlCharacterPattern.test(trimmedValue)) {
    return "";
  }

  if (trimmedValue.startsWith("#")) {
    return trimmedValue;
  }

  if (
    internalMediaMarkdownUrlPrefixes.some((prefix) =>
      trimmedValue.startsWith(prefix),
    )
  ) {
    return trimmedValue;
  }

  if (trimmedValue.startsWith("/")) {
    return trimmedValue.startsWith("//") ? "" : trimmedValue;
  }

  try {
    const parsedUrl = new URL(trimmedValue);

    return allowedAbsoluteProtocols.has(parsedUrl.protocol) ? trimmedValue : "";
  } catch {
    return "";
  }
}

export function isExternalMarkdownHref(value: string) {
  try {
    const parsedUrl = new URL(value);

    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}
