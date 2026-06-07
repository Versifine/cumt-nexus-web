type RedditToken =
  | {
      text: string;
      type: "spoiler";
    }
  | {
      text: string;
      type: "sup";
    };

export type RedditMarkdownTransform = {
  markdown: string;
  tokens: RedditToken[];
};

const spoilerLinkPrefix = "#nexus-spoiler-";
const superscriptLinkPrefix = "#nexus-sup-";

export function transformRedditMarkdown(value: string): RedditMarkdownTransform {
  const spoilerTokens: RedditToken[] = [];
  const withSpoilers = transformOutsideFencedCodeBlocks(value, (line) =>
    replaceDelimitedTokensOutsideMarkdownSyntax({
      close: "!<",
      createMarkdown: (index) => `[显示隐藏内容](${spoilerLinkPrefix}${index})`,
      open: ">!",
      tokens: spoilerTokens,
      type: "spoiler",
      value: line,
    }),
  );
  const tokens = [...spoilerTokens];
  const markdown = transformOutsideFencedCodeBlocks(withSpoilers, (line) =>
    replaceSuperscriptOutsideMarkdownSyntax(line, tokens),
  );

  return {
    markdown,
    tokens,
  };
}

export function getRedditToken(
  href: string | undefined,
  tokens: RedditToken[],
) {
  if (!href) {
    return null;
  }

  if (href.startsWith(spoilerLinkPrefix)) {
    return getTokenByHref(href, spoilerLinkPrefix, "spoiler", tokens);
  }

  if (href.startsWith(superscriptLinkPrefix)) {
    return getTokenByHref(href, superscriptLinkPrefix, "sup", tokens);
  }

  return null;
}

function replaceSuperscriptOutsideMarkdownSyntax(
  value: string,
  tokens: RedditToken[],
) {
  const protectedSpans = getProtectedMarkdownSpans(value);

  return value.replace(
    /\^\(([^)\n]+)\)|\^([^\s^]+)/g,
    (
      match,
      parenthesized: string | undefined,
      bare: string | undefined,
      offset: number,
    ) => {
      if (
        isIndexProtected(protectedSpans, offset) ||
        isEscapedMarkdownToken(value, offset)
      ) {
        return match;
      }

      const text = normalizeTokenText(parenthesized ?? bare ?? "");

      if (!text) {
        return match;
      }

      const index = tokens.length;
      tokens.push({ text, type: "sup" });
      return `[${escapeMarkdownLinkText(text)}](${superscriptLinkPrefix}${index})`;
    },
  );
}

function replaceDelimitedTokensOutsideMarkdownSyntax({
  close,
  createMarkdown,
  open,
  tokens,
  type,
  value,
}: {
  close: string;
  createMarkdown: (index: number) => string;
  open: string;
  tokens: RedditToken[];
  type: RedditToken["type"];
  value: string;
}) {
  const protectedSpans = getProtectedMarkdownSpans(value);
  let cursor = 0;
  let result = "";

  while (cursor < value.length) {
    const start = findTokenOutsideProtectedSpans(
      value,
      open,
      cursor,
      protectedSpans,
    );

    if (start === -1) {
      result += value.slice(cursor);
      break;
    }

    const end = findTokenOutsideProtectedSpans(
      value,
      close,
      start + open.length,
      protectedSpans,
    );

    if (end === -1) {
      result += value.slice(cursor);
      break;
    }

    result += value.slice(cursor, start);
    const text = normalizeTokenText(value.slice(start + open.length, end));
    const index = tokens.length;
    tokens.push({ text: text || "隐藏内容", type });
    result += createMarkdown(index);
    cursor = end + close.length;
  }

  return result;
}

function findTokenOutsideProtectedSpans(
  value: string,
  token: string,
  start: number,
  protectedSpans: ProtectedMarkdownSpan[],
) {
  let cursor = start;

  while (cursor < value.length) {
    const index = value.indexOf(token, cursor);

    if (index === -1) {
      return -1;
    }

    const protectedSpan = getContainingProtectedSpan(protectedSpans, index);

    if (!protectedSpan && !isEscapedMarkdownToken(value, index)) {
      return index;
    }

    cursor = protectedSpan ? protectedSpan.end : index + token.length;
  }

  return -1;
}

type ProtectedMarkdownSpan = {
  end: number;
  start: number;
};

function getProtectedMarkdownSpans(line: string) {
  if (isReferenceDefinitionLine(line)) {
    return [{ end: line.length, start: 0 }];
  }

  return mergeProtectedSpans([
    ...getInlineCodeSpans(line),
    ...getInlineMarkdownLinkSpans(line),
  ]);
}

function isReferenceDefinitionLine(line: string) {
  return /^\s{0,3}\[[^\]\n]+\]:\s+\S/.test(line);
}

function getInlineCodeSpans(line: string) {
  const spans: ProtectedMarkdownSpan[] = [];
  let cursor = 0;

  while (cursor < line.length) {
    if (line[cursor] !== "`" || isEscapedMarkdownToken(line, cursor)) {
      cursor += 1;
      continue;
    }

    const markerLength = countRepeatedCharacters(line, cursor, "`");
    const marker = "`".repeat(markerLength);
    const end = line.indexOf(marker, cursor + markerLength);

    if (end === -1) {
      cursor += markerLength;
      continue;
    }

    spans.push({ end: end + markerLength, start: cursor });
    cursor = end + markerLength;
  }

  return spans;
}

function getInlineMarkdownLinkSpans(line: string) {
  const spans: ProtectedMarkdownSpan[] = [];
  const inlineCodeSpans = getInlineCodeSpans(line);
  let cursor = 0;

  while (cursor < line.length) {
    if (isIndexProtected(inlineCodeSpans, cursor)) {
      const protectedSpan = getContainingProtectedSpan(inlineCodeSpans, cursor);
      cursor = protectedSpan ? protectedSpan.end : cursor + 1;
      continue;
    }

    const span = readMarkdownLinkSpan(line, cursor);

    if (span) {
      spans.push(span);
      cursor = span.end;
      continue;
    }

    cursor += 1;
  }

  return spans;
}

function readMarkdownLinkSpan(line: string, start: number) {
  let labelStart = start;

  if (line[start] === "!") {
    if (line[start + 1] !== "[" || isEscapedMarkdownToken(line, start)) {
      return null;
    }

    labelStart = start + 1;
  } else if (line[start] !== "[" || isEscapedMarkdownToken(line, start)) {
    return null;
  }

  const labelEnd = findMatchingDelimiter(line, labelStart, "[", "]");

  if (labelEnd === -1) {
    return null;
  }

  const destinationStart = labelEnd + 1;
  const destinationMarker = line[destinationStart];

  if (destinationMarker === "(") {
    const destinationEnd = findMatchingDelimiter(
      line,
      destinationStart,
      "(",
      ")",
    );

    return destinationEnd === -1
      ? null
      : { end: destinationEnd + 1, start };
  }

  if (destinationMarker === "[") {
    const referenceEnd = findMatchingDelimiter(
      line,
      destinationStart,
      "[",
      "]",
    );

    return referenceEnd === -1 ? null : { end: referenceEnd + 1, start };
  }

  return null;
}

function findMatchingDelimiter(
  value: string,
  openIndex: number,
  open: string,
  close: string,
) {
  let depth = 0;

  for (let index = openIndex; index < value.length; index += 1) {
    const character = value[index];

    if (isEscapedMarkdownToken(value, index)) {
      continue;
    }

    if (character === open) {
      depth += 1;
      continue;
    }

    if (character === close) {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

function mergeProtectedSpans(spans: ProtectedMarkdownSpan[]) {
  const sortedSpans = spans
    .filter((span) => span.end > span.start)
    .sort((left, right) => left.start - right.start || left.end - right.end);
  const mergedSpans: ProtectedMarkdownSpan[] = [];

  for (const span of sortedSpans) {
    const previous = mergedSpans.at(-1);

    if (previous && span.start <= previous.end) {
      previous.end = Math.max(previous.end, span.end);
      continue;
    }

    mergedSpans.push({ ...span });
  }

  return mergedSpans;
}

function isIndexProtected(spans: ProtectedMarkdownSpan[], index: number) {
  return Boolean(getContainingProtectedSpan(spans, index));
}

function getContainingProtectedSpan(
  spans: ProtectedMarkdownSpan[],
  index: number,
) {
  return spans.find((span) => index >= span.start && index < span.end);
}

function countRepeatedCharacters(
  value: string,
  start: number,
  character: string,
) {
  let count = 0;

  while (value[start + count] === character) {
    count += 1;
  }

  return count;
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

function getTokenByHref(
  href: string,
  prefix: string,
  type: RedditToken["type"],
  tokens: RedditToken[],
) {
  const index = Number(href.slice(prefix.length));
  const token = Number.isInteger(index) ? tokens[index] : undefined;

  if (!token || token.type !== type) {
    return null;
  }

  return token;
}

function normalizeTokenText(text: string) {
  return text.trim();
}

function escapeMarkdownLinkText(text: string) {
  return text.replace(/([\\[\]])/g, "\\$1");
}

function transformOutsideFencedCodeBlocks(
  markdown: string,
  transformLine: (line: string) => string,
) {
  const lines = markdown.split(/\r?\n/);
  let fenceMarker: "`" | "~" | null = null;
  const transformedLines: string[] = [];

  for (const line of lines) {
    const fenceMatch = line.trimStart().match(/^(`{3,}|~{3,})/);

    if (fenceMatch) {
      const marker = fenceMatch[1].startsWith("`") ? "`" : "~";

      if (!fenceMarker) {
        fenceMarker = marker;
        transformedLines.push(line);
        continue;
      }

      if (fenceMarker === marker) {
        fenceMarker = null;
        transformedLines.push(line);
        continue;
      }
    }

    transformedLines.push(fenceMarker ? line : transformLine(line));
  }

  return transformedLines.join("\n");
}
