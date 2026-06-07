export type MarkdownInsert = {
  block?: boolean;
  selection?: {
    end: number;
    start: number;
  };
  text: string;
};

const defaultLinkLabel = "链接文字";
const defaultLinkHref = "https://";
const attachmentMarkdownUrlPrefix = "nexus-attachment:";
const allowedAbsoluteLinkProtocols = new Set(["http:", "https:", "mailto:"]);
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;

export function wrapSelection(
  selectedText: string,
  marker: string,
  fallback: string,
): MarkdownInsert {
  const content = selectedText || fallback;

  return {
    selection: {
      end: marker.length + content.length,
      start: marker.length,
    },
    text: `${marker}${content}${marker}`,
  };
}

export function blockPrefixSelection(
  selectedText: string,
  prefix: string,
  fallback: string,
): MarkdownInsert {
  return {
    block: true,
    text: selectedText
      ? selectedText
          .split(/\r?\n/)
          .map((line) => `${prefix}${line}`)
          .join("\n")
      : fallback,
  };
}

export function orderedListSelection(selectedText: string): MarkdownInsert {
  if (!selectedText) {
    return {
      block: true,
      text: "1. 列表项",
    };
  }

  return {
    block: true,
    text: selectedText
      .split(/\r?\n/)
      .map((line, index) => `${index + 1}. ${line}`)
      .join("\n"),
  };
}

export function fencedCodeBlockSelection(selectedText: string): MarkdownInsert {
  const code = selectedText || "代码内容";
  const text = `\`\`\`\n${code}\n\`\`\``;
  const start = "```\n".length;

  return {
    block: true,
    selection: {
      end: start + code.length,
      start,
    },
    text,
  };
}

export function linkSelection(selectedText: string): MarkdownInsert {
  if (!selectedText) {
    return {
      selection: {
        end: 1 + defaultLinkLabel.length,
        start: 1,
      },
      text: `[${defaultLinkLabel}](${defaultLinkHref})`,
    };
  }

  const normalizedHref = getSafeSelectedLinkHref(selectedText);

  if (normalizedHref) {
    return {
      selection: {
        end: 1 + defaultLinkLabel.length,
        start: 1,
      },
      text: `[${defaultLinkLabel}](${escapeMarkdownLinkDestination(normalizedHref)})`,
    };
  }

  const label = escapeMarkdownLinkLabel(selectedText);
  const hrefStart = label.length + 3;

  return {
    selection: {
      end: hrefStart + defaultLinkHref.length,
      start: hrefStart,
    },
    text: `[${label}](${defaultLinkHref})`,
  };
}

export function spoilerSelection(selectedText: string): MarkdownInsert {
  const content = selectedText || "隐藏内容";

  return {
    selection: {
      end: 3 + content.length,
      start: 3,
    },
    text: `>! ${content} !<`,
  };
}

export function tableSelection(): MarkdownInsert {
  return {
    block: true,
    text:
      "| 项目 | 说明 |\n| --- | --- |\n| 第一项 | 内容 |\n| 第二项 | 内容 |",
  };
}

function escapeMarkdownLinkLabel(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\r?\n/g, " ");
}

function escapeMarkdownLinkDestination(value: string) {
  return value.replace(/\(/g, "%28").replace(/\)/g, "%29");
}

function getSafeSelectedLinkHref(value: string) {
  const trimmedValue = value.trim();

  if (
    !trimmedValue ||
    controlCharacterPattern.test(trimmedValue) ||
    trimmedValue.startsWith(attachmentMarkdownUrlPrefix)
  ) {
    return "";
  }

  if (trimmedValue.startsWith("#")) {
    return trimmedValue;
  }

  if (trimmedValue.startsWith("/")) {
    return trimmedValue.startsWith("//") ? "" : trimmedValue;
  }

  try {
    const parsedUrl = new URL(trimmedValue);

    return allowedAbsoluteLinkProtocols.has(parsedUrl.protocol)
      ? trimmedValue
      : "";
  } catch {
    return "";
  }
}
