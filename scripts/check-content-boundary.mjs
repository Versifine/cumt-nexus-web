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
    allowPaths: new Set(["src/features/content/media-embed-player.tsx"]),
    detail: "iframe rendering must stay inside the controlled whitelist media player",
    name: "arbitrary iframe",
    pattern: /<iframe\b/i,
  },
  {
    detail: "iframe srcDoc would re-enable user-controlled HTML and is banned",
    name: "iframe srcDoc",
    pattern: /srcDoc\s*=/i,
  },
];

console.log("CUMT Nexus Web content boundary check");
console.log("");

checkSourceRoot();
checkBlockedSourcePatterns();
checkBlockedDirectDependencies();
checkContentEntryPoint();
checkRedditAutolinkBoundary();
checkWhitelistedMediaEmbedBoundary();
checkMarkdownComposerEntryPoint();
checkMarkdownToolbarTools();
checkLifecycleComposerDefaultMode();
checkPublishedAttachmentRenderingBoundary();
checkPublishedAttachmentNoFallbackGallery();
checkPublishedAttachmentImageSizing();
checkComposerImageCopy();
checkComposerReferencedImageLimit();
checkMarkdownTypographyBoundary();
checkMarkdownMobileOverflowBoundary();
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
      if (blocked.allowPaths?.has(file.path)) {
        continue;
      }

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

function checkWhitelistedMediaEmbedBoundary() {
  const parser = sourceFiles.find(
    (file) => file.path === "src/features/content/media-embed.ts",
  );
  const player = sourceFiles.find(
    (file) => file.path === "src/features/content/media-embed-player.tsx",
  );
  const contentBody = sourceFiles.find(
    (file) => file.path === "src/features/content/content-body.tsx",
  );
  const problems = [];

  if (!parser) {
    problems.push("src/features/content/media-embed.ts is missing");
  } else {
    for (const token of [
      "resolveWhitelistedMediaEmbed",
      "isWhitelistedMediaAutolink",
      "\"bilibili\"",
      "\"douyin\"",
      "\"netease\"",
      "\"qq-music\"",
      "https://player.bilibili.com/player.html",
      "https://open.douyin.com/player/video",
      "https://music.163.com/outchain/player",
      "https://i.y.qq.com/n2/m/outchain/player/index.html",
    ]) {
      if (!parser.content.includes(token)) {
        problems.push(`media embed parser missing ${token}`);
      }
    }
  }

  if (!player) {
    problems.push("src/features/content/media-embed-player.tsx is missing");
  } else {
    for (const token of [
      "<iframe",
      "sandbox={playerSandbox}",
      "allowFullScreen",
      'referrerPolicy="strict-origin-when-cross-origin"',
      "打开原链接",
      "data-media-provider",
    ]) {
      if (!player.content.includes(token)) {
        problems.push(`media embed player missing ${token}`);
      }
    }
  }

  if (!contentBody) {
    problems.push("src/features/content/content-body.tsx is missing");
  } else {
    for (const token of [
      "@/features/content/media-embed",
      "@/features/content/media-embed-player",
      "isWhitelistedMediaAutolink",
      "resolveWhitelistedMediaEmbed",
      "<MediaEmbedPlayer embed={embed} />",
    ]) {
      if (!contentBody.content.includes(token)) {
        problems.push(`ContentBody missing whitelist embed integration ${token}`);
      }
    }
  }

  if (problems.length > 0) {
    addFail("whitelist media embed boundary", problems.join("; "));
    return;
  }

  addPass(
    "whitelist media embed boundary",
    "ContentBody auto-embeds only supported provider URLs through one controlled iframe wrapper",
  );
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

  for (const token of [
    "@tiptap/react",
    "@tiptap/markdown",
    "@tiptap/starter-kit",
    "@tiptap/extension-image",
    "@tiptap/extension-link",
    "EditorContent",
    "useEditor",
    'contentType: "markdown"',
    "getMarkdown()",
    "RichMarkdownToolbar",
    "MediaEmbedNode",
    "createMediaEmbedPlayerElement",
    "resolveWhitelistedMediaEmbed",
    "syncWhitelistedMediaEmbeds",
    "data-media-editor-node",
  ]) {
    if (!composer.content.includes(token)) {
      composerProblems.push(`MarkdownComposerField rich editor missing ${token}`);
    }
  }

  if (composer.content.includes("@/features/content/content-body")) {
    composerProblems.push("MarkdownComposerField must not use a separate ContentBody preview");
  }

  if (/<textarea\b/i.test(composer.content) || composer.content.includes("<Textarea")) {
    composerProblems.push("MarkdownComposerField must render one rich editing surface, not a textarea");
  }

  if (composer.content.includes("@/features/content/markdown-toolbar")) {
    composerProblems.push("MarkdownComposerField must use selection-aware Tiptap commands instead of the legacy insertion toolbar");
  }

  if (
    !composer.content.includes("const hasUnreferencedUploadedImages =") ||
    !composer.content.includes("未留在正文里的上传图片不会随内容发布") ||
    !composer.content.includes("{unreferencedUploadedImageNotice}")
  ) {
    composerProblems.push(
      "MarkdownComposerField must explain that uploaded images deleted from the editor are not submitted",
    );
  }

  if (
    !composer.content.includes("hasUnsupportedMarkdownImageReferences") ||
    !composer.content.includes("外部图片不会作为正文图片保存") ||
    !composer.content.includes("{unsupportedMarkdownImageNotice}")
  ) {
    composerProblems.push(
      "MarkdownComposerField must warn authors when external image syntax will not become uploaded content images",
    );
  }

  if (composerProblems.length > 0) {
    addFail("MarkdownComposerField rich editor boundary", composerProblems.join("; "));
    return;
  }

  addPass(
    "MarkdownComposerField rich editor boundary",
    "composer uses one rendered Tiptap editing surface while keeping Markdown as the submit format",
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
  const composer = sourceFiles.find(
    (file) => file.path === "src/features/content/markdown-composer-field.tsx",
  );

  if (!composer) {
    addFail("rich Markdown toolbar entry", "src/features/content/markdown-composer-field.tsx is missing");
    return;
  }

  const missingLabels = requiredToolbarLabels.filter(
    (label) => !composer.content.includes(`label: "${label}"`),
  );

  if (missingLabels.length > 0) {
    addFail("rich Markdown toolbar tools", `missing tool label(s): ${missingLabels.join(", ")}`);
    return;
  }

  const missingCommands = [
    "toggleBold()",
    "toggleItalic()",
    "toggleHeading({ level: 2 })",
    "toggleStrike()",
    "toggleBlockquote()",
    "toggleBulletList()",
    "toggleOrderedList()",
    "toggleCode()",
    "toggleCodeBlock()",
    "setLink({ href: normalizedHref })",
    "toggleSpoiler()",
    "insertTable({ rows: 3, cols: 3, withHeaderRow: true })",
  ].filter((token) => !composer.content.includes(token));

  if (missingCommands.length > 0) {
    addFail(
      "rich Markdown toolbar commands",
      `missing selection-aware command(s): ${missingCommands.join(", ")}`,
    );
    return;
  }

  addPass(
    "rich Markdown toolbar tools",
    `${requiredToolbarLabels.length} selection-aware Markdown tool action(s) are declared`,
  );
}

function checkLifecycleComposerDefaultMode() {
  const richEditorProblems = [];
  const composer = sourceFiles.find(
    (file) => file.path === "src/features/content/markdown-composer-field.tsx",
  );

  if (!composer) {
    richEditorProblems.push("src/features/content/markdown-composer-field.tsx is missing");
  } else {
    if (!composer.content.includes("EditorContent")) {
      richEditorProblems.push("MarkdownComposerField must render EditorContent");
    }

    if (
      composer.content.includes("源码编辑") ||
      composer.content.includes("收起源码") ||
      composer.content.includes("打开源码编辑") ||
      composer.content.includes("开始写作") ||
      composer.content.includes("编辑正文") ||
      composer.content.includes("发布效果")
    ) {
      richEditorProblems.push("MarkdownComposerField still exposes source/preview-oriented UI copy");
    }

    if (/\bmode\b/.test(composer.content) || /setMode/.test(composer.content)) {
      richEditorProblems.push("MarkdownComposerField must not keep edit/preview mode state");
    }
  }

  for (const consumerPath of requiredComposerConsumers) {
    const consumer = sourceFiles.find((file) => file.path === consumerPath);

    if (!consumer) {
      richEditorProblems.push(`${consumerPath} is missing`);
      continue;
    }

    if (/<MarkdownComposerField[\s\S]*?\bdefaultMode=/.test(consumer.content)) {
      richEditorProblems.push(`${consumerPath} still passes legacy defaultMode`);
    }

    if (
      consumer.content.includes("默认显示发布后的") ||
      consumer.content.includes("打开“编辑正文”")
    ) {
      richEditorProblems.push(`${consumerPath} still describes a preview-before-edit flow`);
    }
  }

  for (const consumerPath of [
    "src/features/post/post-lifecycle-controls.tsx",
    "src/features/comment/comment-lifecycle-controls.tsx",
  ]) {
    const consumer = sourceFiles.find((file) => file.path === consumerPath);

    if (consumer && !/<MarkdownComposerField[\s\S]*?\bkey=\{/.test(consumer.content)) {
      richEditorProblems.push(
        `${consumerPath} must remount edit dialog composer on open/close`,
      );
    }
  }

  if (richEditorProblems.length > 0) {
    addFail(
      "Markdown composer single surface",
      richEditorProblems.join("; "),
    );
    return;
  }

  addPass(
    "Markdown composer single surface",
    "all post and comment writing surfaces use one rendered editor without source/preview mode UI",
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
  const imageGallery = sourceFiles.find(
    (file) => file.path === "src/features/content/content-image-gallery.tsx",
  );
  const contentMedia = sourceFiles.find(
    (file) => file.path === "src/features/content/content-media.ts",
  );
  const listItem = sourceFiles.find(
    (file) => file.path === "src/features/post/reddit-post-list-item.tsx",
  );

  const problems = [];

  if (!contentBody) {
    problems.push("src/features/content/content-body.tsx is missing");
  } else {
    for (const token of [
      "ContentImageGallery",
      "resolveImageMediaBlockFromMarkdownUrl",
      "isAttachmentGalleryMarkdownUrl",
      'variant="detail"',
    ]) {
      if (!contentBody.content.includes(token)) {
        problems.push(`ContentBody missing gallery integration token ${token}`);
      }
    }

    if (contentBody.content.includes("MarkdownAttachmentImage")) {
      problems.push("ContentBody must not keep the old single-image component");
    }
  }

  if (!imageGallery) {
    problems.push("src/features/content/content-image-gallery.tsx is missing");
  } else {
    for (const token of [
      "max-h-[320px] sm:max-h-[420px]",
      "aspect-[4/5]",
      "aspect-video",
      "max-h-[80vh]",
      "长图",
      "展开长图",
      "createPortal",
      "touch-none",
      "onWheel",
      "onPointerDown",
      "onPointerMove",
      "onPointerUp",
      "打开原图",
      "ArrowLeft",
      "ArrowRight",
      "Esc",
    ]) {
      if (!imageGallery.content.includes(token)) {
        problems.push(`ContentImageGallery missing media behavior token ${token}`);
      }
    }
  }

  if (!contentMedia) {
    problems.push("src/features/content/content-media.ts is missing");
  } else {
    for (const token of [
      "resolveFirstContentMediaBlock",
      "resolveImageMediaBlockFromMarkdownUrl",
      "getAttachmentIdsFromMarkdownUrl",
      "isAttachmentGalleryMarkdownUrl",
      "thumbnail_url",
      "medium_url",
      "original_url",
      'ratio < 0.6',
      'ratio > 2.2',
      "isEscapedMarkdownToken",
    ]) {
      if (!contentMedia.content.includes(token)) {
        problems.push(`content-media helper missing token ${token}`);
      }
    }

    if (
      !contentMedia.content.includes(
        "isEscapedMarkdownToken(markdown, match.index ?? 0)",
      ) ||
      !contentMedia.content.includes("isEscapedMarkdownToken(markdown, matchIndex)")
    ) {
      problems.push(
        "content-media helper must ignore escaped Markdown image/link tokens when deriving the first media block",
      );
    }
  }

  if (!listItem) {
    problems.push("src/features/post/reddit-post-list-item.tsx is missing");
  } else {
    for (const token of [
      "resolveFirstContentMediaBlock",
      "ContentImageGallery",
      "MediaEmbedPlayer",
      'variant="preview"',
      "mediaBlock ? null : getPostLinkPreview(post)",
    ]) {
      if (!listItem.content.includes(token)) {
        problems.push(`post list item missing first media preview token ${token}`);
      }
    }

    if (
      listItem.content.includes("getPreviewImage(") ||
      listItem.content.includes("post.preview?.image") ||
      listItem.content.includes("post.attachments?.find")
    ) {
      problems.push(
        "post list item must not fall back to preview.image or the first orphan attachment",
      );
    }
  }

  if (problems.length > 0) {
    addFail("published attachment image sizing", problems.join("; "));
    return;
  }

  addPass(
    "published attachment image sizing",
    "content media rendering uses scenario-specific preview/detail/lightbox image rules",
  );
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

    if (
      mediaGaps.includes("当前剩余合同缺口集中在编辑态新增或重绑图片") ||
      mediaGaps.includes("当前编辑接口暂不支持新增图片") ||
      mediaGaps.includes("仍未接收 `attachment_ids`") ||
      mediaGaps.includes("但编辑请求不会根据新的 `attachment_ids`") ||
      mediaGaps.includes("编辑保存只提交标题 / 正文") ||
      mediaGaps.includes("前端当前不能开放")
    ) {
      offenders.push("content media API gaps doc still describes edit attachment binding as unsupported");
    }

    if (!mediaGaps.includes("编辑态附件重绑已接入")) {
      offenders.push("content media API gaps doc must record completed edit attachment binding");
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
  } else {
    if (audit.includes("编辑态新增图片仍需要后端更新接口接收 `attachment_ids`")) {
      offenders.push("frontend audit still describes edit image binding as a backend gap");
    }

    if (!audit.includes("编辑态新增图片绑定已接入")) {
      offenders.push("frontend audit must record completed edit image binding");
    }
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
    "docs distinguish completed publish/comment/edit image binding from remaining media gaps",
  );
}

function checkComposerImageCopy() {
  const composer = sourceFiles.find(
    (file) => file.path === "src/features/content/markdown-composer-field.tsx",
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

  const blockedCopy = [
    "待提交图片",
    "已移除待提交图片",
    "已绑定图片",
    "有图片还没有放入正文",
    "选择图片可重新放入正文",
  ];
  const foundBlockedCopy = blockedCopy.filter((copy) =>
    composer.content.includes(copy),
  );

  if (foundBlockedCopy.length > 0) {
    addFail(
      "composer image copy",
      `image writing area must not expose detached image-list wording, found: ${foundBlockedCopy.join(", ")}`,
    );
    return;
  }

  const detachedUploadPatterns = [
    {
      detail: "external inline image manager import",
      pattern: "@/features/media/media-attachments",
    },
    {
      detail: "external uploaded image manager component",
      pattern: "InlineImageAttachmentManager",
    },
    {
      detail: "external bound image reference component",
      pattern: "InlineImageAttachmentReferences",
    },
    {
      detail: "legacy detached image uploader component",
      pattern: "ImageAttachmentUploader",
    },
    {
      detail: "legacy detached alt-text field",
      pattern: "图片说明",
    },
  ];
  const detachedUploadOffenders = [];

  for (const blocked of detachedUploadPatterns) {
    if (composer.content.includes(blocked.pattern)) {
      detachedUploadOffenders.push(`${blocked.detail} in ${composer.path}`);
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
    !composer.content.includes("{renderImageTool()}") ||
    !composer.content.includes('label="添加图片"') ||
    !composer.content.includes('type="file"') ||
    !composer.content.includes("IMAGE_UPLOAD_ACCEPT") ||
    !composer.content.includes("onMouseDown={(event) => event.preventDefault()}")
  ) {
    addFail(
      "composer image tool",
      "MarkdownComposerField must expose image selection in the rich composer toolbar while preserving editor selection",
    );
    return;
  }

  if (
    !composer.content.includes("const minimumInlineImageUploadNoticeMs") ||
    !composer.content.includes("createMinimumInlineImageUploadNoticePromise") ||
    !composer.content.includes(
      "const uploadNoticeSettled = createMinimumInlineImageUploadNoticePromise()",
    ) ||
    !composer.content.includes("await uploadNoticeSettled") ||
    !composer.content.includes("正在上传图片，保存按钮会暂时禁用")
  ) {
    addFail(
      "composer image upload waiting state",
      "MarkdownComposerField must keep a visible upload waiting state and disable submit while inline images are uploading",
    );
    return;
  }

  if (
    !composer.content.includes("handlePaste: (view, event)") ||
    !composer.content.includes("const insertionPosition = view.state.selection.from") ||
    !composer.content.includes("return handleInlineImagePaste(event, insertionPosition)") ||
    !composer.content.includes("onDrop={handleComposerDrop}") ||
    !composer.content.includes("onDragOver={handleComposerDragOver}") ||
    !composer.content.includes("getImageFilesFromDataTransfer") ||
    !composer.content.includes("hasImageFileData") ||
    !composer.content.includes('await uploadInlineImageFiles(imageFiles, { insertion: "cursor" })') ||
    !composer.content.includes("const clipboardData = event.clipboardData") ||
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
    !composer.content.includes("insertMarkdownIntoEditor") ||
    !composer.content.includes("setTextSelection(insertPosition)") ||
    !composer.content.includes('insertContent(markdown, { contentType: "markdown" })') ||
    !composer.content.includes("clampEditorInsertionPosition") ||
    !composer.content.includes("void uploadInlineImageFiles(imageFiles, { insertion })") ||
    !composer.content.includes('typeof insertion === "number"')
  ) {
    addFail(
      "composer pasted image insertion",
      "MarkdownComposerField must upload pasted or dropped image files, including clipboard HTML/text data images, preserve surrounding pasted text, and insert them through the rich editor",
    );
    return;
  }

  if (
    composer.content.includes("handleTextareaPaste") ||
    composer.content.includes("handleTextareaDrop") ||
    composer.content.includes("applyMarkdownInsert") ||
    composer.content.includes("setMode(")
  ) {
    addFail(
      "composer pasted image insertion",
      "MarkdownComposerField must not keep textarea/source-mode image insertion code paths",
    );
    return;
  }

  if (!composer.content.includes("function getReferencedUploadedAttachments")) {
    addFail(
      "composer image removal",
      "composer must derive upload slots from images still referenced by the rendered editor body",
    );
    return;
  }

  if (
    !composer.content.includes("AttachmentGalleryNode") ||
    !composer.content.includes('markdownTokenName: "image"') ||
    !composer.content.includes("ATTACHMENT_GALLERY_MARKDOWN_URL_PREFIX") ||
    !composer.content.includes("multiple={imageUpload.maxCount > 1}") ||
    !composer.content.includes("insertUploadedAttachmentsIntoEditor") ||
    !composer.content.includes("insertAttachmentGalleryIntoEditor") ||
    !composer.content.includes('type: "attachmentGallery"') ||
    !composer.content.includes("createGalleryPreviewElement") ||
    !composer.content.includes("getGalleryAttachmentIdsFromMarkdownUrl")
  ) {
    addFail(
      "composer image gallery insertion",
      "MarkdownComposerField must let multi-image file selection become one visible nexus-gallery block that roundtrips through Markdown",
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

  const editBindingOffenders = [];
  for (const formPath of lifecycleForms) {
    const form = sourceFiles.find((file) => file.path === formPath);

    if (!form) {
      editBindingOffenders.push(`${formPath} is missing`);
      continue;
    }

    if (
      !form.content.includes("@/features/content/attachment-markdown") ||
      !form.content.includes("getReferencedAttachmentIdsForSubmit") ||
      !form.content.includes("attachment_ids: getReferencedAttachmentIdsForSubmit(")
    ) {
      editBindingOffenders.push(
        `${formPath} must submit only Markdown-referenced image attachment ids on edit`,
      );
    }

    if (
      !form.content.includes("editAttachments") ||
      !form.content.includes("setEditAttachments") ||
      !form.content.includes("isUploadingImage") ||
      !form.content.includes("setIsUploadingImage") ||
      !form.content.includes("imageUpload={{")
    ) {
      editBindingOffenders.push(
        `${formPath} must expose edit-time image upload and upload state`,
      );
    }

    if (!form.content.includes("boundAttachments=")) {
      editBindingOffenders.push(
        `${formPath} must pass bound attachments so existing Markdown image nodes render in the editor`,
      );
    }

    if (!form.content.includes("mergeMediaAttachments(")) {
      editBindingOffenders.push(
        `${formPath} must combine existing and newly uploaded images before deriving attachment_ids`,
      );
    }

    if (form.content.includes("当前编辑接口暂不支持新增图片")) {
      editBindingOffenders.push(`${formPath} still shows stale unsupported edit-image copy`);
    }
  }

  if (editBindingOffenders.length > 0) {
    addFail(
      "composer edit attachment binding",
      editBindingOffenders.join("; "),
    );
    return;
  }

  addPass(
    "composer edit attachment binding",
    "post and comment edit dialogs upload new images and submit only referenced attachment ids",
  );

  if (composer.content.includes('imageUpload && mode === "edit"')) {
    addFail(
      "composer preview editing controls",
      "uploaded image management must remain visible in the output-first composer instead of being hidden behind source editing",
    );
    return;
  }

  if (composer.content.includes('boundAttachments && mode === "edit"')) {
    addFail(
      "composer preview editing controls",
      "already-bound image placement controls must remain visible in the output-first composer instead of being hidden behind source editing",
    );
    return;
  }

  addPass(
    "composer image copy",
    "image writing keeps image controls in the toolbar and rendered editor instead of a detached attachment list",
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
      !composer.content.includes("function getRemainingReferenceSlots") ||
      !composer.content.includes("function getReferencedUploadedAttachments") ||
      !composer.content.includes("正文最多放入")
    ) {
      problems.push(
        "MarkdownComposerField must block old and newly uploaded images from exceeding the referenced image limit while ignoring deleted temp uploads",
      );
    }

    if (
      !composer.content.includes("getReferencedUploadedAttachments(value).length < imageUpload.maxCount")
    ) {
      problems.push(
        "MarkdownComposerField must keep the add-image button tied to images still referenced by the editor body",
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

function checkMarkdownMobileOverflowBoundary() {
  const contentBody = sourceFiles.find(
    (file) => file.path === "src/features/content/content-body.tsx",
  );
  const problems = [];

  if (!contentBody) {
    addFail("Markdown mobile overflow boundary", "src/features/content/content-body.tsx is missing");
    return;
  }

  if (
    !contentBody.content.includes("pre({ children })") ||
    !contentBody.content.includes("min-w-0 max-w-full overflow-x-auto") ||
    !contentBody.content.includes("font-mono text-sm leading-6")
  ) {
    problems.push("fenced code blocks must keep horizontal overflow inside the code block on mobile");
  }

  if (
    !contentBody.content.includes("table({ children })") ||
    !contentBody.content.includes('className="my-4 overflow-x-auto border border-border"') ||
    !contentBody.content.includes("min-w-[560px]") ||
    !contentBody.content.includes("border-collapse text-sm")
  ) {
    problems.push("wide Markdown tables must use a scrolling wrapper instead of widening the page");
  }

  if (
    !contentBody.content.includes("img({ alt, src })") ||
    !contentBody.content.includes("外部图片不会直接渲染；请上传图片后放入正文。")
  ) {
    problems.push("external Markdown images must render a local upload notice instead of remote images");
  }

  if (problems.length > 0) {
    addFail("Markdown mobile overflow boundary", problems.join("; "));
    return;
  }

  addPass(
    "Markdown mobile overflow boundary",
    "ContentBody keeps wide tables and code blocks scrollable and blocks external image rendering",
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
