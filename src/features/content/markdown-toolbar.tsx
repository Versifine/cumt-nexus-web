"use client";

import type { ReactNode, RefObject } from "react";
import { Bold, Code, EyeOff, Italic, Link, Quote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MarkdownTool = {
  apply: (selectedText: string) => string;
  icon: ReactNode;
  label: string;
  selectionOffset?: (selectedText: string) => { end: number; start: number };
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
      selectedText
        ? selectedText
            .split(/\r?\n/)
            .map((line) => `> ${line}`)
            .join("\n")
        : "> 引用内容",
    icon: <Quote aria-hidden="true" />,
    label: "引用",
  },
  {
    apply: (selectedText) => wrapSelection(selectedText, "`", "代码"),
    icon: <Code aria-hidden="true" />,
    label: "代码",
  },
  {
    apply: (selectedText) => `[${selectedText || "链接文字"}](https://)`,
    icon: <Link aria-hidden="true" />,
    label: "链接",
    selectionOffset: (selectedText) => {
      const labelLength = selectedText ? selectedText.length : "链接文字".length;
      const cursor = labelLength + 11;

      return { end: cursor, start: cursor };
    },
  },
  {
    apply: (selectedText) => `>! ${selectedText || "隐藏内容"} !<`,
    icon: <EyeOff aria-hidden="true" />,
    label: "涂黑",
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
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const selectedText = value.slice(start, end);
    const after = value.slice(end);
    const insertedText = tool.apply(selectedText);
    const nextValue = `${before}${insertedText}${after}`;

    onChange(nextValue);

    window.requestAnimationFrame(() => {
      textarea?.focus();

      if (!textarea) {
        return;
      }

      const offset = tool.selectionOffset?.(selectedText) ?? {
        end: insertedText.length,
        start: insertedText.length,
      };
      textarea.setSelectionRange(start + offset.start, start + offset.end);
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

function wrapSelection(selectedText: string, marker: string, fallback: string) {
  return `${marker}${selectedText || fallback}${marker}`;
}
