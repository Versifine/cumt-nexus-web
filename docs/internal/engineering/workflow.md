# 前端工程工作流

本文记录 `cumt-nexus-web` 的阶段、分支、文档和验证规则。

## 阶段规则

每个阶段必须有：

- 根目录 `tasks.md` 当前推进位。
- `README.md` 当前状态。
- `docs/internal/` 长期决策。
- `.ai/slices/<stage>/` 阶段切片。
- 阶段退出标准。

阶段完成不只看代码，也要看文档和工单板是否同步。

## 分支规则

建议分支命名：

```text
stage/0-web-planning
stage/1-web-foundation
stage/2-web-community-posts
stage/3-web-comments-vote-feed
```

小修复可以使用：

```text
fix/<short-topic>
docs/<short-topic>
```

## 工单规则

工单命名：

```text
W<stage>-<number>：<title>
```

示例：

```text
W0-002：Next.js 工程初始化
W1-001：App Shell 与路由守卫
W1-002：认证页面与登录态
```

每个工单至少写：

- 状态。
- 优先级。
- 前置依赖。
- 目标。
- 交付物。
- 完成标准。

## 后端同步规则

后端仓库：

```text
D:\Projects\cumt-nexus-api
```

前端实现前需要确认：

- 后端当前阶段。
- 已完成接口。
- 响应结构。
- 错误码。
- 是否需要登录。
- 分页语义。

不要根据记忆硬写接口。后端正在推进阶段 6，feed/vote 相关字段可能随实现收口调整，前端要以当前后端代码和文档为准。

## 环境变量

建议：

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

浏览器直连后端，默认以后端 CORS 已配置处理。

## 验证规则

工程初始化后，每个实现工单至少运行：

```powershell
npm run lint
npm run typecheck
```

本地静态收口可以运行：

```powershell
npm run check:static
```

`check:static` 聚合 lint、typecheck、build、文档、动作边界、依赖、API、内容、中文文案边界、UI 基础件复用和本地环境检查。它不请求真实后端，不替代 `npm run check:main-path`、`npm run check:v2-path`、`npm run check:readiness` 和浏览器 QA。

V2 后端能力收口可以运行：

```powershell
npm run check:v2-path
```

`check:v2-path` 用于真实后端上的 V2 新增能力验收，覆盖图片上传、附件、new/hot、搜索、通知、举报、审核台和社区申请 approve/reject。它会写入 smoke 数据并依赖本地 PostgreSQL 容器提升 staff，只适合本地或预发布环境。

动作边界可以运行：

```powershell
npm run check:actions
```

`check:actions` 用于阻止 `Button asChild` 把普通导航链接做成按钮。表单提交、重试、投票和工具栏这类真实命令继续使用 `Button`；跳转、返回、登录/注册入口优先使用 `TextAction`。

中文文案边界可以运行：

```powershell
npm run check:copy
```

`check:copy` 用于阻止 `Sign in`、`Get started`、`Loading...`、`Internal Server Error` 等常见英文模板文案进入 UI 相关源码。它允许品牌名、技术名、代码标识和短状态码，不替代人工文案审查。

UI 基础件复用可以运行：

```powershell
npm run check:ui-primitives
```

`check:ui-primitives` 用于阻止页面里重复定义 `MetricBlock`、`InfoRow`、`StatusToken` 等数据展示基础件。数据块、键值行、编号说明和状态标签应复用 `src/components/ui/data-display.tsx`，避免每个页面出现细节不同的色块和标签风格。

有测试后继续增加：

```powershell
npm test
```

涉及页面视觉或交互的工单，需要用浏览器检查：

- 桌面视口。
- 移动视口。
- loading 状态。
- empty 状态。
- error 状态。
- 长标题和长正文。
- 未登录和登录态。

## 文档更新规则

以下情况必须更新文档：

- 技术栈变化。
- 路由变化。
- 后端接口语义变化。
- 阶段切换。
- 设计 token 或视觉方向变化。
- 登录态、安全策略或 API client 策略变化。

文档更新顺序：

1. `tasks.md`
2. 相关 `docs/internal/` 文件
3. `.ai/slices/<stage>/`
4. `README.md`

文档索引同步后运行：

```powershell
npm run check:docs
```

该命令验证 README、内部文档索引、提示词模板和关键文档文件是否仍然对齐。新增文档、删除文档或新增验证命令时，要同步更新该检查。
