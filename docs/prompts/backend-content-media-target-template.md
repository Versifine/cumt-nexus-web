# Backend Content Media Target Template

复制下面模板给 Codex，用于在 `D:\Projects\cumt-nexus-api` 里推进内容系统 V2 的图片、对象存储、链接预览和白名单 embed 能力。

```text
请先阅读：
- AGENTS.md
- tasks.md
- README.md
- docs/internal/README.md
- docs/internal/architecture/*
- docs/internal/engineering/*

前端侧参考文档：
- D:\Projects\cumt-nexus-web\docs\internal\architecture\content-system.md
- D:\Projects\cumt-nexus-web\docs\internal\architecture\content-media-api-gaps.md
- D:\Projects\cumt-nexus-web\docs\internal\architecture\markdown-rendering.md

现在先讨论内容系统 V2 的媒体能力，不要立刻写代码。

目标：
- 为帖子图片、评论图片、链接预览、Bilibili / 抖音 / 网易云 / QQ 音乐白名单 embed 建立后端契约。
- 加入对象存储支持，至少覆盖本地开发和生产配置边界。
- 保持前端只通过 HTTP API 协作，不共享代码、不直接访问数据库、不持有对象存储密钥。
- 内容正文能力以 Reddit-style Markdown 为目标；不存用户 HTML，不开放任意 iframe，不把编辑 / 预览双模式作为强制产品形态。

讨论阶段请先输出：
- 当前后端已有能力。
- 缺失的数据模型。
- 缺失的接口。
- 对象存储方案选项。
- 安全风险：MIME 校验、大小限制、SSRF、防任意 iframe、HTML 禁止、未绑定附件清理。
- 推荐切片顺序。
- 哪些内容应该跳过并记录，哪些是必须阻塞。

讨论确认后，先写或更新后端文档：
- docs/internal/architecture/content-media.md
- docs/internal/engineering/object-storage.md
- tasks.md
- README.md 或 docs/internal/README.md 的索引

然后设置目标模式继续推进，实现以下后端能力：

1. 对象存储配置与本地实现
- 支持本地开发配置。
- 支持生产对象存储配置占位。
- 密钥只在后端环境变量。
- 不把对象存储密钥暴露给前端。

2. 图片上传接口
- POST /api/v1/uploads/images
- multipart/form-data
- 登录态必需。
- 校验 MIME、文件大小、真实图片头、宽高。
- 返回结构化 attachment。
- 保存 object_key、url、thumbnail_url、width、height、size_bytes、mime_type、alt_text、status。

3. 帖子附件绑定
- 扩展 POST /api/v1/communities/:slug/posts。
- 支持 attachment_ids。
- 老请求体继续兼容。
- 只能绑定当前用户上传且状态允许的附件。

4. 评论附件绑定
- 扩展 POST /api/v1/posts/:id/comments。
- 支持 attachment_ids。
- parent_id 行为不退化。
- 评论图片数量限制更克制。

5. 读取接口返回媒体
- 帖子列表、帖子详情、评论列表返回 attachments。
- blocked/failed 媒体可降级显示，不让整个资源读取失败。

6. 链接预览
- POST /api/v1/link-previews/resolve
- 只允许 http/https。
- 实现 SSRF 防护：禁止内网、loopback、link-local 和 metadata service。
- 有超时、响应大小限制、重定向限制和缓存。

7. 白名单 embed
- POST /api/v1/embeds/resolve
- 首批 provider：bilibili_video、douyin_video、netease_music_song、netease_music_playlist、netease_music_album、qq_music_song。
- 保存 provider、original_url、provider_resource_id、title、thumbnail_url、status。
- 不保存用户 iframe HTML。
- unsupported URL 返回明确业务错误或 status，不要当成 500。

不做什么：
- 不做浏览器直传对象存储。
- 不开放任意 iframe。
- 不存用户 HTML。
- 不允许前端直接信任第三方图片 URL。
- 不做图片编辑、裁剪、滤镜。
- 不把评论投票、通知、私信混进这个切片。
- 不做大范围目录重构。
- 不随意新增第三方依赖；如需要对象存储 SDK，先说明用途、替代方案和影响范围。

每个小切片完成后都要：
- 更新 tasks.md 和相关 docs/internal 文档。
- 运行 Go 测试、格式化和已有 smoke/main-path 检查。
- 说明改了什么、如何验证、未完成事项、是否新增依赖。
- 提交中文 commit message。
```

使用边界：

- 这个模板给后端仓库使用，不用于直接修改前端。
- 如果后端当前目标模式规则与模板冲突，以后端 `AGENTS.md` 和后端本地文档为准。
- 前端已经支持明确 canonical 裸链接的受控白名单播放器；后端仍要负责短链展开、元数据、审核状态和 `embed_ids` 持久化，前端不能伪造这些结构化能力。
