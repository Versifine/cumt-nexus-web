# 单服务器 Docker 部署 Runbook

本文面向“前后端都用 Docker 镜像发布，服务器只拉取明确版本镜像”的部署方式。默认使用一个 HTTPS 域名，由 Caddy 统一处理 TLS 和反向代理。

示例域名：

```text
https://nexus.example.com
```

端口规划：

```text
Caddy             80/443
前端容器          127.0.0.1:3000
后端 API 容器     127.0.0.1:8080
PostgreSQL        后端 compose 内部网络
```

## 服务器目录

推荐目录：

```text
/opt/cumt-nexus/
  cumt-nexus-web/
    docker-compose.prod.yml
    .env.production
  cumt-nexus-api/
    docker-compose.prod.yml
    .env.production
```

服务器只需要部署 compose 文件和 `.env.production`。如果完全使用远端镜像，服务器不需要保留完整源码。

前端仓库可生成服务器部署包：

```bash
npm run deploy:bundle
```

输出目录为 `dist/deploy/cumt-nexus-web/`，包含前端 compose、生产 env 模板、Caddy 示例和本 runbook。

填写真实 `.env.production` 后，先在前端仓库运行：

```bash
npm run check:deploy-env -- --env-file .env.production
```

如果是在服务器部署包目录中运行，需要有 Node.js；没有 Node.js 时，按本节配置要求人工核对 `WEB_IMAGE`、`NEXT_PUBLIC_SITE_URL` 和 `NEXT_PUBLIC_API_BASE_URL`。

## 前端配置

`/opt/cumt-nexus/cumt-nexus-web/.env.production`：

```env
WEB_IMAGE=ghcr.io/<owner>/cumt-nexus-web:v0.1.0
WEB_BIND_HOST=127.0.0.1
WEB_PORT=3000
NEXT_PUBLIC_SITE_URL=https://nexus.example.com
NEXT_PUBLIC_API_BASE_URL=https://nexus.example.com
```

同域名部署时，`NEXT_PUBLIC_API_BASE_URL` 写站点 origin，不写 `/api/v1`。Caddy 会把 `/api/*` 转发给后端。`WEB_BIND_HOST=127.0.0.1` 表示前端容器端口只给本机 Caddy 访问，不直接暴露到公网。

## 后端配置

`/opt/cumt-nexus/cumt-nexus-api/.env.production` 至少需要：

```env
API_IMAGE=ghcr.io/<owner>/cumt-nexus-api:v0.1.0
API_PORT=127.0.0.1:8080

APP_NAME=cumt-nexus-api
APP_ENV=prod
APP_STARTUP_TIMEOUT=20s

POSTGRES_PORT=5432
POSTGRES_USER=cumt_nexus
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DATABASE=cumt_nexus
POSTGRES_SSL_MODE=disable
POSTGRES_MAX_CONNS=25
POSTGRES_MAX_CONN_LIFETIME=5m
POSTGRES_MAX_CONN_IDLE_TIME=2m

HTTP_ADDR=:8080
HTTP_READ_TIMEOUT=5s
HTTP_WRITE_TIMEOUT=10s
HTTP_SHUTDOWN_TIMEOUT=15s
HTTP_CORS_ALLOWED_ORIGINS=https://nexus.example.com

LOG_LEVEL=info
LOG_FORMAT=json
GIN_MODE=release

AUTH_TOKEN_SECRET=<long-random-secret>
AUTH_ACCESS_TOKEN_TTL=24h
AUTH_EMAIL_ALLOWED_DOMAINS=cumt.edu.cn,mail.cumt.edu.cn

MAIL_PROVIDER=log

OBJECT_STORAGE_PROVIDER=local
OBJECT_STORAGE_ENDPOINT=
OBJECT_STORAGE_REGION=auto
OBJECT_STORAGE_BUCKET=
OBJECT_STORAGE_ACCESS_KEY_ID=
OBJECT_STORAGE_SECRET_ACCESS_KEY=
OBJECT_STORAGE_PUBLIC_BASE_URL=https://nexus.example.com/uploads
OBJECT_STORAGE_FORCE_PATH_STYLE=true
OBJECT_STORAGE_LOCAL_ROOT=/app/var/uploads

UPLOAD_IMAGE_MAX_BYTES=5242880
UPLOAD_IMAGE_MAX_COUNT_PER_POST=9
UPLOAD_IMAGE_MAX_COUNT_PER_COMMENT=1
```

该示例按后端仓库当前 `docker-compose.prod.yml` 和 `.env.production.example` 对齐。后端 `APP_ENV` 只接受 `local/dev/test/prod`，不要写 `production`。后端 compose 会把 `POSTGRES_HOST` 固定为内部服务名 `postgres`，服务器 env 不需要再配置外部数据库 host。

后端仓库当前 compose 使用 `ports: "${API_PORT:-8080}:8080"`。`API_PORT=127.0.0.1:8080` 会让 API 只监听本机回环地址，由 Caddy 对公网暴露 HTTPS；如果写成 `8080`，Docker 会默认监听所有网卡。

`OBJECT_STORAGE_PROVIDER=local` 适合单机小规模部署，必须保留 Caddy 的 `/uploads/*` 到后端 API 转发。正式长期运行更建议把 `OBJECT_STORAGE_PROVIDER` 改为 `r2` 并配置 R2 变量，`OBJECT_STORAGE_PUBLIC_BASE_URL` 必须是浏览器可公开读取图片的 URL，不能是 R2 S3 API endpoint。

生产如果需要真实邮件验证码，把 `MAIL_PROVIDER` 改为 `smtp` 并配置 `SMTP_HOST`、`SMTP_PORT`、`SMTP_USERNAME`、`SMTP_PASSWORD`、`SMTP_FROM` 和 `SMTP_TLS_MODE`。`MAIL_PROVIDER=log` 只适合上线前冒烟或内测。

## Caddy 配置

`/etc/caddy/Caddyfile`，可从前端仓库的 `deploy/Caddyfile.example` 复制后替换域名：

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

重载：

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## 发布前准备

1. DNS 已把 `nexus.example.com` 指向服务器公网 IP。
2. 服务器开放 80/443。
3. Caddy 已安装并能自动申请证书。
4. 服务器已安装 Docker Engine 和 Docker Compose plugin。
5. 前后端容器端口只绑定本机回环地址：前端 `WEB_BIND_HOST=127.0.0.1`，后端 `API_PORT=127.0.0.1:8080`。
6. 如果 GHCR package 是 private，服务器已登录 GHCR：

```bash
echo "<token-with-read-packages>" | docker login ghcr.io -u "<github-user>" --password-stdin
```

7. 前端镜像已发布，且构建时使用了正式 `NEXT_PUBLIC_SITE_URL` 和 `NEXT_PUBLIC_API_BASE_URL`。
8. 后端镜像已发布，数据库 migration 已包含在镜像中。

## 首次启动

先启动后端：

```bash
cd /opt/cumt-nexus/cumt-nexus-api
docker compose --env-file .env.production -f docker-compose.prod.yml pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --no-build
curl http://127.0.0.1:8080/healthz
```

再启动前端：

```bash
cd /opt/cumt-nexus/cumt-nexus-web
docker compose --env-file .env.production -f docker-compose.prod.yml pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --no-build
curl http://127.0.0.1:3000/healthz
```

最后检查公网：

```bash
curl https://nexus.example.com/healthz
curl 'https://nexus.example.com/api/v1/posts?source=all&sort=new&limit=1&offset=0'
curl https://nexus.example.com/readyz
curl -I https://nexus.example.com/
```

同域名部署时，公网 `https://nexus.example.com/healthz` 是前端健康检查；后端公网路径应通过 `/api/*` 验证。`/readyz` 也会走 `/api/v1/posts?source=all&sort=new&limit=1&offset=0` 来确认后端 API 和数据库可用。

## 发布新版本

更新前后端 `.env.production` 中的镜像 tag，然后：

```bash
cd /opt/cumt-nexus/cumt-nexus-api
docker compose --env-file .env.production -f docker-compose.prod.yml pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --no-build

cd /opt/cumt-nexus/cumt-nexus-web
docker compose --env-file .env.production -f docker-compose.prod.yml pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --no-build
```

前端只要修改了 `NEXT_PUBLIC_*`，必须发布新镜像，不能只修改服务器 `.env.production` 后重启。

## 上线后自动验证

推荐在 GitHub Actions 页面手动运行 `.github/workflows/post-deploy-check.yml` 的 `Post-deploy check`，填写真实 `site_url`；同域名部署时 `api_base_url` 留空，独立 API 域名时填写真实 API origin。

也可以在前端仓库或 CI 中运行：

```bash
SITE_URL=https://<your-real-domain>
npm run check:post-deploy -- --site-url="$SITE_URL"
```

独立 API 域名时运行：

```bash
SITE_URL=https://<your-real-domain>
API_URL=https://<your-api-domain>
npm run check:post-deploy -- --site-url="$SITE_URL" --api-base-url="$API_URL"
```

需要拆开排查时，底层命令是：

```bash
node scripts/check-readiness.mjs --frontend-url=https://nexus.example.com --api-base-url=https://nexus.example.com
node scripts/check-public-routes.mjs --frontend-url=https://nexus.example.com
```

如允许写入 smoke 数据，可在预发布环境运行：

```bash
node scripts/check-main-path.mjs --api-base-url=https://nexus.example.com --community-slug=public
```

生产环境不允许写入 smoke 数据时，按 `docs/internal/engineering/browser-qa.md` 做人工只读和关键路径 QA。

## 回滚

前端回滚：把 `WEB_IMAGE` 改回上一稳定 tag，然后：

```bash
cd /opt/cumt-nexus/cumt-nexus-web
docker compose --env-file .env.production -f docker-compose.prod.yml pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --no-build
```

后端回滚：把 `API_IMAGE` 改回上一稳定 tag，然后：

```bash
cd /opt/cumt-nexus/cumt-nexus-api
docker compose --env-file .env.production -f docker-compose.prod.yml pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --no-build
```

后端数据库 migration 不默认自动回滚。发布前必须先备份数据库；如果 migration 包含删除或重写字段，不能按普通镜像 tag 切换直接回滚。
