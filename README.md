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

API client 统一处理：

- `Authorization: Bearer <access_token>`
- `401 unauthenticated` 清理本地登录态
- 错误响应 `{ "error": { "code": "...", "message": "..." } }`
- `NEXT_PUBLIC_API_BASE_URL` 配置后端地址

## 站点公开入口

- `NEXT_PUBLIC_SITE_URL` 用于生成 `robots.txt` 和 `sitemap.xml` 中的绝对 URL。
- 本地默认值是 `http://localhost:3000`；生产部署时必须改为正式域名。
- sitemap 当前只包含不依赖后端数据即可访问的静态主入口。社区详情和帖子详情需要真实数据源稳定后再扩展动态 sitemap。

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
- `docs/internal/engineering/workflow.md`：阶段推进、分支、文档和验证规则。

页面实现前必须先阅读 `AGENTS.md` 和 `docs/design/*`，并且每次只推进一个小的纵向切片。
