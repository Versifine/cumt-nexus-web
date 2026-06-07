export type MarkdownInsert = {
  block?: boolean;
  selection?: {
    end: number;
    start: number;
  };
  text: string;
};

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
  const label = escapeMarkdownLinkLabel(selectedText || "链接文字");

  return {
    selection: {
      end: label.length + 11,
      start: label.length + 11,
    },
    text: `[${label}](https://)`,
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
