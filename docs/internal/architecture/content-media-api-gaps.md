# Content Media API Gaps

本文记录内容系统 V2 中，前端继续推进图片、对象存储、链接预览和白名单 embed 前，必须核对的后端接口与安全边界。

用户已确认后端具备 `POST /api/v1/uploads/images` 和 Cloudflare R2 存储相关边界。前端实现前仍必须核对当前请求字段、响应字段、附件绑定字段和读取返回结构。前端不得伪造图片上传、直接信任第三方图片 URL、直接抓取网页元数据，或渲染用户提交的 iframe HTML。

## 当前结论

- 媒体能力必须以后端为权威：上传、校验、对象存储、审核状态、链接解析和 embed provider 识别都在后端完成。
- V2 前端必须接入 `POST /api/v1/uploads/images`，并在发帖和评论写作器中形成可用上传体验。
- 前端只提交后端返回的结构化 `attachment_id`、`embed_id` 或预览对象，不直接保存第三方 URL 作为附件。
- 帖子图片先于评论图片；评论图片必须等评论树稳定后再接入。
- 链接预览和播放器是两种能力：普通网页只做链接预览，Bilibili / 网易云音乐等只通过 provider 白名单 embed。
- 任意 iframe、用户 HTML、`data:` 图片和浏览器端抓第三方网页元数据都禁止。

## 后端缺口

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

建议接口：

```text
POST /api/v1/uploads/images
```

请求：

```text
multipart/form-data
- file
- alt_text optional
```

响应：

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

未来请求体建议扩展：

```json
{
  "title": "帖子标题",
  "body": "Reddit-style Markdown 正文",
  "attachment_ids": ["uuid"],
  "embed_ids": ["uuid"]
}
```

规则：

- `attachment_ids` 必须属于当前用户，且状态允许绑定。
- 未绑定的临时附件需要有过期清理策略。
- 单帖图片数量需要后端限制。
- 老请求体不带 `attachment_ids` 时必须继续兼容。

### 附件绑定到评论

当前评论接口：

```text
POST /api/v1/posts/:id/comments
```

未来请求体建议扩展：

```json
{
  "body": "Reddit-style Markdown 评论",
  "parent_id": "nullable comment id",
  "attachment_ids": ["uuid"],
  "embed_ids": ["uuid"]
}
```

规则：

- 评论图片可以晚于帖子图片上线。
- 首版评论图片数量应比帖子更克制，例如最多 1 张。
- 子评论和根评论使用同一绑定规则。

### 读取帖子和评论媒体

帖子详情、帖子列表和评论列表需要返回结构化媒体。

建议字段：

```json
{
  "attachments": [
    {
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
  ],
  "embeds": []
}
```

规则：

- 列表页可以只返回缩略图和必要元信息。
- 详情页返回完整展示所需字段。
- `blocked` 或 `failed` 状态必须可降级显示，不应让整个帖子或评论读取失败。

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
netease_music_song
netease_music_playlist
```

规则：

- 后端只保存 provider、资源 ID 和原始 URL，不保存用户提交的 iframe HTML。
- 不支持的 URL 返回 `unsupported`，不要抛成通用 500。
- 前端只根据 provider 渲染受控组件。
- iframe 权限、sandbox、referrer policy 由前端 provider wrapper 固定，不允许用户配置。

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

后端完成后，前端再按这些小切片接入：

1. 帖子图片上传：发帖表单选择图片、上传 loading/error、提交 `attachment_ids`。
2. 帖子详情图片展示：固定比例、失败降级、alt 文案。
3. 评论图片上传：复用上传入口，但限制数量更小。
4. 链接预览：粘贴 URL 后解析，普通网页展示预览卡。
5. 白名单 embed：按 provider 渲染受控播放器 wrapper。

## 验收要求

后端完成媒体能力后，至少需要证明：

- 上传图片接口拒绝未登录用户。
- 超出大小限制的图片失败。
- 非白名单 MIME 失败。
- 发帖可以绑定已上传附件。
- 帖子详情能读取附件元信息。
- 评论可以在后续切片绑定附件。
- 链接预览不会请求内网地址。
- 不支持的 embed URL 返回 `unsupported`。
- Bilibili / 网易云白名单 URL 能返回结构化 provider 对象。
- 前端无需任何对象存储密钥即可展示后端返回的公开 URL 或签名 URL。

## 暂不做

- 浏览器直传对象存储。
- 任意远程图片 URL 作为附件。
- 用户提交 HTML 或 iframe。
- 通用网页播放器。
- 图片编辑、裁剪和滤镜。
- 实时上传进度条之外的复杂媒体管理器。
