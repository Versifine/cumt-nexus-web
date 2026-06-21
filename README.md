# CUMT Nexus Web

CUMT Nexus Web 是 CUMT Nexus 的前端应用，面向校园社区、帖子、评论、通知、审核和个人内容浏览等场景。项目使用 Next.js App Router 构建，界面默认使用简体中文，产品风格以 `docs/design/DESIGN.md` 为准。

## 技术栈

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- shadcn/ui
- Motion
- TanStack Query
- react-hook-form + zod
- lucide-react

不要在本项目里切换框架、引入第二套主 UI 库，或绕过 `src/lib/api` 直接写业务 fetch。

## 本地运行

安装依赖：

```bash
npm install
```

准备环境变量：

```bash
cp .env.example .env.local
```

默认配置：

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

启动开发服务器：

```bash
npm run dev
```

默认访问 `http://localhost:3000`。

## 后端依赖

前端默认连接 `NEXT_PUBLIC_API_BASE_URL`，本地通常是 `http://localhost:8080`。后端需要允许当前前端 origin，否则浏览器会被 CORS 拦截：

```bash
HTTP_CORS_ALLOWED_ORIGINS=http://localhost:3000
```

API 错误结构按后端约定处理：

```json
{
  "error": {
    "code": "unauthenticated",
    "message": "authentication required"
  }
}
```

## 常用命令

```bash
npm run dev
npm run build
npm run deploy:bundle
npm run lint
npm run typecheck
```

常用边界检查：

```bash
npm run check:actions
npm run check:api-boundary
npm run check:content-boundary
npm run check:content-segments
npm run check:copy
npm run check:dependencies
npm run check:deploy
npm run check:deploy-env -- --env-file .env.production
npm run check:docs
npm run check:env
npm run check:main-path
SITE_URL=https://<your-real-domain>
npm run check:post-deploy -- --site-url="$SITE_URL"
npm run check:readiness
npm run check:routes
npm run check:static
npm run check:ui-primitives
npm run check:v2-path
```

`check:static` 会组合运行主要静态检查，但不替代真实后端链路、浏览器 QA 或生产环境验证。

## 代码结构

```text
src/
  app/          路由、布局和页面组合
  components/   跨 feature 的 UI 和展示组件
  features/     业务模块、query、mutation、schema 和页面逻辑
  lib/          API client、认证、query provider 和通用工具
```

约定：

- `src/app` 保持轻量，复杂逻辑放进 `src/features`。
- `src/lib/api` 是唯一 HTTP client 入口。
- 用户内容统一通过 `src/features/content/content-body.tsx` 渲染。
- 写作器统一使用 `src/features/content/markdown-composer-field.tsx`。

## 文档入口

先看这几个入口就够了：

- `AGENTS.md`：Codex 在本仓库里的工作规则。
- `docs/README.md`：文档总入口。
- `docs/design/DESIGN.md`：视觉方向和设计原则。
- `docs/internal/README.md`：内部产品、架构、工程文档索引。
- `docs/internal/engineering/workflow.md`：开发、验证和协作流程。
- `docs/internal/engineering/deployment.md`：生产部署、环境变量、CORS、发布后验证和回滚标准。
- `docs/internal/engineering/server-docker-runbook.md`：单服务器 Docker 拉镜像部署、Caddy 反代、发布和回滚命令清单。
- `.github/workflows/post-deploy-check.yml`：手动触发的公网发布后检查，填写真实域名后运行 `check:post-deploy`。

## 协作边界

- 新增依赖前先说明用途、替代方案和影响范围。
- UI 改动优先复用 shadcn/ui、Tailwind、lucide-react 和现有组件规则。
- 需要后端协议变化时，记录到 `backend-api-needs.md`，不要直接修改后端仓库。
- 提交前按改动范围运行相关检查；跨内容、路由、API、依赖或 UI 基础件时运行对应 `check:*`。
