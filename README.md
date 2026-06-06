# CUMT Nexus Web

`cumt-nexus-web` 是 CUMT Nexus 的前端仓库，面向校园社区内容产品。前端直连后端仓库 `D:\Projects\cumt-nexus-api`，默认后端地址为 `http://localhost:8080`。

## 当前状态

- 技术栈：Next.js App Router + React + TypeScript + Tailwind CSS + shadcn/ui + Motion。
- 视觉方向：dark editorial product / magazine-grade campus community interface。
- 界面语言：用户可见文案默认使用简体中文，品牌名、技术名、URL slug、API 字段和用户生成内容保留原文。
- 当前分支：`stage/0-web-planning`。该分支名来自早期规划阶段，当前实际承载 V1 本地封版和 V2 本地产品化推进。
- 当前目标：V2 后端能力全量前端接入已完成本地初版收口；生产 HTTPS 域名、正式 API origin 和生产 CORS 在没有域名前保持 deferred。
- 最新 V2 本地验收（2026-06-03）：`npm run check:static`、`npm run check:docs`、`npm run check:routes`、严格 `npm run check:readiness`、严格 `npm run check:main-path` 和 `npm run check:v2-path` 通过；后端补齐后已复跑 `lint`、`typecheck`、严格 `check:main-path` 和 `check:v2-path`。
- 当前 V2.1 推进（2026-06-03）：后端已补齐社区申请列表 / 详情和 `/api/v1/me.is_platform_staff`，前端已接入完整申请审核台和 staff 入口显隐；生产配置仍保持 deferred。
- 当前 Post-V2 推进（2026-06-04）：图片附件产品化已接入上传前限制提示、失败重试、待提交附件移除提示和发帖 / 评论差异化数量上限；缩略图 URL、未绑定对象物理清理和失败对象回收仍以后端后续合同为准。
- 最新浏览器复验（2026-06-03）：帖子详情 Reddit Markdown、涂黑、评论 Markdown、评论树和附件路径已在桌面/移动端检查；`/search`、`/notifications`、`/moderation`、`/community-applications/review`、`/communities/public/new` 在桌面/移动端无横向溢出、无控制台 error；登录/注册表单原生降级不会把账号字段写入 URL；退出登录和 token 清空会清理 TanStack Query 缓存。

## 已实现范围

- 注册、登录、当前用户识别和本地 token 会话。
- 全站帖子流，支持最新 / 热门切换。
- 社区列表、社区详情和社区帖子列表。
- 社区帖子流支持最新 / 热门切换。
- 帖子详情、评论列表和评论发布。
- 帖子 upvote / downvote 状态展示和操作。
- 作者编辑和软删除自己的帖子、评论。
- 在指定社区发布帖子。
- 提交社区创建申请。
- 社区申请审核台：staff 可按状态查看申请列表、查看详情并 approve / reject。
- Reddit Markdown 阅读态：帖子和评论正文通过 `react-markdown` + `remark-gfm` 安全渲染，支持 GFM、链接安全过滤、涂黑和上标扩展。
- 单一写作面板：发帖、评论、回复和作者编辑都使用同一套格式工具条，不再提供编辑 / 预览双模式。
- 图片上传和附件展示：发帖、评论可上传图片并提交 `attachment_ids`，上传前按后端默认合同提示并拦截 JPEG / PNG / WebP、单图 5MB、发帖最多 9 张、评论最多 1 张，上传失败可重试，帖子详情和评论树展示返回的图片附件。
- 搜索页 `/search`：支持关键词、`all | communities | posts` scope、URL query、loading、empty 和 error。
- 通知中心 `/notifications`：支持全部 / 未读 / 已读、标记已读和保守跳转。
- 举报入口：普通用户可举报帖子和评论。
- 审核台 `/moderation` 和 `/moderation/reports/:id`：支持举报列表、举报详情、`target_preview`、dismiss、remove-target。
- 内容审核移除：帖子和评论详情入口支持 moderation remove，权限由后端返回 `forbidden` 校验。
- 受保护动作登录门禁：未登录访问发帖或社区申请时，引导登录/注册并保留 `next` 回跳。
- 全局 404 和页面错误状态页。
- 页面级标题、描述、`robots.txt` 和 `sitemap.xml`。
- 基础 favicon、Web App Manifest、Open Graph 和 Twitter 分享元信息。
- 前端健康检查端点 `/healthz`。
- 前后端就绪检查端点 `/readyz`。
- 基础安全响应头：`X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy`、`Permissions-Policy`。
- 主要数据页覆盖 loading、empty、error、未登录、提交中和成功/失败状态。

当前仍不做或等待后续产品合同：

- 申请取消。
- 个人资料编辑、头像、邮箱。
- 评论投票、私信、实时能力和个性化推荐。
- 图片缩略图 URL、未绑定对象物理删除 / TTL 和失败对象回收的后端合同。
- Bilibili、网易云音乐等白名单 embed 和普通网页链接预览。

## V1 本地封版边界

当前可以按“V1 本地版”验收的范围：

- 本地前端 `http://localhost:3000` 或 `http://127.0.0.1:3000`。
- 本地后端 `http://localhost:8080`，并允许本地前端 CORS origin。
- 注册、登录、退出、社区、发帖、帖子详情、评论树、投票和社区申请主链路。
- `npm run check:static`、`npm run check:routes`、严格 `npm run check:readiness` 和严格 `npm run check:main-path`。
- 已记录的桌面和移动端浏览器 QA 证据。

当前不把这些事项作为“V1 本地版完成”的阻塞项：

- 正式生产域名。
- 生产 HTTPS `NEXT_PUBLIC_SITE_URL`。
- 生产 HTTPS `NEXT_PUBLIC_API_BASE_URL`。
- 生产后端 CORS allowlist。
- 生产发布后验证和回滚演练。

这些事项仍然是“生产上线完成”的阻塞项。

## V2 产品路线

V2 命名为 `V2 后端能力全量前端接入`，目标是把当前后端已经提供的社区、内容、发现、通知、举报审核和媒体接口做成完整前端产品体验。

V2 本地初版已经覆盖：

1. API client、类型、query 和 mutation 边界补齐。
2. Reddit Markdown renderer 与单一写作面板。
3. 图片上传与附件展示。
4. 最新 / 热门 feed 排序。
5. 搜索体验。
6. 通知中心。
7. 举报入口。
8. 社区申请列表 / 详情 / approve / reject 审核台。
9. 审核台和 moderation remove。

V2 本地初版已收口，后续重点：

- 保持静态、路由、readiness、main-path 和 V2 主链路验证持续通过。
- 后续新增后端需求继续同步到 `backend-api-needs.md`。
- 图片数量 / 类型 / 大小提示、失败重试和待提交附件移除提示已完成前端产品化；缩略图和对象物理清理继续以后端合同拆分。
- 正式域名、生产 API origin、生产 CORS allowlist 和发布后验证继续保持 deferred。

完整边界和暂停条件见 `docs/internal/product/v2-roadmap.md`。

## 本地运行

安装依赖：

```powershell
npm install
```

准备环境变量：

```powershell
Copy-Item .env.example .env.local
```

`.env.example` 当前包含：

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

启动开发服务器：

```powershell
npm run dev
```

默认访问：

```text
http://localhost:3000
```

## 后端依赖

前端默认依赖后端 CORS 已配置完成，不使用 Next dev proxy。

本地联调时，后端必须允许当前前端 origin：

```powershell
$env:HTTP_CORS_ALLOWED_ORIGINS='http://localhost:3000'
```

如果后端没有配置该 origin，Node.js 脚本仍可能直连接口，但浏览器会被 CORS 拦截。严格 `check:readiness` 会用 `OPTIONS /api/v1/posts` 预检确认浏览器请求可用。

API client 统一处理：

- `Authorization: Bearer <access_token>`
- `401 unauthenticated` 清理本地登录态
- 错误响应 `{ "error": { "code": "...", "message": "..." } }`
- `NEXT_PUBLIC_API_BASE_URL` 配置后端地址

## 站点公开入口

- `NEXT_PUBLIC_SITE_URL` 用于生成 `robots.txt` 和 `sitemap.xml` 中的绝对 URL。
- 本地默认值是 `http://localhost:3000`；生产部署时必须改为正式域名。
- sitemap 当前只包含不依赖后端数据即可访问的静态主入口。社区详情和帖子详情需要真实数据源稳定后再扩展动态 sitemap。
- `manifest.webmanifest`、favicon 和分享元信息复用同一套站点 URL 和品牌文案；当前只提供基础 SVG 图标，不包含大尺寸 Open Graph 封面图。

## 部署健康检查

- `GET /healthz` 返回前端应用自身状态，可用于部署平台或反向代理探测 Next 服务是否可响应。
- `/healthz` 不会请求后端，也不代表 `NEXT_PUBLIC_API_BASE_URL` 对应的后端 API 可用。
- `GET /readyz` 会检查前端自身和后端 `/healthz`，后端可达时返回 `200` 与 `ready` 状态，后端不可达时返回 `503` 与 `degraded` 状态。
- 真实上线前仍需要在 `/readyz` 通过后验证登录、注册、社区、发帖、评论和投票主链路。
- 生产部署步骤、环境变量、CORS、发布后验证和回滚标准见 `docs/internal/engineering/deployment.md`。

## 上线前自检

正式验收使用严格模式：

```powershell
npm run check:readiness
```

严格模式会检查前端 `/healthz`、后端 `/healthz`、后端 CORS 预检、前端 `/readyz`、`robots.txt`、`sitemap.xml`、`manifest.webmanifest`、`icon.svg` 和基础安全响应头。任何 blocker 都会让命令失败。

环境变量检查：

```powershell
npm run check:env
npm run check:env:production
```

`check:env` 会检查 `.env.example` 是否记录 `NEXT_PUBLIC_API_BASE_URL` 和 `NEXT_PUBLIC_SITE_URL`，并验证当前解析到的 URL 是否有效。当前没有 `.env.local` 时会使用 `.env.example` 默认值并给出 warning。`check:env:production` 用于正式部署前，要求生产 URL 使用 `https`，且不能是 `localhost`、`127.0.0.1` 或 `::1`。

API 边界检查：

```powershell
npm run check:api-boundary
```

该命令会静态检查源码中的后端调用边界：业务接口路径必须留在 `src/features/*/api.ts`，`apiRequest` 路径必须以 `/api/v1` 开头，`NEXT_PUBLIC_API_BASE_URL` 只能由统一 API client 读取，源码中不允许绕过批准位置直接 `fetch()` 后端。

用户内容渲染边界检查：

```powershell
npm run check:content-boundary
npm run check:content-segments
```

`check:content-boundary` 会静态检查帖子详情和评论树是否仍通过 `ContentBody` 统一渲染用户正文，并阻止 `dangerouslySetInnerHTML`、原始 HTML 写入 API、`rehype-raw` 和未批准 iframe/srcDoc 进入源码。当前 Reddit Markdown renderer 使用 `react-markdown` + `remark-gfm`，开启 `skipHtml`，链接只允许站内路径、锚点、`http`、`https` 和 `mailto`。`check:content-segments` 会验证 `>! ... !<` 涂黑解析的边界行为，包括普通文本、多段涂黑、未闭合涂黑、空涂黑和多行涂黑。后续如要做白名单 embed，必须在独立切片里更新这些检查和安全文档。

依赖与 UI 库边界检查：

```powershell
npm run check:dependencies
```

该命令会检查 `package.json` 的直接依赖是否仍在批准清单内，`package-lock.json` 根依赖是否与 `package.json` 一致，并阻止 Ant Design、MUI、Mantine、Chakra、DaisyUI 等第二套 UI 库进入依赖或源码 import。确需新增依赖时，必须在明确切片里说明用途、替代方案和影响范围，并同步更新该检查。

文档索引检查：

```powershell
npm run check:docs
```

该命令会检查关键文档文件是否存在，README 和内部文档索引是否覆盖当前文档入口，提示词模板是否保留可复制文本块，并确认 `check:docs` 已写入项目工作流。

动作边界检查：

```powershell
npm run check:actions
```

该命令会检查普通导航和跳转动作是否仍使用 `TextAction`，阻止 `Button asChild` 把普通链接做成按钮。表单提交、重试、投票、工具栏等真实命令仍使用 `Button`。

中文文案边界检查：

```powershell
npm run check:copy
```

该命令会扫描 UI 相关源码里的常见英文模板文案，例如 `Sign in`、`Get started`、`Loading...`、`Internal Server Error` 等，防止页面生成时把默认英文按钮、占位文案或错误页长期保留下来。它允许品牌名、技术名、代码标识和短状态码，不替代人工文案审查。

UI 基础件复用检查：

```powershell
npm run check:ui-primitives
```

该命令会检查 `MetricBlock`、`InfoRow`、`StatusToken` 等数据展示基础件是否仍从 `src/components/ui/data-display.tsx` 复用，防止页面里再次复制多个风格相近但细节不同的数据块或状态标签。

本地静态验收：

```powershell
npm run check:static
```

该命令会顺序运行 lint、typecheck、build、文档索引、动作边界、依赖边界、API 边界、内容渲染边界、涂黑解析、中文文案边界、UI 基础件复用和本地环境变量检查。它不请求真实后端，也不替代 `check:main-path`、`check:v2-path`、`check:readiness` 或浏览器 QA。

后端主链路检查：

```powershell
npm run check:main-path
```

该命令会直接请求 `NEXT_PUBLIC_API_BASE_URL` 对应的真实后端，创建带 `smoke` 前缀的测试用户、社区申请、帖子、根评论、子评论和投票，验证注册、登录、`/me`、社区列表/详情、发帖、帖子详情、评论树读取、根评论发布、子评论回复、upvote、downvote 和取消投票。它用于本地或预发布环境验收，会写入测试数据；后端未启动时该命令必须失败。

后端合同复核确认当前源码的 `view=tree` 评论读取会返回父评论先于子评论的前序遍历；如果未来该合同退化，应升级为 blocker。

如果后端暂时未启动，只用于前端本地收口，可以运行：

```powershell
npm run check:main-path:local
```

本地宽松模式只会把后端不可达记录为 warning，不是上线通过依据。

V2 主链路检查：

```powershell
npm run check:v2-path
```

该命令会在真实后端上覆盖 V2 新增能力：`/me.is_platform_staff`、图片上传和 `attachment_ids`、全站/社区 `new | hot` 排序、搜索 scope、通知列表和标记已读、帖子/评论举报、审核台列表和详情、`target_preview`、dismiss、remove-target、帖子/评论 moderation remove，以及社区申请列表、详情、approve / reject。它会写入 smoke 数据，并通过本地 PostgreSQL 容器把测试用户提升为 staff，仅用于本地或预发布验收。

公开页面冒烟检查：

```powershell
npm run check:routes
```

该命令会检查 `/`、`/login`、带 `next` 的登录/注册页、`/communities`、`/communities/public`、`/posts/route-smoke`、`/communities/public/new`、`/community-applications/new` 和 404 页面是否包含 `zh-CN` 语言标记和关键中文文案。除 404 页面预期返回 `404` 外，其他页面都必须返回 `200`。首页还会检查未登录状态不回退到旧的“登录后查看最新讨论”“待登录”登录墙或“需要登录”错误面板，并要求公开帖子流文案存在；社区列表、社区详情、帖子详情壳、发帖、社区申请和 404 页面会检查是否保留返回首页、社区索引和社区申请等稳定出口链接；社区详情壳、帖子详情壳、发帖和社区申请入口、登录/注册切换还会检查是否保留正确 `next` 回跳。它只证明公开页面、受保护入口和错误页壳能渲染，不替代真实后端主链路联调，也不替代浏览器水合后的动态状态 QA。

当前如果只想在后端未启动时继续前端本地收口，可以使用宽松模式：

```powershell
npm run check:readiness:local
```

宽松模式只把后端不可用和 `/readyz` degraded 标为 warning，不能作为上线通过依据。完整上线检查边界见 `docs/internal/engineering/launch-readiness.md`。

## 部署安全头

- `next.config.ts` 为全站响应添加基础安全头，覆盖页面、route handler 和公开资源。
- 当前不启用严格 CSP，也不在应用层强制 HSTS；这两项需要结合正式域名、资源来源和部署平台配置后再开启。

当前前端依赖的主要接口：

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/me
GET    /api/v1/communities
GET    /api/v1/communities/:slug
GET    /api/v1/communities/:slug/posts?sort=new|hot
POST   /api/v1/communities/:slug/posts
GET    /api/v1/posts?sort=new|hot
GET    /api/v1/posts/:id
GET    /api/v1/posts/:id/comments
POST   /api/v1/posts/:id/comments
PATCH  /api/v1/posts/:id
DELETE /api/v1/posts/:id
PATCH  /api/v1/comments/:id
DELETE /api/v1/comments/:id
PUT    /api/v1/posts/:id/vote
DELETE /api/v1/posts/:id/vote
POST   /api/v1/community-applications
POST   /api/v1/community-applications/:id/approve
POST   /api/v1/community-applications/:id/reject
GET    /api/v1/search?q=...&scope=all|communities|posts
GET    /api/v1/notifications
POST   /api/v1/notifications/:id/read
POST   /api/v1/uploads/images
POST   /api/v1/posts/:id/reports
POST   /api/v1/comments/:id/reports
GET    /api/v1/moderation/reports
GET    /api/v1/moderation/reports/:id
POST   /api/v1/moderation/reports/:id/dismiss
POST   /api/v1/moderation/reports/:id/remove-target
POST   /api/v1/posts/:id/moderation/remove
POST   /api/v1/comments/:id/moderation/remove
```

## 验证命令

每个实现切片至少运行：

```powershell
npm run lint
npm run typecheck
npm run build
npm run check:actions
npm run check:api-boundary
npm run check:content-boundary
npm run check:content-segments
npm run check:copy
npm run check:dependencies
npm run check:docs
npm run check:env
npm run check:ui-primitives
npm run check:main-path
npm run check:v2-path
npm run check:routes
npm run check:readiness
```

涉及页面和交互时，还需要浏览器检查：

- 桌面和移动断点。
- loading、empty、error 状态。
- 未登录和登录态入口。
- 表单校验、提交中、提交失败和提交成功路径。
- 是否有横向溢出和控制台错误。

## 项目文档

- `AGENTS.md`：Codex 后续工作约束。
- `docs/design/DESIGN.md`：长期 UI/UX 风格规范。
- `docs/design/page-patterns.md`：常见页面结构规范。
- `docs/design/component-rules.md`：组件使用规则。
- `docs/prompts/frontend-task-template.md`：前端实现任务模板。
- `docs/prompts/frontend-review-template.md`：前端审查任务模板。
- `docs/prompts/backend-content-media-target-template.md`：后端内容媒体能力目标模式提示词。
- `docs/internal/product/frontend-information-architecture.md`：前端信息架构、页面拓扑、URL、权限边界和后端目标合同蓝图。
- `docs/internal/product/product-targets.md`：产品目标总表，记录已实现能力、前端后续增强、后端缺口和派工顺序。
- `docs/internal/product/v2-roadmap.md`：V2 后端能力全量前端接入路线图。
- `docs/internal/product/frontend-experience-rebuild.md`：从真实页面体验反馈出发的前端重修拆分方案。
- `docs/internal/architecture/frontend-v1.md`：前端 V1 架构、路由和 API 边界。
- `docs/internal/architecture/content-system.md`：内容系统产品形态、评论树、图片和 embed 边界。
- `docs/internal/architecture/content-media-api-gaps.md`：图片、对象存储、链接预览和白名单 embed 的后端合同核对文档。
- `docs/internal/architecture/markdown-rendering.md`：Reddit Markdown renderer 选型、安全边界和实施切片。
- `docs/internal/engineering/workflow.md`：阶段推进、分支、文档和验证规则。
- `docs/internal/engineering/launch-readiness.md`：上线前自检、阻塞项和人工 QA 范围。
- `docs/internal/engineering/deployment.md`：生产部署、环境变量、CORS、发布后验证和回滚标准。
- `docs/internal/engineering/browser-qa.md`：真实浏览器人工 QA 步骤、失败分级和记录模板。

页面实现前必须先阅读 `AGENTS.md` 和 `docs/design/*`，并且每次只推进一个小的纵向切片。
