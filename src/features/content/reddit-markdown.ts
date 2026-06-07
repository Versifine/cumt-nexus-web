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
  const withSpoilers = transformOutsideCodeSegments(value, (segment) =>
    replaceDelimitedTokens({
      close: "!<",
      createMarkdown: (index) => `[显示隐藏内容](${spoilerLinkPrefix}${index})`,
      open: ">!",
      tokens: spoilerTokens,
      type: "spoiler",
      value: segment,
    }),
  );

  const tokens = [...spoilerTokens];
  const markdown = transformOutsideCodeSegments(withSpoilers, (segment) =>
    segment.replace(
      /\^\(([^)\n]+)\)|\^([^\s^]+)/g,
      (
        match,
        parenthesized: string | undefined,
        bare: string | undefined,
      ) => {
        const text = normalizeTokenText(parenthesized ?? bare ?? "");

        if (!text) {
          return match;
        }

        const index = tokens.length;
        tokens.push({ text, type: "sup" });
        return `[${escapeMarkdownLinkText(text)}](${superscriptLinkPrefix}${index})`;
      },
    ),
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

function replaceDelimitedTokens({
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
  let cursor = 0;
  let result = "";

  while (cursor < value.length) {
    const start = value.indexOf(open, cursor);

    if (start === -1) {
      result += value.slice(cursor);
      break;
    }

    const end = value.indexOf(close, start + open.length);

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

function transformOutsideCodeSegments(
  markdown: string,
  transformSegment: (segment: string) => string,
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

    transformedLines.push(
      fenceMarker ? line : transformInlineTextOutsideCode(line, transformSegment),
    );
  }

  return transformedLines.join("\n");
}

function transformInlineTextOutsideCode(
  line: string,
  transformSegment: (segment: string) => string,
) {
  return line
    .split(/(`[^`\n]*`)/g)
    .map((segment) =>
      segment.startsWith("`") && segment.endsWith("`")
        ? segment
        : transformSegment(segment),
    )
    .join("");
}
