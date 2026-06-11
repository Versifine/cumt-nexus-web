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
  extractDataImageSourcesFromClipboardHtml,
  extractDataImageSourcesFromClipboardText,
  extractDataImageTextPaste,
  getClipboardDataImagePlaceholder,
  getClipboardImageFileName,
} = await importTypescriptModule("src/features/content/clipboard-image.ts");
const {
  createAttachmentGalleryMarkdown,
  createAttachmentMarkdown,
  getAttachmentIdFromMarkdownUrl,
  getGalleryAttachmentIdsFromMarkdownUrl,
  getReferencedAttachmentIds,
  getReferencedAttachmentIdsForSubmit,
  getUnsupportedMarkdownImageReferenceCount,
  hasUnsupportedMarkdownImageReferences,
  isAttachmentGalleryMarkdownUrl,
  isAttachmentMarkdownUrl,
  removeAttachmentMarkdownReferences,
  removeAttachmentMarkdownReferencesWithSelection,
} = await importTypescriptModule("src/features/content/attachment-markdown.ts");
const {
  isExternalMarkdownHref,
  normalizeMarkdownHref,
} = await importTypescriptModule("src/features/content/markdown-url.ts");
const {
  resolveLinkPreview,
  resolveMarkdownLinkPreview,
} = await importTypescriptModule("src/features/content/link-preview.ts");
const {
  isWhitelistedMediaAutolink,
  resolveWhitelistedMediaEmbed,
} = await importTypescriptModule("src/features/content/media-embed.ts");
const {
  remarkRedditAutolink,
} = await importTypescriptModule("src/features/content/reddit-autolink.ts");
const {
  transformRedditMarkdown,
} = await importTypescriptModule("src/features/content/reddit-markdown.ts");
const {
  getMarkdownPlainTextSummary,
} = await importTypescriptModule("src/features/content/markdown-summary.ts");

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
checkLinkPreview();
checkMediaEmbed();
checkRedditAutolink();
checkRedditMarkdownTransform();
checkMarkdownSummary();
checkClipboardImageExtraction();

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

  const galleryMarkdown = createAttachmentGalleryMarkdown(
    [
      { id: "img-1" },
      { id: "image id/一)" },
      { id: "img-3" },
    ],
    "轮播[草稿]\n第二行",
  );

  expectEqual(
    "attachment gallery markdown escapes caption and encodes ids",
    galleryMarkdown,
    "![轮播\\[草稿\\] 第二行](nexus-gallery:img-1,image%20id%2F%E4%B8%80%29,img-3)",
  );

  expectEqual(
    "attachment gallery markdown url decodes ids",
    getGalleryAttachmentIdsFromMarkdownUrl(
      "nexus-gallery:img-1,image%20id%2F%E4%B8%80%29,img-3",
    ),
    ["img-1", "image id/一)", "img-3"],
  );

  expectEqual(
    "invalid attachment markdown url is rejected",
    isAttachmentMarkdownUrl("https://example.com/image.png"),
    false,
  );

  expectEqual(
    "invalid gallery markdown url is rejected",
    isAttachmentGalleryMarkdownUrl("https://example.com/image.png"),
    false,
  );

  expectEqual(
    "attachment references are extracted as decoded ids",
    [...getReferencedAttachmentIds(
      "正文\n![内容](nexus-attachment:img-1)\n![组图](nexus-gallery:img-2,img-3)\n![复杂](nexus-attachment:image%20id%2F%E4%B8%80%29)\n![外部](https://example.com/a.png)",
    )],
    ["img-1", "img-2", "img-3", "image id/一)"],
  );

  expectEqual(
    "attachment references ignore raw markers, links and code",
    [...getReferencedAttachmentIds(
      [
        "正文 nexus-attachment:raw-id",
        "正文 nexus-gallery:raw-gallery-id",
        "[普通链接](nexus-attachment:link-id)",
        "[普通图集链接](nexus-gallery:link-gallery-id)",
        "`![代码图片](nexus-attachment:inline-code-id)`",
        "`![代码图集](nexus-gallery:inline-code-gallery-id)`",
        "\\![转义图片](nexus-attachment:escaped-id)",
        "\\![转义图集](nexus-gallery:escaped-gallery-id)",
        "```",
        "![代码块图片](nexus-attachment:fenced-code-id)",
        "![代码块图集](nexus-gallery:fenced-code-gallery-id)",
        "```",
        "![正文图集](nexus-gallery:gallery-visible-1,gallery-visible-2)",
        "![正文图片](nexus-attachment:visible-id)",
      ].join("\n"),
    )],
    ["gallery-visible-1", "gallery-visible-2", "visible-id"],
  );

  expectEqual(
    "unsupported markdown images detect external image syntax",
    hasUnsupportedMarkdownImageReferences(
      "正文\n![外部](https://example.com/a.png)\n![附件](nexus-attachment:img-1)\n![图集](nexus-gallery:img-2,img-3)",
    ),
    true,
  );

  expectEqual(
    "unsupported markdown images ignore attachments, links, code and escaped images",
    getUnsupportedMarkdownImageReferenceCount(
      [
        "![正文图片](nexus-attachment:img-1)",
        "![正文图集](nexus-gallery:img-2,img-3)",
        "[普通链接](https://example.com/a.png)",
        "`![代码图片](https://example.com/code.png)`",
        "\\![转义图片](https://example.com/escaped.png)",
        "```",
        "![代码块图片](https://example.com/fenced.png)",
        "```",
      ].join("\n"),
    ),
    0,
  );

  expectEqual(
    "submit attachment ids follow markdown order and ignore unuploaded ids",
    getReferencedAttachmentIdsForSubmit(
      "正文\n![二](nexus-attachment:img-2)\n![组图](nexus-gallery:img-4,img-3)\n![外来](nexus-attachment:manual-id)\n![一](nexus-attachment:img-1)",
      [{ id: "img-1" }, { id: "img-2" }, { id: "img-3" }],
    ),
    ["img-2", "img-3", "img-1"],
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
    "removing a gallery attachment reference removes the gallery marker",
    removeAttachmentMarkdownReferences(
      "前文\n![组图](nexus-gallery:img-1,img-2,img-3)\n后文",
      "img-2",
    ),
    "前文\n后文",
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

  expectEqual(
    "removing an attachment reference ignores links and code",
    removeAttachmentMarkdownReferences(
      [
        "[普通链接](nexus-attachment:img-1)",
        "`![行内代码图片](nexus-attachment:img-1)`",
        "```",
        "![代码块图片](nexus-attachment:img-1)",
        "```",
        "\\![转义图片](nexus-attachment:img-1)",
        "![正文图片](nexus-attachment:img-1)",
        "后文",
      ].join("\n"),
      "img-1",
    ),
    [
      "[普通链接](nexus-attachment:img-1)",
      "`![行内代码图片](nexus-attachment:img-1)`",
      "```",
      "![代码块图片](nexus-attachment:img-1)",
      "```",
      "\\![转义图片](nexus-attachment:img-1)",
      "后文",
    ].join("\n"),
  );

  const moveSource = "前文\n![内容](nexus-attachment:img-1)\n中间正文";
  const moveTargetSelection = moveSource.indexOf("正文");
  const movedReferenceResult = removeAttachmentMarkdownReferencesWithSelection(
    moveSource,
    "img-1",
    {
      end: moveTargetSelection,
      start: moveTargetSelection,
    },
  );
  const movedReferenceMarkdown = "前文\n中间正文";
  const movedReferenceSelection = movedReferenceMarkdown.indexOf("正文");

  expectEqual(
    "moving an attachment reference keeps cursor at the same writing position",
    movedReferenceResult,
    {
      markdown: movedReferenceMarkdown,
      selection: {
        end: movedReferenceSelection,
        start: movedReferenceSelection,
      },
    },
  );

  const insideReferenceSource = "前文\n![内容](nexus-attachment:img-1)\n后文";
  const insideReferenceSelection = insideReferenceSource.indexOf("nexus");

  expectEqual(
    "moving an attachment reference maps a cursor inside the old marker to its removed position",
    removeAttachmentMarkdownReferencesWithSelection(
      insideReferenceSource,
      "img-1",
      {
        end: insideReferenceSelection,
        start: insideReferenceSelection,
      },
    ),
    {
      markdown: "前文\n后文",
      selection: {
        end: "前文\n".length,
        start: "前文\n".length,
      },
    },
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
    "gallery markdown links are allowed",
    normalizeMarkdownHref("nexus-gallery:img-1,img-2"),
    "nexus-gallery:img-1,img-2",
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

function checkLinkPreview() {
  expectEqual(
    "link preview uses backend metadata when safe",
    resolveLinkPreview({
      backendPreview: {
        description: "  页面摘要  ",
        thumbnail_url: "https://cdn.example.com/cover.png",
        title: "  后端标题  ",
        url: "https://www.example.com/path",
      },
      markdown: "[正文链接](https://fallback.example.com)",
    }),
    {
      description: "页面摘要",
      host: "example.com",
      imageUrl: "https://cdn.example.com/cover.png",
      source: "backend",
      title: "后端标题",
      url: "https://www.example.com/path",
    },
  );

  expectEqual(
    "link preview extracts markdown link outside images and code",
    resolveMarkdownLinkPreview(
      [
        "![外部图](https://image.example.com/a.png)",
        "`[代码](https://code.example.com)`",
        "```",
        "[代码块](https://fenced.example.com)",
        "```",
        "[可见链接](https://www.example.com/page)",
      ].join("\n"),
    ),
    {
      host: "example.com",
      source: "markdown",
      title: "可见链接",
      url: "https://www.example.com/page",
    },
  );

  expectEqual(
    "link preview extracts bare URL and strips trailing punctuation",
    resolveMarkdownLinkPreview("参考 https://www.example.com/path?q=1。"),
    {
      host: "example.com",
      source: "markdown",
      title: "example.com",
      url: "https://www.example.com/path?q=1",
    },
  );

  expectEqual(
    "link preview blocks unsafe and internal links",
    resolveMarkdownLinkPreview(
      "[站内](/communities/public) [危险](javascript:alert(1))",
    ),
    null,
  );

  expectEqual(
    "link preview ignores external markdown image URLs",
    resolveMarkdownLinkPreview("![外部图](https://image.example.com/a.png)"),
    null,
  );
}

function checkMediaEmbed() {
  expectEqual(
    "bilibili video URL resolves to a controlled player",
    summarizeMediaEmbed(
      resolveWhitelistedMediaEmbed(
        "https://www.bilibili.com/video/BV1B7411m7LV?p=2&t=30",
      ),
    ),
    {
      embedUrl:
        "https://player.bilibili.com/player.html?bvid=BV1B7411m7LV&p=2&t=30&autoplay=0&danmaku=0",
      layout: "wide-video",
      provider: "bilibili",
      resourceId: "BV1B7411m7LV",
      resourceType: "video-bvid",
    },
  );

  expectEqual(
    "douyin video URL resolves to official open player",
    summarizeMediaEmbed(
      resolveWhitelistedMediaEmbed(
        "https://www.douyin.com/video/7146408143612123456",
      ),
    ),
    {
      embedUrl:
        "https://open.douyin.com/player/video?vid=7146408143612123456&autoplay=0",
      layout: "portrait-video",
      provider: "douyin",
      resourceId: "7146408143612123456",
      resourceType: "video",
    },
  );

  expectEqual(
    "netease song URL resolves to outchain player",
    summarizeMediaEmbed(
      resolveWhitelistedMediaEmbed(
        "https://music.163.com/#/song?id=1294066180",
      ),
    ),
    {
      embedUrl:
        "https://music.163.com/outchain/player?type=2&id=1294066180&auto=0&height=66",
      layout: "music-compact",
      provider: "netease",
      resourceId: "1294066180",
      resourceType: "song",
    },
  );

  expectEqual(
    "netease playlist URL resolves to tall outchain player",
    summarizeMediaEmbed(
      resolveWhitelistedMediaEmbed(
        "https://music.163.com/#/playlist?id=3778678",
      ),
    ),
    {
      embedUrl:
        "https://music.163.com/outchain/player?type=0&id=3778678&auto=0&height=430",
      layout: "music-tall",
      provider: "netease",
      resourceId: "3778678",
      resourceType: "playlist",
    },
  );

  expectEqual(
    "qq music song id URL resolves to outchain player",
    summarizeMediaEmbed(
      resolveWhitelistedMediaEmbed(
        "https://i.y.qq.com/v8/playsong.html?songid=127570280&songtype=0",
      ),
    ),
    {
      embedUrl:
        "https://i.y.qq.com/n2/m/outchain/player/index.html?songid=127570280&songtype=0",
      layout: "music-compact",
      provider: "qq-music",
      resourceId: "127570280",
      resourceType: "song-id",
    },
  );

  expectEqual(
    "qq music song mid URL resolves without accepting arbitrary hosts",
    summarizeMediaEmbed(
      resolveWhitelistedMediaEmbed(
        "https://y.qq.com/n/ryqq/songDetail/002rhFKO3EjKAg",
      ),
    ),
    {
      embedUrl:
        "https://i.y.qq.com/n2/m/outchain/player/index.html?songmid=002rhFKO3EjKAg&songtype=0",
      layout: "music-compact",
      provider: "qq-music",
      resourceId: "002rhFKO3EjKAg",
      resourceType: "song-mid",
    },
  );

  expectEqual(
    "unsupported media URL does not become an embed",
    resolveWhitelistedMediaEmbed("https://example.com/video/BV1B7411m7LV"),
    null,
  );

  expectEqual(
    "bare provider link is treated as auto-embeddable",
    isWhitelistedMediaAutolink(
      "https://www.bilibili.com/video/BV1B7411m7LV",
      "https://www.bilibili.com/video/BV1B7411m7LV",
    ),
    true,
  );

  expectEqual(
    "custom labelled provider link is treated as embeddable media",
    contentMediaSourceAllowsLabelledProviderLinks(),
    true,
  );

  expectEqual(
    "backend preview provider URL is treated as embeddable media",
    summarizeMediaEmbed(
      resolveWhitelistedMediaEmbed("https://www.bilibili.com/video/BV1B7411m7LV"),
    ),
    {
      embedUrl:
        "https://player.bilibili.com/player.html?bvid=BV1B7411m7LV&autoplay=0&danmaku=0",
      layout: "wide-video",
      provider: "bilibili",
      resourceId: "BV1B7411m7LV",
      resourceType: "video-bvid",
    },
  );
}

function checkRedditAutolink() {
  const tree = {
    children: [
      {
        children: [{ type: "text", value: "看 r/public 和 u/alice。" }],
        type: "paragraph",
      },
      {
        children: [
          {
            children: [{ type: "text", value: "r/inside-link" }],
            type: "link",
            url: "/existing",
          },
        ],
        type: "paragraph",
      },
      { type: "code", value: "r/code u/code" },
      {
        children: [
          { type: "inlineCode", value: "u/inline-code" },
          { type: "text", value: " https://example.com/r/path /u/not-a-ref wordu/nope" },
        ],
        type: "paragraph",
      },
    ],
    type: "root",
  };

  remarkRedditAutolink()(tree);

  expectEqual(
    "reddit r/u references become site links",
    tree.children[0].children.map(summarizeMarkdownNode),
    [
      "text:看 ",
      "link:/communities/public:r/public",
      "text: 和 ",
      "link:/users/alice:u/alice",
      "text:。",
    ],
  );

  expectEqual(
    "reddit autolink ignores existing links and code",
    [
      tree.children[1].children[0].children[0].value,
      tree.children[2].value,
      tree.children[3].children.map(summarizeMarkdownNode),
    ],
    [
      "r/inside-link",
      "r/code u/code",
      [
        "inlineCode:u/inline-code",
        "text: https://example.com/r/path /u/not-a-ref wordu/nope",
      ],
    ],
  );
}

function checkRedditMarkdownTransform() {
  const transformed = transformRedditMarkdown(
    "普通 >! hidden !< ^(two words) ^one",
  );

  expectEqual(
    "reddit spoiler and superscript transform outside code",
    transformed,
    {
      markdown:
        "普通 [显示隐藏内容](#nexus-spoiler-0) [two words](#nexus-sup-1) [one](#nexus-sup-2)",
      tokens: [
        { text: "hidden", type: "spoiler" },
        { text: "two words", type: "sup" },
        { text: "one", type: "sup" },
      ],
    },
  );

  expectEqual(
    "reddit transforms ignore inline and fenced code",
    transformRedditMarkdown(
      [
        "`>! code !< ^code`",
        "```",
        ">! fenced !< ^fenced",
        "```",
        "正文 >! ok !< ^ok",
      ].join("\n"),
    ),
    {
      markdown: [
        "`>! code !< ^code`",
        "```",
        ">! fenced !< ^fenced",
        "```",
        "正文 [显示隐藏内容](#nexus-spoiler-0) [ok](#nexus-sup-1)",
      ].join("\n"),
      tokens: [
        { text: "ok", type: "spoiler" },
        { text: "ok", type: "sup" },
      ],
    },
  );

  expectEqual(
    "reddit transforms protect inline markdown and hide unused definitions",
    transformRedditMarkdown(
      [
        "链接 [^label](https://example.com/^path)",
        "图片 ![^alt >! no !<](nexus-attachment:img-1)",
        "[ref]: https://example.com/^definition",
        "正文 >! [链接](https://example.com/^inside) !< ^ok",
      ].join("\n"),
    ),
    {
      markdown: [
        "链接 [^label](https://example.com/^path)",
        "图片 ![^alt >! no !<](nexus-attachment:img-1)",
        "",
        "正文 [显示隐藏内容](#nexus-spoiler-0) [ok](#nexus-sup-1)",
      ].join("\n"),
      tokens: [
        { text: "[链接](https://example.com/^inside)", type: "spoiler" },
        { text: "ok", type: "sup" },
      ],
    },
  );

  expectEqual(
    "reddit transforms respect escaped markers",
    transformRedditMarkdown("\\^literal \\>! not hidden !< ^ok"),
    {
      markdown: "\\^literal \\>! not hidden !< [ok](#nexus-sup-0)",
      tokens: [{ text: "ok", type: "sup" }],
    },
  );

  expectEqual(
    "reference-style links and images are inlined before reddit transforms",
    transformRedditMarkdown(
      [
        "引用 [显示文字][ref] 和 [大小写][REF]",
        "折叠 [same][] 不在本切片处理",
        "图片 ![图][ref]",
        "`[code][ref]`",
        "```",
        "[fenced][ref]",
        "```",
        "[ref]: https://example.com/^definition",
      ].join("\n"),
    ),
    {
      markdown: [
        "引用 [显示文字](https://example.com/^definition) 和 [大小写](https://example.com/^definition)",
        "折叠 [same][] 不在本切片处理",
        "图片 ![图](https://example.com/^definition)",
        "`[code][ref]`",
        "```",
        "[fenced][ref]",
        "```",
        "",
      ].join("\n"),
      tokens: [],
    },
  );
}

function checkMarkdownSummary() {
  expectEqual(
    "markdown summary removes source markers and keeps readable text",
    getMarkdownPlainTextSummary(
      "## 标题\n\n**重点** [链接](https://example.com)\n\n![图\\[草稿\\]](nexus-attachment:img-1)\n![轮播](nexus-gallery:img-2,img-3)\n>! 隐藏内容 !<",
    ),
    "标题 重点 链接 图片：图[草稿] 图片：轮播 隐藏内容",
  );

  expectEqual(
    "markdown summary turns external image syntax into image text",
    getMarkdownPlainTextSummary("![外部图](https://example.com/a.png)\n正文"),
    "图片：外部图 正文",
  );

  expectEqual(
    "markdown summary removes table divider rows",
    getMarkdownPlainTextSummary("| 项 | 值 |\n| --- | --- |\n| A | B |"),
    "项 值 A B",
  );

  expectEqual(
    "markdown summary handles truncated attachment image syntax",
    getMarkdownPlainTextSummary(
      "正文 ![正文图片](nexus-attachment:6d5b2a68-30a4",
    ),
    "正文 图片：正文图片",
  );

  expectEqual(
    "markdown summary handles truncated link syntax",
    getMarkdownPlainTextSummary("正文 [链接](https://example.com/path"),
    "正文 链接",
  );

  expectEqual(
    "markdown summary uses fallback for empty source",
    getMarkdownPlainTextSummary("   ", "没有摘要"),
    "没有摘要",
  );
}

function checkClipboardImageExtraction() {
  const pngDataUrl = "data:image/png;base64,iVBORw0KGgo=";
  const jpegDataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
  const sources = extractDataImageSourcesFromClipboardHtml(
    [
      `<p><img src="${pngDataUrl}"></p>`,
      `<img alt="duplicate" src="${pngDataUrl}">`,
      `<img src='${jpegDataUrl}'>`,
      `<img src="https://example.com/remote.png">`,
      `<img src="data:text/html;base64,PHNjcmlwdA==">`,
    ].join("\n"),
  );

  expectEqual(
    "clipboard html data images extract supported image sources once",
    sources,
    [
      {
        dataUrl: pngDataUrl,
        extension: "png",
        mimeType: "image/png",
      },
      {
        dataUrl: jpegDataUrl,
        extension: "jpg",
        mimeType: "image/jpeg",
      },
    ],
  );

  expectEqual(
    "clipboard html image filename uses Chinese paste copy",
    getClipboardImageFileName(sources[0], 0),
    "粘贴图片-1.png",
  );

  expectEqual(
    "clipboard html data images decode html entities",
    extractDataImageSourcesFromClipboardHtml(
      `<img src=&quot;data:image/webp;base64,UklGRg==&quot;>`,
    ),
    [
      {
        dataUrl: "data:image/webp;base64,UklGRg==",
        extension: "webp",
        mimeType: "image/webp",
      },
    ],
  );

  expectEqual(
    "clipboard plain text data image extracts image source",
    extractDataImageSourcesFromClipboardText(
      "data:image/png;base64,iVBORw0KGgo=",
    ),
    [
      {
        dataUrl: "data:image/png;base64,iVBORw0KGgo=",
        extension: "png",
        mimeType: "image/png",
      },
    ],
  );

  expectEqual(
    "clipboard text data images extract markdown and raw occurrences once",
    extractDataImageSourcesFromClipboardText(
      [
        "![inline](data:image/webp;base64,UklGRg==)",
        "![duplicate](data:image/webp;base64,UklGRg==)",
        "![remote](https://example.com/remote.png)",
        "[plain link](data:image/png;base64,iVBORw0KGgo=)",
      ].join("\n"),
    ),
    [
      {
        dataUrl: "data:image/webp;base64,UklGRg==",
        extension: "webp",
        mimeType: "image/webp",
      },
      {
        dataUrl: "data:image/png;base64,iVBORw0KGgo=",
        extension: "png",
        mimeType: "image/png",
      },
    ],
  );

  expectEqual(
    "clipboard text data image paste keeps surrounding markdown text",
    extractDataImageTextPaste(
      [
        "前文 **重点**",
        "![inline](data:image/webp;base64,UklGRg==)",
        "后文 [plain](data:image/png;base64,iVBORw0KGgo=)",
        "再次使用 ![duplicate](data:image/webp;base64,UklGRg==)",
      ].join("\n"),
    ),
    {
      sources: [
        {
          dataUrl: "data:image/webp;base64,UklGRg==",
          extension: "webp",
          mimeType: "image/webp",
        },
        {
          dataUrl: "data:image/png;base64,iVBORw0KGgo=",
          extension: "png",
          mimeType: "image/png",
        },
      ],
      text: [
        "前文 **重点**",
        getClipboardDataImagePlaceholder(0),
        `后文 ${getClipboardDataImagePlaceholder(1)}`,
        `再次使用 ${getClipboardDataImagePlaceholder(0)}`,
      ].join("\n"),
    },
  );
}

function summarizeMarkdownNode(node) {
  if (node.type === "link") {
    return `link:${node.url}:${node.children.map((child) => child.value ?? "").join("")}`;
  }

  return summarizeMarkdownNodeText(node);
}

function summarizeMediaEmbed(embed) {
  if (!embed) {
    return null;
  }

  return {
    embedUrl: embed.embedUrl,
    layout: embed.layout,
    provider: embed.provider,
    resourceId: embed.resourceId,
    resourceType: embed.resourceType,
  };
}

function summarizeMarkdownNodeText(node) {
  return `${node.type}:${node.value ?? ""}`;
}

function contentMediaSourceAllowsLabelledProviderLinks() {
  const contentMediaSource = readFileSync(
    resolve(root, "src/features/content/content-media.ts"),
    "utf8",
  );

  return (
    contentMediaSource.includes("resolveWhitelistedMediaEmbed(href)") &&
    contentMediaSource.includes("resolveEmbedMediaBlockFromUrl") &&
    !contentMediaSource.includes("isWhitelistedMediaAutolink(href")
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
