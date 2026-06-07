# Reddit Markdown 渲染选型与安全边界

本文定义 CUMT Nexus Web Reddit-style Markdown 正文渲染的实施方案和当前安全边界。`react-markdown` 与 `remark-gfm` 已作为 V2 依赖接入；后续新增 Markdown、HTML、embed 或 sanitize 相关依赖时，仍必须按 `AGENTS.md` 说明用途、替代方案和影响范围，并获得用户明确同意。

产品目标：

```text
Reddit-style Markdown parity
```

含义：

- 帖子和评论正文能力对齐 Reddit Markdown。
- 常用格式通过写作器工具动作承接。
- 高级用户可以直接输入 Markdown。
- 提供轻量编辑 / 预览切换，但不强制用户使用预览。
- 阅读态直接渲染最终内容。
- 不存用户 HTML，不开放任意 iframe。

## 当前状态

已实现：

- 发帖、根评论、回复评论、帖子编辑和评论编辑使用单一写作面板。
- 写作器提供加粗、斜体、标题、删除线、引用、无序列表、有序列表、行内代码、代码块、链接、涂黑和表格工具动作。
- 帖子正文和评论正文通过 `src/features/content/content-body.tsx` 渲染。
- 当前渲染器使用 `react-markdown` + `remark-gfm`。
- 支持 GFM 表格、任务列表、删除线、代码块、引用、列表、标题和链接。
- 支持 `>! ... !<` spoiler / 涂黑语法。
- 支持 Reddit-style 上标预处理。
- 链接只允许站内路径、锚点、`http`、`https` 和 `mailto`。
- 写作器提供轻量预览，预览复用 `ContentBody`，阅读态仍负责最终渲染。
- UI smoke 已验证发帖、根评论和子评论回复可以提交并在阅读态渲染 Markdown。
- 编辑弹窗已接入同一写作器，但浏览器保存会被后端 CORS `PATCH` 预检挡住；后端放行 `PATCH` 后必须复验帖子编辑和评论编辑保存。
- 不使用 `dangerouslySetInnerHTML`。
- 不存用户 HTML。
- 不使用 `rehype-raw`。
- `npm run check:content-boundary` 已经固化当前安全边界：帖子详情和评论树必须复用 `ContentBody`，写作器预览必须复用 `ContentBody`，工具栏必须保留当前核心动作，源码中不得出现 `dangerouslySetInnerHTML`、原始 HTML 写入、`rehype-raw` 或未批准 iframe/srcDoc。
- `npm run check:content-segments` 已经固化当前 spoiler / 涂黑解析边界：普通文本、多段涂黑、未闭合涂黑、空涂黑和多行涂黑必须保持稳定。

未实现：

- 与 Reddit 细节完全一致的 Markdown 兼容性审查。
- `r/community` 和 `u/user` 自动链接。
- 引用式链接的产品化验证。
- 白名单 embed。

## Reddit Markdown 能力范围

按 Reddit 官方格式指南，首版能力目标应覆盖：

```text
段落
换行
_italic_ / *italic*
__bold__ / **bold**
___bold-italic___ / ***bold-italic***
~~strikethrough~~
>!spoiler!<
^superscript / ^(superscript)
`inline code`
fenced code block
[link](https://example.com)
[link][1] + [1]: https://example.com
# heading
## heading
- unordered list
1. ordered list
> blockquote
table
thematic break
escaped Markdown syntax
```

首版可分批，但文档口径不再写成“少量 Markdown-like 语法”。最终目标是 Reddit Markdown parity。

## 当前 renderer 选择

```text
react-markdown
remark-gfm
```

选择理由：

- `react-markdown` 以 React 组件方式渲染 Markdown，符合当前 Next.js / React 结构。
- `remark-gfm` 覆盖删除线、自动链接、表格、任务列表等常见社区内容语法。
- 这组依赖不引入第二套 UI 库，不改变 shadcn/ui 的主组件系统边界。
- 当前通过 `skipHtml`、自定义组件和链接白名单保持安全边界，不启用 `rehype-raw`。
- 图片不再由帖子或评论组件挂在正文外层；上传成功后写作器插入 `![说明](nexus-attachment:<attachment_id>)`，阅读态由 `ContentBody` 按后端返回的结构化 `attachments` 渲染对应图片。
- 普通 `https://...` Markdown 图片不会直接渲染为远程图片；用户必须走图片上传和后端 attachment 合同。

后续可选评估：

- 是否需要引入 `rehype-sanitize` 作为额外 AST 白名单防线。
- `r/community` 和 `u/user` 自动链接是否要映射到本项目路由。
- Reddit 引用式链接、转义、列表边界等细节是否需要更接近 Reddit。
- 表格移动端是否需要更强的视觉处理。

替代方案：

- `markdown-it`：成熟，但更偏字符串到 HTML，容易把后续实现推向 HTML sanitization 和 `dangerouslySetInnerHTML`，不作为首选。
- `marked`：轻量，但同样偏 HTML 字符串输出，不符合当前 React 组件化边界。
- 手写完整 Markdown parser：不做。Markdown 规则复杂，手写实现会增加安全和兼容风险。
- HTML 富文本编辑器：不做。当前拒绝存用户 HTML，也不把 HTML 编辑器作为产品路线。

## 安全规则

必须遵守：

- 禁止渲染用户输入的原始 HTML。
- 禁止启用 `rehype-raw`。
- 禁止使用 `dangerouslySetInnerHTML` 渲染用户正文。
- 禁止保存用户提交的 HTML。
- 禁止任意 iframe。
- 禁止绕过 `ContentBody` 直接在帖子详情或评论树中实现另一套用户内容渲染。
- 禁止 `javascript:`、`data:` 等危险链接协议。
- 禁止 `//example.com` 这类协议相对 URL；站内链接必须使用单斜杠路径，例如 `/communities/public`。
- 外链必须加 `rel="nofollow ugc noopener noreferrer"`。
- 外链是否新窗口打开由统一组件决定，不在页面里临时变化。
- 图片和 embed 必须由后端返回结构化附件或白名单 provider，不能只靠 Markdown URL 放行。

允许协议首版建议：

```text
http:
https:
mailto:
```

不允许首版直接支持：

```text
javascript:
data:
vbscript:
file:
blob:
```

## Spoiler 处理策略

当前 `ContentBody` 已经支持 `>! ... !<`。后续任何 renderer 接入时都不要丢掉该能力。

建议：

1. 先保留当前 spoiler 分段策略：按 `>! ... !<` 切分正文，非 spoiler 段交给 renderer，spoiler 段作为纯文本放进现有涂黑组件。
2. 如果后续需要 spoiler 内部也支持 Markdown，再单独实现 remark/micromark 扩展，不在首版渲染切片里硬做。

这样做的边界更清楚：

- spoiler 默认隐藏行为不退化。
- 不需要把 spoiler 转成 HTML 再 sanitize。
- 不把完整 Markdown parser 责任塞进前端自写字符串逻辑。

## 组件组织

推荐结构：

```text
src/features/content/
  content-body.tsx
  markdown-toolbar.tsx
  markdown-renderer.tsx
  markdown-link.tsx
  reddit-auto-link.tsx
  spoiler-text.tsx
```

规则：

- `content-body.tsx` 保持为正文渲染入口，帖子和评论继续只依赖它。
- `markdown-renderer.tsx` 封装第三方 Markdown renderer 和组件映射。
- `markdown-link.tsx` 统一处理链接协议、rel、target 和样式。
- `reddit-auto-link.tsx` 处理 `r/community` 和 `u/user` 类自动链接。
- `spoiler-text.tsx` 承载涂黑展开 / 收起状态。
- `attachment-markdown.ts` 统一正文内附件引用格式、引用提取和移除逻辑。
- 页面组件不得直接 import 第三方 renderer，只能通过 `features/content` 的统一入口使用。

## 样式规则

Markdown 正文必须符合 `docs/design/DESIGN.md`：

- 暗色 editorial product 风格。
- 正文密度适中，不做博客模板大留白。
- 标题层级克制，不使用 oversized hero 字号。
- 引用使用左侧线和低对比背景，不用发光边框。
- 行内代码使用轻量色块，不用高饱和主题。
- 代码块必须可横向滚动，不挤爆移动端。
- 表格必须放进横向滚动容器，不撑破页面。
- 列表缩进要浅，不能破坏评论树缩进。
- 链接优先用文字颜色和下划线表达，不做 outline button。
- spoiler 默认视觉隐藏，展开/收起动效克制。

## 实施切片

### Slice A：依赖批准与边界同步

交付：

- 说明是否新增 `react-markdown`、`remark-gfm`、`rehype-sanitize`。
- 明确 Reddit spoiler、上标、自动链接是否需要自定义扩展。
- 更新 `scripts/check-dependency-boundary.mjs` 的批准清单。
- 更新 `package.json` 和 `package-lock.json`。
- 不改页面行为。

验证：

- `npm run check:dependencies`
- `npm run lint`
- `npm run typecheck`

### Slice B：帖子正文 Reddit Markdown 渲染

交付：

- `ContentBody` 接入 Markdown renderer。
- 帖子详情正文支持首版 Reddit Markdown 范围。
- spoiler 行为保持默认隐藏、可展开。

验证：

- 纯文本旧帖子仍正常显示。
- `>! ... !<` 默认不显示隐藏文本。
- 链接协议和 rel 符合安全规则。
- 移动端代码块和表格不横向撑破页面。

### Slice C：评论正文 Reddit Markdown 渲染

交付：

- 评论树复用同一个 `ContentBody`。
- 评论正文支持首版 Reddit Markdown 范围。
- 评论树缩进和 Markdown 列表缩进不互相挤压。

验证：

- 根评论和子评论都可渲染。
- 折叠分支不影响已展开 spoiler 状态的安全边界。
- 移动端深层评论仍可读。

### Slice D：写作器工具动作

交付：

- 发帖、根评论、回复评论提供同一套格式工具动作。
- 工具动作插入或包裹 Reddit Markdown 语法。
- 预览不另造 renderer，必须和阅读态使用同一套 `ContentBody` 渲染入口。
- 提交 payload 仍是后端当前支持的 `body` 字段。

验证：

- 发帖和评论主链路不退化。
- 移动端输入稳定。
- loading、error、disabled 状态不退化。

## 验收命令

文档切片至少运行：

```bash
npm run check:docs
```

实现切片至少运行：

```bash
npm run lint
npm run typecheck
npm run build
npm run check:dependencies
npm run check:api-boundary
npm run check:content-boundary
npm run check:content-segments
```

涉及路由壳或公开页面时再运行：

```bash
npm run check:routes
```

涉及真实后端交互时再运行：

```bash
npm run check:main-path
npm run check:v2-path
```

`check:v2-path` 必须覆盖图片上传、`attachment_ids` 绑定、正文内 `nexus-attachment:<id>` marker 的提交和读取保留，防止图片再次退回“正文外外挂附件”的实现。

涉及页面渲染时必须做浏览器烟测，至少覆盖：

- 帖子正文纯文本。
- 帖子正文 Reddit Markdown。
- 帖子正文 spoiler。
- 评论正文 Reddit Markdown。
- 移动端宽度下的长正文、表格和代码块。

## 参考来源

- `react-markdown` 官方文档：<https://remarkjs.github.io/react-markdown/>
- `remark-gfm` 官方仓库：<https://github.com/remarkjs/remark-gfm>
- `rehype-sanitize` 官方仓库：<https://github.com/rehypejs/rehype-sanitize>
- Reddit Help Formatting Guide：<https://support.reddithelp.com/hc/en-us/articles/360043033952-Formatting-Guide>
- Reddit Help comment/post formatting：<https://support.reddithelp.com/hc/en-us/articles/205191185-How-do-I-format-my-comment-or-post>
