# 前端体验重修拆分方案

本文用于指导 `cumt-nexus-web` 后续从“功能能跑”推进到“真实用户愿意用”。它不是新的技术栈规划，也不是大范围重构计划；它规定一种工作方式：用户看真实页面并给体验反馈，AI 负责把反馈翻译成可验证的小切片，再按代码边界实施。

整体页面拓扑、App Shell、URL、登录态边界、内容模型和后端目标合同以 `docs/internal/product/frontend-information-architecture.md` 为准。本文只负责把真实页面反馈拆成可执行体验切片。

## 目标

当前前端已经接入了大量后端能力，但上线标准不能只看接口、构建和脚本是否通过。上线前必须让主要页面满足以下条件：

- 用户进入页面后知道自己在哪里。
- 用户知道当前最重要的下一步是什么。
- loading、empty、error、success 和 disabled 状态都可理解、可恢复。
- 未登录、会话失效和权限不足不会让用户迷路。
- 移动端能读、能点、没有横向溢出。
- 页面信息不吵、不乱、不伪装后端没有的能力。
- 视觉仍符合 `dark editorial product / magazine-grade campus community interface`，不重新选择审美方向。

## 工作角色

### 用户负责

用户不需要懂前端文件、React 或 Tailwind。用户只负责从真实页面体验出发给反馈，例如：

- 这里我不知道该点哪里。
- 这个按钮看起来像主操作，但其实不是。
- 这里状态像报错，但我不知道怎么恢复。
- 移动端这块挤在一起。
- 这个文案看不懂。
- 这个流程跳转后让我迷路。
- 这里信息太多，真正重要的东西被淹没了。

用户反馈可以是粗粒度的。AI 必须负责把它拆成具体问题、文件范围、实现切片和验证方式。

### AI 负责

AI 每次必须先按 `AGENTS.md` 阅读当前相关约束，并在改动前说明：

- 准备审查和修改哪些文件。
- 每个文件为什么需要看或改。
- 本切片完成边界。
- 本切片明确不做什么。
- 是否需要重新核对后端接口和响应结构。

AI 不能要求用户提供组件级实现方案。用户说“反人类”时，AI 要把它翻译成可执行分类，例如：

- 信息层级错误。
- 主操作不明确。
- 状态反馈不足。
- 入口隐藏过深。
- 未登录和登录态体验断裂。
- 移动端布局不可用。
- 错误文案不可操作。
- 组件视觉不一致。

## 优先级定义

### P0：阻塞上线

满足任一条件即为 P0：

- 主流程无法完成，例如不能登录、不能发帖、不能评论、不能进入详情。
- 用户无法判断下一步，导致流程实际不可用。
- 未登录、会话失效或权限不足时出现重复错误、接口噪音或无出口页面。
- 表单提交、上传、投票、审批等操作缺少明确失败恢复方式。
- 移动端横向溢出、关键内容不可读或触控目标难以点击。
- 页面展示后端未完成能力，造成产品误导。
- 用户敏感信息可能出现在 URL、错误面板或不该出现的位置。

### P1：明显影响使用

满足任一条件即为 P1：

- 主操作和次级操作视觉权重混乱。
- loading、empty、error、success 或 disabled 状态存在，但文案或布局不清楚。
- 页面信息密度失衡，用户需要反复扫读才能找到关键内容。
- 列表、详情、表单或审核页的入口和返回路径不稳定。
- 组件风格分裂，例如同类状态、数据块、文字动作表现不一致。
- 移动端可用但阅读和操作成本明显偏高。

### P2：打磨项

满足任一条件即为 P2：

- 微文案还可以更短、更具体。
- 动效、hover、focus 或布局节奏可以更精细。
- 次要信息排序可以优化。
- 页面已经可用，但还不够顺滑或不够有产品质感。

## 总体拆分

后续不按文件夹从上到下遍历代码，而按用户路径拆分。每个切片都从一个真实页面或真实流程开始，由 AI 自动追踪到 `src/app/*`、`src/features/*`、`src/components/*` 和 `src/lib/*`。

```text
A. 基础体验底座
B. 账号与登录态
C. 社区与内容主链路
D. 发现、通知、申请和审核
E. 全局收口与上线验收
```

## A. 基础体验底座

### A1：设计系统和基础组件巡检

页面类型：跨页面基础件。

主要范围：

- `src/app/globals.css`
- `src/components/ui/*`
- `src/components/feedback/*`
- `src/components/app-shell/*`

体验目标：

- Button 只用于真实命令。
- 普通导航和次级动作优先使用 `TextAction`。
- loading、empty、error 状态组件有稳定中文文案和出口。
- `MetricBlock`、`InfoRow`、`StatusToken` 等数据展示基础件不重复造。
- 组件风格符合暗色 editorial product，而不是默认 SaaS 卡片堆叠。

本切片不做：

- 不重写设计系统。
- 不换 UI 库。
- 不引入新依赖。
- 不同时重做具体业务页面。

### A2：API、登录态和缓存底座巡检

页面类型：跨页面数据状态。

主要范围：

- `src/lib/api/*`
- `src/lib/auth/*`
- `src/lib/query/*`
- `src/app/providers.tsx`
- `src/features/auth/*`

体验目标：

- `401 unauthenticated` 后清理 token 和缓存。
- 页面不会从旧缓存展示受保护数据。
- 统一错误结构能转换成用户可理解的中文反馈。
- 页面和组件不绕过统一 API client。

本切片不做：

- 不改后端接口。
- 不新增临时 fetch。
- 不伪造权限或业务状态。

### A3：App Shell 和全局导航

页面类型：Dashboard shell。

主要范围：

- `src/app/layout.tsx`
- `src/components/app-shell/page-nav.tsx`
- `src/components/app-shell/home-shell.tsx`
- 依赖当前用户状态的入口显隐。

体验目标：

- 用户始终知道如何回首页、社区、搜索、通知和关键工作区。
- 首页、社区、搜索、通知、审核、社区申请等主工作区必须共享同一套 App Shell，不允许每个页面各自做一套顶栏和导航。
- 桌面端左侧栏目应稳定存在并高亮当前路由；如果未来支持收起，收起和展开必须是同一套导航状态，而不是页面之间结构漂移。
- 移动端左侧栏目应统一收起成同一个导航入口，打开后仍使用同一组栏目和顺序。
- 顶部 bar 只承载当前页面上下文、搜索/登录/用户菜单等全局动作；不要在首页一套 sticky bar、其他页面一套 `PageNav` 横排按钮。
- staff-only 入口只在有权限时出现。
- 退出登录后不会留下旧数据。
- 移动端导航可读、可点、不挤压内容。

当前已发现的问题：

- `HomeShell` 自带桌面左侧栏和 sticky 顶栏。
- 社区列表、搜索页、通知页等页面使用 `PageNav` 做横向顶部导航，没有复用首页左侧栏目结构。
- 结果是用户在首页、社区、搜索、通知之间切换时，导航位置、视觉权重和页面骨架都变化，像进入了不同产品。

建议修复切片：

- 新增或重构统一 `AppShell`，集中管理品牌、左侧栏目、移动端导航、顶部上下文区和用户菜单。
- 让首页、社区列表、搜索页、通知中心先接入同一 `AppShell`，作为第一批闭环。
- 后续再把社区详情、帖子详情、发帖、社区申请、审核台迁入同一骨架。
- `PageNav` 降级为“详情页返回上级”的局部组件，不能再承担主导航。

本切片不做：

- 不同时重做首页 feed 的数据和帖子列表体验。
- 不在同一切片里重修所有详情页和管理页。
- 不新增第二套 sidebar 或导航组件。
- 不新增不存在的个人中心或设置页。

## B. 账号与登录态

### B1：登录页

路由：`/login`

页面类型：Auth Page。

主要范围：

- `src/app/login/page.tsx`
- `src/features/auth/login-form.tsx`
- `src/features/auth/redirect.ts`

体验目标：

- 用户明确知道这里是登录。
- 字段校验贴近字段。
- 提交中按钮 disabled，不能重复提交。
- 登录失败有可理解原因和恢复方式。
- 登录成功按安全 `next` 回跳。
- 登录和注册切换不丢失 `next`。

本切片不做：

- 不增加社交登录占位。
- 不改 token 存储方案。

### B2：注册页

路由：`/register`

页面类型：Auth Page。

主要范围：

- `src/app/register/page.tsx`
- `src/features/auth/register-form.tsx`
- `src/features/auth/redirect.ts`

体验目标：

- 用户明确知道用户名和密码要求。
- 用户名冲突、字段错误和提交失败能恢复。
- 注册成功后进入正确下一步。
- 切到登录时保留安全 `next`。

本切片不做：

- 不新增邮箱、头像或资料编辑。
- 不伪造后端未提供的账号能力。

### B3：未登录门禁统一

页面类型：跨页面 auth gate。

主要范围：

- `src/features/auth/auth-required.tsx`
- 社区详情、帖子详情、发帖页、社区申请页、评论和投票入口。

体验目标：

- 未登录用户看到的是门禁和清楚出口，不是接口报错。
- 登录和注册入口保留当前页面 `next`。
- 未登录状态不请求不必要的受保护接口。
- 会话失效后页面能回到稳定门禁。

本切片不做：

- 不新增权限系统。
- 不修改后端认证规则。

## C. 社区与内容主链路

### C1：未登录首页

路由：`/`

页面类型：Landing Page / Dashboard Page。

主要范围：

- `src/app/page.tsx`
- `src/components/app-shell/home-shell.tsx`
- 首页依赖的 auth 和 feed query。

体验目标：

- 未登录用户也能看到公开信息流，并能打开公开帖子阅读正文。
- 未登录用户不会看到需要登录的错误面板。
- 页面说明 CUMT Nexus 是什么，但不做营销 hero。
- 登录、注册、社区入口和稳定出口清楚；投票、评论、发帖等写动作继续引导登录。
- 移动端首屏不拥挤。

后端合同前置条件：

- `GET /api/v1/posts?sort=new|hot&limit=...&offset=...` 应支持匿名读取 active public 社区的 visible 帖子。
- `GET /api/v1/posts/:id` 应支持匿名读取 visible 帖子详情。
- 如后续社区详情也要未登录直接看帖子，`GET /api/v1/communities/:slug/posts?sort=new|hot&limit=...&offset=...` 也应支持匿名读取。
- 上述读取接口应支持可选 Bearer：无 token 时返回公开数据且 `my_vote=0`；有有效 token 时返回当前用户 `my_vote`；有格式错误或无效 token 时仍返回 `unauthenticated`，避免静默降级。
- 写操作仍必须保持 Bearer，包括发帖、评论、投票、举报、编辑、删除、审核和上传。
- 前端在这些后端合同补齐前不能伪造信息流；只能保留当前登录门禁或把该项记录为后端前置缺口。

本切片不做：

- 不伪造公共总 feed。
- 不新增宣传型大图或装饰背景。

### C2：登录后首页 feed

路由：`/`

页面类型：Dashboard Page。

主要范围：

- `src/components/app-shell/home-shell.tsx`
- `src/features/post/queries.ts`
- 帖子列表和排序入口。

体验目标：

- 登录后直接看到最新或热门讨论。
- `new | hot` 切换状态明确。
- loading、empty、error 都有下一步。
- 右侧栏只放对用户有用的上下文，不做开发状态面板。
- 移动端单列可扫读。

本切片不做：

- 不重做帖子详情。
- 不新增推荐算法或统计卡。

### C3：社区列表

路由：`/communities`

页面类型：List Page。

主要范围：

- `src/app/communities/page.tsx`
- `src/features/community/community-list.tsx`
- `src/features/community/queries.ts`

体验目标：

- 用户能快速扫读社区。
- 页面必须接入统一 App Shell，左侧栏目和顶部 bar 与首页保持一致。
- 社区 slug、名称、说明和进入动作层级清楚。
- 没有社区、加载失败、重试和申请入口状态完整。
- 移动端列表不变成巨大宣传卡。

本切片不做：

- 不新增复杂筛选。
- 不伪造成员数或统计字段。

### C4：社区详情

路由：`/communities/[slug]`

页面类型：Detail Page / List Page。

主要范围：

- `src/app/communities/[slug]/page.tsx`
- `src/features/community/community-detail.tsx`
- 社区帖子 query 和发帖入口。

体验目标：

- 用户明确当前社区、社区信息和帖子列表关系。
- new/hot 切换不破坏 empty/error。
- 未登录状态有稳定门禁。
- 发帖入口显眼但不过度抢视觉。
- 移动端右侧上下文下沉后仍可读。

本切片不做：

- 不实现社区设置或成员管理。
- 不伪造私密社区能力。

### C5：发帖页

路由：`/communities/[slug]/new`

页面类型：Form Page。

主要范围：

- `src/app/communities/[slug]/new/page.tsx`
- `src/features/post/post-form.tsx`
- `src/features/content/markdown-toolbar.tsx`
- `src/features/media/media-attachments.tsx`

体验目标：

- 标题、正文和图片附件的关系清楚。
- Markdown 工具动作不喧宾夺主。
- 图片上传中、失败、重试、移除和数量限制明确。
- 提交中禁用重复提交。
- 成功后跳到帖子详情或明确下一步。

本切片不做：

- 不实现编辑 / 预览双模式。
- 不新增后端未支持的 embed。

### C6：帖子详情

路由：`/posts/[id]`

页面类型：Detail Page。

主要范围：

- `src/app/posts/[id]/page.tsx`
- `src/features/post/post-detail.tsx`
- `src/features/content/content-body.tsx`
- `src/features/media/media-attachments.tsx`
- `src/features/vote/vote-control.tsx`

体验目标：

- 用户能先读正文，再看投票、作者动作、举报和上下文。
- 帖子详情必须有来源感知的返回策略：从首页信息流进入时返回信息流；从社区进入时返回对应社区；从搜索进入时返回搜索结果并保留 query；来源未知时返回所属社区。
- 全局导航由统一 App Shell 负责，详情页局部返回只负责回到合理来路，不能硬编码为 `返回社区索引`。
- Markdown、长链接、代码块、表格和图片不撑破移动端。
- 投票 pending 和失败状态明确。
- 作者编辑、作者删除、审核移除和举报在文案上区分。
- not found、error、未登录门禁都有稳定出口。
- 返回来源不写进公开 URL 的 `return_to` query；优先使用 history、sessionStorage 或客户端 source state。

当前已发现的问题：

- `PostDetail` 使用 `PageNav backHref="/communities" backLabel="返回社区索引"`。
- 当用户从首页信息流点进帖子时，该返回入口会把用户带到社区索引，而不是回到刚才的信息流。
- 这会破坏浏览连续性，尤其在首页、搜索和社区详情都能进入帖子详情后，单一硬编码返回目标会越来越不合理。

建议修复切片：

- 在进入帖子详情前用 history、sessionStorage 或客户端 source state 记录来源，例如首页、全站、关注、社区、搜索、用户主页或收藏。
- 帖子详情根据来源渲染 `返回首页`、`返回全站`、`返回关注`、`返回社区`、`返回搜索结果` 等文案。
- 不在公开 URL 上暴露 `return_to`，也不接受任意外部 URL 作为返回目标。
- 如果来源缺失，使用帖子响应中的 `community.slug` fallback 到所属社区。

本切片不做：

- 不重做评论树。
- 不新增评论投票。

### C7：评论区

路由：`/posts/[id]`

页面类型：Detail Page related list。

主要范围：

- `src/features/comment/comment-form.tsx`
- `src/features/comment/comment-tree.tsx`
- `src/features/comment/comment-lifecycle-controls.tsx`
- `src/features/content/content-body.tsx`
- `src/features/media/media-attachments.tsx`

体验目标：

- 根评论、回复、编辑和删除入口清楚。
- 评论树缩进在移动端可读。
- 折叠和展开不会让用户丢失上下文。
- 评论提交中、失败和成功反馈明确。
- 未登录用户知道登录后才能评论，并能保留回跳。

本切片不做：

- 不新增无限深视觉树。
- 不伪造评论投票。

### C8：媒体附件体验

页面类型：跨发帖、评论和详情。

主要范围：

- `src/features/media/*`
- `src/features/post/post-form.tsx`
- `src/features/comment/comment-form.tsx`
- 帖子详情和评论树附件展示。

体验目标：

- 上传限制在选择文件前后都可理解。
- 失败可以重试或取消。
- 移除待提交附件后用户知道它不会随正文发布。
- 发帖和评论的图片数量上限不同，但表现一致。
- 图片展示不压垮正文阅读。

本切片不做：

- 不直接删除对象存储文件。
- 不实现缩略图 URL，除非后端合同已补齐。

## D. 发现、通知、申请和审核

### D1：搜索页

路由：`/search`

页面类型：List Page。

主要范围：

- `src/app/search/page.tsx`
- `src/features/search/*`

体验目标：

- 用户知道搜索范围是全部、社区还是帖子。
- 页面必须接入统一 App Shell，左侧栏目和顶部 bar 与首页、社区页保持一致。
- query 和 scope 同步到 URL。
- 空关键词不发起无意义请求。
- loading、empty、error 和结果跳转清楚。
- 移动端搜索框和 tabs 不挤压。

本切片不做：

- 不新增评论搜索、高亮或复杂排序。
- 不伪造后端不存在的结果类型。

### D2：通知中心

路由：`/notifications`

页面类型：List Page。

主要范围：

- `src/app/notifications/page.tsx`
- `src/features/notification/*`

体验目标：

- 页面必须接入统一 App Shell，左侧栏目和顶部 bar 与首页、社区页、搜索页保持一致。
- 全部、未读、已读视图清楚。
- 通知类型文案可理解。
- 标记已读后本地状态同步。
- 没有通知时给出克制下一步。
- 跳转目标保守，不把用户带到不存在页面。

本切片不做：

- 不实现实时推送。
- 不伪造未接入的通知事件源。

### D3：社区申请提交

路由：`/community-applications/new`

页面类型：Form Page。

主要范围：

- `src/app/community-applications/new/page.tsx`
- `src/features/community/community-application-form.tsx`

体验目标：

- 用户知道申请创建社区需要填什么。
- 提交失败和成功后的下一步清楚。
- 未登录状态有登录 / 注册和 `next` 回跳。
- 表单字段错误贴近字段。

本切片不做：

- 不实现申请取消。
- 不伪造审核进度通知。

### D4：社区申请审核台

路由：`/community-applications/review`

页面类型：Dashboard Page / List Page。

主要范围：

- `src/app/community-applications/review/page.tsx`
- `src/features/community/community-application-review.tsx`
- `src/features/community/api.ts`

体验目标：

- staff 能按状态查看申请列表。
- 申请详情、approve、reject 和拒绝原因清楚。
- 操作成功后列表和详情状态同步。
- 普通用户看不到入口，直接访问时有 forbidden 状态。
- 移动端审核操作不挤在一起。

本切片不做：

- 不绕过后端 staff 权限。
- 不伪造申请人资料。

### D5：举报入口

页面类型：Dialog / detail action。

主要范围：

- `src/features/moderation/report-content-dialog.tsx`
- 帖子详情和评论节点中的举报入口。

体验目标：

- 举报入口不抢主阅读注意力。
- 举报原因表单短、明确、可提交。
- 提交后 success 状态阻止重复误提交。
- 未登录用户被引导登录并保留回跳。

本切片不做：

- 不把举报做成大按钮。
- 不新增举报分类，除非后端支持。

### D6：审核台和举报详情

路由：`/moderation`、`/moderation/reports/[id]`

页面类型：Dashboard Page / Detail Page。

主要范围：

- `src/app/moderation/page.tsx`
- `src/app/moderation/reports/[id]/page.tsx`
- `src/features/moderation/*`

体验目标：

- staff 能扫读举报列表。
- 举报详情中的 `target_preview`、状态、来源和操作关系清楚。
- dismiss 和 remove target 的后果明确。
- forbidden、empty、error 和操作失败状态完整。
- 移动端详情和操作区不互相挤压。

本切片不做：

- 不新增审核规则配置。
- 不伪造审核统计。

## E. 全局收口与上线验收

### E1：全局错误、404 和 loading

页面类型：Global states。

主要范围：

- `src/app/error.tsx`
- `src/app/not-found.tsx`
- `src/app/loading.tsx`
- `src/components/feedback/*`

体验目标：

- 全局错误页不暴露技术细节。
- 404 有首页、社区和相关稳定出口。
- loading 使用骨架或稳定布局，不造成明显跳动。
- 所有文案保持中文。

本切片不做：

- 不把错误页做成营销页。
- 不新增复杂插画。

### E2：公开入口、metadata 和健康检查

页面类型：Public shell / deployment support。

主要范围：

- `src/app/robots.ts`
- `src/app/sitemap.ts`
- `src/app/manifest.ts`
- `src/app/healthz/route.ts`
- `src/app/readyz/route.ts`
- `next.config.ts`

体验目标：

- 公开入口和基础元信息不误导。
- 健康检查能区分前端自身和后端就绪。
- 安全响应头保持基础防护。

本切片不做：

- 不配置生产域名，除非已经拿到真实域名。
- 不开启严格 CSP，除非资源来源已确认。

### E3：全站浏览器 QA

页面类型：验收流程。

主要范围：

- `docs/internal/engineering/browser-qa.md`
- 真实浏览器桌面和移动端。

体验目标：

- 桌面和移动端走完主路径。
- 每个页面检查 loading、empty、error、success、disabled。
- 控制台没有 error。
- 没有横向溢出。
- 登录态、未登录态和权限不足都覆盖。

本切片不做：

- 不用脚本结果替代所有人工体验判断。
- 不把没有浏览器证据的路径写成已验证。

## 单次切片模板

后续用户可以直接用下面模板派工：

```text
按 docs/internal/product/frontend-experience-rebuild.md 做一个体验重修切片。

目标页面或路径：
[填写页面，例如 /posts/[id] 评论区]

我的体验反馈：
1. [填写看到的问题]
2. [填写看到的问题]
3. [填写看到的问题]

要求：
- 先审查，不急着改。
- 按 P0/P1/P2 分类问题。
- 说明准备读取哪些文件、准备修改哪些文件、完成边界和本次不做什么。
- 涉及后端接口时先核对当前合同。
- 确认边界后再实现。
- 完成后运行必要验证，并做桌面和移动端浏览器检查。
```

如果用户已经明确要直接修改，可以使用：

```text
按 docs/internal/product/frontend-experience-rebuild.md 修 [页面或路径]。
我的反馈是：[填写问题]。
本轮只修这个切片，不扩大到其他页面，不新增依赖。
改动前先说明文件范围、完成边界和本次不做什么。
```

## 单次切片交付标准

每次体验重修完成后，AI 必须汇报：

- 改了什么。
- 修改或新增了哪些文件。
- 解决了哪些用户体验问题。
- 没解决哪些问题，为什么留到后续切片。
- 运行了哪些验证命令。
- 浏览器检查了哪些页面、桌面或移动端断点。
- 是否新增依赖；原则上不新增。

## 验证基线

文档切片至少运行：

```powershell
npm run check:docs
```

普通页面切片至少运行：

```powershell
npm run lint
npm run typecheck
npm run check:actions
npm run check:api-boundary
npm run check:copy
npm run check:ui-primitives
```

涉及用户内容、Markdown 或附件时追加：

```powershell
npm run check:content-boundary
npm run check:content-segments
```

涉及真实后端主链路时追加：

```powershell
npm run check:main-path
npm run check:v2-path
npm run check:readiness
```

涉及公开路由和入口时追加：

```powershell
npm run check:routes
```

浏览器 QA 必须按页面实际风险选择桌面和移动端断点。只跑脚本不能证明体验已经上线可用。

## 推进顺序建议

建议先按真实用户主路径推进，不从边角管理页开始：

1. 未登录首页。
2. 登录页和注册页。
3. 登录后首页 feed。
4. 社区列表。
5. 社区详情。
6. 发帖页。
7. 帖子详情。
8. 评论区。
9. 媒体附件体验。
10. 搜索页。
11. 通知中心。
12. 社区申请提交。
13. 社区申请审核台。
14. 举报入口。
15. 审核台和举报详情。
16. 全局错误、404 和 loading。
17. 全站浏览器 QA。

当前如果工作区已经有未提交功能改动，必须先收口或明确冻结这些改动，再开始新的体验重修切片，避免多个页面问题叠在一起。
