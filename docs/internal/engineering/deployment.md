# 生产部署手册

本文记录 `cumt-nexus-web` 从本地验收进入生产部署前必须完成的配置和验证。它不绑定具体平台；无论部署到 Vercel、Node.js 服务器、容器平台或反向代理后面，都必须满足本文的检查边界。

## 部署目标

生产环境必须满足：

- 前端站点使用正式 HTTPS origin，例如 `https://web.example.com`。
- 后端 API 使用浏览器可访问的正式 HTTPS origin。同域名路径转发时，它和站点 origin 相同，例如 `https://nexus.example.com`；独立 API 域名时，例如 `https://api.example.com`。
- `NEXT_PUBLIC_API_BASE_URL` 只写 API origin，不包含 `/api/v1`。
- `NEXT_PUBLIC_SITE_URL` 只写站点 origin，不包含路径。
- 后端 CORS 允许生产站点 origin。即使同域名部署，也建议显式配置该 origin，保证带 `Origin` 的写请求和预检请求稳定。
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
- 前后端同域名时，两个值可以相同，例如都写 `https://nexus.example.com`；Caddy/Nginx 负责把 `/api/*` 转发给后端。
- 变更后必须重新构建前端，因为 `NEXT_PUBLIC_*` 会进入客户端构建产物。

本地验证生产变量形态：

```powershell
$env:NEXT_PUBLIC_API_BASE_URL='https://api.example.com'
$env:NEXT_PUBLIC_SITE_URL='https://web.example.com'
npm run check:env:production
```

## 后端 CORS

后端必须允许生产站点 origin。当前后端变量是 `HTTP_CORS_ALLOWED_ORIGINS`，多个 origin 用英文逗号分隔，值必须是完整 origin，不能带路径。当前本地联调变量是：

```powershell
$env:HTTP_CORS_ALLOWED_ORIGINS='http://localhost:3000'
```

生产环境应把允许 origin 改成正式站点地址，例如：

```text
HTTP_CORS_ALLOWED_ORIGINS=https://web.example.com
```

单域名部署时写：

```text
HTTP_CORS_ALLOWED_ORIGINS=https://nexus.example.com
```

验收要求：

- `OPTIONS /api/v1/posts` 对生产前端 origin 返回可用预检结果。
- `Access-Control-Allow-Origin` 允许生产前端 origin。
- `Access-Control-Allow-Methods` 至少允许 `GET`。
- `Access-Control-Allow-Headers` 至少允许 `Authorization`。
- `npm run check:readiness` 或等价命令必须能检查到生产 API 的 CORS。

如果生产环境还需要保留预发布 origin，必须按后端配置规则显式列出；不要用宽泛 CORS 掩盖配置问题。正式公网环境不要保留 `localhost`。

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

## Docker 镜像部署

前端仓库提供生产镜像构建文件：

| 文件 | 职责 |
|---|---|
| `Dockerfile` | 构建 Next.js standalone 生产镜像 |
| `.dockerignore` | 排除 `node_modules`、`.next`、真实 `.env*` 等本地文件 |
| `docker-compose.prod.yml` | 生产容器编排，支持本地构建或拉取 `WEB_IMAGE` |
| `.env.production.example` | 前端生产环境变量模板 |

生产镜像构建时必须注入：

```bash
NEXT_PUBLIC_SITE_URL=https://nexus.example.com
NEXT_PUBLIC_API_BASE_URL=https://nexus.example.com
```

`NEXT_PUBLIC_*` 会进入客户端构建产物，因此修改这些变量后必须重新构建并发布新镜像，不能只重启旧容器。

本机模拟生产镜像：

```bash
cp .env.production.example .env.production
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
curl http://127.0.0.1:3000/healthz
```

服务器拉取镜像部署：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --no-build
```

生成可上传服务器的前端部署包：

```bash
npm run deploy:bundle
```

输出目录：

```text
dist/deploy/cumt-nexus-web/
```

部署包包含前端 compose、生产 env 模板、Caddy 示例和单服务器 runbook。`dist/` 不提交到 Git。

填写真实 `.env.production` 后，可以先做前端生产环境文件检查：

```bash
npm run check:deploy-env -- --env-file .env.production
```

该命令会阻止 `example.com`、`<owner>`、`latest`、localhost、非 HTTPS origin、带路径的 `NEXT_PUBLIC_API_BASE_URL` 等上线常见错误。

`.env.production` 示例：

```env
WEB_IMAGE=ghcr.io/<owner>/cumt-nexus-web:v0.1.0
WEB_BIND_HOST=127.0.0.1
WEB_PORT=3000
NEXT_PUBLIC_SITE_URL=https://nexus.example.com
NEXT_PUBLIC_API_BASE_URL=https://nexus.example.com
```

单服务器反代部署时，前端 compose 端口必须只绑定本机回环地址，即 `WEB_BIND_HOST=127.0.0.1`。后端仓库当前生产 compose 可通过 `API_PORT=127.0.0.1:8080` 达成同样效果。不要让前端 3000 或后端 8080 直接监听公网网卡；公网入口只应该是 Caddy/Nginx 的 80/443。

前端镜像发布到 GHCR：

```text
.github/workflows/publish-docker.yml
```

触发方式：

- 推送 `v*.*.*` Git tag，例如 `v0.1.0`。
- 在 GitHub Actions 页面手动运行 `Publish Docker image`，填写 `image_tag`、`site_url` 和 `api_base_url`。

tag 自动发布时，需要在 GitHub repository variables 中配置：

```text
NEXT_PUBLIC_SITE_URL=https://nexus.example.com
NEXT_PUBLIC_API_BASE_URL=https://nexus.example.com
```

手动发布时，workflow input 会覆盖 repository variables。发布成功后，服务器 `.env.production` 中的 `WEB_IMAGE` 应指向对应镜像。服务器拉远端镜像部署时使用 `up --no-build`，避免没有源码或 Dockerfile 时意外进入本地构建：

```env
WEB_IMAGE=ghcr.io/<owner>/cumt-nexus-web:v0.1.0
```

上线后公网检查也可以在 GitHub Actions 手动运行：

```text
.github/workflows/post-deploy-check.yml
```

在 Actions 页面运行 `Post-deploy check`，填写真实 `site_url`；同域名部署时 `api_base_url` 留空，独立 API 域名时填写真实 API origin。该 workflow 会运行 `npm run check:post-deploy`，验证公网 readiness、CORS、公开 API 读路径、公开页面和基础安全响应头。

如果前后端使用同一个域名，建议由 Caddy 或 Nginx 统一处理 HTTPS，并按路径转发：

```text
https://nexus.example.com          -> 前端容器 127.0.0.1:3000
https://nexus.example.com/api/*    -> 后端容器 127.0.0.1:8080
https://nexus.example.com/uploads/* -> 后端容器 127.0.0.1:8080
```

Caddy 示例：

```caddyfile
nexus.example.com {
  encode zstd gzip

  handle /api/* {
    reverse_proxy 127.0.0.1:8080
  }

  handle /uploads/* {
    reverse_proxy 127.0.0.1:8080
  }

  handle {
    reverse_proxy 127.0.0.1:3000
  }
}
```

同一份示例也保存在 `deploy/Caddyfile.example`，部署到服务器时可以复制到 `/etc/caddy/Caddyfile` 后替换域名。

## 部署前自动验收

部署前在本地或 CI 至少运行：

```powershell
npm run lint
npm run typecheck
npm run build
npm run check:api-boundary
npm run check:dependencies
npm run check:deploy
npm run check:env
npm run check:env:production
```

使用 Docker 镜像部署时，填写真实 `.env.production` 后再运行：

```bash
npm run check:deploy-env -- --env-file .env.production
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
$env:SITE_URL='https://<your-real-domain>'
$env:API_URL='https://<your-api-domain>'
npm run check:post-deploy -- --site-url=$env:SITE_URL --api-base-url=$env:API_URL
```

同域名部署时可省略 `--api-base-url`：

```powershell
$env:SITE_URL='https://<your-real-domain>'
npm run check:post-deploy -- --site-url=$env:SITE_URL
```

需要拆开排查时，底层命令是：

```powershell
node scripts/check-readiness.mjs --frontend-url=https://web.example.com --api-base-url=https://api.example.com
node scripts/check-public-routes.mjs --frontend-url=https://web.example.com
```

也可以在 GitHub Actions 页面手动运行 `.github/workflows/post-deploy-check.yml`，填写同一组真实域名，让 CI 从公网视角验证部署结果。

并在浏览器中确认：

- `/healthz` 返回前端 `ok`。
- `/api/v1/posts?source=all&sort=new&limit=1&offset=0` 通过公网反代返回 `200`。
- `/readyz` 返回 `ready`，且该检查会通过 `/api/v1/posts?source=all&sort=new&limit=1&offset=0` 验证后端 API 和数据库。
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
- 生产环境完整桌面与移动端全路径人工 QA。当前已完成 V2 本地浏览器复验，包括帖子详情 Markdown、涂黑、评论 Markdown、搜索、通知、审核台和社区申请审核入口；这些证据不能替代生产环境发布后 QA。

这些缺口未补齐前，不允许把目标标记为生产上线完成。当前用户尚未准备正式域名，因此生产 HTTPS、正式 API origin 和生产 CORS allowlist 作为 deferred 项保留；它们不阻塞“V2 本地初版”，但仍阻塞真实公网发布。
