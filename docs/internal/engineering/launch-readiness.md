# 上线前自检

本文记录 `cumt-nexus-web` 从“本地可运行”推进到“可以上线”的检查边界。它不替代人工 QA，也不替代真实后端联调；它用于把每次收口前必须证明的事项固定下来。

生产部署步骤、环境变量、CORS、发布后验证和回滚标准见 `docs/internal/engineering/deployment.md`。

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

该命令用于确认首版真实后端主链路可用。它会直接请求 `NEXT_PUBLIC_API_BASE_URL`，创建带 `smoke` 前缀的测试用户、社区申请、帖子、根评论、子评论和投票，并验证注册、登录、`/me`、社区列表、社区详情、社区帖子列表、发帖、全站最新流、帖子详情、评论树读取、根评论发布、子评论回复、upvote、downvote 和取消投票。该命令会写入测试数据，应在本地或预发布环境运行；后端不可达时严格模式必须失败。

当前如果后端仍按简单时间倒序返回评论，子评论可能出现在根评论之前；脚本会记录 warning。后端 tree contract 完成后，该排序问题应升级为 blocker。

后端暂未启动但仍要做前端本地收口时，可以使用：

```powershell
npm run check:main-path:local
```

本地宽松模式只把后端不可达记录为 warning，不能作为上线通过证据。

V2 主链路检查：

```powershell
npm run check:v2-path
```

该命令用于确认 V2 新增真实后端能力可用。它会创建 smoke 用户和内容，接入图片上传、附件提交、new/hot 排序、搜索、通知、举报、审核台、`target_preview`、dismiss、remove-target、帖子/评论 moderation remove，以及社区申请 approve / reject。该命令会写入测试数据，并通过本地 PostgreSQL 容器把测试用户提升为 staff，只应在本地或预发布环境运行。

公开页面冒烟检查：

```powershell
npm run check:routes
```

该命令要求本地或目标前端服务已启动。它会请求 `/`、`/login`、带 `next` 的登录/注册页、`/communities`、`/search?q=public&scope=all`、`/users/route-smoke`、`/users/route-smoke/posts`、`/users/route-smoke/comments`、`/communities/public`、`/posts/route-smoke`、`/communities/public/new`、`/community-applications/new` 和 404 页面，检查页面包含 `zh-CN` 语言标记，并包含该页面应有的关键中文文案。除 404 页面预期返回 `404` 外，其他页面都必须返回 `200`。首页还会检查未登录状态不回退到旧的“登录后查看最新讨论”“待登录”登录墙或“需要登录”错误面板，并要求公开帖子流文案存在；搜索页壳会检查未登录状态不回退到旧的“登录后使用搜索”登录墙；用户主页壳、用户帖子列表壳和用户评论列表壳会检查未登录状态不回退到登录墙；社区详情壳会检查未登录状态不回退到旧的“需要登录 / 请先登录后查看社区详情和帖子”登录墙；帖子详情壳会检查未登录状态不回退到旧的“需要登录 / 请先登录后查看帖子详情、评论和投票”登录墙；社区列表、发帖、社区申请和 404 页面会检查是否保留返回首页、社区索引和社区申请等稳定出口链接；发帖和社区申请入口、登录/注册切换还会检查是否保留正确 `next` 回跳。它用于发现路由丢失、页面级 500、中文文案缺失、错误页误渲染和页面出口缺失；客户端水合后才出现的动态状态仍需要浏览器 QA。

可选参数：

```powershell
node scripts/check-readiness.mjs --frontend-url=http://localhost:3000 --api-base-url=http://localhost:8080 --timeout-ms=8000
node scripts/check-api-boundary.mjs
node scripts/check-dependency-boundary.mjs
node scripts/check-env.mjs --production
node scripts/check-main-path.mjs --api-base-url=http://localhost:8080 --community-slug=public --timeout-ms=10000
node scripts/check-v2-path.mjs --api-base-url=http://localhost:8080 --community-slug=public --timeout-ms=10000
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
- `GET /api/v1/posts/:id/comments?view=tree` 是否能读取评论列表。
- `POST /api/v1/posts/:id/comments` 是否能发布 smoke 根评论和带 `parent_id` 的子评论，并在评论列表中看到父子关系。
- `PUT /api/v1/posts/:id/vote` 是否能 upvote 和 downvote。
- `DELETE /api/v1/posts/:id/vote` 是否能取消投票，且帖子详情中的 `my_vote` 回到 `0`。

`scripts/check-v2-path.mjs` 当前检查：

- 后端 `/healthz` 是否可达。
- 图片上传接口是否返回可用于发帖和评论的附件 ID。
- 发帖和评论提交 `attachment_ids` 后，详情和评论树是否展示附件。
- 全站和社区帖子流 `sort=new|hot` 是否可用。
- `GET /api/v1/search` 的 `all | communities | posts` scope 是否可用。
- 通知列表、未读列表、标记已读和已读列表是否可用。
- 普通用户是否能举报帖子和评论。
- 非 staff 访问审核接口是否返回 `forbidden`。
- staff 是否能读取举报列表、举报详情和 `target_preview`。
- staff 是否能 dismiss、remove-target，并直接 moderation remove 帖子和评论。
- staff 是否能 approve / reject 社区申请。

`scripts/check-public-routes.mjs` 当前检查：

- `/`：包含 `CUMT Nexus`、`最新讨论`、`社区信息流`、`公开帖子流`、`浏览社区`，且不能包含 `登录后查看最新讨论`、`待登录` 或 `需要登录`。
- `/login`：包含 `CUMT Nexus`、`登录`、`账号验证`、`创建账号`。
- `/login?next=%2Fcommunities%2Fpublic%2Fnew`：切换到注册时必须保留 `next=%2Fcommunities%2Fpublic%2Fnew`。
- `/register`：包含 `CUMT Nexus`、`注册账号`、`账号创建`、`去登录`。
- `/register?next=%2Fcommunity-applications%2Fnew`：切换到登录时必须保留 `next=%2Fcommunity-applications%2Fnew`。
- `/communities`：包含 `社区目录`、`校园社区`、`申请社区`，并保留首页、社区索引和社区申请出口。
- `/search?q=public&scope=all`：包含 `搜索社区和帖子`、`搜索关键词和范围`、`范围`，并保留首页和社区索引出口，且不能包含旧的 `登录后使用搜索` 登录墙。
- `/users/route-smoke`：至少证明动态用户主页路由壳可返回 `200`，并包含 `用户主页`、`正在加载`、`浏览社区`、首页和社区索引出口，且不能包含登录墙。
- `/users/route-smoke/posts`：至少证明动态用户帖子列表路由壳可返回 `200`，并包含 `用户帖子`、`正在加载`、`浏览社区`、首页和社区索引出口，且不能包含登录墙。
- `/users/route-smoke/comments`：至少证明动态用户评论列表路由壳可返回 `200`，并包含 `用户评论`、`正在加载`、`浏览社区`、首页和社区索引出口，且不能包含登录墙。
- `/communities/public`：至少证明动态社区详情路由壳可返回 `200`，并包含 `CUMT Nexus`、`首页`、`社区`、`正在加载`、`浏览社区`、首页和社区索引出口，且不能包含 `需要登录` 或旧社区详情登录墙说明。
- `/posts/route-smoke`：至少证明动态帖子详情路由壳可返回 `200`，并包含 `CUMT Nexus`、`返回社区索引`、`正在加载`、`浏览社区`、首页和社区索引出口，且不能包含 `需要登录` 或旧帖子详情登录墙说明。
- `/communities/public/new`：包含 `CUMT Nexus`、`发起讨论`、`需要登录`、`登录后发起讨论`、`去登录`，且登录/注册链接必须指向 `next=%2Fcommunities%2Fpublic%2Fnew`。
- `/community-applications/new`：包含 `CUMT Nexus`、`申请新社区`、`返回社区索引`，且登录/注册链接必须指向 `next=%2Fcommunity-applications%2Fnew`。
- `/route-smoke-not-found`：预期返回 `404`，并包含 `这个页面不存在或已经移动`、`返回最新讨论` 和 `浏览社区索引`。
- 所有页面都必须包含 `zh-CN` 语言标记，且不能渲染常见错误页标记。

## 最新浏览器 QA 记录

2026-06-07 首页信息流行展示复验记录：

- 自动检查已复验：`npm run lint`、`npm run typecheck`、`npm run check:api-boundary`、`npm run check:ui-primitives`、`npm run check:copy`、`npm run check:docs`、`npm run check:routes` 和 `npm run check:static` 均通过。
- 匿名 API 复验：`GET /api/v1/posts?limit=3&offset=0&sort=new` 返回帖子携带 `community.slug/name`、`author.display_name/username`、`comment_count`、`body_excerpt`、`preview` 和 `attachments` 字段，首条为 `/public`、作者 `comments_71ibp9dt`、`comment_count: 1`。
- 浏览器复验 `/` 桌面和 `390px` 移动端：首页信息流行展示 `/public`、`Public`、作者用户名、帖子标题、正文摘要和 `1 评论`；页面不再以旧的 `社区 {shortId}` / `作者 {shortId}` 作为主要元信息。
- 浏览器复验 `/` 桌面和 `390px` 移动端：未出现旧登录墙，`scrollWidth` 等于 `clientWidth`，无横向溢出，控制台无 error。

2026-06-07 首页信息流首屏服务端预取复验记录：

- 自动检查已复验：`npm run lint`、`npm run typecheck`、`npm run check:api-boundary`、`npm run check:docs`、`npm run check:routes`、`npm run check:ui-primitives` 和 `npm run check:static` 通过。
- 后端合同只读复核：`GET /api/v1/posts?limit=20&offset=0&sort=new` 为 public + optional Bearer；本切片未改后端。
- 匿名 API 复验：`GET /api/v1/posts?limit=20&offset=0&sort=new` 返回 20 条帖子，首条标题为 `User comments QA 71ibp9dt`，无 Bearer。
- 前端路由壳/SSR 复验：`http://localhost:3000/?qa=ssr-home-feed` 返回 `200`，HTML 直接包含首页标题、公开帖子流文案和帖子标题 `User comments QA 71ibp9dt`。
- in-app Browser 可见复验：桌面 `1265px` 和移动端 `390px` 均直接显示首页信息流、默认最新排序和真实帖子行；不显示旧的首页登录墙；`scrollWidth` 等于 `clientWidth`，无横向溢出，控制台无 error/warning。

2026-06-07 社区详情首屏服务端预取复验记录：

- 自动检查已复验：`npm run lint`、`npm run typecheck`、`npm run check:api-boundary`、`npm run check:docs`、`npm run check:routes`、`npm run check:ui-primitives` 和 `npm run check:static` 通过。
- 后端合同只读复核：`GET /api/v1/communities/:slug` 和 `GET /api/v1/communities/:slug/posts?sort=new` 为 public + optional Bearer；本切片未改后端。
- 匿名 API 复验：`GET /api/v1/communities/public` 返回社区 `Public`；`GET /api/v1/communities/public/posts?limit=20&offset=0&sort=new` 返回 20 条帖子，首条标题为 `User comments QA 71ibp9dt`，无 Bearer。
- 前端路由壳/SSR 复验：`http://localhost:3000/communities/public?qa=ssr-community-detail` 返回 `200`，HTML 直接包含社区名 `Public`、`/public` 和帖子标题 `User comments QA 71ibp9dt`。
- in-app Browser 可见复验：桌面 `1265px` 和移动端 `390px` 均直接显示社区现场、默认最新帖子流和真实帖子行；不显示旧的社区详情登录墙；`scrollWidth` 等于 `clientWidth`，无横向溢出，控制台无 error/warning。

2026-06-07 帖子详情首屏服务端预取和返回 fallback 复验记录：

- 自动检查已复验：`npm run lint`、`npm run typecheck`、`npm run check:api-boundary`、`npm run check:docs`、`npm run check:routes`、`npm run check:ui-primitives` 和 `npm run check:static` 通过。
- 后端合同只读复核：`GET /api/v1/posts/:id` 和 `GET /api/v1/posts/:id/comments?view=tree&sort=new&max_depth=6` 为 public + optional Bearer；本切片未改后端。
- 匿名 API 复验：帖子 `0fed7ec2-7f55-44bc-8f8f-41b1bc40018d` 返回标题 `User comments QA 71ibp9dt`、正文 `Body for user comments QA 71ibp9dt` 和社区 `public`；评论树返回 1 条 visible 评论，正文为 `Comment body for /users/:username/comments QA 71ibp9dt`，无 Bearer。
- 前端路由壳/SSR 复验：`http://localhost:3000/posts/0fed7ec2-7f55-44bc-8f8f-41b1bc40018d?qa=ssr-post-detail` 返回 `200`，HTML 直接包含帖子标题、正文和评论正文，且不包含登录墙。
- in-app Browser 可见复验：桌面 `1265px` 和移动端 `390px` 均直接显示帖子正文、评论树和未登录投票/评论门禁；无来源记录时返回入口显示 `返回 /public`，不再显示 `返回社区索引`；`scrollWidth` 等于 `clientWidth`，无横向溢出，控制台无 error/warning。

2026-06-07 用户公开评论列表首屏服务端预取复验记录：

- 自动检查已复验：`npm run lint`、`npm run typecheck`、`npm run check:api-boundary`、`npm run check:docs`、`npm run check:routes`、`npm run check:ui-primitives` 和 `npm run check:static` 通过。
- 后端合同只读复核：`GET /api/v1/users/:username` 和 `GET /api/v1/users/:username/comments?limit=...&offset=...` 为 public + optional Bearer；本切片未改后端。
- 匿名 API 复验：临时用户 `comments_71ibp9dt` 的公开资料返回 `comment_count: 1`，`GET /api/v1/users/comments_71ibp9dt/comments?limit=20&offset=0` 返回 1 条 visible 评论，正文为 `Comment body for /users/:username/comments QA 71ibp9dt`，无 Bearer。
- 前端路由壳/SSR 复验：`http://localhost:3000/users/comments_71ibp9dt/comments?qa=ssr-comments` 返回 `200`，HTML 直接包含 `comments_71ibp9dt` 和评论正文 `Comment body for /users/:username/comments QA 71ibp9dt`，且不包含登录墙。
- in-app Browser 可见复验：桌面 `1265px` 和移动端 `390px` 均直接显示用户评论页、公开评论指标、真实评论行和 `查看原帖` 入口；`scrollWidth` 等于 `clientWidth`，无横向溢出，控制台无 error/warning。

2026-06-07 用户公开帖子列表首屏服务端预取复验记录：

- 自动检查已复验：`npm run lint`、`npm run typecheck`、`npm run check:api-boundary`、`npm run check:docs`、`npm run check:routes`、`npm run check:ui-primitives` 和 `npm run check:static` 通过。
- 后端合同只读复核：`GET /api/v1/users/:username` 和 `GET /api/v1/users/:username/posts?limit=...&offset=...&sort=new` 为 public + optional Bearer；本切片未改后端。
- 匿名 API 复验：临时用户 `comments_71ibp9dt` 的公开资料返回 `post_count: 1`，`GET /api/v1/users/comments_71ibp9dt/posts?limit=20&offset=0&sort=new` 返回 1 条 visible 帖子，标题为 `User comments QA 71ibp9dt`，无 Bearer。
- 前端路由壳/SSR 复验：`http://localhost:3000/users/comments_71ibp9dt/posts?qa=ssr-posts` 返回 `200`，HTML 直接包含 `comments_71ibp9dt` 和帖子标题 `User comments QA 71ibp9dt`，且不包含登录墙。
- in-app Browser 可见复验：桌面 `1265px` 和移动端 `390px` 均直接显示用户帖子页、`最新/热门` 排序、公开帖子指标和真实帖子行；`scrollWidth` 等于 `clientWidth`，无横向溢出，控制台无 error/warning。

2026-06-07 用户主页首屏服务端预取复验记录：

- 自动检查已复验：`npm run lint`、`npm run typecheck`、`npm run check:api-boundary`、`npm run check:docs`、`npm run check:routes` 和 `npm run check:static` 通过。
- 后端合同只读复核：`GET /api/v1/users/:username` 为 public + optional Bearer；本切片未改后端。
- 匿名 API 复验：临时用户 `comments_71ibp9dt` 的 `GET /api/v1/users/comments_71ibp9dt` 返回公开用户资料，包含 `post_count: 1` 和 `comment_count: 1`，无 Bearer。
- 前端路由壳/SSR 复验：`http://localhost:3000/users/comments_71ibp9dt?qa=ssr-profile` 返回 `200`，HTML 包含 `用户主页`、`comments_71ibp9dt`、`公开资料` 和用户公开帖子入口，且不包含登录墙。
- in-app Browser 可见复验：桌面 `1265px` 和移动端 `390px` 均直接显示用户主页、公开资料、公开帖子/评论入口；`scrollWidth` 等于 `clientWidth`，无横向溢出，控制台无 error/warning。

2026-06-07 用户公开评论列表接入复验记录：

- 自动检查已复验：`npm run lint`、`npm run typecheck`、`npm run check:api-boundary`、`npm run check:ui-primitives`、`npm run check:static` 和 `npm run check:routes` 通过。
- 后端合同只读复核：`GET /api/v1/users/:username/comments?limit=...&offset=...` 为 public + optional Bearer；本切片未改后端。
- 匿名 API 复验：临时用户 `comments_71ibp9dt` 的 `GET /api/v1/users/comments_71ibp9dt/comments?limit=20` 返回 1 条 visible 评论，作者 `comments_71ibp9dt`，原帖 `0fed7ec2-7f55-44bc-8f8f-41b1bc40018d`，无 Bearer。
- 前端路由壳复验：`http://localhost:3000/users/comments_71ibp9dt/comments` 返回 `200`，HTML 包含 `用户评论`、`comments_71ibp9dt` 和 `返回用户主页`，且不包含登录墙。
- 本轮 in-app Browser 可见复验受当前会话限制：桌面 tab 的页面标题正确，但可见 body 持续停在全局 loading shell，控制台无 error；因此本条不作为桌面/移动端人工可视化通过证据，后续需要在可正常水合的浏览器中复验评论列表行、原帖跳转和移动端横向溢出。

2026-06-07 用户公开帖子列表接入复验记录：

- 自动检查已复验：`npm run lint`、`npm run typecheck`、`npm run check:api-boundary`、`npm run check:ui-primitives`、`npm run check:static`、`npm run check:routes` 和 `npm run build` 通过。
- 后端合同只读复核：`GET /api/v1/users/:username` 和 `GET /api/v1/users/:username/posts?sort=new|hot` 均为 public + optional Bearer；本切片未改后端。
- 匿名 API 复验：临时用户 `posts_15dojehg` 的 `GET /api/v1/users/posts_15dojehg/posts?sort=new` 返回 1 条 visible 帖子，作者 `posts_15dojehg`，社区 `/public`，无 Bearer。
- 前端路由壳复验：`http://localhost:3010/users/posts_15dojehg/posts` 返回 `200`，HTML 包含 `用户帖子`、`posts_15dojehg` 和 `返回用户主页`，且不包含登录墙。
- 本轮 in-app Browser 可见复验受当前会话限制：桌面 tab 的页面标题正确，但可见 body 持续停在全局 loading shell，控制台无 error；因此本条不作为桌面/移动端人工可视化通过证据，后续需要在可正常水合的浏览器中复验列表行、排序点击和移动端横向溢出。

2026-06-07 搜索页未登录公开读取前端门禁复验记录：

- 自动检查已复验：`npm run lint`、`npm run typecheck`、`npm run check:actions`、`npm run check:api-boundary`、`npm run check:copy`、`npm run check:docs`、`npm run check:ui-primitives` 和 `npm run check:routes` 通过；完整静态验收见本切片最终验证。
- 后端合同只读复核：当前后端 `GET /api/v1/search` 仍注册在 `RequireAuth` 保护分组，合同 Auth 列仍是 Bearer，handler 仍要求 `CurrentUserID`；无 token 直连 `GET /api/v1/search?q=public&scope=all&limit=20&offset=0` 返回 `HTTP 401`。本切片未改后端。
- 浏览器复验未登录 `/search?q=public&scope=all` 桌面和 `390px` 移动端：页面展示搜索页壳和“公开搜索暂不可用”，不再展示旧的 `登录后使用搜索` 或 `搜索需要身份上下文` 登录墙。
- 浏览器复验未登录 `/search?q=public&scope=all` 桌面和 `390px` 移动端：`scrollWidth` 等于 `clientWidth`，控制台无 error。未登录真实搜索结果等待后端把 `GET /api/v1/search` 改为可选 Bearer 后复验。

2026-06-07 社区详情公开阅读复验记录：

- 自动检查已复验：`npm run lint`、`npm run typecheck`、`npm run check:docs`、`npm run check:copy`、`npm run check:routes` 通过；完整静态验收见本切片最终验证。
- 后端合同只读复核：`GET /api/v1/communities/:slug` 和 `GET /api/v1/communities/:slug/posts` 在后端合同中为 optional Bearer；本切片未改后端。
- 浏览器复验未登录 `/communities/public` 桌面和移动端：社区详情请求和社区帖子流请求均返回 200，页面展示真实社区内容和帖子流，不再显示 `需要登录` 或 `请先登录后查看社区详情和帖子` 登录墙。
- 浏览器复验未登录 `/communities/public` 桌面和移动端：`发布帖子 +` 仍指向受保护发帖页，`scrollWidth` 等于 `clientWidth`，控制台无 error。

2026-06-07 帖子详情公开阅读和受保护动作门禁复验记录：

- 自动检查已复验：`npm run lint`、`npm run typecheck`、`npm run check:actions`、`npm run check:api-boundary`、`npm run check:content-boundary`、`npm run check:copy`、`npm run check:ui-primitives` 和 `npm run check:routes` 通过。
- 后端合同只读复核：`GET /api/v1/posts/:id` 和 `GET /api/v1/posts/:id/comments?view=tree` 在后端合同中为 optional Bearer；本切片未改后端。
- 浏览器复验未登录 `/posts/5b6ebaff-ceac-47f5-a83a-4062201d0745` 桌面和移动端：帖子详情请求和评论树请求均返回 200，页面展示真实帖子正文和 1 条评论，不再显示 `需要登录` 或 `请先登录后查看帖子详情、评论和投票` 登录墙。
- 浏览器复验未登录 `/posts/5b6ebaff-ceac-47f5-a83a-4062201d0745` 桌面和移动端：评论、投票和举报显示登录门禁，`平台移除` 不显示，`scrollWidth` 等于 `clientWidth`，控制台无 error。

2026-06-07 首页公开阅读和共享 App Shell 复验记录：

- 自动检查已复验：`npm run lint`、`npm run typecheck`、`npm run check:actions`、`npm run check:api-boundary`、`npm run check:content-boundary`、`npm run check:copy`、`npm run check:ui-primitives`、`npm run check:static` 和 `npm run check:routes` 通过。
- 后端合同只读复核：`GET /api/v1/posts`、`GET /api/v1/posts/:id`、`GET /api/v1/communities/:slug/posts` 和 `GET /api/v1/posts/:id/comments` 已在后端 README 和合同文档中标记为 public + optional Bearer，本切片不需要新增后端需求。
- 浏览器复验 `/` 桌面和移动端：顶部搜索输入框来自共享 App Shell，左侧 / 移动主导航只显示首页和社区，首页不再显示 `登录后查看最新讨论`、`待登录` 或 `需要登录` 登录墙，页面包含公开帖子流说明。
- 浏览器复验 `/` 桌面和移动端：`scrollWidth` 等于 `clientWidth`，无横向溢出，控制台无 error。

2026-06-03 V2.1 后端缺口补齐复验记录：

- 自动检查已复验：`npm run lint` 通过，`npm run typecheck` 通过，严格 `npm run check:main-path` 通过（run id: `mpy7bguq_uauzn`），`npm run check:v2-path` 通过（run id: `mpy7bgxp_e5r1i`）。
- `check:v2-path` 已确认 `/api/v1/me` 返回 `is_platform_staff`，普通用户读取社区申请列表和详情会被后端拒绝，staff 可以读取社区申请列表、读取详情、approve 和 reject。
- 浏览器复验 `/community-applications/review` 未登录态：桌面 `1280px` 和移动 `390px` 均显示中文登录门禁，`scrollWidth` 等于 `clientWidth`，无横向溢出，控制台无 error。
- 浏览器复验发现登录表单在客户端脚本未接管时会退化成原生 GET 并把账号字段放进 URL；已为登录和注册表单补 `method="post"`，复测空提交后 URL 不再包含 `username` 或 `password`。
- 本轮 in-app browser 受输入和本地存储限制影响，未完成 staff 态可视化点击审核；staff 列表、详情、approve / reject 以真实后端 `check:v2-path` 作为本地验收证据。上线前仍需在真实可输入浏览器中按 `docs/internal/engineering/browser-qa.md` 手动复验 staff 审核台。

2026-06-03 V2 本地初版收口记录：

- 自动检查已复验：`npm run check:static` 通过，`npm run check:docs` 通过，严格 `npm run check:readiness` 通过，严格 `npm run check:main-path` 通过，`npm run check:routes` 通过，`npm run check:v2-path` 通过。
- 后端 CORS 已修复，严格 readiness 的 `OPTIONS /api/v1/posts` 预检允许 `http://localhost:3000`。
- `check:v2-path` 已覆盖 `/me.is_platform_staff`、图片上传、发帖/评论附件、new/hot 排序、搜索、通知、举报、审核台、`target_preview`、dismiss、remove-target、moderation remove、社区申请列表、申请详情和 approve / reject。
- 桌面和移动端浏览器已检查帖子详情 Markdown、涂黑、评论 Markdown、无编辑/预览 tab、`/search?q=QA&scope=all`、`/notifications`、`/moderation`、`/community-applications/review` 和 `/communities/public/new`；页面无横向溢出，控制台无 error。
- V2.1 已接入社区申请完整审核台和 staff-only 入口精确显隐；没有新的 P0 后端缺口阻塞本地初版。

2026-06-03 V1 本地封版验收记录：

- `npm run check:static` 通过，只有未复制 `.env.local`、使用 `.env.example` 默认本地值的 warning。
- `npm run check:routes` 通过，公开页面、受保护入口门禁和 `next` 回跳壳均可渲染。
- 严格 `npm run check:readiness` 通过。首次检查时当前 8080 后端进程未带 `HTTP_CORS_ALLOWED_ORIGINS`，导致 `OPTIONS /api/v1/posts` 返回 404；已重启本地后端并临时注入 `HTTP_CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000` 后通过。
- 严格 `npm run check:main-path` 在重启后的本地后端上通过，注册、登录、`/me`、社区、发帖、帖子详情、评论树、根评论、子评论、upvote、downvote 和取消投票均通过。
- 由于当前没有正式域名，生产 HTTPS `NEXT_PUBLIC_SITE_URL`、生产 HTTPS `NEXT_PUBLIC_API_BASE_URL`、生产 CORS allowlist、发布后验证和回滚演练保持 deferred，不阻塞 V1 本地封版。

2026-06-03 本地严格复验和帖子详情浏览器检查记录：

- 自动检查已复验：`npm run check:static` 通过，严格 `npm run check:readiness` 通过，严格 `npm run check:main-path` 通过，`npm run check:routes` 通过。
- 后端合同复核确认此前 `check:main-path` 评论树 warning 来自旧 API 进程；当前源码重启后 `view=tree` 仍是父评论先于子评论的前序遍历。
- 使用浏览器自动化清除 `cumt_nexus_access_token` 后打开 `/posts/0bc2e12d-7e2a-463e-ae8d-0b7e4295b425`：页面只请求前端路由，不再请求帖子详情和评论接口；显示中文登录门禁、登录回跳和页面导航出口；控制台无 error，当前视口无横向溢出。
- 使用 smoke 账号 `smoke_mpxgdyax_mcqah` 登录后，`next` 正确回跳帖子详情；登录请求、帖子详情请求和评论树请求均返回 200；页面展示真实帖子、根评论、子评论、评论表单和投票区；控制台无 error。
- 退出登录或 API client 因 `unauthenticated` 清空 token 时，会清理 TanStack Query 缓存；首页、社区详情和帖子详情不会继续从旧缓存派生受保护数据。
- 移动端 `390px` 复验 `/posts/73b10efe-c216-43af-9dd0-4cde6637f1cb`：通过后端创建测试用户和帖子评论树，并将 access token 写入浏览器本地会话后打开详情页；`GET /api/v1/me`、全站最新流、帖子详情和 `view=tree&sort=new&max_depth=6` 评论请求均返回 200；页面展示帖子正文、根评论、子评论、评论表单、回复框和投票区；`scrollWidth=390`、`clientWidth=390`，无横向溢出；控制台无 error。
- 本次移动端复验截图保存在 `.ai/screenshots/mobile-post-detail-comment-tree-2026-06-03.png`。该截图只作为本地 QA 证据，不进入 git。
- 本次临时测试数据由 PowerShell 直接创建，中文正文被终端编码转换为问号；因此本条只证明移动端布局、评论树、回复框、接口请求和控制台状态，不证明中文用户生成内容的显示质量。
- 本轮不是完整桌面/移动端全路径人工 QA。上线前仍需按 `docs/internal/engineering/browser-qa.md` 跑完注册、登录、退出、社区列表、社区详情、发帖、帖子详情、评论、投票、社区申请和移动端主路径。

2026-06-02 本地浏览器检查记录：

- 桌面端验证 `/`、`/communities`、`/community-applications/new`、`/login`、`/register`：页面为中文、没有 Next.js 错误页、没有横向溢出、控制台没有 error。
- 移动端 `390px` 宽度验证 `/`、`/communities`、`/communities/public`、`/communities/public/new`、`/community-applications/new`、`/login`、`/register`：没有横向溢出，没有错误页。
- 未登录首页已验证：使用公开帖子流路径，不再展示“登录后查看最新讨论”“待登录”或“需要登录”登录墙。
- 未登录社区详情已改为公开读取目标；旧记录中的登录提示只作为历史行为，不再是当前验收标准。
- 评论表单和投票控件已补组件级登录门禁；会话缺失时提供登录/注册入口，并保留当前帖子 `next` 回跳。
- 本地后端以 `HTTP_CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000` 启动后，严格 `npm run check:readiness` 已通过，后端 CORS 预检允许 `http://localhost:3000`。
- 浏览器端到端已验证：注册成功后进入首页，进入 `/communities/public/new` 发帖，成功跳转帖子详情，发表评论，upvote，再次点击取消投票；帖子详情保留首页、社区索引和社区申请出口。

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
- `docs/internal/engineering/deployment.md` 中的生产部署前检查、发布后验证和回滚标准没有完成。

## 本地初版判定

没有正式域名前，当前目标先收敛为“V2 本地初版收口”。它要求：

- `npm run check:static` 通过。
- `npm run check:routes` 通过。
- 严格 `npm run check:readiness` 在本地前后端都启动时通过。
- 严格 `npm run check:main-path` 在本地后端上通过。
- `npm run check:v2-path` 在本地后端和本地 PostgreSQL 容器可用时通过。
- README、`tasks.md`、内部文档和 `.ai/slices/` 对齐当前阶段。
- 已记录的桌面和移动端浏览器 QA 证据没有发现阻塞性问题。

以下事项在没有正式域名前保持 deferred，不阻塞 V2 本地初版：

- 生产 HTTPS `NEXT_PUBLIC_SITE_URL`。
- 生产 HTTPS `NEXT_PUBLIC_API_BASE_URL`。
- 生产后端 CORS allowlist。
- 生产发布后验证和回滚演练。

这些 deferred 项仍然阻塞真实公网生产上线。

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
