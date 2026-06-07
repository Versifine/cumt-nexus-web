#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import ts from "typescript";

const root = process.cwd();
const { parseSpoilerSegments } = await importTypescriptModule(
  "src/features/content/spoiler-segments.ts",
);
const {
  createAttachmentMarkdown,
  getAttachmentIdFromMarkdownUrl,
  getReferencedAttachmentIds,
  isAttachmentMarkdownUrl,
  removeAttachmentMarkdownReferences,
} = await importTypescriptModule("src/features/content/attachment-markdown.ts");
const {
  isExternalMarkdownHref,
  normalizeMarkdownHref,
} = await importTypescriptModule("src/features/content/markdown-url.ts");
const {
  getMarkdownPlainTextSummary,
} = await importTypescriptModule("src/features/content/markdown-summary.ts");
const {
  fencedCodeBlockSelection,
  linkSelection,
  spoilerSelection,
  wrapSelection,
} = await importTypescriptModule("src/features/content/markdown-toolbar-actions.ts");

const spoilerCases = [
  {
    expected: [{ text: "", type: "text" }],
    name: "empty input stays plain text",
    value: "",
  },
  {
    expected: [{ text: "普通正文", type: "text" }],
    name: "plain text stays plain text",
    value: "普通正文",
  },
  {
    expected: [
      { text: "前文 ", type: "text" },
      { text: "隐藏内容", type: "spoiler" },
      { text: " 后文", type: "text" },
    ],
    name: "single spoiler is split and trimmed",
    value: "前文 >! 隐藏内容 !< 后文",
  },
  {
    expected: [
      { text: "A ", type: "text" },
      { text: "x", type: "spoiler" },
      { text: " B ", type: "text" },
      { text: "y", type: "spoiler" },
      { text: " C", type: "text" },
    ],
    name: "multiple spoilers are preserved in order",
    value: "A >! x !< B >! y !< C",
  },
  {
    expected: [{ text: "前文 >! 没有闭合", type: "text" }],
    name: "unclosed spoiler remains plain text",
    value: "前文 >! 没有闭合",
  },
  {
    expected: [
      { text: "前文 ", type: "text" },
      { text: "已闭合", type: "spoiler" },
      { text: " 后文 >! 未闭合", type: "text" },
    ],
    name: "later unclosed spoiler does not discard previous segments",
    value: "前文 >! 已闭合 !< 后文 >! 未闭合",
  },
  {
    expected: [{ text: "隐藏内容", type: "spoiler" }],
    name: "empty spoiler uses fallback text",
    value: ">!   !<",
  },
  {
    expected: [{ text: "第一行\n第二行", type: "spoiler" }],
    name: "multiline spoiler keeps internal line breaks",
    value: ">! 第一行\n第二行 !<",
  },
];

console.log("CUMT Nexus Web content segment check");
console.log("");

const failures = [];

for (const testCase of spoilerCases) {
  const actual = parseSpoilerSegments(testCase.value);

  if (!deepEqual(actual, testCase.expected)) {
    failures.push({ actual, expected: testCase.expected, name: testCase.name });
    console.log(`[FAIL] ${testCase.name}`);
    continue;
  }

  console.log(`[PASS] ${testCase.name}`);
}

checkAttachmentMarkdown();
checkMarkdownUrl();
checkMarkdownSummary();
checkMarkdownToolbarActions();

console.log("");

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure.name);
    console.error(`expected: ${JSON.stringify(failure.expected)}`);
    console.error(`actual:   ${JSON.stringify(failure.actual)}`);
  }

  console.error(`Content segment check failed with ${failures.length} blocker(s).`);
  process.exit(1);
}

console.log("Content segment check passed.");

async function importTypescriptModule(relativePath) {
  const sourcePath = resolve(root, relativePath);
  const source = readFileSync(sourcePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2020,
    },
  });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(
    transpiled.outputText,
  ).toString("base64")}`;

  return import(moduleUrl);
}

function checkAttachmentMarkdown() {
  const attachment = {
    alt_text: "图[草稿] 说明\n第二行",
    id: "image id/一)",
  };
  const attachmentMarkdown = createAttachmentMarkdown(attachment);
  const expectedAttachmentMarkdown =
    "![图\\[草稿\\] 说明 第二行](nexus-attachment:image%20id%2F%E4%B8%80%29)";

  expectEqual(
    "attachment markdown escapes alt text and encodes id",
    attachmentMarkdown,
    expectedAttachmentMarkdown,
  );

  expectEqual(
    "attachment markdown url decodes id",
    getAttachmentIdFromMarkdownUrl("nexus-attachment:image%20id%2F%E4%B8%80%29"),
    "image id/一)",
  );

  expectEqual(
    "invalid attachment markdown url is rejected",
    isAttachmentMarkdownUrl("https://example.com/image.png"),
    false,
  );

  expectEqual(
    "attachment references are extracted as decoded ids",
    [...getReferencedAttachmentIds(
      "正文\n![内容](nexus-attachment:img-1)\n![复杂](nexus-attachment:image%20id%2F%E4%B8%80%29)\n![外部](https://example.com/a.png)",
    )],
    ["img-1", "image id/一)"],
  );

  expectEqual(
    "removing an attachment reference keeps surrounding content and external images",
    removeAttachmentMarkdownReferences(
      "前文\n![内容](nexus-attachment:img-1)\n后文\n![外部](https://example.com/a.png)",
      "img-1",
    ),
    "前文\n后文\n![外部](https://example.com/a.png)",
  );

  expectEqual(
    "removing an attachment reference only removes the exact id",
    removeAttachmentMarkdownReferences(
      "![一](nexus-attachment:img-1)\n![十](nexus-attachment:img-10)",
      "img-1",
    ),
    "![十](nexus-attachment:img-10)",
  );

  expectEqual(
    "removing an attachment reference handles escaped alt text",
    removeAttachmentMarkdownReferences(
      "前文\n![图\\[草稿\\] 说明 第二行](nexus-attachment:image%20id%2F%E4%B8%80%29)\n后文",
      "image id/一)",
    ),
    "前文\n后文",
  );

  expectEqual(
    "removing an attachment reference handles escaped backslash alt text",
    removeAttachmentMarkdownReferences(
      "前文\n![路径 \\\\ 说明](nexus-attachment:img-escape)\n后文",
      "img-escape",
    ),
    "前文\n后文",
  );
}

function checkMarkdownUrl() {
  expectEqual(
    "http markdown links are allowed",
    normalizeMarkdownHref("https://example.com/path?q=1"),
    "https://example.com/path?q=1",
  );

  expectEqual(
    "mailto markdown links are allowed",
    normalizeMarkdownHref("mailto:hello@example.com"),
    "mailto:hello@example.com",
  );

  expectEqual(
    "site-relative markdown links are allowed",
    normalizeMarkdownHref("/communities/public"),
    "/communities/public",
  );

  expectEqual(
    "hash markdown links are allowed",
    normalizeMarkdownHref("#comments"),
    "#comments",
  );

  expectEqual(
    "attachment markdown links are allowed",
    normalizeMarkdownHref("nexus-attachment:img-1"),
    "nexus-attachment:img-1",
  );

  expectEqual(
    "protocol-relative markdown links are blocked",
    normalizeMarkdownHref("//example.com/path"),
    "",
  );

  expectEqual(
    "javascript markdown links are blocked",
    normalizeMarkdownHref("javascript:alert(1)"),
    "",
  );

  expectEqual(
    "data markdown links are blocked",
    normalizeMarkdownHref("data:text/html;base64,PHNjcmlwdA=="),
    "",
  );

  expectEqual(
    "control characters in markdown links are blocked",
    normalizeMarkdownHref("https://example.com/\nnext"),
    "",
  );

  expectEqual(
    "http markdown links are marked external",
    isExternalMarkdownHref("http://example.com"),
    true,
  );

  expectEqual(
    "uppercase http markdown links are marked external",
    isExternalMarkdownHref("HTTPS://example.com"),
    true,
  );

  expectEqual(
    "site-relative markdown links are not marked external",
    isExternalMarkdownHref("/communities/public"),
    false,
  );
}

function checkMarkdownSummary() {
  expectEqual(
    "markdown summary removes source markers and keeps readable text",
    getMarkdownPlainTextSummary(
      "## 标题\n\n**重点** [链接](https://example.com)\n\n![图\\[草稿\\]](nexus-attachment:img-1)\n>! 隐藏内容 !<",
    ),
    "标题 重点 链接 图片：图[草稿] 隐藏内容",
  );

  expectEqual(
    "markdown summary turns external image syntax into image text",
    getMarkdownPlainTextSummary("![外部图](https://example.com/a.png)\n正文"),
    "图片：外部图 正文",
  );

  expectEqual(
    "markdown summary uses fallback for empty source",
    getMarkdownPlainTextSummary("   ", "没有摘要"),
    "没有摘要",
  );
}

function checkMarkdownToolbarActions() {
  expectEqual(
    "toolbar inline fallback selects placeholder text",
    wrapSelection("", "**", "加粗文字"),
    {
      selection: { end: 6, start: 2 },
      text: "**加粗文字**",
    },
  );

  expectEqual(
    "toolbar inline selected text stays selected inside marker",
    wrapSelection("重点", "*", "斜体文字"),
    {
      selection: { end: 3, start: 1 },
      text: "*重点*",
    },
  );

  expectEqual(
    "toolbar spoiler fallback selects hidden placeholder",
    spoilerSelection(""),
    {
      selection: { end: 7, start: 3 },
      text: ">! 隐藏内容 !<",
    },
  );

  expectEqual(
    "toolbar link escapes label and places cursor in url",
    linkSelection("图[草稿]"),
    {
      selection: { end: 18, start: 18 },
      text: "[图\\[草稿\\]](https://)",
    },
  );

  expectEqual(
    "toolbar code block selects code placeholder",
    fencedCodeBlockSelection(""),
    {
      block: true,
      selection: { end: 8, start: 4 },
      text: "```\n代码内容\n```",
    },
  );
}

function expectEqual(name, actual, expected) {
  if (!deepEqual(actual, expected)) {
    failures.push({ actual, expected, name });
    console.log(`[FAIL] ${name}`);
    return;
  }

  console.log(`[PASS] ${name}`);
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}
