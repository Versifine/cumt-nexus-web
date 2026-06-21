# 内容系统产品形态讨论稿

本文记录 CUMT Nexus 后续内容系统方向：帖子和评论正文能力对齐 Reddit Markdown，评论从单层列表升级为 Reddit-style 评论树，并逐步支持图片、链接预览和白名单外链播放器。

本文是讨论稿和后续任务边界，不是已经实现的功能说明。任何实现前都要再次核对后端当前能力，并按 `AGENTS.md` 的完整功能任务推进。

## 产品方向

CUMT Nexus 的内容形态固定为：

```text
Reddit-style campus community content system
```

含义：

- 帖子是社区讨论的主对象，可以承载长文本、图片和外链上下文。
- 评论是树状讨论，不是单层留言板。
- 正文格式能力以 Reddit Markdown 为理想形态。
- 写作体验借鉴 Reddit：常用格式通过编辑器工具动作完成，高级用户仍可直接输入 Markdown。
- 不把“编辑 / 预览双模式”作为主流程；阅读态直接渲染最终内容。
- 媒体能力受控、可审核、可降级，不允许用户随意注入 HTML 或 iframe。
- 视觉上不复制 Reddit 皮肤；交互结构可以学习 Reddit，界面仍遵守 `docs/design/DESIGN.md` 的 dark editorial product 方向。

## 目标

### 帖子

帖子应支持：

- Reddit-style Markdown 正文。
- spoiler / 涂黑内容。
- 图片附件。
- 外链预览。
- 白名单嵌入内容，例如 Bilibili 视频和网易云音乐。
- 后续可扩展的内容类型，而不是每次新增媒体都重写帖子模型。

首版建议保留一个统一发帖入口，不急着拆成多个复杂 tab。用户在同一个写作器中写正文、添加图片或粘贴链接，由系统识别内容能力。

### 评论

评论应支持：

- 回复帖子。
- 回复评论。
- 树状层级展示。
- 折叠单个评论分支。
- Reddit-style Markdown 正文。
- spoiler / 涂黑内容。
- 图片附件，能力可以晚于帖子图片上线。
- 后续评论投票。

评论结构可以学习 Reddit：

- 左侧竖线表达层级。
- 每条评论有作者、时间、分数、回复入口和折叠入口。
- 子评论缩进展示。
- 深层评论超过展示深度后用“继续展开”或“查看后续回复”承接。

但不要照搬 Reddit 的视觉皮肤。我们的评论区仍应使用项目现有线条、编号、色块和低按钮感文字动作。

## 非目标

首轮不要做：

- 任意 HTML 富文本编辑器。
- 用户输入任意 HTML。
- 用户输入任意 iframe。
- 强制编辑 / 预览双模式。
- 所有站点通用的外链播放器。
- 实时协作编辑。
- 评论无限展开并一次加载整棵树。
- 楼中楼之外的复杂私信、@ 提醒和通知流。
- 帖子编辑历史、版本 diff 和草稿云同步。

这些能力可以以后讨论，但不应该阻塞 Reddit Markdown、图片和评论树的基础落地。

## Reddit Markdown 能力范围

目标能力按 Reddit 官方格式指南对齐，至少包括：

- 段落和换行。
- 斜体。
- 加粗。
- 加粗斜体。
- 删除线。
- spoiler / 涂黑：`>! ... !<`。
- 上标。
- 行内代码。
- 代码块。
- 链接。
- `r/community` 和 `u/user` 自动链接。
- 标题。
- 有序列表和无序列表。
- 引用。
- 表格和列对齐。
- 分隔线。
- Markdown 转义。

实现顺序可以分批，但长期能力目标不是“少量 Markdown-like 语法”，而是 Reddit-style Markdown parity。

## 当前已落地的最小子集

- 发帖、根评论、回复评论和帖子编辑使用单一写作面板；评论不提供编辑入口。
- 写作器提供加粗、斜体、引用、代码、链接和涂黑格式工具动作。
- 帖子详情正文和评论树正文通过 `ContentBody` 安全渲染。
- 当前 renderer 使用 `react-markdown` + `remark-gfm`，支持 GFM 表格、任务列表、删除线、代码块、引用、列表、标题和安全链接。
- `>! ... !<` 会渲染为默认隐藏、可点击展开的涂黑内容。
- Reddit-style 上标会经过预处理后渲染为上标。
- 未闭合的 `>!` 会按普通文本显示。
- 不提供编辑 / 预览双模式，阅读态负责最终渲染。
- 裸贴的 Bilibili、抖音、网易云音乐和 QQ 音乐 canonical URL 会由统一正文渲染入口自动渲染为受控播放器；用户提交的 iframe HTML 仍然完全禁止。
- 前端不存用户 HTML，不使用 `dangerouslySetInnerHTML`，不启用 `rehype-raw`。
- `npm run check:content-boundary` 已经作为静态守护，防止帖子详情正文和评论树正文绕过 `ContentBody`，并阻止原始 HTML、`rehype-raw` 和白名单播放器组件之外的 iframe/srcDoc 进入源码。
- `npm run check:content-segments` 已经作为行为守护，验证普通文本、多段涂黑、未闭合涂黑、空涂黑和多行涂黑的解析结果。

## 写作器形态

首版写作器应借鉴 Reddit，而不是做文档编辑器：

- 主体是稳定正文输入区。
- 常用格式提供工具动作：加粗、斜体、删除线、引用、代码、链接、涂黑、列表。
- 高级用户可以直接输入 Reddit Markdown。
- 不默认提供“编辑 / 预览”双 tab；阅读态负责最终渲染。
- 图片和链接以独立内容块或附件区呈现，不把远程图片 URL 当正文语法直接渲染。
- 移动端优先保持输入稳定，不做复杂浮动工具栏。

新增 Markdown editor、renderer、sanitize 或 embed 依赖前必须单独评估：

- 是否支持 React / Next.js。
- 是否能禁用 HTML。
- 是否能扩展 Reddit spoiler。
- 是否能安全渲染链接、表格和代码块。
- bundle 体积和维护状态。
- 是否会引入第二套 UI 风格。

## 媒体模型

图片、链接预览和白名单 embed 的后端契约缺口见 `docs/internal/architecture/content-media-api-gaps.md`。图片上传和 canonical 白名单播放器已在前端落地；白名单 embed 的短链解析、元数据、审核状态和 `embed.id` 持久化已由后端 `/api/v1/embeds/resolve` 补齐，链接预览仍以后端合同为准。

### 图片

图片能力分两步：

1. 帖子图片。
2. 评论图片。

图片规则：

- 上传必须走后端接口，不允许前端直接信任第三方 URL 作为图片附件。
- 支持 MIME 白名单，例如 `image/jpeg`、`image/png`、`image/webp`、`image/gif` 是否开放要单独讨论。
- 限制单图大小、单帖图片数量、单评论图片数量。
- 后端应保存宽高、文件大小、MIME、hash、状态。
- 前端渲染要有固定尺寸或比例，避免布局跳动。
- 必须支持 alt 文案或至少允许用户填写图片描述。

建议数据对象：

```text
media_attachment
- id
- owner_type: post | comment
- owner_id
- kind: image
- url
- thumbnail_url
- width
- height
- size_bytes
- mime_type
- alt_text
- status: ready | processing | blocked | failed
- created_at
```

### 链接预览

外链预览不是播放器。它用于普通网页：

- 展示标题。
- 展示域名。
- 展示摘要。
- 展示缩略图，如果安全可用。
- 链接失效时显示降级状态。

链接预览应由后端解析和缓存。前端不应在用户浏览器里直接抓取任意网页元数据。

### 外链播放器

Bilibili、抖音、网易云音乐和 QQ 音乐属于白名单 embed，不等于开放任意 iframe。

规则：

- 用户粘贴 URL。
- 前端可以先识别明确 canonical URL 并渲染受控 iframe wrapper。
- 后端仍应识别 provider、提取稳定 ID、展开短链、保存结构化 embed 并返回审核状态。
- 前端最终只根据白名单 provider 或本地白名单解析结果渲染受控 iframe 或播放器 wrapper。
- 不能保存用户提交的 iframe HTML。

建议 provider：

```text
bilibili_video
douyin_video
netease_music_song
netease_music_playlist
netease_music_album
qq_music_song
```

建议数据对象：

```text
content_embed
- id
- owner_type: post | comment
- owner_id
- provider
- original_url
- provider_resource_id
- title
- thumbnail_url
- status: ready | unsupported | blocked | failed
- created_at
- updated_at
```

前端渲染要求：

- 每种 provider 单独封装组件。
- iframe 使用 sandbox 和最小权限。
- 失败时显示可点击原链接。
- 移动端保持固定比例，不横向溢出。
- 不允许用户自定义播放器 HTML。

## 评论树

### 数据模型

Reddit-style 评论需要后端至少支持：

```text
comments.parent_id nullable
comments.depth 或查询时计算 depth
comments.path 或排序辅助字段，具体由后端决定
comments.reply_count
comments.score 后续可选
comments.upvote_count 后续可选
comments.downvote_count 后续可选
comments.my_vote 后续可选
```

最低可行模型：

- `parent_id` 为空表示直接回复帖子。
- `parent_id` 指向另一条评论表示回复评论。
- API 可以先返回扁平列表，由前端组树。
- 每条评论必须包含 `id`、`parent_id`、`author_id`、`body`、`status`、`created_at`。

### 查询策略

不要首版一次加载无限深整棵树。建议分阶段：

第一阶段：

- 帖子详情一次返回前 `N` 条评论。
- 扁平返回，前端组树。
- 最大展示深度限制为 6。
- 超深层级显示为“继续查看回复”入口。

第二阶段：

- 支持按评论节点加载子树。
- 支持排序：热门、最新、旧到新。
- 支持折叠状态保存在客户端。

### 前端展示

评论树组件建议拆分：

```text
CommentTree
CommentNode
CommentComposer
CommentActions
CollapsedCommentBranch
```

展示规则：

- 每个节点左侧用细竖线表达层级。
- 回复动作使用文字动作，例如 `回复`。
- 折叠动作使用文字或图标，不做大按钮。
- 深层缩进不能挤压正文。移动端超过深度后减少缩进或转为“查看后续回复”。
- 评论正文和帖子正文使用同一个安全正文渲染入口。

## API 草案

以下只是方向，不代表当前后端已经支持。

### 帖子

```text
POST /api/v1/communities/:slug/posts
GET  /api/v1/posts/:id
```

未来请求体可以扩展：

```json
{
  "title": "帖子标题",
  "body": "Reddit-style Markdown 正文",
  "attachment_ids": ["..."],
  "content_refs": [{"kind": "embed", "ref_id": "..."}]
}
```

### 评论

```text
GET  /api/v1/posts/:id/comments
POST /api/v1/posts/:id/comments
POST /api/v1/comments/:id/replies
```

也可以统一用一个创建评论接口：

```json
{
  "body": "Reddit-style Markdown 评论",
  "parent_id": "nullable comment id",
  "attachment_ids": ["..."],
  "content_refs": [{"kind": "embed", "ref_id": "..."}]
}
```

### 上传

```text
POST /api/v1/uploads/images
```

返回：

```json
{
  "attachment": {
    "id": "...",
    "url": "...",
    "thumbnail_url": "...",
    "width": 1200,
    "height": 800,
    "status": "ready"
  }
}
```

### Embed 解析

```text
POST /api/v1/embeds/resolve
```

请求：

```json
{
  "url": "https://www.bilibili.com/video/..."
}
```

返回：

```json
{
  "embed": {
    "id": "...",
    "provider": "bilibili_video",
    "provider_resource_id": "...",
    "title": "...",
    "thumbnail_url": "...",
    "status": "ready"
  }
}
```

## 安全边界

必须遵守：

- 不存用户 HTML。
- 不渲染未 sanitize 的 HTML。
- 不开放任意 iframe。
- 不在前端直接抓取第三方网页元数据。
- 图片上传必须限制大小、类型和数量。
- 外链播放器只允许白名单 provider。
- Markdown renderer 必须禁用危险协议，例如 `javascript:`。
- 嵌入 iframe 必须使用 sandbox、referrer policy 和最小权限。
- 后端仍是内容校验和持久化的权威。

## 实施顺序

建议按完整任务推进：

### Task 1：Reddit Markdown renderer 方案确认

交付：

- 明确候选 renderer 和 sanitizer。
- 明确是否新增依赖。
- 明确 Reddit Markdown 首版能力范围和二期能力范围。
- 不改页面行为。

完成标准：

- 依赖影响、替代方案和安全边界写清楚。
- 获得新增依赖批准后才进入实现任务。

### Task 2：帖子正文 Reddit Markdown 渲染

交付：

- `ContentBody` 接入安全 renderer。
- 帖子详情正文支持首版 Reddit Markdown 范围。
- spoiler 行为保持默认隐藏、可展开。

完成标准：

- 纯文本旧内容仍正常显示。
- 不渲染用户 HTML。
- 不绕过 `ContentBody`。
- 移动端长文本、表格和代码块不横向撑破页面。

### Task 3：评论正文 Reddit Markdown 渲染

交付：

- 评论树复用同一个 `ContentBody`。
- 评论正文支持首版 Reddit Markdown 范围。
- 评论树缩进和列表缩进不互相挤压。

完成标准：

- 根评论和子评论都可渲染。
- 折叠分支不影响已展开 spoiler 状态的安全边界。
- 移动端深层评论仍可读。

### Task 4：写作器工具动作

交付：

- 发帖、根评论、回复评论支持同一套格式工具动作。
- 工具动作插入或包裹 Reddit Markdown 语法。
- 不强制编辑 / 预览双模式。

完成标准：

- 发帖和评论主链路不退化。
- 移动端输入稳定。
- disabled、loading、error 状态不退化。

### Task 5：评论树后端契约

交付：

- 后端评论模型增加 `parent_id`。
- API 返回 `parent_id`。
- 前端类型同步。

完成标准：

- 旧评论作为根评论正常显示。
- 新评论可以回复评论。
- 主链路脚本覆盖根评论和子评论。

### Task 6：评论树 UI

交付：

- `CommentTree`、`CommentNode`、`CommentComposer`。
- 折叠分支。
- 最大展示深度。

完成标准：

- 桌面和移动端可读。
- 深层回复不挤压正文。
- 用户可以从任意深度回到帖子上下文。

### Task 7：帖子图片

交付：

- 图片上传接口。
- 发帖页添加图片。
- 帖子详情渲染图片。

完成标准：

- 尺寸、类型、数量限制明确。
- 上传 loading / error 状态完整。
- 图片失败可降级显示。

### Task 8：评论图片

交付：

- 评论发布支持图片附件。
- 评论树中渲染图片。

完成标准：

- 不破坏评论树移动端布局。
- 图片数量和尺寸更克制。

### Task 9：白名单外链 embed

交付：

- Bilibili provider。
- 网易云 provider。
- 通用 embed wrapper。

完成标准：

- 只接受白名单 URL。
- iframe 权限受控。
- 失败时有原链接降级入口。

## 待讨论问题

- 首版 Reddit Markdown 是否包含表格和上标，还是先放到第二批。
- `r/community` 和 `u/user` 自动链接如何映射到 CUMT Nexus 的社区和用户。
- 是否兼容 Reddit 的反斜杠换行规则。
- 图片是否允许 GIF。
- 帖子图片首版是否支持多图。
- 评论图片首版是否延后。
- 评论树默认排序是 `best`、`new` 还是 `old`。
- 评论树最大默认展开深度是多少。
- Bilibili 和网易云嵌入是否需要用户主动点击后加载，避免页面自动加载第三方资源。
- 是否需要内容审核状态影响图片和 embed 展示。

## 当前结论

推荐结论：

- 正文能力目标是 Reddit Markdown parity。
- 写作体验不做强制编辑 / 预览双模式，常用格式通过工具动作承接，高级用户可以直接写 Markdown。
- 当前已先落地 spoiler / 涂黑的最小安全渲染，但这不是完整 Reddit Markdown。
- `docs/internal/architecture/markdown-rendering.md` 是下一步 renderer 选型、安全边界和实施任务入口。
- 当前已新增用户内容渲染边界自检；后续 Reddit Markdown、图片和 embed 任务必须同步更新该检查，而不是绕过它。
- 当前已新增 spoiler / 涂黑解析行为自检；后续 renderer 接入时必须继续通过该检查，除非在独立任务中明确更新语法规则。
- 媒体能力的后端 API gap 已拆到 `docs/internal/architecture/content-media-api-gaps.md`；后续对象存储、图片和 embed 应先在后端仓库按该文档推进。
- 图片和 embed 晚于 Reddit Markdown renderer 与写作器，避免一次性扩大后端、存储、安全和前端渲染范围。
- 外链播放器必须走 provider 白名单，不开放任意 iframe。
- 后续任何实现都要以后端契约为准，先定数据模型和安全边界，再写前端 UI。

## 参考来源

- Reddit Help Formatting Guide：<https://support.reddithelp.com/hc/en-us/articles/360043033952-Formatting-Guide>
- Reddit Help comment/post formatting：<https://support.reddithelp.com/hc/en-us/articles/205191185-How-do-I-format-my-comment-or-post>
