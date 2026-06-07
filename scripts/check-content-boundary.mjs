#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import process from "node:process";

const root = process.cwd();
const sourceRoot = resolve(root, "src");
const results = [];

const sourceFiles = existsSync(sourceRoot)
  ? listSourceFiles(sourceRoot).map((filePath) => ({
      absolutePath: filePath,
      content: readFileSync(filePath, "utf8"),
      path: normalizePath(relative(root, filePath)),
    }))
  : [];

const requiredContentEntryConsumers = [
  "src/features/post/post-detail.tsx",
  "src/features/comment/comment-tree.tsx",
  "src/features/profile/public-user-comments.tsx",
];

const requiredComposerConsumers = [
  "src/features/post/post-form.tsx",
  "src/features/comment/comment-form.tsx",
  "src/features/post/post-lifecycle-controls.tsx",
  "src/features/comment/comment-lifecycle-controls.tsx",
];

const requiredToolbarLabels = [
  "加粗",
  "斜体",
  "标题",
  "删除线",
  "引用",
  "无序列表",
  "有序列表",
  "代码",
  "代码块",
  "链接",
  "涂黑",
  "表格",
];

const blockedPatterns = [
  {
    detail: "user content must be rendered as React nodes, not injected HTML",
    name: "dangerouslySetInnerHTML",
    pattern: /dangerouslySetInnerHTML/,
  },
  {
    detail: "raw HTML mutation APIs are not allowed in frontend content rendering",
    name: "raw HTML mutation",
    pattern:
      /(?:\.(?:innerHTML|outerHTML)\s*(?:[+\-*/%]?=)|insertAdjacentHTML\s*\(|document\.write\s*\(|createContextualFragment\s*\(|new\s+DOMParser\s*\()/,
  },
  {
    detail: "rehype-raw would re-enable raw user HTML and is banned by docs",
    name: "rehype-raw",
    pattern:
      /(?:from\s+["']rehype-raw["']|require\s*\(\s*["']rehype-raw["']\s*\)|import\s*\(\s*["']rehype-raw["']\s*\)|\brehypeRaw\b)/,
  },
  {
    detail: "embed support must be a future whitelist provider slice, not arbitrary iframe HTML",
    name: "arbitrary iframe",
    pattern: /<iframe\b|srcDoc\s*=/i,
  },
];

console.log("CUMT Nexus Web content boundary check");
console.log("");

checkSourceRoot();
checkBlockedSourcePatterns();
checkBlockedDirectDependencies();
checkContentEntryPoint();
checkMarkdownComposerEntryPoint();
checkMarkdownToolbarTools();
checkLifecycleComposerDefaultMode();
checkPublishedAttachmentRenderingBoundary();
checkPublishedAttachmentNoFallbackGallery();
checkComposerImageCopy();

for (const result of results) {
  console.log(`[${result.status.toUpperCase()}] ${result.name} - ${result.detail}`);
}

const failCount = results.filter((result) => result.status === "fail").length;
console.log("");

if (failCount > 0) {
  console.error(`Content boundary check failed with ${failCount} blocker(s).`);
  process.exit(1);
}

console.log("Content boundary check passed.");

function checkSourceRoot() {
  if (!existsSync(sourceRoot)) {
    addFail("source root", "src directory is missing");
    return;
  }

  addPass("source root", `${sourceFiles.length} source file(s) scanned`);
}

function checkBlockedSourcePatterns() {
  for (const blocked of blockedPatterns) {
    const offenders = [];

    for (const file of sourceFiles) {
      if (blocked.pattern.test(file.content)) {
        offenders.push(file.path);
      }
    }

    if (offenders.length > 0) {
      addFail(blocked.name, `${blocked.detail}; found ${offenders.join(", ")}`);
      continue;
    }

    addPass(blocked.name, blocked.detail);
  }
}

function checkBlockedDirectDependencies() {
  const packageJson = readJsonFile("package.json");

  if (!packageJson) {
    return;
  }

  const directDependencies = [
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
  ];
  const blocked = directDependencies.filter((name) => name === "rehype-raw");

  if (blocked.length > 0) {
    addFail("blocked content dependencies", `found banned package(s): ${blocked.join(", ")}`);
    return;
  }

  addPass("blocked content dependencies", "no banned raw HTML Markdown package is declared directly");
}

function checkContentEntryPoint() {
  const contentBody = sourceFiles.find(
    (file) => file.path === "src/features/content/content-body.tsx",
  );

  if (!contentBody) {
    addFail("ContentBody entry", "src/features/content/content-body.tsx is missing");
    return;
  }

  const missingConsumers = [];

  for (const consumerPath of requiredContentEntryConsumers) {
    const consumer = sourceFiles.find((file) => file.path === consumerPath);

    if (!consumer) {
      missingConsumers.push(`${consumerPath} is missing`);
      continue;
    }

    if (!consumer.content.includes("@/features/content/content-body")) {
      missingConsumers.push(`${consumerPath} does not import ContentBody`);
    }

    if (!/<ContentBody[\s\S]*?\battachments=/.test(consumer.content)) {
      missingConsumers.push(`${consumerPath} renders ContentBody without attachments`);
    }
  }

  if (missingConsumers.length > 0) {
    addFail("ContentBody consumers", missingConsumers.join("; "));
    return;
  }

  addPass(
    "ContentBody consumers",
    `${requiredContentEntryConsumers.length} approved consumer(s) use the shared content renderer`,
  );
}

function checkMarkdownComposerEntryPoint() {
  const composer = sourceFiles.find(
    (file) => file.path === "src/features/content/markdown-composer-field.tsx",
  );

  if (!composer) {
    addFail("MarkdownComposerField entry", "src/features/content/markdown-composer-field.tsx is missing");
    return;
  }

  const composerProblems = [];

  if (!composer.content.includes("@/features/content/content-body")) {
    composerProblems.push("MarkdownComposerField preview does not import ContentBody");
  }

  if (!/<ContentBody[\s\S]*?\battachments=/.test(composer.content)) {
    composerProblems.push("MarkdownComposerField preview renders without shared attachment-aware ContentBody");
  }

  if (composerProblems.length > 0) {
    addFail("MarkdownComposerField preview boundary", composerProblems.join("; "));
    return;
  }

  addPass(
    "MarkdownComposerField preview boundary",
    "composer preview uses the same attachment-aware ContentBody renderer as published content",
  );

  const missingConsumers = [];

  for (const consumerPath of requiredComposerConsumers) {
    const consumer = sourceFiles.find((file) => file.path === consumerPath);

    if (!consumer) {
      missingConsumers.push(`${consumerPath} is missing`);
      continue;
    }

    if (!consumer.content.includes("@/features/content/markdown-composer-field")) {
      missingConsumers.push(`${consumerPath} does not import MarkdownComposerField`);
    }
  }

  if (missingConsumers.length > 0) {
    addFail("MarkdownComposerField consumers", missingConsumers.join("; "));
    return;
  }

  addPass(
    "MarkdownComposerField consumers",
    `${requiredComposerConsumers.length} writing surface(s) use the shared Markdown composer`,
  );
}

function checkMarkdownToolbarTools() {
  const toolbar = sourceFiles.find(
    (file) => file.path === "src/features/content/markdown-toolbar.tsx",
  );

  if (!toolbar) {
    addFail("MarkdownToolbar entry", "src/features/content/markdown-toolbar.tsx is missing");
    return;
  }

  const missingLabels = requiredToolbarLabels.filter(
    (label) => !toolbar.content.includes(`label: "${label}"`),
  );

  if (missingLabels.length > 0) {
    addFail("MarkdownToolbar tools", `missing tool label(s): ${missingLabels.join(", ")}`);
    return;
  }

  addPass(
    "MarkdownToolbar tools",
    `${requiredToolbarLabels.length} Markdown tool action(s) are declared`,
  );
}

function checkLifecycleComposerDefaultMode() {
  const lifecycleConsumers = [
    "src/features/post/post-lifecycle-controls.tsx",
    "src/features/comment/comment-lifecycle-controls.tsx",
  ];
  const missingPreviewDefault = [];

  for (const consumerPath of lifecycleConsumers) {
    const consumer = sourceFiles.find((file) => file.path === consumerPath);

    if (!consumer) {
      missingPreviewDefault.push(`${consumerPath} is missing`);
      continue;
    }

    if (!/<MarkdownComposerField[\s\S]*?\bdefaultMode="preview"/.test(consumer.content)) {
      missingPreviewDefault.push(`${consumerPath} does not default edit dialog to preview`);
    }
  }

  if (missingPreviewDefault.length > 0) {
    addFail(
      "Markdown lifecycle preview default",
      missingPreviewDefault.join("; "),
    );
    return;
  }

  addPass(
    "Markdown lifecycle preview default",
    "post and comment edit dialogs render preview before exposing Markdown source",
  );
}

function checkPublishedAttachmentRenderingBoundary() {
  const galleryOffenders = [];

  for (const consumerPath of requiredContentEntryConsumers) {
    const consumer = sourceFiles.find((file) => file.path === consumerPath);

    if (consumer?.content.includes("MediaAttachmentGallery")) {
      galleryOffenders.push(consumerPath);
    }
  }

  if (galleryOffenders.length > 0) {
    addFail(
      "published attachment rendering boundary",
      `published posts and comments must render attachments through ContentBody; found gallery imports in ${galleryOffenders.join(", ")}`,
    );
    return;
  }

  addPass(
    "published attachment rendering boundary",
    "published posts and comments keep images inside the shared Markdown content renderer",
  );
}

function checkPublishedAttachmentNoFallbackGallery() {
  const contentBody = sourceFiles.find(
    (file) => file.path === "src/features/content/content-body.tsx",
  );

  if (!contentBody) {
    addFail("published attachment fallback", "src/features/content/content-body.tsx is missing");
    return;
  }

  const blockedPatterns = [
    "fallbackAttachments",
    "MediaAttachmentFigure",
    "getReferencedAttachmentIds(value)",
  ];
  const foundBlockedPatterns = blockedPatterns.filter((pattern) =>
    contentBody.content.includes(pattern),
  );

  if (foundBlockedPatterns.length > 0) {
    addFail(
      "published attachment fallback",
      `published attachments must render only when referenced by Markdown; found fallback pattern(s): ${foundBlockedPatterns.join(", ")}`,
    );
    return;
  }

  addPass(
    "published attachment fallback",
    "published attachments are not appended outside the Markdown body",
  );
}

function checkComposerImageCopy() {
  const composer = sourceFiles.find(
    (file) => file.path === "src/features/content/markdown-composer-field.tsx",
  );
  const mediaAttachments = sourceFiles.find(
    (file) => file.path === "src/features/media/media-attachments.tsx",
  );

  if (!composer) {
    addFail("composer image copy", "src/features/content/markdown-composer-field.tsx is missing");
    return;
  }

  if (!mediaAttachments) {
    addFail("composer image copy", "src/features/media/media-attachments.tsx is missing");
    return;
  }

  const blockedCopy = ["待提交图片", "已移除待提交图片", "已绑定图片"];
  const foundBlockedCopy = blockedCopy.filter((copy) =>
    mediaAttachments.content.includes(copy),
  );

  if (foundBlockedCopy.length > 0) {
    addFail(
      "composer image copy",
      `image writing area must use 正文图片 wording, found: ${foundBlockedCopy.join(", ")}`,
    );
    return;
  }

  const detachedUploadPatterns = [
    {
      detail: "legacy detached image uploader component",
      pattern: "ImageAttachmentUploader",
    },
    {
      detail: "legacy detached alt-text field",
      pattern: "图片说明",
    },
    {
      detail: "legacy detached file field",
      pattern: "选择图片",
    },
  ];
  const detachedUploadOffenders = [];

  for (const blocked of detachedUploadPatterns) {
    for (const file of [composer, mediaAttachments]) {
      if (file.content.includes(blocked.pattern)) {
        detachedUploadOffenders.push(`${blocked.detail} in ${file.path}`);
      }
    }
  }

  if (detachedUploadOffenders.length > 0) {
    addFail(
      "composer image copy",
      `image writing must stay inside the Markdown composer toolbar; found ${detachedUploadOffenders.join("; ")}`,
    );
    return;
  }

  if (
    !composer.content.includes("trailingTools={renderImageTool()}") ||
    !composer.content.includes('aria-label="添加图片"') ||
    !composer.content.includes("onMouseDown={(event) => event.preventDefault()}")
  ) {
    addFail(
      "composer image tool",
      "MarkdownComposerField must expose image selection as a toolbar tool that preserves textarea selection",
    );
    return;
  }

  if (
    !composer.content.includes("function removeInlineImageAttachment") ||
    !composer.content.includes("imageUpload.onChange(") ||
    !composer.content.includes("filter((item) => item.id !== attachment.id)")
  ) {
    addFail(
      "composer image removal",
      "removing an inline image must remove both Markdown references and pending attachment_ids",
    );
    return;
  }

  if (!mediaAttachments.content.includes("正文图片")) {
    addFail(
      "composer image copy",
      "image writing area must label uploaded images as 正文图片",
    );
    return;
  }

  addPass(
    "composer image copy",
    "image writing area uses 正文图片 wording instead of detached attachment wording",
  );
}

function readJsonFile(fileName) {
  const filePath = resolve(root, fileName);

  if (!existsSync(filePath)) {
    addFail(fileName, "file is missing");
    return null;
  }

  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    addFail(fileName, `invalid JSON: ${error.message}`);
    return null;
  }
}

function listSourceFiles(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
      continue;
    }

    if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

function normalizePath(path) {
  return path.split(sep).join("/");
}

function addPass(name, detail) {
  results.push({ detail, name, status: "pass" });
}

function addFail(name, detail) {
  results.push({ detail, name, status: "fail" });
}
