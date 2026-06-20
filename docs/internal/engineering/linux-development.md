# Linux 开发环境整理

本文记录 `cumt-nexus-web` 从 Windows 开发环境切换到 Linux 或 WSL2 时的可执行步骤。目标是复刻当前前端开发约定，不顺手更换包管理器、框架、UI 库或后端联调方式。

## 迁移前确认

当前仓库使用：

- Next.js App Router + React + TypeScript + Tailwind CSS。
- `npm` 和 `package-lock.json`，不要迁移成 pnpm、yarn 或 bun。
- 前端默认地址 `http://localhost:3000`。
- 后端默认地址 `http://localhost:8080`。
- `.env.local` 从 `.env.example` 复制，不提交到 Git。

当前 Windows 本机核对到的版本：

```text
node v24.11.1
npm 11.6.2
```

仓库没有在 `package.json` 中固定 `engines` 或 `packageManager`。Linux 上优先使用 Node 24 系列和 npm 11 系列，减少迁移变量。

迁移前先处理当前工作树：

```powershell
git status --short --branch
```

如果有未提交改动，优先选择提交、暂存或导出 patch 后再切环境。不要依赖复制 `node_modules/`、`.next/` 或本地缓存迁移项目状态。

## 推荐目录

原生 Linux 推荐：

```bash
mkdir -p ~/Projects
cd ~/Projects
git clone <repo-url> cumt-nexus-web
cd cumt-nexus-web
```

WSL2 推荐把仓库放在 Linux 文件系统，例如：

```text
~/Projects/cumt-nexus-web
```

不建议长期把仓库放在 `/mnt/d/Projects/cumt-nexus-web` 里开发。跨 Windows 文件系统会拖慢 Next.js 文件监听、依赖安装和构建缓存。

## 系统依赖

推荐通过 `nvm` 安装 Node：

```bash
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
exec "$SHELL"
nvm install 24
nvm use 24
node -v
npm -v
```

安装项目依赖：

```bash
npm ci
```

如果正在迁移包含依赖变更的未提交分支，先确认 `package.json` 和 `package-lock.json` 是同一组改动，再运行安装命令。正常克隆和 CI 场景优先使用 `npm ci`。

## 环境变量

创建本地环境文件：

```bash
cp .env.example .env.local
```

本地默认内容：

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

约束：

- `NEXT_PUBLIC_API_BASE_URL` 只写后端 origin，不带 `/api/v1`。
- `NEXT_PUBLIC_SITE_URL` 只写前端 origin，不带路径。
- 修改 `NEXT_PUBLIC_*` 后需要重新启动或重新构建前端。

## 启动前端

```bash
npm run dev
```

默认访问：

```text
http://localhost:3000
```

如果 3000 端口已被占用，先找出占用进程并关闭。不要随意换端口后直接跑完整验收，因为 `check:routes` 和后端 CORS 默认都按 `http://localhost:3000` 组织。

## 后端联调

前端默认直连后端，不使用 Next dev proxy。后端需要在 Linux 或 Windows 上监听：

```text
http://localhost:8080
```

后端 CORS 至少允许：

```bash
HTTP_CORS_ALLOWED_ORIGINS=http://localhost:3000
```

如果前端在 WSL2、后端在 Windows，要确认 `localhost:8080` 从浏览器和 WSL 进程都能访问。访问不通时优先统一把前后端都放到 WSL2 或都放到同一台 Linux 环境里跑。

## 验收顺序

只验证前端静态质量：

```bash
npm run lint
npm run typecheck
npm run check:static
```

前端 `npm run dev` 已启动后，验证公开页面壳：

```bash
npm run check:routes
```

后端 `http://localhost:8080` 已启动并且 CORS 正确后，跑严格联调：

```bash
npm run check:readiness
npm run check:main-path
npm run check:v2-path
```

注意：

- `check:static` 不请求真实后端。
- `check:routes` 需要前端服务在 `http://localhost:3000`。
- `check:main-path` 和 `check:v2-path` 会写入 smoke 测试数据，只适合本地或预发布环境。
- 后端暂时不可用时只能用 `check:readiness:local` 或 `check:main-path:local` 做前端本地收口，不能作为上线通过依据。

## 常见问题

### 文件大小写

Linux 文件系统大小写敏感。Windows 上能通过的错误 import，例如文件实际叫 `PostCard.tsx` 但 import 写成 `post-card`，可能会在 Linux `typecheck` 或 `build` 暴露。

处理方式：

```bash
npm run typecheck
npm run build
```

按报错修正 import 或文件名，不要用只在 Windows 上成立的路径。

### 换行和编码

项目文档和源码按 UTF-8 处理。Linux 终端默认 UTF-8，中文文档应直接可读。不要为了终端显示问题把文档转成 GBK。

如果 Git 提示大量换行变更，先检查 Git 配置：

```bash
git config --get core.autocrlf
git diff --stat
```

迁移环境时不要把纯换行变化和功能改动混在同一提交里。

### 文件监听慢

WSL2 中如果项目位于 `/mnt/c` 或 `/mnt/d`，Next.js 文件监听和热更新可能明显变慢。把仓库移到 `~/Projects` 后重新安装依赖：

```bash
rm -rf node_modules .next
npm ci
```

### 端口和 CORS

如果页面能打开但数据加载失败，先区分三件事：

```bash
curl http://localhost:3000/healthz
curl http://localhost:8080/healthz
npm run check:readiness
```

前两个只说明前端和后端进程是否可达；`check:readiness` 还会检查后端 CORS 预检和前端 `/readyz`。

### 依赖漂移

不要用 `npm install` 顺手升级依赖。新增依赖必须先说明用途、替代方案和影响范围，并同步更新依赖边界检查。

常规恢复方式：

```bash
rm -rf node_modules .next
npm ci
```

## 迁移完成标准

Linux 环境可以视为可用，需要至少满足：

- `npm ci` 成功。
- `.env.local` 已按本地默认值配置。
- `npm run dev` 能打开 `http://localhost:3000`。
- `npm run lint` 通过。
- `npm run typecheck` 通过。
- `npm run check:static` 通过。
- 前端启动后 `npm run check:routes` 通过。
- 后端启动后严格 `npm run check:readiness` 通过。

涉及真实业务改动时，继续按 `README.md` 的完整验证命令和浏览器 QA 要求执行。
