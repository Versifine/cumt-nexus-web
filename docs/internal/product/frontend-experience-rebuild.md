# 前端体验重修拆分方案

本文用于指导 `cumt-nexus-web` 后续从“功能能跑”推进到“真实用户愿意用”。它不是新的技术栈规划；它规定一种工作方式：用户看真实页面并给体验反馈，AI 负责把反馈翻译成可验证的完整任务，必要时可以大范围重构或重写前端结构。

整体页面拓扑、App Shell、URL、登录态边界、内容模型和后端目标合同以 `docs/internal/product/frontend-information-architecture.md` 为准。本文只负责把真实页面反馈拆成可执行体验任务。

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

用户反馈可以是粗粒度的。AI 必须负责把它拆成具体问题、文件范围、实现任务和验证方式。

### AI 负责

AI 必须按 `AGENTS.md` 的当前规则执行：用户目标明确时直接做完整闭环；只有新增依赖、改后端、破坏性操作、大量删除用户内容或高风险取舍时，才需要先说明文件范围、验收范围和风险。

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

后续不按文件夹从上到下遍历代码，而按用户路径拆分。每个任务都从一个真实页面或真实流程开始，由 AI 自动追踪到 `src/app/*`、`src/features/*`、`src/components/*` 和 `src/lib/*`。

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

非目标：

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

非目标：

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

建议修复任务：

- 新增或重构统一 `AppShell`，集中管理品牌、左侧栏目、移动端导航、顶部上下文区和用户菜单。
- 让首页、社区列表、搜索页、通知中心先接入同一 `AppShell`，作为第一批闭环。
- 后续再把社区详情、帖子详情、发帖、社区申请、审核台迁入同一骨架。
- `PageNav` 降级为“详情页返回上级”的局部组件，不能再承担主导航。

非目标：

- 不同时重做首页 feed 的数据和帖子列表体验。
- 不在同一任务里重修所有详情页和管理页。
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

非目标：

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

非目标：

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

非目标：

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

非目标：

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
- 用户在当前推荐页执行 upvote、downvote 或取消投票时，当前列表不能立刻重排、移除或跳走帖子；投票只更新该卡片的 vote 状态和计数，下一次显式刷新、切换排序或重新进入页面时再接受新的推荐顺序。

当前已发现的问题：

- 推荐页投票成功后会刷新帖子列表 query，后端重新按推荐 / 热度排序返回结果，导致卡片位置实时变化。
- 取消点赞时，帖子可能因为分数变化或推荐排序变化从当前页消失；这会让用户误以为操作删除了帖子或页面出错，属于严重浏览连续性问题。

非目标：

- 不重做帖子详情。
- 不新增推荐算法或统计卡。

建议修复任务：

- 投票成功后不要 invalidate 当前 feed 列表并立即重排；应只更新当前帖子卡片的 `my_vote`、`score`、`upvote_count` 和 `downvote_count`。
- 帖子详情 query 可以刷新，但当前列表页需要保持本次会话内的稳定顺序。
- 如果后端推荐流依赖投票行为实时改变排序，需要提供明确的 cursor / snapshot / refresh token 语义；前端只在用户主动刷新、切换排序、翻页或重新进入页面时采用新排序。

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

非目标：

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

非目标：

- 不实现社区设置或成员管理。
- 不伪造私密社区能力。

### C5：发帖页

路由：`/communities/[slug]/new`

页面类型：Form Page。

主要范围：

- `src/app/communities/[slug]/new/page.tsx`
- `src/features/post/post-form.tsx`
- `src/features/content/markdown-composer-field.tsx`
- `src/features/media/queries.ts`

体验目标：

- 标题、正文和图片附件的关系清楚。
- Markdown 工具动作作用于当前选区或当前块，不暴露源码编辑面。
- 图片上传中、失败、重试、移除和数量限制明确。
- 提交中禁用重复提交。
- 成功后跳到帖子详情或明确下一步。

非目标：

- 不实现编辑 / 预览双模式。
- 不新增后端未支持的结构化 `embed_ids` 持久化；canonical 白名单裸链接可以由前端受控播放器渲染。

### C6：帖子详情

路由：`/posts/[id]`

页面类型：Detail Page。

主要范围：

- `src/app/posts/[id]/page.tsx`
- `src/features/post/post-detail.tsx`
- `src/features/content/content-body.tsx`
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

建议修复任务：

- 在进入帖子详情前用 history、sessionStorage 或客户端 source state 记录来源，例如首页、全站、关注、社区、搜索、用户主页或收藏。
- 帖子详情根据来源渲染 `返回首页`、`返回全站`、`返回关注`、`返回社区`、`返回搜索结果` 等文案。
- 不在公开 URL 上暴露 `return_to`，也不接受任意外部 URL 作为返回目标。
- 如果来源缺失，使用帖子响应中的 `community.slug` fallback 到所属社区。

非目标：

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
- `src/features/content/markdown-composer-field.tsx`

体验目标：

- 根评论、回复、编辑和删除入口清楚。
- 评论树缩进在移动端可读。
- 折叠和展开不会让用户丢失上下文。
- 评论提交中、失败和成功反馈明确。
- 未登录用户知道登录后才能评论，并能保留回跳。

非目标：

- 不新增无限深视觉树。
- 不伪造评论投票。

### C8：媒体附件体验

页面类型：跨发帖、评论和详情。

实施细则见 `docs/internal/product/post-media-profile-rebuild.md`。本节只保留体验切片入口和关键验收边界；正文媒体块、列表页预览、详情页轮播、lightbox、外链播放器和图片比例分流的完整规则以该文档为准。

主要范围：

- `src/features/media/*`
- `src/features/post/post-form.tsx`
- `src/features/comment/comment-form.tsx`
- 帖子详情和评论树正文内图片展示。

体验目标：

- 上传限制在选择文件前后都可理解。
- 失败可以重试或取消。
- 移除正文图片后用户知道它不会随正文发布。
- 发帖和评论的图片数量上限不同，但表现一致。
- 图片展示不压垮正文阅读。
- 附件只作为资产存在；正文决定媒体出现的位置、顺序和分组。
- 详情页媒体必须在正文中间按作者排版出现，不再把图片统一堆在正文底部。
- 写作器支持插入单图块和图片轮播块：用户可以形成“文字 - 图片 1/2/3 轮播 - 文字 - 图片 4 - 文字 - 图片 6/7 轮播”的内容流。
- 白名单外链播放器也是正文媒体块：当正文中出现可播放的 Bilibili / 抖音 / 网易云 / QQ 音乐 canonical 链接时，详情页按当前位置渲染受控播放器。
- 列表页不完整复刻正文媒体流，只抽取第一个媒体块作为帖子预览；第一个媒体块是播放器就显示播放器，是图片组就显示图片预览器，没有媒体块再回退链接卡片和文字摘要。
- 旧帖子里只有附件但正文没有插入 marker 的内容不再做额外兼容；后续内容以正文媒体块为准。

正文媒体块建议：

```text
单图：![图片说明](nexus-attachment:<attachment_id>)
轮播：![图集说明](nexus-gallery:<attachment_id>,<attachment_id>,<attachment_id>)
播放器：正文中的白名单 canonical 外链，由渲染器识别为 embed block
```

列表页媒体规则：

- 最大高度：桌面 `420px`，移动端 `320px`。
- 普通图：`0.6 <= width / height <= 2.2`，正常预览，限制最大高度。
- 长图或截图：`width / height < 0.6`，列表裁成 `4:5` 或 `3:4`，显示“长图 / 点击查看完整图片”角标。
- 超宽图：`width / height > 2.2`，列表使用 `16:9` 或 `21:9` 容器，图片 `object-fit: contain`，背景使用深色。
- 小图：宽或高小于 `300px` 时不强行铺满，居中显示。
- 多图：列表最多展示 4 张，第 4 张显示 `+N`，点击进入帖子详情或灯箱。
- 列表页不得加载原图优先；有 `thumbnail_url` 时优先使用缩略图。

详情页媒体规则：

- 普通图按内容列宽完整显示。
- 长图默认限高 `80vh`，提供展开和进入灯箱的入口，避免默认把详情页拖成几十屏。
- 超宽图按宽度完整显示，必要时使用深色背景承托。
- 图片轮播块在正文中间显示为稳定播放器，支持上一张、下一张、序号和缩略导航。
- 点击任意图片进入 lightbox。

Lightbox 要求：

- 完整比例查看原图或后端提供的最高清展示图。
- 支持多图左右切换、键盘方向键、`Esc` 关闭。
- 支持缩放、拖拽、移动端滑动切换和双指缩放。
- 显示当前序号、图片说明和打开原图入口。
- 长图、超宽图和小图都必须能完整查看，不受列表或详情页裁切规则影响。

帖子预览验收口径：

- 列表页只展示正文里的第一个媒体块，不把正文后续图片完整铺开。
- 第一个媒体块是白名单播放器时，帖子卡片直接展示受控播放器预览。
- 第一个媒体块是单图或图片轮播时，帖子卡片展示受限高度的图片预览器。
- 正文没有媒体块时，才回退到普通链接卡片和正文摘要。
- 只有已绑定附件但正文没有 `nexus-attachment:` 或 `nexus-gallery:` marker 的旧内容，不再为列表或详情额外追加图片预览。
- 帖子卡片里的媒体预览必须能进入帖子详情；如果支持直接打开 lightbox，也不能阻断标题、评论数、投票和来源记录。

后端协议需求：

- 媒体块分组、列表缩略图、详情中图、原图和可播放 embed 的结构化读取需求记录在根目录 `backend-api-needs.md`。
- 前端实现前必须核对后端当前合同；后端未返回的衍生图、结构化 block 或 embed 元数据不能在 UI 中伪造成已完成能力。

非目标：

- 不直接删除对象存储文件。
- 不在前端做上传压缩、EXIF 清理、AVIF/WebP 转码或超大文件最终裁决；这些必须以后端或上传服务合同为准。
- 不允许任意 iframe、用户 HTML 或任意远程图片 URL。

### C9：公开用户主页和用户内容流

路由：

- `/users/[username]`
- `/users/[username]/posts`
- `/users/[username]/comments`

实施细则见 `docs/internal/product/post-media-profile-rebuild.md`。本节只保留体验切片入口；Twitter / X 式主栏、Reddit 式右侧上下文栏、帖子 / 评论 tab、评论上下文和移动端下沉规则以该文档为准。

页面类型：Detail Page / List Page。

主要范围：

- `src/app/users/[username]/*`
- `src/features/profile/*`
- 用户公开帖子列表和评论列表。
- 帖子列表项和评论列表项共享的预览组件。

体验目标：

- 个人主页主栏借鉴 Twitter / X 的个人页信息结构：顶部用户身份区、紧凑资料、统计、内容 tab 和连续内容流。
- `/posts` 和 `/comments` 不是两个突兀按钮；它们应表现为同一主页主栏里的 tab / segmented navigation，当前 tab 高亮，切换后仍保留主页语境。
- 用户帖子流复用全站帖子卡片规则，包括正文首个媒体块预览、投票、评论数、收藏和来源记录。
- 用户评论流不把 `post_id` 当作正文内容展示；每条评论应像时间线条目一样显示评论正文、所在帖子、所在社区和进入原帖的稳定入口。
- 右侧栏目学习 Reddit 的上下文栏：用户简介、徽章、公开统计、常发社区、账号公开状态和相关入口；不做开发状态面板，也不塞无后端支持的统计卡。
- 未登录用户可以查看公开主页、公开帖子和公开评论；需要登录的动作只在动作处引导登录。
- 移动端使用单列：用户身份区、tab 和内容流优先，右侧上下文下沉到主内容下方。

右侧栏目建议：

- `关于`：头像、昵称、用户名、签名、简介和公开角色。
- `公开统计`：帖子数、评论数、收到的公开互动计数；没有后端字段时不伪造。
- `常见社区`：用户公开发帖或评论过的社区摘要；没有后端字段时先不展示。
- `内容入口`：帖子、评论、收藏等仅展示后端已支持且权限允许的入口；公开主页不展示私密账号设置。

后端协议需求：

- 用户主页右侧栏、用户评论上下文和用户帖子列表媒体预览所需字段记录在根目录 `backend-api-needs.md`。
- 如果后端暂时只返回 `post_id`，前端只能提供稳定的“查看原帖”入口，不能伪造帖子标题、社区 slug 或评论锚点。

非目标：

- 不实现个人资料编辑。
- 不实现关注用户、私信或粉丝列表。
- 不展示私密邮箱、后台权限细节或未公开统计。
- 不把个人主页做成营销 profile card 或孤立的个人中心。

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
- 未登录用户可以进入搜索页并发起公开搜索；不能把搜索页做成登录墙。
- query 和 scope 同步到 URL。
- 空关键词不发起无意义请求。
- loading、empty、error 和结果跳转清楚。
- 移动端搜索框和 tabs 不挤压。

后端合同前置条件：

- `GET /api/v1/search?q=...&scope=all|communities|posts` 应支持可选 Bearer。
- 无 token 时返回 active public 社区和 visible public 帖子。
- 有有效 token 时可以返回当前用户视角；无效 token 仍返回 `unauthenticated`，不要静默降级。
- 当前后端已把搜索注册在 public read + optional Bearer 分组；前端按公开读取调用，不伪造评论搜索、高亮、排序或扩展结果类型。

非目标：

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

非目标：

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

非目标：

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

非目标：

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

非目标：

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

非目标：

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

非目标：

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

非目标：

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

非目标：

- 不用脚本结果替代所有人工体验判断。
- 不把没有浏览器证据的路径写成已验证。

## 单次任务模板

后续用户可以直接用下面模板派工：

```text
按 docs/internal/product/frontend-experience-rebuild.md 做一个体验重修任务。

目标页面或路径：
[填写页面，例如 /posts/[id] 评论区]

我的体验反馈：
1. [填写看到的问题]
2. [填写看到的问题]
3. [填写看到的问题]

要求：
- 先核对当前状态，确认风险后直接实施。
- 按 P0/P1/P2 分类问题。
- 高风险时说明准备读取和修改哪些文件、验收范围和风险。
- 涉及后端接口时先核对当前合同。
- 目标明确时直接实现。
- 完成后运行必要验证，并做桌面和移动端浏览器检查。
```

如果用户已经明确要直接修改，可以使用：

```text
按 docs/internal/product/frontend-experience-rebuild.md 修 [页面或路径]。
我的反馈是：[填写问题]。
本轮围绕这个目标完整处理；如果需要跨页面、共享组件或整体重构，可以一起改。
不要改后端实现；需要后端补什么写进文档。
```

## 单次任务交付标准

每次体验重修完成后，AI 必须汇报：

- 改了什么。
- 修改或新增了哪些文件。
- 解决了哪些用户体验问题。
- 没解决哪些问题，为什么留到后续任务。
- 运行了哪些验证命令。
- 浏览器检查了哪些页面、桌面或移动端断点。
- 是否新增依赖；原则上不新增。

## 验证基线

文档任务至少运行：

```powershell
npm run check:docs
```

普通页面任务至少运行：

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
10. 公开用户主页和用户内容流。
11. 搜索页。
12. 通知中心。
13. 社区申请提交。
14. 社区申请审核台。
15. 举报入口。
16. 审核台和举报详情。
17. 全局错误、404 和 loading。
18. 全站浏览器 QA。

当前如果工作区已经有未提交功能改动，必须先收口或明确冻结这些改动，再开始新的体验重修任务，避免多个页面问题叠在一起。
