# Content Media API Gaps

本文记录内容系统 V2 中，前端继续推进图片、对象存储、链接预览和白名单 embed 前，必须核对的后端接口与安全边界。

用户已确认后端具备 `POST /api/v1/uploads/images` 和 Cloudflare R2 存储相关边界。前端实现前仍必须核对当前请求字段、响应字段、附件绑定字段和读取返回结构。前端不得伪造图片上传、直接信任第三方图片 URL、直接抓取网页元数据，或渲染用户提交的 iframe HTML。

帖子媒体流、列表首个媒体块预览、详情页图片播放器、lightbox 和公开用户主页重构的产品规则见 `docs/internal/product/post-media-profile-rebuild.md`。本文只保留媒体和 embed 相关 API、安全和数据模型边界。

## 当前结论

- 媒体能力必须以后端为最终权威：上传、校验、对象存储、审核状态、链接解析、短链展开、元数据抓取和 embed provider 持久化都在后端完成。
- V2 前端已接入 `POST /api/v1/uploads/images`，并在发帖和评论写作器中形成可用上传体验。
- 前端只提交后端返回的结构化 `attachment_id`、`embed_id` 或预览对象，不直接保存第三方 URL 作为附件。
- 前端正文内图片使用 Markdown 引用 `![说明](nexus-attachment:<attachment_id>)`。该 marker 只负责在正文中表达位置；真正图片 URL、状态、尺寸和说明仍以后端返回的 `attachments` 为准。
- 后续媒体模型采用“附件是资产，正文决定位置和分组”的原则：单图、图片轮播和白名单播放器都应作为正文流里的媒体块出现，而不是统一追加到正文底部。
- 单图继续使用 `nexus-attachment` marker；图片轮播建议使用明确的正文 marker，例如 `![图集说明](nexus-gallery:<attachment_id>,<attachment_id>)`。该 marker 表达“这些图片在此处组成一组播放器”，真正 URL、尺寸、缩略图、状态和权限仍以后端返回资产为准。
- 当前 `content_refs` 是按顺序保存的扁平引用列表，适合表达正文引用了哪些图片、链接预览和 embed；它不能单独表达“图片 1/2/3 是一个轮播组，图片 6/7 是另一个轮播组”。媒体分组必须由正文 marker 表达，或由后端后续新增 block 级结构表达。
- 旧内容或用户未插入正文的已绑定附件不再由 `ContentBody` 追加成正文外图集；发布态只渲染正文内 `nexus-attachment` marker 引用到的附件。
- 帖子和评论图片均已接入；评论图片数量继续比帖子更克制。
- 链接预览和播放器是两种能力：普通网页只做链接预览，Bilibili / 抖音 / 网易云音乐 / QQ 音乐只通过 provider 白名单 embed。
- V2 前端已支持明确 canonical 裸链接的本地白名单识别和受控播放器渲染；这不保存 `embed_ids`，也不解析短链、标题、封面或审核状态。
- 任意 iframe、用户 HTML、`data:` 图片和浏览器端抓第三方网页元数据都禁止。

## 当前已核对的图片合同

截至 2026-06-08，前端按当前后端合同实现图片附件产品化：

- `POST /api/v1/uploads/images` 使用 `multipart/form-data`，字段为 `file` 和可选 `alt_text`。
- 成功响应字段至少包括 `attachment.id`、`kind`、`url`、`width`、`height`、`size_bytes`、`mime_type`、`alt_text`、`status`、`created_at`；如后端当前合同提供 `thumbnail_url`，列表页应优先使用它，前端实现前仍需复核真实响应。
- 后端默认限制：单图片最大 `5242880` bytes，发帖最多 9 张，评论最多 1 张。
- 后端只接受 `image/jpeg`、`image/png`、`image/webp`，并按文件头识别 MIME。
- `alt_text` 最长 200 个字符。
- `POST /api/v1/communities/:slug/posts` 已支持 `attachment_ids`，帖子详情、社区帖子列表和全站帖子流返回 `attachments`。
- `POST /api/v1/posts/:id/comments` 已支持 `attachment_ids`，评论 flat list 和 `view=tree` 均返回 `attachments`。
- 前端已按上述合同提示并拦截明显不合规输入；图片只通过写作器工具栏、粘贴或拖拽进入正文，未留在正文里的上传图片不会随内容提交。
- 前端当前不直接删除对象、不生成缩略图、不伪造缺失的衍生图字段。
- 编辑态附件重绑已接入：`PATCH /api/v1/posts/:id` 和 `PATCH /api/v1/comments/:id` 已接收可选 `attachment_ids`，前端编辑弹窗可以新增图片，并在保存时只提交正文实际引用到的图片 ID。

## 后端 / API 剩余缺口

### CORS 方法

浏览器端编辑帖子和评论需要调用 `PATCH /api/v1/posts/:id` 和 `PATCH /api/v1/comments/:id`。当前本地预检证据：

```text
OPTIONS /api/v1/posts/:id
Origin: http://localhost:3000
Access-Control-Request-Method: PATCH

Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

上述是旧证据。2026-06-08 复核后端当前远端 `main`，`internal/platform/httpserver/middleware.go` 已返回：

```text
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
```

结论：CORS 方法缺口已不再作为当前阻塞。前端仍必须用真实浏览器复验帖子编辑和评论编辑保存，因为 shell 直连成功不能覆盖浏览器预检、会话、TanStack Query 刷新和弹窗状态。

### 对象存储配置

后端需要先确定对象存储方案，至少支持本地开发和生产两类配置。

建议配置项：

```text
OBJECT_STORAGE_PROVIDER=local | s3 | minio
OBJECT_STORAGE_BUCKET=...
OBJECT_STORAGE_REGION=...
OBJECT_STORAGE_ENDPOINT=...
OBJECT_STORAGE_ACCESS_KEY=...
OBJECT_STORAGE_SECRET_KEY=...
OBJECT_STORAGE_PUBLIC_BASE_URL=...
OBJECT_STORAGE_MAX_IMAGE_BYTES=5242880
OBJECT_STORAGE_ALLOWED_IMAGE_MIME=image/jpeg,image/png,image/webp
```

规则：

- 密钥只存在后端环境变量，不进入前端。
- 生产环境必须使用私有写入凭证，公开读取 URL 或签名读取策略由后端统一决定。
- 本地开发可以落到本地文件或 MinIO，但 API 响应结构必须与生产一致。
- 后端必须保存对象 key，而不是只保存公开 URL。

### 上传图片

当前接口：

```text
POST /api/v1/uploads/images
```

请求：

```text
multipart/form-data
- file
- alt_text optional
```

当前响应：

```json
{
  "attachment": {
    "id": "uuid",
    "kind": "image",
    "url": "https://cdn.example.com/...",
    "thumbnail_url": "https://cdn.example.com/...",
    "width": 1200,
    "height": 800,
    "size_bytes": 123456,
    "mime_type": "image/webp",
    "alt_text": "图片描述",
    "status": "ready"
  }
}
```

后端必须校验：

- 登录态。
- 文件大小。
- MIME 白名单。
- 实际文件头，而不是只看扩展名。
- 图片宽高。
- 单用户短时间上传频率。
- 空文件、损坏图片和超大像素图片。

后续可选：

- 生成缩略图。
- 图片 hash 去重。
- EXIF 清理。
- 审核状态：`ready | processing | blocked | failed`。

### 附件绑定到帖子

当前发帖接口：

```text
POST /api/v1/communities/:slug/posts
```

当前请求体：

```json
{
  "title": "帖子标题",
  "body": "Reddit-style Markdown 正文",
  "attachment_ids": ["uuid"]
}
```

规则：

- `attachment_ids` 必须属于当前用户，且状态允许绑定。
- 未绑定的临时附件需要有过期清理策略。
- 单帖图片数量需要后端限制。
- 老请求体不带 `attachment_ids` 时必须继续兼容。
- 外链预览和白名单 embed 不复用 `attachment_ids`；如需 `embed_ids`，必须另起合同。

### 附件绑定到评论

当前评论接口：

```text
POST /api/v1/posts/:id/comments
```

当前请求体：

```json
{
  "body": "Reddit-style Markdown 评论",
  "parent_id": "nullable comment id",
  "attachment_ids": ["uuid"]
}
```

规则：

- 评论图片可以晚于帖子图片上线。
- 首版评论图片数量应比帖子更克制，例如最多 1 张。
- 子评论和根评论使用同一绑定规则。
- 外链预览和白名单 embed 不复用 `attachment_ids`；如需 `embed_ids`，必须另起合同。

### 编辑态附件重绑已接入

当前编辑接口：

```text
PATCH /api/v1/posts/:id
PATCH /api/v1/comments/:id
```

当前后端源码和合同显示：

- `PATCH /api/v1/posts/:id` 请求体为 `title`、`body` 和可选 `attachment_ids`。
- `PATCH /api/v1/comments/:id` 请求体为 `body` 和可选 `attachment_ids`。
- 不带 `attachment_ids` 时继续只更新正文；带 `attachment_ids` 时后端按作者和目标内容校验所有权，并替换当前内容绑定的图片集合。
- 成功响应会继续返回最新 `attachments`。

因此前端编辑弹窗当前支持：

- 打开编辑弹窗后直接显示渲染编辑面，不直接露出 Markdown 源码。
- 在同一个渲染编辑面里修改正文和标题 / 评论内容。
- 上传、粘贴或拖拽新增图片并插入正文位置。
- 删除正文中的图片 marker 后阅读态不展示这张图片，保存时也不提交对应 `attachment_id`。
- 保存时按正文实际引用顺序提交 `attachment_ids`，未引用图片不随内容绑定。

帖子编辑请求体：

```json
{
  "title": "帖子标题",
  "body": "Reddit-style Markdown 正文",
  "attachment_ids": ["uuid"]
}
```

评论编辑同理：

```json
{
  "body": "Reddit-style Markdown 评论",
  "attachment_ids": ["uuid"]
}
```

规则：

- 不带 `attachment_ids` 的老请求继续只更新正文。
- 带 `attachment_ids` 时按当前作者和目标内容校验所有权。
- 删除正文 marker 后应解除当前内容绑定；未引用附件如何 TTL 清理，仍需要对象清理合同继续跟进。

### 读取帖子和评论媒体

帖子详情、帖子列表和评论列表当前返回结构化媒体。

当前字段：

```json
{
  "attachments": [
    {
      "id": "uuid",
      "kind": "image",
      "url": "https://cdn.example.com/...",
      "width": 1200,
      "height": 800,
      "size_bytes": 123456,
      "mime_type": "image/webp",
      "alt_text": "图片描述",
      "status": "ready"
    }
  ],
  "embeds": []
}
```

规则：

- 列表页可以只返回缩略图和必要元信息。
- 详情页返回完整展示所需字段。
- `blocked` 或 `failed` 状态必须可降级显示，不应让整个帖子或评论读取失败。
- 正文中的单图、轮播和 embed 必须能按正文顺序被前端解析；如果仅返回扁平 `attachments` 和 `content_refs`，前端只能从 Markdown marker 中恢复 block 位置和分组。
- 如果后端后续要提供更稳定的正文 block 结构，建议在帖子和评论读取响应中增加 `content_blocks`，而不是把分组塞进 `attachments`。

建议 block 结构：

```json
{
  "content_blocks": [
    {
      "kind": "markdown",
      "text": "第一段文字"
    },
    {
      "kind": "image_gallery",
      "ids": ["attachment-1", "attachment-2", "attachment-3"],
      "caption": "图集说明"
    },
    {
      "kind": "embed",
      "ref_id": "https://www.bilibili.com/video/BV...",
      "provider": "bilibili_video"
    }
  ]
}
```

字段边界：

- `content_blocks` 是可选增强；没有该字段时，前端继续以 Markdown marker 和 `attachments` / `content_refs` 解析。
- `image_gallery.ids` 必须引用同一内容中已绑定、状态允许展示的图片附件。
- 后端可以拒绝空图集、重复 ID、超过数量上限的图集或引用未绑定附件的图集。
- 评论是否支持轮播应单独确认；如果评论仍限制 1 张图，评论正文只需要单图块。
- 列表页如要避免前端解析整段正文，可以在 `preview` 中返回第一个媒体块的摘要；否则前端会保守解析 `body_excerpt` / `body` 和附件。

建议图片资产字段：

```json
{
  "id": "uuid",
  "kind": "image",
  "url": "https://cdn.example.com/original-or-display.jpg",
  "thumbnail_url": "https://cdn.example.com/thumb.jpg",
  "medium_url": "https://cdn.example.com/medium.jpg",
  "original_url": "https://cdn.example.com/original.jpg",
  "width": 1200,
  "height": 800,
  "size_bytes": 123456,
  "mime_type": "image/webp",
  "alt_text": "图片描述",
  "status": "ready"
}
```

规则：

- `thumbnail_url` 用于列表页。
- `medium_url` 用于详情页常规展示。
- `original_url` 只用于 lightbox、打开原图或下载；如果后端不区分原图和展示图，可以暂时等于 `url`。
- 前端按 `width / height` 做普通图、长图、超宽图和小图分流；后端不必返回分类字段，但必须保证宽高可信。
- 超大原图、压缩、EXIF 清理、转码和真实文件大小限制由后端或上传服务负责，前端只做选择前提示和明显违规拦截。

### 链接预览

建议接口：

```text
POST /api/v1/link-previews/resolve
```

请求：

```json
{
  "url": "https://example.com/page"
}
```

响应：

```json
{
  "preview": {
    "id": "uuid",
    "url": "https://example.com/page",
    "domain": "example.com",
    "title": "页面标题",
    "description": "页面摘要",
    "thumbnail_url": "https://cdn.example.com/preview.jpg",
    "status": "ready"
  }
}
```

后端必须处理：

- URL 协议白名单：`http`、`https`。
- SSRF 防护，禁止内网地址、loopback、link-local、metadata service。
- 请求超时、响应大小限制和重定向次数限制。
- 解析结果缓存。
- 降级状态：`ready | unsupported | blocked | failed`。

### 白名单 embed

建议接口：

```text
POST /api/v1/embeds/resolve
```

请求：

```json
{
  "url": "https://www.bilibili.com/video/BV..."
}
```

响应：

```json
{
  "embed": {
    "id": "uuid",
    "provider": "bilibili_video",
    "original_url": "https://www.bilibili.com/video/BV...",
    "provider_resource_id": "BV...",
    "title": "视频标题",
    "thumbnail_url": "https://...",
    "status": "ready"
  }
}
```

首批 provider 建议：

```text
bilibili_video
douyin_video
netease_music_song
netease_music_playlist
netease_music_album
qq_music_song
```

规则：

- 后端只保存 provider、资源 ID 和原始 URL，不保存用户提交的 iframe HTML。
- 不支持的 URL 返回 `unsupported`，不要抛成通用 500。
- 前端只根据 provider 渲染受控组件；当前 `ContentBody` 已有一套无后端持久化的 canonical URL 本地识别，后端 resolve 完成后应切到结构化 `embed` / `embed_ids` 合同。
- iframe 权限、sandbox、referrer policy 由前端 provider wrapper 固定，不允许用户配置。

当前前端本地识别范围：

```text
Bilibili: bilibili.com/video/BV..., bilibili.com/video/av..., player.bilibili.com/player.html
抖音: douyin.com/video/<id>, iesdouyin.com/share/video/<id>, open.douyin.com/player/video?vid=...
网易云音乐: music.163.com/#/song?id=..., playlist, album, outchain/player
QQ 音乐: i.y.qq.com/v8/playsong.html?songid=..., y.qq.com/n/ryqq/songDetail/<songmid>, i.y.qq.com/n2/m/outchain/player/index.html
```

仍需后端处理：

- `b23.tv`、`v.douyin.com` 等短链展开。
- 标题、封面、作者等元数据。
- provider 审核状态和屏蔽状态。
- `embed_ids` 写入帖子 / 评论发布和编辑请求。
- 已保存内容读取时返回结构化 `embeds`。

## 数据模型建议

```text
media_attachments
- id
- owner_user_id
- owner_type nullable: post | comment
- owner_id nullable
- kind: image
- object_key
- url
- thumbnail_object_key nullable
- thumbnail_url nullable
- width
- height
- size_bytes
- mime_type
- alt_text nullable
- status: ready | processing | blocked | failed
- created_at
- attached_at nullable

content_embeds
- id
- owner_user_id
- owner_type nullable: post | comment
- owner_id nullable
- provider
- original_url
- provider_resource_id
- title nullable
- thumbnail_url nullable
- status: ready | unsupported | blocked | failed
- created_at
- attached_at nullable

link_previews
- id
- url
- normalized_url
- domain
- title nullable
- description nullable
- thumbnail_url nullable
- status: ready | unsupported | blocked | failed
- fetched_at
- expires_at
```

## 前端接入顺序

图片能力已完成当前前端接入，后续仍按能力拆完整任务：

1. 已完成：帖子图片上传，发帖表单选择图片、上传 loading/error、失败重试、提交 `attachment_ids`。
2. 已完成：帖子详情图片展示，固定比例、alt 文案和附件元信息。
3. 已完成：评论图片上传，复用上传入口，按后端合同限制为最多 1 张。
4. 已完成：编辑态图片新增 / 删除 / 重绑，前端编辑弹窗上传入口提交正文实际引用的 `attachment_ids`。
5. 链接预览：粘贴 URL 后解析，普通网页展示预览卡。
6. 已完成前端 canonical URL 白名单 embed：按 provider 渲染受控播放器 wrapper。
7. 待后端补齐：白名单 embed resolve、短链解析、元数据、审核状态和 `embed_ids` 持久化。

## 验收要求

后端完成媒体能力后，至少需要证明：

- 上传图片接口拒绝未登录用户。
- 超出大小限制的图片失败。
- 非白名单 MIME 失败。
- 发帖可以绑定已上传附件。
- 帖子详情能读取附件元信息。
- 评论可以绑定已上传附件。
- 链接预览不会请求内网地址。
- 不支持的 embed URL 返回 `unsupported`。
- Bilibili / 抖音 / 网易云 / QQ 音乐白名单 URL 能返回结构化 provider 对象。
- 前端无需任何对象存储密钥即可展示后端返回的公开 URL 或签名 URL。

## 暂不做

- 浏览器直传对象存储。
- 任意远程图片 URL 作为附件。
- 用户提交 HTML 或 iframe。
- 通用网页播放器。
- 图片编辑、裁剪和滤镜。
- 实时上传进度条之外的复杂媒体管理器。
