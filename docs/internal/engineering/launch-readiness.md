# 上线前自检

本文记录 `cumt-nexus-web` 从“本地可运行”推进到“可以上线”的检查边界。它不替代人工 QA，也不替代真实后端联调；它用于把每次收口前必须证明的事项固定下来。

## 自检命令

严格模式：

```powershell
npm run check:readiness
```

严格模式用于正式验收。只要后端不可达、`/readyz` 降级、公开入口缺失或基础安全响应头缺失，就必须失败。

本地宽松模式：

```powershell
npm run check:readiness:local
```

本地宽松模式只允许后端不可用导致的 degraded 结果变成 warning。它适合当前前端独立收口阶段，但不能作为上线通过证据。

公开页面冒烟检查：

```powershell
npm run check:routes
```

该命令要求本地或目标前端服务已启动。它会请求 `/`、`/login`、`/register`、`/communities` 和 `/community-applications/new`，检查页面返回 `200`、包含 `zh-CN` 语言标记，并包含该页面应有的关键中文文案。它用于发现路由丢失、页面级 500、中文文案缺失和错误页误渲染。

可选参数：

```powershell
node scripts/check-readiness.mjs --frontend-url=http://localhost:3000 --api-base-url=http://localhost:8080 --timeout-ms=8000
node scripts/check-public-routes.mjs --frontend-url=http://localhost:3000 --timeout-ms=8000
```

## 自动检查范围

`scripts/check-readiness.mjs` 当前检查：

- 前端 `/healthz` 是否返回 `cumt-nexus-web` 和 `ok`。
- 后端 `NEXT_PUBLIC_API_BASE_URL/healthz` 是否可达。
- 前端 `/readyz` 是否返回 `ok`；严格模式下 degraded 是阻塞。
- `robots.txt` 是否包含 sitemap 声明。
- `sitemap.xml` 是否包含站点 URL。
- `manifest.webmanifest` 是否包含 `name`、`start_url` 和 `icons`。
- `icon.svg` 是否能正常返回 SVG。
- 基础安全响应头是否存在：`X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy`、`Permissions-Policy`。

`scripts/check-public-routes.mjs` 当前检查：

- `/`：包含 `CUMT Nexus`、`最新讨论`、`浏览社区`。
- `/login`：包含 `CUMT Nexus`、`登录`、`账号验证`、`创建账号`。
- `/register`：包含 `CUMT Nexus`、`注册账号`、`账号创建`、`去登录`。
- `/communities`：包含 `社区目录`、`校园社区`、`申请社区`。
- `/community-applications/new`：包含 `CUMT Nexus`、`申请新社区`、`返回社区索引`。
- 所有页面都必须包含 `zh-CN` 语言标记，且不能渲染常见错误页标记。

## 上线阻塞项

以下任意一项未完成时，不允许把目标标记为可上线：

- `npm run lint` 未通过。
- `npm run typecheck` 未通过。
- `npm run build` 未通过。
- `npm run check:routes` 未通过。
- `npm run check:readiness` 未通过。
- 后端 `/healthz` 不可达，或前端 `/readyz` 仍为 degraded。
- 注册、登录、获取当前用户、社区列表、社区详情、发帖、帖子详情、评论、投票主链路没有用真实后端验证。
- 生产环境未配置正式 `NEXT_PUBLIC_API_BASE_URL`。
- 生产环境未配置正式 `NEXT_PUBLIC_SITE_URL`。
- 主要页面没有完成桌面和移动端人工检查。

## 人工 QA 范围

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

## 当前已知缺口

截至本文创建时，前端本地 `/healthz` 可用，但后端 `http://localhost:8080/healthz` 不可达，导致 `/readyz` 返回 degraded。真实业务主链路仍需要等后端服务启动后再验收。
