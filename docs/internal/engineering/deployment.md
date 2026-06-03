# 生产部署手册

本文记录 `cumt-nexus-web` 从本地验收进入生产部署前必须完成的配置和验证。它不绑定具体平台；无论部署到 Vercel、Node.js 服务器、容器平台或反向代理后面，都必须满足本文的检查边界。

## 部署目标

生产环境必须满足：

- 前端站点使用正式 HTTPS origin，例如 `https://web.example.com`。
- 后端 API 使用正式 HTTPS origin，例如 `https://api.example.com`。
- `NEXT_PUBLIC_API_BASE_URL` 只写后端 origin，不包含 `/api/v1`。
- `NEXT_PUBLIC_SITE_URL` 只写前端 origin，不包含路径。
- 后端 CORS 允许生产前端 origin。
- 前端 `/readyz` 返回 `ready`。
- `npm run check:env:production` 通过。
- 真实浏览器人工 QA 按 `docs/internal/engineering/browser-qa.md` 完成。

## 环境变量

前端生产环境必须配置：

```text
NEXT_PUBLIC_API_BASE_URL=https://<api-origin>
NEXT_PUBLIC_SITE_URL=https://<web-origin>
```

约束：

- 必须使用 `https`。
- 不能是 `localhost`、`127.0.0.1`、`::1` 或 `*.localhost`。
- 不能带路径，例如不要写 `https://api.example.com/api/v1`。
- 不要在前端配置后端内网地址，除非浏览器也能访问该地址。
- 变更后必须重新构建前端，因为 `NEXT_PUBLIC_*` 会进入客户端构建产物。

本地验证生产变量形态：

```powershell
$env:NEXT_PUBLIC_API_BASE_URL='https://api.example.com'
$env:NEXT_PUBLIC_SITE_URL='https://web.example.com'
npm run check:env:production
```

## 后端 CORS

后端必须允许生产前端 origin。当前本地联调变量是：

```powershell
$env:HTTP_CORS_ALLOWED_ORIGINS='http://localhost:3000'
```

生产环境应把允许 origin 改成正式前端地址，例如：

```text
HTTP_CORS_ALLOWED_ORIGINS=https://web.example.com
```

验收要求：

- `OPTIONS /api/v1/posts` 对生产前端 origin 返回可用预检结果。
- `Access-Control-Allow-Origin` 允许生产前端 origin。
- `Access-Control-Allow-Methods` 至少允许 `GET`。
- `Access-Control-Allow-Headers` 至少允许 `Authorization`。
- `npm run check:readiness` 或等价命令必须能检查到生产 API 的 CORS。

如果生产环境还需要保留本地或预发布 origin，必须按后端配置规则显式列出；不要用宽泛 CORS 掩盖配置问题。

## 构建与启动

安装依赖：

```powershell
npm install
```

构建：

```powershell
npm run build
```

自托管 Node.js 启动：

```powershell
npm run start
```

部署平台如果使用自己的 Next.js adapter，仍必须执行等价的生产构建，并保留 `next.config.ts` 中的安全响应头。

## 部署前自动验收

部署前在本地或 CI 至少运行：

```powershell
npm run lint
npm run typecheck
npm run build
npm run check:api-boundary
npm run check:dependencies
npm run check:env
npm run check:env:production
```

后端生产或预发布环境可用后，运行：

```powershell
node scripts/check-readiness.mjs --frontend-url=https://web.example.com --api-base-url=https://api.example.com
node scripts/check-public-routes.mjs --frontend-url=https://web.example.com
node scripts/check-main-path.mjs --api-base-url=https://api.example.com --community-slug=public
```

注意：

- `check-main-path` 会创建 smoke 用户、社区申请、帖子、评论和投票数据。
- 正式生产环境如不允许写入 smoke 数据，应在预发布环境完成主链路验收，并在生产环境执行人工只读检查。
- `check:readiness:local` 和 `check:main-path:local` 不能作为上线通过证据。

## 浏览器人工验收

自动命令通过后，按 `docs/internal/engineering/browser-qa.md` 执行真实浏览器 QA。

必须覆盖：

- 注册。
- 登录和退出。
- 未登录门禁和 `next` 回跳。
- 社区列表和社区详情。
- 发帖。
- 帖子详情、评论和投票。
- 社区申请。
- 桌面和移动端。

人工 QA 记录必须写回 `docs/internal/engineering/launch-readiness.md` 的“最新浏览器 QA 记录”。

## 发布后验证

发布后立即检查：

```powershell
node scripts/check-readiness.mjs --frontend-url=https://web.example.com --api-base-url=https://api.example.com
node scripts/check-public-routes.mjs --frontend-url=https://web.example.com
```

并在浏览器中确认：

- `/healthz` 返回 `ok`。
- `/readyz` 返回 `ready`。
- 首页不出现 CORS 错误或“无法加载最新帖子”异常状态。
- 登录页和注册页可访问。
- 受保护入口保留 `next` 回跳。
- 移动端首页没有横向溢出。

## 回滚标准

出现以下任一情况，优先回滚到上一稳定版本：

- 前端无法启动或大面积白屏。
- `/readyz` 在后端正常时仍 degraded。
- 生产 CORS 阻断浏览器访问 API。
- 注册、登录、发帖、评论或投票主路径不可用。
- 安全响应头缺失且不能立即修复。

回滚后必须保留问题记录，包括：

- 发布版本或 commit。
- 触发回滚的路径和现象。
- 是否影响数据写入。
- 下一次重新发布前必须补的验证。

## 当前生产阻塞项

截至 2026-06-03 本地复验后，生产部署仍缺：

- 正式 `NEXT_PUBLIC_SITE_URL`。
- 正式 `NEXT_PUBLIC_API_BASE_URL`。
- 后端生产 CORS allowlist。当前只验证了本地 `http://localhost:3000` 的严格 CORS preflight。
- 完整桌面与移动端全路径人工 QA。当前只补充了帖子详情未登录门禁、登录回跳和评论树浏览器复验。

这些缺口未补齐前，不允许把目标标记为生产上线完成。当前用户尚未准备正式域名，因此生产 HTTPS、正式 API origin 和生产 CORS allowlist 作为 deferred 项保留；它们不阻塞“V1 本地版封版”，但仍阻塞真实公网发布。
