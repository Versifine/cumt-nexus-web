export type ClipboardDataImageSource = {
  dataUrl: string;
  extension: string;
  mimeType: string;
};

const imageSrcPattern =
  /<img\b[^>]*?\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
const markdownDataImagePattern =
  /!\[[^\]\r\n]*\]\(\s*(data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+)\s*(?:"[^"]*"|'[^']*')?\s*\)/gi;
const textDataImagePattern =
  /data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+/gi;
const base64DataImagePattern =
  /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i;

export function extractDataImageSourcesFromClipboardHtml(html: string) {
  const sources: ClipboardDataImageSource[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(imageSrcPattern)) {
    const rawSource = normalizeHtmlAttributeValue(decodeHtmlAttribute(
      match[1] ?? match[2] ?? match[3] ?? "",
    ));
    const source = parseBase64DataImage(rawSource);

    if (!source || seen.has(source.dataUrl)) {
      continue;
    }

    seen.add(source.dataUrl);
    sources.push(source);
  }

  return sources;
}

export function extractDataImageSourcesFromClipboardText(text: string) {
  const sources: ClipboardDataImageSource[] = [];
  const seen = new Set<string>();

  for (const match of text.matchAll(markdownDataImagePattern)) {
    addDataImageSource(sources, seen, match[1] ?? "");
  }

  for (const match of text.matchAll(textDataImagePattern)) {
    addDataImageSource(sources, seen, match[0] ?? "");
  }

  return sources;
}

export function getClipboardImageFileName(
  source: Pick<ClipboardDataImageSource, "extension">,
  index: number,
) {
  return `粘贴图片-${index + 1}.${source.extension}`;
}

function parseBase64DataImage(value: string) {
  const match = value.match(base64DataImagePattern);

  if (!match) {
    return null;
  }

  const mimeType = match[1].toLowerCase();
  const base64 = match[2].replace(/\s/g, "");

  if (!base64) {
    return null;
  }

  return {
    dataUrl: `data:${mimeType};base64,${base64}`,
    extension: getImageExtension(mimeType),
    mimeType,
  };
}

function addDataImageSource(
  sources: ClipboardDataImageSource[],
  seen: Set<string>,
  rawSource: string,
) {
  const source = parseBase64DataImage(rawSource);

  if (!source || seen.has(source.dataUrl)) {
    return;
  }

  seen.add(source.dataUrl);
  sources.push(source);
}

function normalizeHtmlAttributeValue(value: string) {
  const trimmedValue = value.trim();
  const firstCharacter = trimmedValue[0];
  const lastCharacter = trimmedValue[trimmedValue.length - 1];

  if (
    trimmedValue.length >= 2 &&
    ((firstCharacter === '"' && lastCharacter === '"') ||
      (firstCharacter === "'" && lastCharacter === "'"))
  ) {
    return trimmedValue.slice(1, -1).trim();
  }

  return trimmedValue;
}

function getImageExtension(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "img";
  }
}

function decodeHtmlAttribute(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_match, codePoint: string) =>
      decodeCodePoint(Number.parseInt(codePoint, 10)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_match, codePoint: string) =>
      decodeCodePoint(Number.parseInt(codePoint, 16)),
    );
}

function decodeCodePoint(codePoint: number) {
  if (!Number.isFinite(codePoint) || codePoint <= 0) {
    return "";
  }

  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return "";
  }
}
