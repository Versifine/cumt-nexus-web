#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import process from "node:process";

const root = process.cwd();
const sourceRoot = resolve(root, "src");
const docsRoot = resolve(root, "docs");
const results = [];

const sourceFiles = existsSync(sourceRoot)
  ? listSourceFiles(sourceRoot).map((filePath) => ({
      absolutePath: filePath,
      content: readFileSync(filePath, "utf8"),
      path: normalizePath(relative(root, filePath)),
    }))
  : [];
const docsFiles = existsSync(docsRoot)
  ? listMarkdownFiles(docsRoot).map((filePath) => ({
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
checkRedditAutolinkBoundary();
checkMarkdownComposerEntryPoint();
checkMarkdownToolbarTools();
checkLifecycleComposerDefaultMode();
checkPublishedAttachmentRenderingBoundary();
checkPublishedAttachmentNoFallbackGallery();
checkPublishedAttachmentImageSizing();
checkComposerImageCopy();
checkComposerReferencedImageLimit();
checkMarkdownTypographyBoundary();
checkCommentTreeMobileIndentBoundary();
checkMarkdownSourceLeakage();
checkMediaContractDocs();

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

function checkRedditAutolinkBoundary() {
  const contentBody = sourceFiles.find(
    (file) => file.path === "src/features/content/content-body.tsx",
  );
  const autolink = sourceFiles.find(
    (file) => file.path === "src/features/content/reddit-autolink.ts",
  );
  const problems = [];

  if (!contentBody) {
    problems.push("src/features/content/content-body.tsx is missing");
  } else {
    if (!contentBody.content.includes("@/features/content/reddit-autolink")) {
      problems.push("ContentBody must import the Reddit-style autolink plugin");
    }

    if (!contentBody.content.includes("remarkPlugins={[remarkGfm, remarkRedditAutolink]}")) {
      problems.push("ContentBody must run Reddit-style autolink through the shared Markdown renderer");
    }
  }

  if (!autolink) {
    problems.push("src/features/content/reddit-autolink.ts is missing");
  } else {
    if (
      !autolink.content.includes("/communities/${encodeURIComponent(name)}") ||
      !autolink.content.includes("/users/${encodeURIComponent(name)}")
    ) {
      problems.push("Reddit-style autolink must map r/* and u/* to site routes");
    }

    for (const skippedType of ["code", "inlineCode", "link", "image"]) {
      if (!autolink.content.includes(`"${skippedType}"`)) {
        problems.push(`Reddit-style autolink must skip ${skippedType} nodes`);
      }
    }
  }

  if (problems.length > 0) {
    addFail("Reddit-style autolink boundary", problems.join("; "));
    return;
  }

  addPass(
    "Reddit-style autolink boundary",
    "ContentBody maps r/community and u/user references without touching code, links or images",
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

  if (
    !composer.content.includes("const hasPreviewContent = value.trim().length > 0") ||
    /const\s+hasPreviewContent\s*=[^;]*(?:previewAttachments|imageUpload|boundAttachments)/.test(
      composer.content,
    )
  ) {
    composerProblems.push(
      "MarkdownComposerField preview empty state must be based on Markdown body text, not detached uploaded attachments",
    );
  }

  if (
    !composer.content.includes("const hasDetachedPreviewImages =") ||
    !composer.content.includes("有图片还没有放入正文") ||
    !composer.content.includes("{detachedPreviewImageNotice}")
  ) {
    composerProblems.push(
      "MarkdownComposerField preview must explain uploaded images that are not inserted into the Markdown body",
    );
  }

  if (
    !composer.content.includes("hasUnsupportedMarkdownImageReferences") ||
    !composer.content.includes("外部 Markdown 图片不会作为正文图片保存") ||
    !composer.content.includes("{unsupportedMarkdownImageNotice}")
  ) {
    composerProblems.push(
      "MarkdownComposerField must warn authors when external Markdown image syntax will not become uploaded content images",
    );
  }

  if (composerProblems.length > 0) {
    addFail("MarkdownComposerField preview boundary", composerProblems.join("; "));
    return;
  }

  addPass(
    "MarkdownComposerField preview boundary",
    "composer preview uses the same attachment-aware ContentBody renderer as published content and keeps detached uploads out of preview content state",
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
    "MediaAttachmentGallery",
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

function checkPublishedAttachmentImageSizing() {
  const contentBody = sourceFiles.find(
    (file) => file.path === "src/features/content/content-body.tsx",
  );

  if (!contentBody) {
    addFail("published attachment image sizing", "src/features/content/content-body.tsx is missing");
    return;
  }

  const imageComponentMatch = contentBody.content.match(
    /function MarkdownAttachmentImage[\s\S]*?function isVisibleImageAttachment/,
  );
  const imageComponent = imageComponentMatch?.[0] ?? "";
  const sizingProblems = [];

  if (!imageComponent.includes("w-fit max-w-full")) {
    sizingProblems.push("attachment image wrapper must keep natural width while respecting the content column");
  }

  if (!imageComponent.includes("h-auto max-h-[520px] max-w-full")) {
    sizingProblems.push("attachment img must not force small images to full column width");
  }

  if (hasClassToken(imageComponent, "w-full")) {
    sizingProblems.push("attachment image renderer must not force images to w-full");
  }

  if (sizingProblems.length > 0) {
    addFail("published attachment image sizing", sizingProblems.join("; "));
    return;
  }

  addPass(
    "published attachment image sizing",
    "inline attachment images keep natural size and stay within the content column",
  );
}

function hasClassToken(source, token) {
  const classNamePattern = /className=["']([^"']*)["']/g;

  for (const match of source.matchAll(classNamePattern)) {
    if (match[1].split(/\s+/).includes(token)) {
      return true;
    }
  }

  return false;
}

function checkMediaContractDocs() {
  const docsByPath = new Map(docsFiles.map((file) => [file.path, file.content]));
  const offenders = [];
  const mediaGaps = docsByPath.get(
    "docs/internal/architecture/content-media-api-gaps.md",
  );
  const roadmap = docsByPath.get("docs/internal/product/v2-roadmap.md");
  const audit = docsByPath.get(
    "docs/internal/product/frontend-implementation-audit.md",
  );
  const blockedDocPhrases = [
    "待提交图片",
    "待提交附件",
    "帖子详情和评论树展示附件",
    "图片上传与附件展示",
    "图片上传和附件展示",
  ];
  const docPhraseOffenders = [];

  if (!mediaGaps) {
    offenders.push("content media API gaps doc is missing");
  } else {
    if (mediaGaps.includes("未来请求体建议扩展")) {
      offenders.push("publish/comment attachment_ids docs still describe completed contracts as future");
    }

    if (!mediaGaps.includes("编辑态附件重绑")) {
      offenders.push("content media API gaps doc must name the remaining edit attachment contract");
    }
  }

  if (!roadmap) {
    offenders.push("V2 roadmap doc is missing");
  } else {
    if (roadmap.includes("不再提供编辑 / 预览双模式")) {
      offenders.push("V2 roadmap still claims the composer has no edit/preview mode");
    }

    if (roadmap.includes("帖子详情和评论树展示返回图片")) {
      offenders.push("V2 roadmap still describes detached attachment rendering");
    }
  }

  if (!audit) {
    offenders.push("frontend implementation audit doc is missing");
  } else if (
    !audit.includes("编辑态新增图片仍需要后端更新接口接收 `attachment_ids`")
  ) {
    offenders.push("frontend audit must keep the edit image binding gap explicit");
  }

  for (const file of docsFiles) {
    for (const phrase of blockedDocPhrases) {
      if (file.content.includes(phrase)) {
        docPhraseOffenders.push(`${file.path}: ${phrase}`);
      }
    }
  }

  if (docPhraseOffenders.length > 0) {
    offenders.push(
      `media docs still use detached attachment wording: ${docPhraseOffenders.join("; ")}`,
    );
  }

  if (offenders.length > 0) {
    addFail("media contract docs", offenders.join("; "));
    return;
  }

  addPass(
    "media contract docs",
    "docs distinguish completed publish/comment image binding from the remaining edit binding contract",
  );
}

function checkComposerImageCopy() {
  const composer = sourceFiles.find(
    (file) => file.path === "src/features/content/markdown-composer-field.tsx",
  );
  const mediaAttachments = sourceFiles.find(
    (file) => file.path === "src/features/media/media-attachments.tsx",
  );
  const publishForms = [
    "src/features/post/post-form.tsx",
    "src/features/comment/comment-form.tsx",
  ];
  const lifecycleForms = [
    "src/features/post/post-lifecycle-controls.tsx",
    "src/features/comment/comment-lifecycle-controls.tsx",
  ];

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
    !composer.content.includes("onPaste={handleTextareaPaste}") ||
    !composer.content.includes("onPaste={handleComposerPaste}") ||
    !composer.content.includes("onDrop={handleComposerDrop}") ||
    !composer.content.includes("onDragOver={handleComposerDragOver}") ||
    !composer.content.includes("onDrop={handleTextareaDrop}") ||
    !composer.content.includes("onDragOver={handleTextareaDragOver}") ||
    !composer.content.includes("getImageFilesFromDataTransfer") ||
    !composer.content.includes("hasImageFileData") ||
    !composer.content.includes('await uploadInlineImageFiles(imageFiles, { insertion: "cursor" })') ||
    !composer.content.includes('await uploadInlineImageFiles(imageFiles, { insertion: "end" })') ||
    !composer.content.includes("event.clipboardData") ||
    !composer.content.includes("event.dataTransfer") ||
    !composer.content.includes("extractDataImageSourcesFromClipboardHtml") ||
    !composer.content.includes("extractDataImageSourcesFromClipboardText") ||
    !composer.content.includes("extractDataImageTextPaste") ||
    !composer.content.includes("getClipboardDataImagePlaceholder") ||
    !composer.content.includes("getDataImageFilesFromTransferHtml") ||
    !composer.content.includes("getDataImageFilesFromTransferText") ||
    !composer.content.includes("getDataImageTextPasteFromTransferText") ||
    !composer.content.includes("createFileFromDataImageSource") ||
    !composer.content.includes("uploadInlineDataImageTextPaste") ||
    !composer.content.includes("replaceClipboardDataImagePlaceholders") ||
    !composer.content.includes("applyMarkdownInsert") ||
    !composer.content.includes('setMode("edit")') ||
    !composer.content.includes('await uploadInlineImageFiles(imageFiles, { insertion })')
  ) {
    addFail(
      "composer pasted image insertion",
      "MarkdownComposerField must upload pasted or dropped image files, including clipboard HTML/text data images, preserve surrounding pasted text, and insert them into the Markdown body",
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

  const submitBindingOffenders = [];
  for (const formPath of publishForms) {
    const form = sourceFiles.find((file) => file.path === formPath);

    if (!form) {
      submitBindingOffenders.push(`${formPath} is missing`);
      continue;
    }

    if (
      !form.content.includes("getReferencedAttachmentIdsForSubmit") ||
      !form.content.includes("attachment_ids: getReferencedAttachmentIdsForSubmit(")
    ) {
      submitBindingOffenders.push(
        `${formPath} must submit only Markdown-referenced image attachment ids`,
      );
    }
  }

  if (submitBindingOffenders.length > 0) {
    addFail(
      "composer submit attachment ids",
      submitBindingOffenders.join("; "),
    );
    return;
  }

  addPass(
    "composer submit attachment ids",
    "publish forms submit only image attachment ids referenced by Markdown",
  );

  const editContractOffenders = [];
  for (const formPath of lifecycleForms) {
    const form = sourceFiles.find((file) => file.path === formPath);

    if (!form) {
      editContractOffenders.push(`${formPath} is missing`);
      continue;
    }

    if (form.content.includes("imageUpload={{")) {
      editContractOffenders.push(
        `${formPath} must not expose edit-time image upload until PATCH attachment_ids is supported`,
      );
    }

    if (form.content.includes("attachment_ids:")) {
      editContractOffenders.push(
        `${formPath} must not send attachment_ids to current edit PATCH endpoints`,
      );
    }

    if (!form.content.includes("boundAttachments=")) {
      editContractOffenders.push(
        `${formPath} must still let authors place already-bound images back into the Markdown body`,
      );
    }

    if (!form.content.includes("当前编辑接口暂不支持新增图片")) {
      editContractOffenders.push(
        `${formPath} must tell authors edit-time new image upload is not supported by the current PATCH contract`,
      );
    }
  }

  if (editContractOffenders.length > 0) {
    addFail(
      "composer edit attachment contract",
      editContractOffenders.join("; "),
    );
    return;
  }

  addPass(
    "composer edit attachment contract",
    "post and comment edit dialogs do not expose unsupported new image binding but keep already-bound image placement available",
  );

  if (
    !composer.content.includes('imageUpload && mode === "edit"') ||
    !composer.content.includes('boundAttachments && mode === "edit"')
  ) {
    addFail(
      "composer preview editing controls",
      "image insertion and attachment management controls must stay hidden until the editor tab is active",
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

function checkMarkdownSourceLeakage() {
  const leaks = [];
  const lifecycle = sourceFiles.find(
    (file) => file.path === "src/features/comment/comment-lifecycle-controls.tsx",
  );
  const commentTree = sourceFiles.find(
    (file) => file.path === "src/features/comment/comment-tree.tsx",
  );
  const moderationConsole = sourceFiles.find(
    (file) => file.path === "src/features/moderation/moderation-console.tsx",
  );

  if (!lifecycle) {
    leaks.push("src/features/comment/comment-lifecycle-controls.tsx is missing");
  } else {
    if (!lifecycle.content.includes("@/features/content/markdown-summary")) {
      leaks.push("comment delete confirmation must import Markdown summary cleanup");
    }

    if (/line-clamp-3[\s\S]*?\{comment\.body\}/.test(lifecycle.content)) {
      leaks.push("comment delete confirmation renders raw comment.body");
    }
  }

  if (!commentTree) {
    leaks.push("src/features/comment/comment-tree.tsx is missing");
  } else {
    if (!commentTree.content.includes("@/features/content/markdown-summary")) {
      leaks.push("comment action target labels must import Markdown summary cleanup");
    }

    if (/targetLabel=\{comment\.body/.test(commentTree.content)) {
      leaks.push("comment report/moderation target labels render raw comment.body");
    }
  }

  if (!moderationConsole) {
    leaks.push("src/features/moderation/moderation-console.tsx is missing");
  } else {
    if (!moderationConsole.content.includes("@/features/content/markdown-summary")) {
      leaks.push("moderation target previews must import Markdown summary cleanup");
    }

    if (
      /\{preview\?\.title\s*\|\|\s*preview\?\.body_excerpt\s*\|\|\s*report\.reason\}/.test(
        moderationConsole.content,
      ) ||
      /\{preview\.body_excerpt\s*\|\|\s*["']暂无预览。["']\}/.test(
        moderationConsole.content,
      )
    ) {
      leaks.push("moderation target previews render raw body_excerpt");
    }
  }

  if (leaks.length > 0) {
    addFail("Markdown source leakage", leaks.join("; "));
    return;
  }

  addPass(
    "Markdown source leakage",
    "destructive dialogs and moderation previews use cleaned Markdown summaries",
  );
}

function checkComposerReferencedImageLimit() {
  const composer = sourceFiles.find(
    (file) => file.path === "src/features/content/markdown-composer-field.tsx",
  );
  const mediaAttachments = sourceFiles.find(
    (file) => file.path === "src/features/media/media-attachments.tsx",
  );
  const consumers = [
    {
      path: "src/features/post/post-form.tsx",
      token: "maxReferencedAttachments={IMAGE_UPLOAD_LIMITS.maxCountPerPost}",
    },
    {
      path: "src/features/comment/comment-form.tsx",
      token: "maxReferencedAttachments={IMAGE_UPLOAD_LIMITS.maxCountPerComment}",
    },
    {
      path: "src/features/post/post-lifecycle-controls.tsx",
      token: "maxReferencedAttachments={IMAGE_UPLOAD_LIMITS.maxCountPerPost}",
    },
    {
      path: "src/features/comment/comment-lifecycle-controls.tsx",
      token: "maxReferencedAttachments={IMAGE_UPLOAD_LIMITS.maxCountPerComment}",
    },
  ];
  const problems = [];

  if (!composer) {
    problems.push("src/features/content/markdown-composer-field.tsx is missing");
  } else {
    if (!composer.content.includes("maxReferencedAttachments?: number")) {
      problems.push("MarkdownComposerField must accept a total referenced image limit");
    }

    if (
      !composer.content.includes("function canInsertAttachmentReference") ||
      !composer.content.includes("function getRemainingReferenceSlots") ||
      !composer.content.includes("正文最多放入")
    ) {
      problems.push(
        "MarkdownComposerField must block old and newly uploaded images from exceeding the referenced image limit",
      );
    }

    if (
      !composer.content.includes("canInsertAttachment={canInsertAttachmentReference}")
    ) {
      problems.push(
        "MarkdownComposerField must pass insert limit state to inline image controls",
      );
    }
  }

  if (!mediaAttachments) {
    problems.push("src/features/media/media-attachments.tsx is missing");
  } else {
    if (
      !mediaAttachments.content.includes("canInsertAttachment?:") ||
      !mediaAttachments.content.includes("已达上限") ||
      !mediaAttachments.content.includes("移动到光标处") ||
      !mediaAttachments.content.includes("disabled={disabled || !canInsert}")
    ) {
      problems.push(
        "inline image controls must allow inserted images to move while disabling actions when the composer reference limit is reached",
      );
    }
  }

  for (const consumerConfig of consumers) {
    const consumer = sourceFiles.find((file) => file.path === consumerConfig.path);

    if (!consumer) {
      problems.push(`${consumerConfig.path} is missing`);
      continue;
    }

    if (!consumer.content.includes(consumerConfig.token)) {
      problems.push(
        `${consumerConfig.path} does not pass the total referenced image limit`,
      );
    }
  }

  if (problems.length > 0) {
    addFail("composer referenced image limit", problems.join("; "));
    return;
  }

  addPass(
    "composer referenced image limit",
    "composer blocks post/comment image references from exceeding their total content limits",
  );
}

function checkMarkdownTypographyBoundary() {
  const contentBody = sourceFiles.find(
    (file) => file.path === "src/features/content/content-body.tsx",
  );
  const problems = [];

  if (!contentBody) {
    addFail("Markdown typography boundary", "src/features/content/content-body.tsx is missing");
    return;
  }

  const blockedHeadingTokens = ["text-3xl", "text-2xl", "font-black"];
  const foundBlockedHeadingTokens = blockedHeadingTokens.filter((token) =>
    contentBody.content.includes(token),
  );

  if (foundBlockedHeadingTokens.length > 0) {
    problems.push(
      `Markdown headings must stay at content scale, found: ${foundBlockedHeadingTokens.join(", ")}`,
    );
  }

  if (
    !contentBody.content.includes("input({ checked, type })") ||
    !contentBody.content.includes('type === "checkbox"') ||
    !contentBody.content.includes("accent-primary") ||
    !contentBody.content.includes('aria-label={checked ? "已完成" : "未完成"}')
  ) {
    problems.push("GFM task-list checkboxes must render through a stable ContentBody component");
  }

  if (
    !contentBody.content.includes("li({ children, className })") ||
    !contentBody.content.includes("[&>p]:my-0") ||
    !contentBody.content.includes("task-list-item")
  ) {
    problems.push("Markdown list items must preserve task-list class names and remove nested paragraph gaps");
  }

  if (
    !contentBody.content.includes("ul({ children, className })") ||
    !contentBody.content.includes("contains-task-list") ||
    !contentBody.content.includes("list-none pl-0")
  ) {
    problems.push("Markdown task lists must remove default bullets and padding");
  }

  if (problems.length > 0) {
    addFail("Markdown typography boundary", problems.join("; "));
    return;
  }

  addPass(
    "Markdown typography boundary",
    "ContentBody keeps Markdown headings and task lists at content scale",
  );
}

function checkCommentTreeMobileIndentBoundary() {
  const commentTree = sourceFiles.find(
    (file) => file.path === "src/features/comment/comment-tree.tsx",
  );
  const problems = [];

  if (!commentTree) {
    addFail("comment tree mobile indent", "src/features/comment/comment-tree.tsx is missing");
    return;
  }

  if (
    /visualDepth\s*>\s*0\s*&&\s*["'][^"']*\bml-\d/.test(commentTree.content) ||
    /visualDepth\s*>\s*0\s*&&\s*["'][^"']*\bsm:ml-\d/.test(commentTree.content)
  ) {
    problems.push("nested comments must not add recursive left margin on mobile");
  }

  if (!commentTree.content.includes('visualDepth > 0 && "border-l border-border pl-2 sm:pl-4"')) {
    problems.push("nested comments must use a narrow mobile border and padding indentation");
  }

  if (commentTree.content.includes("ml-3 inline-flex min-h-10")) {
    problems.push("depth expansion action must not add extra mobile left margin");
  }

  if (problems.length > 0) {
    addFail("comment tree mobile indent", problems.join("; "));
    return;
  }

  addPass(
    "comment tree mobile indent",
    "nested comments keep mobile indentation narrow so Markdown content remains readable",
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

function listMarkdownFiles(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...listMarkdownFiles(fullPath));
      continue;
    }

    if (/\.md$/.test(entry.name)) {
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
