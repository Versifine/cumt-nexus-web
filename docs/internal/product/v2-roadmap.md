# V2 产品路线图

本文定义 `cumt-nexus-web` 的 V2 产品边界和实施顺序。V2 的目标不是只做几个新页面，而是把当前后端已经具备的产品能力在前端完整接入，并把 V1 的本地主链路骨架推进成可真实使用的校园社区内容产品。

本文是 V2 的派工入口。具体页面实现仍要遵守：

- `AGENTS.md`
- `docs/design/DESIGN.md`
- `docs/design/page-patterns.md`
- `docs/design/component-rules.md`
- `docs/internal/product/product-targets.md`
- `docs/internal/architecture/content-system.md`
- `docs/internal/architecture/markdown-rendering.md`
- `docs/internal/architecture/content-media-api-gaps.md`

## V2 定义

V2 命名为：

```text
V2 后端能力全量前端接入
```

一句话目标：

```text
把当前后端已经提供的社区、内容、发现、通知、举报审核和媒体接口做成完整前端产品体验。
```

## 当前实现状态

截至本轮 V2 本地初版收口，前端已经落地：

- 合同核对与 API client 补齐：搜索、通知、举报、审核、社区申请 approve / reject、图片上传、feed sort 都已进入统一 API 边界。
- Reddit Markdown renderer：`ContentBody` 使用 `react-markdown` + `remark-gfm`，开启 `skipHtml`，不使用 `rehype-raw`，链接协议做白名单过滤。
- 写作器：发帖、评论、回复和帖子编辑都使用单一 `MarkdownComposerField` 和格式工具条；组件是实时渲染编辑器，工具条作用于当前选区或当前块，提交给后端的格式仍是 Markdown。评论不提供编辑入口。
- 图片上传与正文图片展示：发帖和评论写作器接入 `POST /api/v1/uploads/images`，提交 `attachment_ids`，上传后插入 `nexus-attachment` 正文 marker，帖子详情和评论树只渲染正文内 marker 引用到的图片；Post-V2 已补齐 JPEG / PNG / WebP、单图 5MB、发帖最多 9 张、评论最多 1 张的前端提示和拦截，以及上传失败重试、正文图片移除提示。
- 内容发现：首页和社区帖子流支持 `new | hot`，搜索页支持 `all | communities | posts`。
- 通知中心：支持列表、未读 / 已读筛选、标记已读和保守跳转。
- 举报与审核：普通用户可举报帖子 / 评论；审核台支持举报列表、详情、`target_preview`、dismiss、remove-target；帖子和评论支持 moderation remove。
- 社区申请审批：已接入列表、详情、approve / reject 和 staff-only 入口显隐。

当前后端缺口状态：

- 社区申请列表 / 详情读取接口已由后端补齐，前端已接入完整审核台。
- `/api/v1/me.is_platform_staff` 已由后端补齐，前端已用于 staff-only 入口显隐。
- 本地 CORS 预检已由后端修复，严格 `npm run check:readiness` 已能证明浏览器 origin 可访问 API。
- 后续新增前端所需后端接口时，继续写入根目录 `backend-api-needs.md`，并保持该文件在 `.gitignore` 中。

本轮 V2 本地收口证据：

- `npm run check:static`、`npm run check:docs`、`npm run check:routes`、严格 `npm run check:readiness`、严格 `npm run check:main-path` 和 `npm run check:v2-path` 均通过。
- 桌面和移动端浏览器已检查帖子详情、Reddit Markdown、涂黑、评论 Markdown、`/search`、`/notifications`、`/moderation`、`/community-applications/review` 和 `/communities/public/new`，未发现横向溢出或控制台 error。
- V2.1 已把社区申请审核台从手动输入 ID 升级为列表、详情、approve / reject 和 staff 入口显隐。

V2 的验收范围以当前后端能力为准：

- 已接入能力不能退化。
- 未接入但后端已有接口的能力必须进入 V2。
- 后端接口存在但字段未在前端确认时，先做合同核对任务，不凭记忆写字段。
- 任何前端页面都必须包含 loading、empty、error、success/submitted、disabled 和移动端状态。

## V2 设计原则

### 产品原则

- 后端能力全量接入。用户列出的接口都必须在 V2 中有前端入口、状态和验证路径。
- 内容系统优先。Reddit Markdown、图片上传、帖子详情和评论树是产品质感核心。
- 能力对齐 Reddit Markdown。帖子和评论正文目标是 Reddit-style Markdown parity。
- 体验不要变成复杂文档编辑器。不强制编辑 / 预览双模式；常用格式通过工具动作承接，高级用户可以粘贴或输入 Markdown，由写作器解析成可见排版。
- 管理能力要有边界。社区申请审批、举报审核和内容移除必须只给有权限用户入口。
- 后端合同优先。实现前重新核对后端响应结构，不在前端伪造字段或业务状态。

### 视觉原则

- 继续使用 dark editorial product / magazine-grade campus community interface。
- 保持中文界面。
- 多用色块、线条、编号和文字动作控制注意力，减少大按钮。
- 不照搬 Reddit 皮肤，只学习结构和交互模式。
- 不新增第二套 UI 库。
- 不做每个页面一种风格。

## 后端能力清单

以下能力由用户确认后端已经具备，V2 前端必须覆盖。

### 账号与会话

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/me
Bearer JWT 认证中间件
JWT access token 签发
用户领域模型、密码哈希、用户仓储
```

前端状态：

- V1 已接入注册、登录、当前用户、token 会话和退出。
- V2 只做回归守护，不重复造 auth 架构。

### 社区与社区申请

```text
GET  /api/v1/communities
GET  /api/v1/communities/:slug
POST /api/v1/community-applications
POST /api/v1/community-applications/:id/approve
POST /api/v1/community-applications/:id/reject
```

后端还具备：

```text
阶段 2 社区 schema migration
社区领域模型与 PostgreSQL repository
API 启动期公共总版 bootstrap
审批通过后事务内创建社区和申请人 owner 成员关系
```

前端状态：

- V1 已接入社区列表、详情和提交社区申请。
- V2 已接入申请列表、详情、approve / reject 操作和 staff-only 审核入口。

### 帖子

```text
POST   /api/v1/communities/:slug/posts
PATCH  /api/v1/posts/:id
DELETE /api/v1/posts/:id
GET    /api/v1/communities/:slug/posts
GET    /api/v1/posts/:id
GET    /api/v1/posts
GET    /api/v1/posts?sort=new|hot
GET    /api/v1/communities/:slug/posts?sort=new|hot
```

后端还具备：

```text
阶段 3 帖子 schema、domain、repository
```

前端状态：

- V1 已接入发帖、编辑、删除、社区帖子列表、帖子详情、全站最新流。
- V2 已补齐 `new | hot` 排序切换，首页和社区详情使用包含排序参数的稳定 query key。

### 评论

```text
POST   /api/v1/posts/:id/comments
PATCH  /api/v1/comments/:id
DELETE /api/v1/comments/:id
GET    /api/v1/posts/:id/comments
```

后端还具备：

```text
阶段 4 评论 schema、domain、repository
```

前端状态：

- V1 已接入根评论、子评论、编辑、软删除和评论树。
- V2 必须在 Reddit Markdown 和图片能力接入时保持评论树不退化。

### 投票

```text
PUT    /api/v1/posts/:id/vote
DELETE /api/v1/posts/:id/vote
```

后端还具备：

```text
阶段 6 帖子投票 schema、domain、repository
```

前端状态：

- V1 已接入帖子 upvote / downvote / 取消投票。
- V2 只做回归守护，并在 new/hot 和搜索结果中保持投票状态展示一致。

### 举报与审核

```text
POST /api/v1/posts/:id/reports
POST /api/v1/comments/:id/reports
POST /api/v1/posts/:id/moderation/remove
POST /api/v1/comments/:id/moderation/remove
GET  /api/v1/moderation/reports
GET  /api/v1/moderation/reports/:id
POST /api/v1/moderation/reports/:id/dismiss
POST /api/v1/moderation/reports/:id/remove-target
```

后端还具备：

```text
阶段 7 举报和审核 schema、domain、repository
审核台举报列表和详情响应 target_preview
```

前端状态：

- V2 必须完整接入。
- 普通用户可举报帖子和评论。
- 有权限用户可进入审核台、查看举报列表和详情、dismiss、remove target。
- 内容详情页要根据权限显示 moderation remove 动作。

### 搜索

```text
GET /api/v1/search?q=...&scope=all|communities|posts
```

前端状态：

- V2 已接入搜索入口和搜索结果页。
- 已覆盖 scope 切换、URL query、loading、empty 和 error。

### 通知

```text
GET  /api/v1/notifications
POST /api/v1/notifications/:id/read
```

前端状态：

- V2 已接入通知入口、通知列表、未读状态、标记已读和跳转目标。

### 图片上传与存储

```text
POST /api/v1/uploads/images
```

后端还具备：

```text
阶段 13 文档边界：评论树、Markdown-like 正文、图片附件和 Cloudflare R2 存储
```

前端状态：

- V2 已接入图片上传。
- 发帖和评论提交 `attachment_ids`，详情页按正文内 `nexus-attachment` marker 和后端返回的 `attachments` 结构渲染图片。
- 前端不持有 R2 密钥，不浏览器直传对象存储。

## V2 验收范围

V2 完成必须覆盖以下前端能力：

1. Auth 基线不退化：注册、登录、当前用户、退出、受保护入口和 `next` 回跳保持可用。
2. 社区基线不退化：社区列表、公共社区详情、社区申请提交保持可用。
3. 社区申请审批：approve / reject 有 staff 入口和状态反馈。
4. 帖子基线不退化：发布、编辑、删除、详情、全站流、社区流保持可用。
5. 帖子排序：全站和社区帖子流支持 `new | hot`。
6. 评论基线不退化：根评论、子评论、编辑、删除、评论树保持可用。
7. 投票基线不退化：upvote、downvote、取消投票在列表和详情中状态一致。
8. Reddit Markdown：帖子和评论阅读态支持 Reddit-style Markdown，写作器支持常用格式动作。
9. 图片上传：发帖和评论写作器按后端合同接入图片上传和正文内图片展示。
10. 搜索：支持 `all | communities | posts` scope。
11. 通知：支持列表、未读和标记已读。
12. 举报：普通用户可举报帖子和评论。
13. 审核：staff 可查看举报列表、举报详情、dismiss 和 remove target。
14. 内容移除：有权限用户可从帖子和评论触发 moderation remove。

V2 不要求完成：

- 私信。
- 实时推送。
- 个性化推荐。
- 完整个人主页。
- 生产域名和公网发布。
- 任意 HTML、任意 iframe、浏览器直传对象存储。

## Milestone A：合同核对与 API client 补齐

目标：把后端已存在但前端未接入的接口先落到统一 API client 和类型边界。

交付：

- 搜索 API。
- 通知 API。
- 举报 API。
- 审核 API。
- 社区申请 approve / reject API。
- 图片上传 API。
- 帖子流 `sort=new|hot` 参数。
- 社区帖子流 `sort=new|hot` 参数。

完成标准：

- 所有新增调用都位于 `src/features/*/api.ts` 或既有统一 API 边界内。
- 不绕过 `lib/api`。
- 错误结构继续使用统一 `{ error: { code, message } }` 解析。
- 没有页面行为也必须通过 `npm run check:api-boundary`。

## Milestone B：Reddit Markdown 与写作器

目标：把当前纯文本 + spoiler 最小渲染推进到 Reddit-style Markdown 正文能力。

### B1 Renderer 方案确认

交付：

- 确认是否新增 `react-markdown`、`remark-gfm`、`rehype-sanitize`。
- 确认 Reddit spoiler、上标、自动链接是否需要自定义扩展。
- 更新依赖边界检查。
- 不改页面行为。

完成标准：

- 新增依赖用途、替代方案、影响范围写清楚。
- 依赖获得明确同意后再进入实现。
- `npm run check:docs` 通过。

### B2 帖子正文渲染

交付：

- `ContentBody` 接入安全 Markdown renderer。
- 帖子详情支持首版 Reddit Markdown。
- 旧纯文本帖子正常显示。
- spoiler 默认隐藏、可展开。

完成标准：

- 不渲染用户 HTML。
- 不绕过 `ContentBody`。
- 移动端表格、代码块和长链接不撑破页面。
- `check:content-boundary` 和 `check:content-segments` 同步更新并通过。

### B3 评论正文渲染

交付：

- 评论树复用同一个 `ContentBody`。
- 根评论和子评论支持同一正文格式能力。
- 评论树缩进和 Markdown 列表缩进不互相挤压。

完成标准：

- 折叠评论分支不破坏正文渲染。
- spoiler 状态不泄露隐藏文本。
- 桌面和移动端都可读。

### B4 写作器工具动作

交付：

- 发帖、根评论、回复评论复用同一套格式工具动作。
- 工具动作插入或包裹 Reddit Markdown 语法。
- 常用动作包括加粗、斜体、删除线、引用、代码、链接、涂黑、列表。
- 不强制编辑 / 预览双模式。

完成标准：

- 提交 payload 仍兼容当前后端 `body` 字段。
- loading、error、disabled 状态不退化。
- 移动端输入稳定。

## Milestone C：图片上传与正文图片展示

目标：接入 `POST /api/v1/uploads/images`，让帖子和评论支持图片。

交付：

- 发帖写作器上传图片。
- 评论写作器上传图片。
- 帖子详情展示图片附件。
- 评论树展示图片附件。
- 上传 loading、error、disabled 和失败降级状态。

完成标准：

- 上传必须走后端接口。
- 前端不持有 R2 密钥。
- 图片尺寸、数量、类型限制以后端为准。
- attachment 绑定字段和读取结构以实现前合同核对为准。
- 不破坏移动端评论树布局。

## Milestone D：内容发现

目标：让用户能找到内容，而不是只依赖最新流。

### D1 Feed 排序

交付：

- 首页帖子流支持 `new | hot`。
- 社区帖子流支持 `new | hot`。
- 查询状态进入 URL 或稳定 query key。
- 排序说明使用中文。

完成标准：

- 切换排序不破坏 empty/error 状态。
- TanStack Query key 明确区分排序参数。
- 投票后列表状态不明显错乱。

### D2 搜索体验

交付：

- 全站搜索入口。
- 搜索结果页。
- `all | communities | posts` scope 切换。
- loading、empty、error 和 query 参数同步。

完成标准：

- 搜索关键词和 scope 保留在 URL 中。
- 移动端搜索入口可用。
- 空关键词不发起无意义请求。

## Milestone E：通知与反馈闭环

目标：让用户知道内容后续发生了什么，并能处理明显违规内容。

### E1 通知中心

交付：

- 通知入口。
- 通知列表。
- 未读状态。
- 标记已读。
- 通知跳转目标。

完成标准：

- 回复、审核、系统消息的文案区分清楚。
- 没有通知时使用克制 empty 状态。
- 标记已读后本地缓存同步。

### E2 举报入口

交付：

- 帖子举报入口。
- 评论举报入口。
- 举报原因表单。
- 提交后 success 状态。

完成标准：

- 未登录用户进入登录门禁并保留 `next`。
- 失败状态明确，不让用户重复误提交。
- 举报动作不做成大按钮，优先用菜单或文字动作。

## Milestone F：审核与社区申请管理

目标：接入 staff 能力，补齐社区申请审批和举报审核。

### F1 社区申请审批

交付：

- 社区申请列表或审核入口，具体列表接口实现前核对。
- 申请详情读取。
- approve / reject 操作。
- staff-only 入口显隐。
- 审批成功反馈。
- 审批后社区 owner 成员关系由后端事务保证，前端只展示结果。

完成标准：

- 普通用户看不到 staff 审批入口。
- forbidden、empty、error 状态完整。
- 审批后相关 query 缓存失效。

### F2 举报审核台

交付：

- `GET /api/v1/moderation/reports` 列表。
- `GET /api/v1/moderation/reports/:id` 详情。
- 展示 `target_preview`。
- dismiss。
- remove-target。

完成标准：

- 普通用户看不到审核台入口。
- 列表、详情、操作成功和失败状态完整。
- 移除目标后列表和详情状态同步。

### F3 内容 moderation remove

交付：

- 有权限用户可从帖子详情触发 `POST /api/v1/posts/:id/moderation/remove`。
- 有权限用户可从评论节点触发 `POST /api/v1/comments/:id/moderation/remove`。

完成标准：

- 普通作者软删除和 staff moderation remove 在 UI 文案上区分清楚。
- 操作需要确认，不误触。
- 成功后目标内容降级显示或从列表移除，以后端返回为准。

## Milestone G：V2 收口

目标：把全部后端已具备能力前端接入后，做本地封版收口。

交付：

- README、`tasks.md` 和内部文档对齐；旧阶段目录只作为历史资料，不再作为前端执行边界。
- `check:main-path` 如不能覆盖新增接口，需要新增或扩展脚本。
- 浏览器 QA 覆盖桌面和移动端。

完成标准：

- V2 验收范围 14 项全部有证据。
- 没有被文档称为已实现但页面不可用的能力。
- deferred 项清晰记录。
- 当前状态：已完成本地初版收口；生产域名、生产 API origin、生产 CORS allowlist、发布后验证和回滚演练继续 deferred。

## 历史实施顺序

V2 初版按以下顺序推进：

1. A 合同核对与 API client 补齐。
2. B1 Reddit Markdown renderer 方案确认。
3. B2 帖子正文渲染。
4. B3 评论正文渲染。
5. B4 写作器工具动作。
6. C 图片上传与正文图片展示。
7. D1 Feed 排序。
8. D2 搜索体验。
9. E1 通知中心。
10. E2 举报入口。
11. F1 社区申请审批。
12. F2 举报审核台。
13. F3 内容 moderation remove。
14. G V2 收口。

V2 本地初版已经完成 G 收口，V2.1 已补齐社区申请审核台和 staff 入口显隐。Post-V2 正文图片产品化已完成前端限制提示、失败重试和正文图片移除提示。后续继续推进时，不再从 A 重新开始；只做内容系统产品化、生产 deferred 项和新的完整任务。

## V2 验收

文档任务至少运行：

```powershell
npm run check:docs
```

实现任务至少运行：

```powershell
npm run lint
npm run typecheck
npm run build
npm run check:actions
npm run check:api-boundary
npm run check:content-boundary
npm run check:content-segments
npm run check:copy
npm run check:dependencies
npm run check:docs
npm run check:ui-primitives
```

涉及后端主链路时追加：

```powershell
npm run check:main-path
npm run check:readiness
```

涉及 V2 新增后端能力时追加：

```powershell
npm run check:v2-path
```

`check:v2-path` 覆盖 `/me.is_platform_staff`、图片上传、附件提交、new/hot 排序、搜索、通知、举报、审核台、target_preview、dismiss、remove-target、moderation remove、社区申请列表、社区申请详情和 approve / reject。它会写入 smoke 数据，并依赖本地 PostgreSQL 容器提升测试用户为 staff，只用于本地或预发布验收。

涉及页面渲染时必须做浏览器 QA，至少覆盖：

- 桌面和移动端。
- 登录态和未登录态。
- loading、empty、error、success、disabled 状态。
- 返回首页、社区索引、帖子详情、审核台、搜索页和通知页等稳定出口。
- 控制台 error。
- 移动端横向溢出。

## V2 暂停条件

遇到以下情况必须暂停并回到文档或后端：

- 需要新增依赖但未获批准。
- 后端响应字段和文档不一致。
- 正文渲染需要放宽 HTML、iframe 或 `dangerouslySetInnerHTML` 禁区。
- 媒体能力需要前端持有对象存储密钥。
- 页面实现需要引入第二套 UI 库。
- 一个任务开始扩散成多个页面加大范围重构。

## Post-V2 下一步

V2 本地初版已经收口。后续不再把“G 收口”作为当前推进位，改为按完整任务处理：

1. 图片数量 / 类型 / 大小提示、失败重试和正文图片移除提示已完成前端产品化；缩略图 URL、未绑定对象物理删除 / TTL、失败对象回收和编辑态图片重绑继续以后端合同拆分。
2. 白名单 embed 的前端 canonical 裸链接播放器已落地；后端 resolve / 短链 / 元数据 / `embed.id` 合同已补齐，后续只接前端发布和编辑入口，以及普通网页链接预览、评论投票和通知事件源增强。
3. 拿到正式域名后，再处理生产 `NEXT_PUBLIC_SITE_URL`、生产 `NEXT_PUBLIC_API_BASE_URL`、生产 CORS allowlist、发布后验证和回滚演练。
