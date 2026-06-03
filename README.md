# CUMT Nexus Web

`cumt-nexus-web` 是 CUMT Nexus 的前端仓库，面向校园社区内容产品。前端直连后端仓库 `D:\Projects\cumt-nexus-api`，默认后端地址为 `http://localhost:8080`。

## 当前状态

- 技术栈：Next.js App Router + React + TypeScript + Tailwind CSS + shadcn/ui + Motion。
- 视觉方向：dark editorial product / magazine-grade campus community interface。
- 界面语言：用户可见文案默认使用简体中文，品牌名、技术名、URL slug、API 字段和用户生成内容保留原文。
- 当前分支：`stage/0-web-planning`。
- 当前目标：持续推进到可上线版本，保持小的纵向切片逐步收口。

## 已实现范围

- 注册、登录、当前用户识别和本地 token 会话。
- 全站最新帖子流。
- 社区列表、社区详情和社区帖子列表。
- 帖子详情、评论列表和评论发布。
- 帖子 upvote / downvote 状态展示和操作。
- 在指定社区发布帖子。
- 提交社区创建申请。
- 受保护动作登录门禁：未登录访问发帖或社区申请时，引导登录/注册并保留 `next` 回跳。
- 全局 404 和页面错误状态页。
- 页面级标题、描述、`robots.txt` 和 `sitemap.xml`。
- 基础 favicon、Web App Manifest、Open Graph 和 Twitter 分享元信息。
- 前端健康检查端点 `/healthz`。
- 前后端就绪检查端点 `/readyz`。
- 基础安全响应头：`X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy`、`Permissions-Policy`。
- 主要数据页覆盖 loading、empty、error、未登录、提交中和成功/失败状态。

首版暂不做：

- 独立后台审批台。
- 申请列表和申请取消。
- 个人资料编辑、头像、邮箱。
- 图片上传、帖子编辑、删除、搜索。
- hot feed、推荐排序、评论投票、通知、私信和实时能力。

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

`check:content-boundary` 会静态检查帖子正文、评论正文和预览是否仍通过 `ContentBody` 统一渲染，并阻止 `dangerouslySetInnerHTML`、原始 HTML 写入 API、`rehype-raw` 和未批准 iframe/srcDoc 进入源码。`check:content-segments` 会验证当前 `>! ... !<` 涂黑解析的边界行为，包括普通文本、多段涂黑、未闭合涂黑、空涂黑和多行涂黑。后续如要做白名单 embed 或完整 Markdown renderer，必须在独立切片里更新这些检查和安全文档。

依赖与 UI 库边界检查：

```powershell
npm run check:dependencies
```

该命令会检查 `package.json` 的直接依赖是否仍在批准清单内，`package-lock.json` 根依赖是否与 `package.json` 一致，并阻止 Ant Design、MUI、Mantine、Chakra、DaisyUI 等第二套 UI 库进入依赖或源码 import。确需新增依赖时，必须在明确切片里说明用途、替代方案和影响范围，并同步更新该检查。

后端主链路检查：

```powershell
npm run check:main-path
```

该命令会直接请求 `NEXT_PUBLIC_API_BASE_URL` 对应的真实后端，创建带 `smoke` 前缀的测试用户、社区申请、帖子、根评论、子评论和投票，验证注册、登录、`/me`、社区列表/详情、发帖、帖子详情、评论树读取、根评论发布、子评论回复、upvote、downvote 和取消投票。它用于本地或预发布环境验收，会写入测试数据；后端未启动时该命令必须失败。

当前如果后端仍按简单时间倒序返回评论，子评论可能出现在根评论之前；脚本会记录 warning。后端 tree contract 完成后，该排序问题应升级为 blocker。

如果后端暂时未启动，只用于前端本地收口，可以运行：

```powershell
npm run check:main-path:local
```

本地宽松模式只会把后端不可达记录为 warning，不是上线通过依据。

公开页面冒烟检查：

```powershell
npm run check:routes
```

该命令会检查 `/`、`/login`、带 `next` 的登录/注册页、`/communities`、`/communities/public`、`/posts/route-smoke`、`/communities/public/new`、`/community-applications/new` 和 404 页面是否包含 `zh-CN` 语言标记和关键中文文案。除 404 页面预期返回 `404` 外，其他页面都必须返回 `200`。首页还会检查未登录状态不回退到“无法加载最新帖子”或“需要登录”错误面板；社区列表、社区详情、帖子详情壳、发帖、社区申请和 404 页面会检查是否保留返回首页、社区索引和社区申请等稳定出口链接；发帖和社区申请入口、登录/注册切换还会检查是否保留正确 `next` 回跳。它只证明公开页面、受保护入口和错误页壳能渲染，不替代真实后端主链路联调，也不替代浏览器水合后的动态状态 QA。

当前如果只想在后端未启动时继续前端本地收口，可以使用宽松模式：

```powershell
npm run check:readiness:local
```

宽松模式只把后端不可用和 `/readyz` degraded 标为 warning，不能作为上线通过依据。完整上线检查边界见 `docs/internal/engineering/launch-readiness.md`。

## 部署安全头

- `next.config.ts` 为全站响应添加基础安全头，覆盖页面、route handler 和公开资源。
- 当前不启用严格 CSP，也不在应用层强制 HSTS；这两项需要结合正式域名、资源来源和部署平台配置后再开启。

当前首版依赖的主要接口：

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/me
GET    /api/v1/communities
GET    /api/v1/communities/:slug
GET    /api/v1/communities/:slug/posts
POST   /api/v1/communities/:slug/posts
GET    /api/v1/posts
GET    /api/v1/posts/:id
GET    /api/v1/posts/:id/comments
POST   /api/v1/posts/:id/comments
PUT    /api/v1/posts/:id/vote
DELETE /api/v1/posts/:id/vote
POST   /api/v1/community-applications
```

## 验证命令

每个实现切片至少运行：

```powershell
npm run lint
npm run typecheck
npm run build
npm run check:api-boundary
npm run check:content-boundary
npm run check:content-segments
npm run check:dependencies
npm run check:env
npm run check:main-path
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
- `docs/internal/architecture/frontend-v1.md`：前端 V1 架构、路由和 API 边界。
- `docs/internal/architecture/content-system.md`：内容系统产品形态、评论树、图片和 embed 边界。
- `docs/internal/architecture/markdown-rendering.md`：Markdown renderer 选型、安全边界和实施切片。
- `docs/internal/engineering/workflow.md`：阶段推进、分支、文档和验证规则。
- `docs/internal/engineering/launch-readiness.md`：上线前自检、阻塞项和人工 QA 范围。
- `docs/internal/engineering/deployment.md`：生产部署、环境变量、CORS、发布后验证和回滚标准。
- `docs/internal/engineering/browser-qa.md`：真实浏览器人工 QA 步骤、失败分级和记录模板。

页面实现前必须先阅读 `AGENTS.md` 和 `docs/design/*`，并且每次只推进一个小的纵向切片。
