# Markdown 渲染选型与安全边界

本文定义 CUMT Nexus Web 后续 Markdown-like 正文渲染的实施方案。它不是依赖安装记录；真正新增依赖前仍必须按 `AGENTS.md` 说明用途、替代方案和影响范围，并获得用户明确同意。

## 当前状态

已实现：

- 发帖和评论工具栏可以插入 Markdown-like 语法。
- 帖子正文和评论正文通过 `src/features/content/content-body.tsx` 渲染。
- 当前渲染器只识别 `>! ... !<` spoiler / 涂黑语法。
- 其它内容全部按纯文本显示。
- 发帖表单、根评论表单和回复评论表单已经提供轻量预览，预览复用 `ContentBody`。
- 不使用 `dangerouslySetInnerHTML`。
- 不存用户 HTML。
- 未新增 Markdown 相关依赖。

未实现：

- 加粗、斜体、引用、列表、代码块和链接的 Markdown 渲染。
- 完整 Markdown 预览。
- GFM 表格和任务列表。
- 图片附件渲染。
- 白名单 embed。
- Markdown 内部的 spoiler 嵌套解析。

## 推荐方向

推荐下一阶段采用：

```text
react-markdown
remark-gfm
rehype-sanitize
```

推荐理由：

- `react-markdown` 以 React 组件方式渲染 Markdown，符合当前 Next.js / React 结构。
- `remark-gfm` 覆盖删除线、自动链接、表格、任务列表等常见社区内容语法。
- `rehype-sanitize` 用于限制最终 HTML AST，降低后续扩展插件时的 XSS 风险。
- 这组依赖不引入第二套 UI 库，不改变 shadcn/ui 的主组件系统边界。

替代方案：

- `markdown-it`：成熟，但更偏字符串到 HTML，容易把后续实现推向 HTML sanitization 和 `dangerouslySetInnerHTML`，不作为首选。
- `marked`：轻量，但同样偏 HTML 字符串输出，不符合当前 React 组件化边界。
- 手写完整 Markdown parser：不做。Markdown 规则复杂，手写实现会增加安全和兼容风险。
- 富文本编辑器：不做。当前产品方向是 Markdown-like 写作，不是 WYSIWYG HTML 编辑器。

## 安全规则

必须遵守：

- 禁止渲染用户输入的原始 HTML。
- 禁止启用 `rehype-raw`。
- 禁止使用 `dangerouslySetInnerHTML` 渲染用户正文。
- 禁止保存用户提交的 HTML。
- 禁止任意 iframe。
- 禁止 `javascript:`、`data:` 等危险链接协议。
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

## 首版渲染范围

首版 Markdown 渲染建议支持：

```text
段落
**加粗**
*斜体*
~~删除线~~
> 引用
- 无序列表
1. 有序列表
`行内代码`
```code block```
[链接文本](https://example.com)
>! spoiler / 涂黑内容 !<
```

暂不优先支持：

- 表格的复杂交互。若 GFM 表格自然出现，移动端必须包在横向滚动容器里。
- 任务列表的可编辑状态。任务列表只显示，不允许在阅读态勾选改变数据。
- 标题 `#` 作为正文顶级 H1。帖子标题已经是页面 H1，正文里的 `#` 应映射为 `h2` 或在首版禁用。
- Markdown 图片语法 `![alt](url)` 直接加载远程图片。图片必须等附件模型和对象存储完成。

## Spoiler 处理策略

当前 `ContentBody` 已经支持 `>! ... !<`，后续接入 Markdown renderer 时不要丢掉该能力。

建议分两步：

1. 接入 Markdown renderer 时，先保留当前 spoiler 分段策略：先按 `>! ... !<` 切分正文，非 spoiler 段交给 Markdown renderer，spoiler 段作为纯文本放进现有涂黑按钮。
2. 如果后续需要 spoiler 内部也支持 Markdown，再单独实现 remark/micromark 扩展，不在首版渲染切片里硬做。

这样做的边界更清楚：

- spoiler 默认隐藏行为不退化。
- 不需要把 spoiler 转成 HTML 再 sanitize。
- 不阻塞正文基础 Markdown 渲染。
- 不把完整 Markdown parser 责任塞进前端自写字符串逻辑。

## 组件组织

推荐结构：

```text
src/features/content/
  content-body.tsx
  markdown-toolbar.tsx
  markdown-renderer.tsx
  markdown-link.tsx
  spoiler-text.tsx
```

规则：

- `content-body.tsx` 保持为正文渲染入口，帖子和评论继续只依赖它。
- `markdown-renderer.tsx` 封装第三方 Markdown renderer 和组件映射。
- `markdown-link.tsx` 统一处理链接协议、rel、target 和样式。
- `spoiler-text.tsx` 承载涂黑展开/收起状态。
- 页面组件不得直接 import `react-markdown`，只能通过 `features/content` 的统一入口使用。

## 样式规则

Markdown 正文必须符合 `docs/design/DESIGN.md`：

- 暗色 editorial product 风格。
- 正文密度适中，不做博客模板大留白。
- 标题层级克制，不使用 oversized hero 字号。
- 引用使用左侧线和低对比背景，不用发光边框。
- 行内代码使用轻量色块，不用高饱和主题。
- 代码块必须可横向滚动，不挤爆移动端。
- 列表缩进要浅，不能破坏评论树缩进。
- 链接优先用文字颜色和下划线表达，不做 outline button。

## 实施切片

### Slice A：依赖批准与边界同步

交付：

- 说明是否新增 `react-markdown`、`remark-gfm`、`rehype-sanitize`。
- 更新 `scripts/check-dependency-boundary.mjs` 的批准清单。
- 更新 `package.json` 和 `package-lock.json`。
- 不改页面行为。

验证：

- `npm run check:dependencies`
- `npm run lint`
- `npm run typecheck`

### Slice B：帖子正文 Markdown 渲染

交付：

- `ContentBody` 接入 Markdown renderer。
- 帖子详情正文支持首版 Markdown 范围。
- spoiler 行为保持默认隐藏、可展开。

验证：

- 纯文本旧帖子仍正常显示。
- `>! ... !<` 默认不显示隐藏文本。
- 链接协议和 rel 符合安全规则。
- 移动端代码块不横向撑破页面。

### Slice C：评论正文 Markdown 渲染

交付：

- 评论树复用同一个 `ContentBody`。
- 评论正文支持首版 Markdown 范围。
- 评论树缩进和 Markdown 列表缩进不互相挤压。

验证：

- 根评论和子评论都可渲染。
- 折叠分支不影响已展开 spoiler 状态的安全边界。
- 移动端深层评论仍可读。

### Slice D：编辑预览

当前已落地的最小子集：

- 发帖表单提供编辑/预览切换。
- 根评论和回复评论表单提供编辑/预览切换。
- 预览使用同一个 `ContentBody`。
- 预览只渲染 spoiler / 涂黑，其余内容仍保持纯文本。
- 提交 payload 仍是后端当前支持的 `body` 字段。

后续完整 Markdown renderer 批准后，再把该预览升级为完整 Markdown 预览。

交付：

- 发帖表单提供编辑/预览切换。
- 根评论和回复评论表单提供编辑/预览切换。

验证：

- 预览使用同一个 `ContentBody`。
- 提交 payload 仍是后端当前支持的 `body` 字段。
- loading、error、disabled 状态不退化。

## 验收命令

每个实现切片至少运行：

```bash
npm run lint
npm run typecheck
npm run build
npm run check:dependencies
npm run check:api-boundary
```

涉及路由壳或公开页面时再运行：

```bash
npm run check:routes
```

涉及真实后端交互时再运行：

```bash
npm run check:main-path
```

涉及页面渲染时必须做浏览器烟测，至少覆盖：

- 帖子正文纯文本。
- 帖子正文 spoiler。
- 评论正文 spoiler。
- 移动端宽度下的长正文和代码块。

## 参考来源

- `react-markdown` 官方文档：<https://remarkjs.github.io/react-markdown/>
- `remark-gfm` 官方仓库：<https://github.com/remarkjs/remark-gfm>
- `rehype-sanitize` 官方仓库：<https://github.com/rehypejs/rehype-sanitize>
