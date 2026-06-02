# 上线前自检

本文记录 `cumt-nexus-web` 从“本地可运行”推进到“可以上线”的检查边界。它不替代人工 QA，也不替代真实后端联调；它用于把每次收口前必须证明的事项固定下来。

## 自检命令

严格模式：

```powershell
npm run check:readiness
```

严格模式用于正式验收。只要后端不可达、后端 CORS 预检不允许当前前端 origin、`/readyz` 降级、公开入口缺失或基础安全响应头缺失，就必须失败。

本地宽松模式：

```powershell
npm run check:readiness:local
```

本地宽松模式只允许后端不可用导致的 degraded 结果变成 warning。它适合当前前端独立收口阶段，但不能作为上线通过证据。

环境变量检查：

```powershell
npm run check:env
npm run check:env:production
```

`check:env` 用于本地和 CI 的基础检查，确保 `.env.example` 记录必要变量，并验证当前解析到的 URL 合法。`check:env:production` 用于正式部署前，要求生产 URL 使用 `https`，且不能是 `localhost`、`127.0.0.1` 或 `::1`。

API 边界检查：

```powershell
npm run check:api-boundary
```

该命令用于确认源码仍遵守前后端 HTTP contract 边界：页面和组件不直接写后端 URL，业务 API 路径集中在 feature API 模块，统一 client 负责 base URL、认证头、错误解析和超时兜底。

依赖与 UI 库边界检查：

```powershell
npm run check:dependencies
```

该命令用于确认项目仍遵守固定技术栈和唯一主组件系统边界：直接依赖必须在批准清单内，`package-lock.json` 根依赖必须与 `package.json` 一致，源码和锁文件中不允许出现 Ant Design、MUI、Mantine、Chakra、DaisyUI 等第二套 UI 库。确需新增依赖时，必须先说明用途、替代方案和影响范围，再在同一切片中更新批准清单。

后端主链路检查：

```powershell
npm run check:main-path
```

该命令用于确认首版真实后端主链路可用。它会直接请求 `NEXT_PUBLIC_API_BASE_URL`，创建带 `smoke` 前缀的测试用户、社区申请、帖子、评论和投票，并验证注册、登录、`/me`、社区列表、社区详情、社区帖子列表、发帖、全站最新流、帖子详情、评论列表、评论发布、upvote、downvote 和取消投票。该命令会写入测试数据，应在本地或预发布环境运行；后端不可达时严格模式必须失败。

后端暂未启动但仍要做前端本地收口时，可以使用：

```powershell
npm run check:main-path:local
```

本地宽松模式只把后端不可达记录为 warning，不能作为上线通过证据。

公开页面冒烟检查：

```powershell
npm run check:routes
```

该命令要求本地或目标前端服务已启动。它会请求 `/`、`/login`、`/register`、`/communities`、`/communities/public`、`/communities/public/new` 和 `/community-applications/new`，检查页面返回 `200`、包含 `zh-CN` 语言标记，并包含该页面应有的关键中文文案。首页还会检查未登录状态不回退到“无法加载最新帖子”或“需要登录”错误面板。它用于发现路由丢失、页面级 500、中文文案缺失和错误页误渲染；客户端水合后才出现的动态状态仍需要浏览器 QA。

可选参数：

```powershell
node scripts/check-readiness.mjs --frontend-url=http://localhost:3000 --api-base-url=http://localhost:8080 --timeout-ms=8000
node scripts/check-api-boundary.mjs
node scripts/check-dependency-boundary.mjs
node scripts/check-env.mjs --production
node scripts/check-main-path.mjs --api-base-url=http://localhost:8080 --community-slug=public --timeout-ms=10000
node scripts/check-public-routes.mjs --frontend-url=http://localhost:3000 --timeout-ms=8000
```

## 自动检查范围

`scripts/check-readiness.mjs` 当前检查：

- 前端 `/healthz` 是否返回 `cumt-nexus-web` 和 `ok`。
- 后端 `NEXT_PUBLIC_API_BASE_URL/healthz` 是否可达。
- 后端 `OPTIONS /api/v1/posts` 是否允许当前 `NEXT_PUBLIC_SITE_URL` origin、`GET` 方法和 `Authorization` 请求头。
- 前端 `/readyz` 是否返回 `ready`；严格模式下 degraded 是阻塞。
- `robots.txt` 是否包含 sitemap 声明。
- `sitemap.xml` 是否包含站点 URL。
- `manifest.webmanifest` 是否包含 `name`、`start_url` 和 `icons`。
- `icon.svg` 是否能正常返回 SVG。
- 基础安全响应头是否存在：`X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy`、`Permissions-Policy`。

`scripts/check-env.mjs` 当前检查：

- `.env.example` 是否存在。
- `.env.example` 是否记录 `NEXT_PUBLIC_API_BASE_URL` 和 `NEXT_PUBLIC_SITE_URL`。
- 当前解析到的 `NEXT_PUBLIC_API_BASE_URL` 和 `NEXT_PUBLIC_SITE_URL` 是否是合法 `http` 或 `https` URL。
- `NEXT_PUBLIC_API_BASE_URL` 是否只包含 origin，不能把 `/api/v1` 写进 base URL。
- `NEXT_PUBLIC_SITE_URL` 是否只包含站点 origin，不能附带路径。
- 生产模式下 URL 必须使用 `https`，且不能使用 localhost 或 loopback 地址。

`scripts/check-api-boundary.mjs` 当前检查：

- `src/` 是否存在，并扫描所有 `.ts` 和 `.tsx` 源码文件。
- `fetch()` 是否只出现在批准位置：`src/lib/api/client.ts` 和 `src/app/readyz/route.ts`。
- `NEXT_PUBLIC_API_BASE_URL` 是否只由 `src/lib/api/client.ts` 读取。
- `/api/v1` 后端路径是否只出现在 `src/features/*/api.ts`。
- feature API 模块里的 `apiRequest(...)` 路径是否都以 `/api/v1` 开头。

`scripts/check-dependency-boundary.mjs` 当前检查：

- `package.json` 和 `package-lock.json` 是否存在且 JSON 合法。
- `dependencies` 和 `devDependencies` 是否仍是批准的直接依赖和版本。
- `package-lock.json` 根依赖声明是否与 `package.json` 完全一致。
- 直接依赖和锁文件中是否出现被禁止的第二套 UI 库。
- `src/` 源码 import 是否绕过 shadcn/ui 边界引入被禁止的 UI 库。

`scripts/check-main-path.mjs` 当前检查：

- 后端 `/healthz` 是否可达。
- `POST /api/v1/auth/register` 是否能创建 smoke 用户并返回 access token。
- `POST /api/v1/auth/login` 是否能登录同一 smoke 用户。
- `GET /api/v1/me` 是否返回当前登录用户。
- `GET /api/v1/communities` 是否返回社区列表并包含目标社区，默认 `public`。
- `GET /api/v1/communities/:slug` 是否返回目标社区详情。
- `POST /api/v1/community-applications` 是否能提交 smoke 社区申请。
- `GET /api/v1/communities/:slug/posts` 是否能读取目标社区帖子列表。
- `POST /api/v1/communities/:slug/posts` 是否能发布 smoke 帖子。
- `GET /api/v1/posts?sort=new` 是否能在最新流中看到新帖子。
- `GET /api/v1/posts/:id` 是否能读取新帖子详情。
- `GET /api/v1/posts/:id/comments` 是否能读取评论列表。
- `POST /api/v1/posts/:id/comments` 是否能发布 smoke 评论，并在评论列表中看到它。
- `PUT /api/v1/posts/:id/vote` 是否能 upvote 和 downvote。
- `DELETE /api/v1/posts/:id/vote` 是否能取消投票，且帖子详情中的 `my_vote` 回到 `0`。

`scripts/check-public-routes.mjs` 当前检查：

- `/`：包含 `CUMT Nexus`、`最新讨论`、`浏览社区`、`登录后查看最新讨论`、`待登录`，且不能包含 `无法加载最新帖子` 或 `需要登录`。
- `/login`：包含 `CUMT Nexus`、`登录`、`账号验证`、`创建账号`。
- `/register`：包含 `CUMT Nexus`、`注册账号`、`账号创建`、`去登录`。
- `/communities`：包含 `社区目录`、`校园社区`、`申请社区`。
- `/communities/public`：至少证明动态社区详情路由壳可返回 `200`，并包含 `返回社区索引`。
- `/communities/public/new`：包含 `CUMT Nexus`、`发起讨论`、`需要登录`、`登录后发起讨论`、`去登录`。
- `/community-applications/new`：包含 `CUMT Nexus`、`申请新社区`、`返回社区索引`。
- 所有页面都必须包含 `zh-CN` 语言标记，且不能渲染常见错误页标记。

## 最新浏览器 QA 记录

2026-06-02 本地浏览器检查记录：

- 桌面端验证 `/`、`/communities`、`/community-applications/new`、`/login`、`/register`：页面为中文、没有 Next.js 错误页、没有横向溢出、控制台没有 error。
- 移动端 `390px` 宽度验证 `/`、`/communities`、`/communities/public`、`/communities/public/new`、`/community-applications/new`、`/login`、`/register`：没有横向溢出，没有错误页。
- 未登录首页已验证：不再请求需要认证的最新帖子接口，不再展示“需要登录”错误面板，改为“登录后查看最新讨论”引导状态。
- 未登录社区详情已验证：只展示单一登录提示，不再重复显示帖子区错误，也不显示 `--` 占位上下文。
- 当前浏览器自动化环境无法输入表单，也无法写入本地 storage；登录后页面的真实浏览器人工 QA 仍需在可输入浏览器环境中补齐。

## 上线阻塞项

以下任意一项未完成时，不允许把目标标记为可上线：

- `npm run lint` 未通过。
- `npm run typecheck` 未通过。
- `npm run build` 未通过。
- `npm run check:api-boundary` 未通过。
- `npm run check:dependencies` 未通过。
- `npm run check:env` 未通过。
- `npm run check:main-path` 未通过。
- `npm run check:routes` 未通过。
- `npm run check:readiness` 未通过。
- 后端 `/healthz` 不可达，或前端 `/readyz` 仍为 degraded。
- 后端 CORS 未允许当前前端 origin、`GET` 方法或 `Authorization` 请求头，导致浏览器无法访问 API。
- 注册、登录、获取当前用户、社区列表、社区详情、发帖、帖子详情、评论、投票主链路没有用真实后端验证。
- 生产环境未配置正式 `NEXT_PUBLIC_API_BASE_URL`。
- 生产环境未配置正式 `NEXT_PUBLIC_SITE_URL`。
- 主要页面没有完成桌面和移动端人工检查。
- 登录后首页、社区详情、发帖、帖子详情、评论和投票还没有在真实可输入浏览器中完成端到端人工 QA。

## 人工 QA 范围

完整步骤、失败分级和记录模板见 `docs/internal/engineering/browser-qa.md`。上线前人工 QA 必须按该文档执行并在本文“最新浏览器 QA 记录”中补充摘要。

后端可用后，至少需要手动验证这些主路径：

- 新用户注册成功后进入登录态或可继续登录。
- 登录成功后能访问受保护动作。
- 未登录访问发帖、评论、社区申请时能进入登录门禁，并保留 `next` 回跳。
- 首页最新流可加载真实帖子。
- 社区列表、社区详情和社区帖子列表可加载真实数据。
- 发帖成功后能进入帖子详情或看到可理解的成功状态。
- 评论成功后能在评论列表看到结果。
- upvote、downvote 和取消投票不会伪造成功状态。
- 后端返回 `{ "error": { "code": "...", "message": "..." } }` 时，前端能展示可理解错误。

## 视觉和响应式 QA

页面上线前必须按 `docs/design/DESIGN.md` 检查：

- 仍符合 `dark editorial product / magazine-grade campus community interface`。
- 没有回到默认 SaaS 卡片堆叠或大面积渐变。
- 用户可见文案默认是简体中文。
- loading、empty、error、success、disabled 状态完整。
- 移动端不出现横向溢出。
- 长标题、长 slug、长用户名和长正文不会挤压主要操作。
- 次级跳转优先使用文字动作、bar、色块或分割线，不把页面堆成按钮集合。

## 后端联调要求

严格上线验收要求后端服务已启动，并且 `http://localhost:8080/healthz` 或目标环境的后端健康检查可达。本地联调时，后端还需要配置 `HTTP_CORS_ALLOWED_ORIGINS=http://localhost:3000` 或对应前端地址。后端不可达或 CORS 预检失败时，`npm run check:readiness` 和 `npm run check:main-path` 都不能作为通过证据。
