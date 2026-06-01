# CUMT Nexus Web

`cumt-nexus-web` 是 CUMT Nexus 的前端仓库，面向校园社区内容产品。前端对接后端仓库 `D:\Projects\cumt-nexus-api`，后端当前主线是阶段 6：全站最新帖子流 + 帖子 upvote/downvote 基础。

## 当前状态

- 阶段：`阶段 0 前端规划与视觉基线`
- 技术栈：`Next.js + Tailwind CSS + shadcn/ui + Motion`
- 产品形态：登录后内容社区，不做营销落地页。
- 设计方向：内容优先、校园社区质感、克制但有细节，不套模板化 AI 风格。

阶段 0 的目标是先把技术栈、页面边界、设计语言、后端接口依赖和实施工单写清楚，再初始化工程。

## 技术选择

```text
Next.js App Router
React
TypeScript
Tailwind CSS
shadcn/ui
Motion
TanStack Query
react-hook-form
zod
lucide-react
```

选择理由：

- Next.js App Router 提供稳定的布局、路由和后续公开内容 SEO 空间。
- shadcn/ui 基于 Radix 和 Tailwind，可定制空间大，适合做出自己的产品气质。
- Tailwind CSS 用于沉淀设计 token 和状态样式。
- Motion 只用于微交互、列表进入、弹窗和状态反馈，不做大面积炫技动效。
- TanStack Query 承担服务端状态、缓存、重试和失效刷新。
- react-hook-form + zod 承担登录、注册、发帖、评论和社区申请表单。

## 首版产品范围

首版先覆盖后端已经具备或阶段 6 正在收口的主链路：

- 注册、登录、当前用户识别。
- 社区列表和社区详情。
- 社区帖子列表。
- 发布帖子。
- 帖子详情。
- 评论列表和发布评论。
- 社区创建申请。
- 全站最新帖子流。
- 帖子 upvote/downvote 状态展示和操作。

首版暂不做：

- 独立后台审批台。
- 申请列表和申请取消。
- 个人资料编辑、头像、邮箱。
- 图片上传、帖子编辑、删除、搜索。
- hot feed、推荐排序、评论投票、通知、防刷策略。

## 后端依赖

默认后端地址：

```text
http://localhost:8080
```

前端按后端 CORS 已配置处理，不默认依赖 Vite/Next dev proxy。API 客户端统一处理：

- `Authorization: Bearer <access_token>`
- `401 unauthenticated` 清理登录态并引导登录
- 错误响应 `{ "error": { "code": "...", "message": "..." } }`
- 分页参数 `limit` / `offset`

## 文档

- `tasks.md`：当前阶段工单板。
- `AGENTS.md`：Codex 后续在本项目中的工作约束。
- `docs/design/DESIGN.md`：长期 UI/UX 风格规范。
- `docs/design/page-patterns.md`：常见页面结构规范。
- `docs/design/component-rules.md`：组件使用规则。
- `docs/prompts/frontend-task-template.md`：前端实现任务提示词模板。
- `docs/prompts/frontend-review-template.md`：前端审查提示词模板。
- `docs/internal/README.md`：内部文档索引。
- `docs/internal/architecture/frontend-v1.md`：前端 V1 架构、路由和 API 边界。
- `docs/internal/design/product-visual-direction.md`：内部设计索引，指向 `docs/design/`。
- `docs/internal/engineering/workflow.md`：阶段推进、分支、文档和验证规则。
- `.ai/slices/stage-00-planning/`：阶段 0 切片记录。

## 下一步

推进 `W0-002`：初始化 Next.js 工程，接入 Tailwind CSS、shadcn/ui、Motion、基础 lint/typecheck，并保留当前文档结构。
