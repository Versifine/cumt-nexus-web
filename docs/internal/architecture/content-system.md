# 内容系统产品形态讨论稿

本文记录 CUMT Nexus 后续内容系统方向：帖子从纯文本升级为 Markdown-like 内容，评论从单层列表升级为 Reddit-style 评论树，并逐步支持图片、链接预览和白名单外链播放器。

本文是讨论稿和后续切片边界，不是已经实现的功能说明。任何实现前都要再次核对后端当前能力，并按 `AGENTS.md` 的小纵向切片推进。

## 产品方向

CUMT Nexus 的内容形态固定为：

```text
Reddit-style campus community content system
```

含义：

- 帖子是社区讨论的主对象，可以承载长文本、图片和外链上下文。
- 评论是树状讨论，不是单层留言板。
- 内容编辑体验接近 Markdown，但面向普通校园用户提供必要的工具按钮。
- 媒体能力受控、可审核、可降级，不允许用户随意注入 HTML 或 iframe。
- 视觉上不复制 Reddit 皮肤；交互结构可以学习 Reddit，界面仍遵守 `docs/design/DESIGN.md` 的 dark editorial product 方向。

## 目标

### 帖子

帖子应支持：

- Markdown-like 正文。
- spoiler / 涂黑内容。
- 图片附件。
- 外链预览。
- 白名单嵌入内容，例如 Bilibili 视频和网易云音乐。
- 后续可扩展的内容类型，而不是每次新增媒体都重写帖子模型。

首版建议保留一个统一发帖入口，不急着拆成多个复杂 tab。用户在同一个编辑器中写正文、添加图片或粘贴链接，由系统识别内容能力。

### 评论

评论应支持：

- 回复帖子。
- 回复评论。
- 树状层级展示。
- 折叠单个评论分支。
- Markdown-like 正文。
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

- 富文本 HTML 编辑器。
- 用户输入任意 HTML。
- 用户输入任意 iframe。
- 所有站点通用的外链播放器。
- 实时协作编辑。
- 评论无限展开并一次加载整棵树。
- 楼中楼之外的复杂私信、@ 提醒和通知流。
- 帖子编辑历史、版本 diff 和草稿云同步。

这些能力可以以后讨论，但不应该阻塞 Markdown、图片和评论树的基础落地。

## 内容格式

### Markdown-like 范围

建议支持的基础语法：

````text
# 标题
## 小标题
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
![图片描述](attachment://...)
>! spoiler / 涂黑内容 !<
````

规则：

- 存储原始 Markdown-like 文本，不存储用户生成 HTML。
- 渲染前必须经过安全解析和 sanitization。
- 链接必须加安全属性，例如 `rel="nofollow ugc noopener noreferrer"`。
- 外链打开新窗口与否由产品统一决定，不在单个页面随意变化。
- spoiler 必须在未展开时不可直接读到视觉内容，但仍要考虑无障碍说明。

### Spoiler / 涂黑

建议语法：

```text
>! 这里是涂黑内容 !<
```

展示规则：

- 默认显示为一段黑色或深色遮罩。
- 点击或键盘激活后展开。
- 同一段 spoiler 可以再次收起。
- 不使用闪烁、发光或大面积动画。
- 文案使用中文，例如 `显示隐藏内容`。

当前已落地的最小子集：

- 发帖和评论工具栏可以插入 `>! 隐藏内容 !<`。
- 帖子详情正文和评论树正文会把该语法渲染为默认隐藏、可点击展开的涂黑内容。
- 该渲染只处理 spoiler / 涂黑片段，其余内容仍按纯文本显示。
- 未闭合的 `>!` 会按普通文本显示。
- 前端不存用户 HTML，不使用 `dangerouslySetInnerHTML`，也没有新增 Markdown renderer 依赖。
- `npm run check:content-boundary` 已经作为静态守护，防止帖子正文、评论正文和预览绕过 `ContentBody`，并阻止原始 HTML、`rehype-raw` 和未批准 iframe/srcDoc 进入源码。
- `npm run check:content-segments` 已经作为行为守护，验证普通文本、多段涂黑、未闭合涂黑、空涂黑和多行涂黑的解析结果。

仍未落地：

- 完整 Markdown renderer。
- Markdown 预览。
- 链接安全渲染。
- 图片附件。
- 白名单 embed。

### 编辑器形态

首版编辑器不做复杂 WYSIWYG。建议：

- 左侧或顶部提供少量工具按钮：加粗、引用、代码、链接、图片、spoiler。
- 主体仍是 textarea 或轻量 Markdown editor。
- 提供预览 tab 或“预览”切换。
- 移动端优先保持输入稳定，不做复杂浮动工具栏。

新增 Markdown editor 或 renderer 依赖前必须单独评估：

- 是否支持 React/Next.js。
- 是否能禁用 HTML。
- 是否能扩展 spoiler。
- 是否能安全渲染链接和图片。
- bundle 体积和维护状态。
- 是否会引入第二套 UI 风格。

## 媒体模型

图片、链接预览和白名单 embed 的后端契约缺口见 `docs/internal/architecture/content-media-api-gaps.md`。在这些接口完成前，前端只记录 gap，不伪造上传、对象存储或播放器能力。

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

Bilibili 和网易云音乐属于白名单 embed，不等于开放任意 iframe。

规则：

- 用户粘贴 URL。
- 后端识别 provider。
- 后端提取稳定 ID。
- 后端保存结构化 embed。
- 前端只根据白名单 provider 渲染受控 iframe 或播放器 wrapper。
- 不能保存用户提交的 iframe HTML。

建议 provider：

```text
bilibili_video
netease_music_song
netease_music_playlist
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

当前评论是单层结构。Reddit-style 评论需要后端至少增加：

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
- 评论正文和帖子正文使用同一个安全 Markdown renderer。

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
  "body": "Markdown-like 正文",
  "attachment_ids": ["..."],
  "embed_ids": ["..."]
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
  "body": "Markdown-like 评论",
  "parent_id": "nullable comment id",
  "attachment_ids": ["..."],
  "embed_ids": ["..."]
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

建议按小切片推进：

### Slice 1：Markdown renderer 讨论和选型

交付：

- 按 `docs/internal/architecture/markdown-rendering.md` 选定 Markdown renderer 和 sanitizer 方案。
- 明确是否新增依赖。
- 写 dependency boundary 更新方案。
- 不改帖子数据模型。

完成标准：

- 帖子详情可以安全渲染基础 Markdown。
- 纯文本旧内容仍正常显示。
- spoiler 语法有明确实现方案。

### Slice 2：帖子 Markdown 编辑和预览

交付：

- 发帖页编辑器支持基础 Markdown 输入。
- 提供预览切换。
- 提交仍使用当前 `body` 字段。

完成标准：

- loading、error、disabled 状态完整。
- 移动端不横向溢出。
- 不引入富文本 HTML 存储。

### Slice 3：评论 Markdown 渲染

交付：

- 评论正文使用同一 Markdown renderer。
- 评论发布仍使用当前 `body` 字段。

完成标准：

- 评论列表安全渲染 Markdown。
- 未登录门禁和错误状态不退化。

### Slice 4：评论树后端契约

交付：

- 后端评论模型增加 `parent_id`。
- API 返回 `parent_id`。
- 前端类型同步。

完成标准：

- 旧评论作为根评论正常显示。
- 新评论可以回复评论。
- 主链路脚本覆盖根评论和子评论。

### Slice 5：评论树 UI

交付：

- `CommentTree`、`CommentNode`、`CommentComposer`。
- 折叠分支。
- 最大展示深度。

完成标准：

- 桌面和移动端可读。
- 深层回复不挤压正文。
- 用户可以从任意深度回到帖子上下文。

### Slice 6：帖子图片

交付：

- 图片上传接口。
- 发帖页添加图片。
- 帖子详情渲染图片。

完成标准：

- 尺寸、类型、数量限制明确。
- 上传 loading/error 状态完整。
- 图片失败可降级显示。

### Slice 7：评论图片

交付：

- 评论发布支持图片附件。
- 评论树中渲染图片。

完成标准：

- 不破坏评论树移动端布局。
- 图片数量和尺寸更克制。

### Slice 8：白名单外链 embed

交付：

- Bilibili provider。
- 网易云 provider。
- 通用 embed wrapper。

完成标准：

- 只接受白名单 URL。
- iframe 权限受控。
- 失败时有原链接降级入口。

## 待讨论问题

- Markdown 是否允许标题 `#`，还是只允许正文级别格式。
- spoiler 是否使用 Reddit 语法 `>! !<`，还是提供自定义语法。
- 图片是否允许 GIF。
- 帖子图片首版是否支持多图。
- 评论图片首版是否延后。
- 评论树默认排序是 `best`、`new` 还是 `old`。
- 评论树最大默认展开深度是多少。
- Bilibili 和网易云嵌入是否需要用户主动点击后加载，避免页面自动加载第三方资源。
- 是否需要内容审核状态影响图片和 embed 展示。

## 当前结论

推荐结论：

- 结构上学习 Reddit，视觉上保持 CUMT Nexus 自己的暗色 editorial product 风格。
- 当前已先落地 spoiler / 涂黑的最小安全渲染；完整 Markdown renderer 的选型和安全边界见 `docs/internal/architecture/markdown-rendering.md`。
- 当前已新增用户内容渲染边界自检；后续 Markdown、图片和 embed 切片必须同步更新该检查，而不是绕过它。
- 当前已新增 spoiler / 涂黑解析行为自检；后续 Markdown renderer 接入时必须继续通过该检查，除非在独立切片中明确更新语法规则。
- 媒体能力的后端 API gap 已拆到 `docs/internal/architecture/content-media-api-gaps.md`；后续对象存储、图片和 embed 应先在后端仓库按该文档推进。
- 下一步如要做完整 Markdown，应先获得新增依赖批准，再更新依赖边界检查。
- 图片和 embed 晚于评论树，避免一次性扩大后端、存储、安全和前端渲染范围。
- 外链播放器必须走 provider 白名单，不开放任意 iframe。
- 后续任何实现都要以后端契约为准，先定数据模型和安全边界，再写前端 UI。
