import type { MarkdownInsert } from "./markdown-toolbar-actions";

export type MarkdownInsertionResult = {
  selection: {
    end: number;
    start: number;
  };
  value: string;
};

export function applyMarkdownInsert({
  end,
  insert,
  start,
  value,
}: {
  end: number;
  insert: MarkdownInsert | string;
  start: number;
  value: string;
}): MarkdownInsertionResult {
  const normalizedInsert =
    typeof insert === "string" ? { text: insert } : insert;
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
  const selection = normalizedInsert.selection ?? {
    end: insertedText.length,
    start: insertedText.length,
  };
  const insertionOffset = shouldPadBefore ? 1 : 0;

  return {
    selection: {
      end: start + insertionOffset + selection.end,
      start: start + insertionOffset + selection.start,
    },
    value: nextValue,
  };
}
