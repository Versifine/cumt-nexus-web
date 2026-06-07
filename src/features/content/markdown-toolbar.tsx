"use client";

import type { ReactNode, RefObject } from "react";
import {
  Bold,
  Code,
  CodeXml,
  EyeOff,
  Heading2,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Table,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  blockPrefixSelection,
  fencedCodeBlockSelection,
  linkSelection,
  type MarkdownInsert,
  orderedListSelection,
  spoilerSelection,
  tableSelection,
  wrapSelection,
} from "@/features/content/markdown-toolbar-actions";
import { cn } from "@/lib/utils";

type MarkdownTool = {
  apply: (selectedText: string) => MarkdownInsert;
  icon: ReactNode;
  label: string;
};

type MarkdownToolbarProps = {
  className?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
};

const tools: MarkdownTool[] = [
  {
    apply: (selectedText) => wrapSelection(selectedText, "**", "加粗文字"),
    icon: <Bold aria-hidden="true" />,
    label: "加粗",
  },
  {
    apply: (selectedText) => wrapSelection(selectedText, "*", "斜体文字"),
    icon: <Italic aria-hidden="true" />,
    label: "斜体",
  },
  {
    apply: (selectedText) =>
      blockPrefixSelection(selectedText, "## ", "## 小标题"),
    icon: <Heading2 aria-hidden="true" />,
    label: "标题",
  },
  {
    apply: (selectedText) => wrapSelection(selectedText, "~~", "删除线文字"),
    icon: <Strikethrough aria-hidden="true" />,
    label: "删除线",
  },
  {
    apply: (selectedText) =>
      blockPrefixSelection(selectedText, "> ", "> 引用内容"),
    icon: <Quote aria-hidden="true" />,
    label: "引用",
  },
  {
    apply: (selectedText) =>
      blockPrefixSelection(selectedText, "- ", "- 列表项"),
    icon: <List aria-hidden="true" />,
    label: "无序列表",
  },
  {
    apply: (selectedText) => orderedListSelection(selectedText),
    icon: <ListOrdered aria-hidden="true" />,
    label: "有序列表",
  },
  {
    apply: (selectedText) => wrapSelection(selectedText, "`", "代码"),
    icon: <Code aria-hidden="true" />,
    label: "代码",
  },
  {
    apply: (selectedText) => fencedCodeBlockSelection(selectedText),
    icon: <CodeXml aria-hidden="true" />,
    label: "代码块",
  },
  {
    apply: linkSelection,
    icon: <Link aria-hidden="true" />,
    label: "链接",
  },
  {
    apply: spoilerSelection,
    icon: <EyeOff aria-hidden="true" />,
    label: "涂黑",
  },
  {
    apply: tableSelection,
    icon: <Table aria-hidden="true" />,
    label: "表格",
  },
];

export function MarkdownToolbar({
  className,
  disabled = false,
  onChange,
  textareaRef,
  value,
}: MarkdownToolbarProps) {
  function applyTool(tool: MarkdownTool) {
    const selectedText = getCurrentSelectionText(textareaRef.current, value);
    const insert = tool.apply(selectedText);

    insertMarkdownAtCursor({
      insert,
      onChange,
      textarea: textareaRef.current,
      value,
    });
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1 border border-border bg-background-soft p-1",
        className,
      )}
      aria-label="正文格式工具栏"
    >
      <span className="px-2 font-mono text-[11px] text-muted-foreground">
        格式
      </span>
      {tools.map((tool) => (
        <Button
          key={tool.label}
          aria-label={tool.label}
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyTool(tool)}
          size="icon"
          title={tool.label}
          type="button"
          variant="ghost"
          className="size-9 rounded-md"
        >
          {tool.icon}
        </Button>
      ))}
    </div>
  );
}

function getCurrentSelectionText(
  textarea: HTMLTextAreaElement | null,
  value: string,
) {
  const start = textarea?.selectionStart ?? value.length;
  const end = textarea?.selectionEnd ?? value.length;

  return value.slice(start, end);
}

export function insertMarkdownAtCursor({
  insert,
  onChange,
  textarea,
  value,
}: {
  insert: MarkdownInsert | string;
  onChange: (value: string) => void;
  textarea: HTMLTextAreaElement | null;
  value: string;
}) {
  const normalizedInsert =
    typeof insert === "string" ? { text: insert } : insert;
  const start = textarea?.selectionStart ?? value.length;
  const end = textarea?.selectionEnd ?? value.length;
  const before = value.slice(0, start);
  const after = value.slice(end);
  const shouldPadBefore =
    normalizedInsert.block && Boolean(before) && !before.endsWith("\n");
  const shouldPadAfter =
    normalizedInsert.block && (!after || !after.startsWith("\n"));
  const insertedText = [
    shouldPadBefore ? "\n" : "",
    normalizedInsert.text,
    shouldPadAfter ? "\n" : "",
  ].join("");
  const nextValue = `${before}${insertedText}${after}`;

  onChange(nextValue);

  window.requestAnimationFrame(() => {
    textarea?.focus();

    if (!textarea) {
      return;
    }

    const selection = normalizedInsert.selection ?? {
      end: insertedText.length,
      start: insertedText.length,
    };
    const insertionOffset = shouldPadBefore ? 1 : 0;
    textarea.setSelectionRange(
      start + insertionOffset + selection.start,
      start + insertionOffset + selection.end,
    );
  });
}
