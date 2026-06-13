# 前端规划落地摸排

日期：2026-06-07
更新：2026-06-10

本文回答“之前的前端规划完成了多少”。结论先写清楚：规划文档已经收口，但实现没有完全达到规划和上线体验要求。`tasks.md`、`v2-roadmap.md` 中的 `DONE` 只能说明当时的脚本和局部验收通过，不能等同于所有页面体验已经可上线。

本次摸排依据：

- 静态扫描 `src/app` 路由、`src/components/app-shell`、`src/features/*`。
- 代码核对 `AppShell`、`HomeShell`、`PostSort`、`SearchPage`、`NotificationCenter`、`PublicUserProfile`、`ContentBody`、`MarkdownComposerField`。
- 浏览器抽查首页、一条已有图片帖子、`check:v2-path` 新建的正文内图片 marker smoke 帖子，以及 UI 发帖 / 评论 / 回复 / 编辑弹窗。
- 本次不是完整桌面 / 移动端人工 QA，不覆盖全部页面点击验证。

## 总体结论

当前前端不是“完全没做”，但也不是“规划已经全部落地”。更准确的状态是：

- App Shell、基础路由、顶部搜索、顶部通知入口、头像菜单、最近访问社区、个人主页基础壳已经落地。
- 未登录公开读取在前端意图上已经打开；搜索、首页、社区详情、帖子详情和评论读取都必须继续与后端 optional Bearer / 公开读取合同保持一致。
- 帖子和评论 Markdown / 图片一体化已补齐统一入口；发帖、评论、回复、帖子编辑、评论编辑都复用同一 Tiptap 实时渲染写作器。发帖、评论发布和帖子 / 评论编辑都会提交正文引用到的 `attachment_ids`，正文内容仍以 Markdown 提交给后端。
- Feed 规划仍未完整落地：前端已有 `best | hot | new | top | rising` 和推荐 / 全站 / 关注 source 的 URL / UI 基础；本地运行时已证明帖子五种排序可用。当前后端合同确认 `source=recommended|all`，关注流入口保留但不请求或展示普通公开帖子，避免伪造关注内容。
- 保存收藏链路已接入当前后端合同；帖子列表和详情可以收藏 / 取消收藏，用户菜单进入 `/saved` 查看真实账号收藏列表。
- 通知中心已按后端 `category` / `status` / `unread-summary` / `read-all` 合同接入：回复、@、赞、系统分类、分类未读摘要和全部标记已读都走真实接口；`/notifications/replies`、`/notifications/mentions`、`/notifications/likes`、`/notifications/system` 分类 URL 已落地并复用同一通知中心。前端已集中解析现有 `source_type/source_id`：帖子、社区和举报可直达，评论通知不会误链到错误页面，而是明确提示后端尚未返回所属帖子 ID。后续剩余风险主要是评论 target 精度和审核 / 社区申请类事件覆盖。
- 积分特效和个性化推荐没有落地；链接预览已有前端保守链接卡，后端网页元数据解析缓存仍未接入；评论投票已复用统一 Reddit 投票控件接入当前后端合同；Bilibili / 抖音 / 网易云 / QQ 音乐 canonical 裸链接白名单 embed 已在前端阅读态和写作器编辑态落地，后端结构化 resolve、短链和 `embed.id` 持久化已补齐。

## 落地矩阵

| 能力 | 当前代码事实 | 判定 | 后续处理 |
| --- | --- | --- | --- |
| 全局 App Shell | `src/components/app-shell/app-shell.tsx` 提供左侧首页 / 社区、最近访问、顶部搜索、通知 bell、头像菜单；主要页面已包 `AppShell`。 | 已落地，仍需全站视觉 QA。 | 后续反馈按具体页面任务调整，不重建第二套导航。 |
| 全局错误、404 和 loading | `src/app/error.tsx`、`src/app/not-found.tsx` 和 `src/app/loading.tsx` 已落地；错误页复用 `StatusPage` 和重试动作，不暴露 digest / 错误标识；404 复用 `StatusPage`，保留返回最新讨论和社区索引出口；页面级 loading 使用 App Shell 风格 Skeleton 骨架。`check:ui-primitives` 已固化全局状态页边界，`check:routes` 覆盖 404 中文文案和稳定出口。 | 基础落地。 | 仍需在完整浏览器 QA 中检查真实错误边界触发、移动端无横向溢出和 loading 水合后的视觉稳定性。 |
| 搜索入口 | 顶部搜索输入不会点击即跳转，提交后进入 `/search?q=...&scope=all`；搜索页有 `all | communities | posts`；`GET /api/v1/search` 已按 public + optional Bearer 合同接入，前端使用公开读取并禁止旧搜索登录墙 / 不可用面板回归。 | 公开搜索合同已落地。 | 如需 Reddit 式联想、快捷搜索、评论搜索、高亮或排序，需要单独任务和后端合同。 |
| 通知入口 | 通知不在左侧栏，顶部 bell 进入 `/notifications`；未登录会跳登录。 | 入口落地。 | 通知中心分类、未读和全部已读已接入；后续按 target 精度和全站视觉 QA 继续打磨。 |
| 通知中心 | `NotificationCenter` 已接入 `GET /api/v1/notifications?category=all|replies|mentions|likes|system&status=unread|read|all`、`GET /api/v1/notifications/unread-summary` 和 `POST /api/v1/notifications/read-all`；分类 tabs 不再本地过滤，右栏展示后端分类未读摘要，列表和单条已读操作会统一刷新通知 query。`/notifications/replies`、`/notifications/mentions`、`/notifications/likes`、`/notifications/system` 会直达对应分类，tab 切换会同步 URL，登录门禁保留分类回跳。`resolveNotificationTarget` 集中处理来源：`post` 进入帖子、`community` 进入社区、`report/moderation_report` 进入举报详情，`comment` 因后端缺少所属帖子 ID 而显示“等待评论上下文”。 | 后端分类 / 未读 / 全部已读合同已落地，现有来源解析已前端收口；分类 URL 已补齐静态路由检查。 | 仍需后端给 `source_type=comment` 返回所属帖子 / 评论锚点或目标 URL；审核 / 社区申请类通知也需要稳定类型和目标。 |
| 社区申请与管理入口 | 申请入口出现在首页右栏、社区相关出口和头像 staff 工作台；不在左侧主导航。社区详情右栏已按 `viewer_permissions` 拆出“社区操作”：可发帖用户显示发帖入口，登录但不能发帖的用户显示申请社区，未登录用户显示登录后参与，有 `can_manage` 或 `can_moderate` 时才显示 `管理社区`。`/communities/:slug/manage` 已接入真实社区管理上下文、帖子、评论、举报、成员、资料和规则；owner 可维护社区名称和简介，owner / moderator 可新增、编辑和删除规则，未登录显示登录门禁，非 owner / moderator 显示 `需要社区权限`。 | 权限入口、管理读取、资料写操作和规则写操作已落地。 | 成员编辑、成员邀请、角色调整和完整社区管理子页仍未实现；当前页面继续明确不伪造成员写操作。 |
| 审核入口 | staff 头像菜单进入举报审核和社区审批；不在左侧主导航。举报审核列表 `/moderation` 和举报详情 `/moderation/reports/:id` 已与社区审批一样先读取 `/me.is_platform_staff`，非 staff 直接显示“需要平台权限”，不会先请求受保护举报数据；身份确认失败有独立错误态。 | 权限态和空错态基础落地。 | 仍需在真实可输入浏览器中补完整 staff 点击审核和移动端全路径 QA。 |
| 帖子详情返回 | 列表进入帖子时写入 sessionStorage 来源；详情页通过 `useSyncExternalStore` 读取当前帖子来源，刷新后仍能恢复；无来源时 fallback 到所属社区，否则社区索引。`check:actions` 已固化首页 / 社区 / 搜索 / 收藏 / 用户页入口写来源、内部 href 限制和禁止公开 `return_to`。 | 已落地，并完成返回来源回归 QA。 | 后续只需在新增帖子入口时同步接入来源记录。 |
| 个人主页 | `/users/[username]`、`/posts`、`/comments` 已存在；展示头像、昵称、简介、徽章、统计和公开内容入口。 | 基础落地。 | 仍不是完整个人中心；资料编辑、关注、漂亮展示信息需要后端和后续任务。 |
| 首页 / 社区 feed item | 列表项展示社区、作者、标题、摘要、分数、评论数、图片预览；没有图片时会从后端 `preview.link` 或正文首个安全 http/https 外链生成保守链接卡，显示域名、链接文字或后端标题，不抓取远端、不伪造元数据。 | 基础落地。 | 推荐 / 关注 feed 未证明；完整网页标题、描述、缩略图仍需要后端解析缓存。 |
| 保存收藏 | `POST /api/v1/posts/:id/save`、`DELETE /api/v1/posts/:id/save` 和 `GET /api/v1/me/saved-posts` 已接入；列表项和详情 footer 显示收藏动作及公开计数；`/saved` 登录后读取真实收藏列表，未登录显示登录门禁；从收藏列表进入帖子详情会记录“返回收藏”。 | 基础落地。 | 仍需后端补更完整的个性化收藏排序、分页加载和收藏夹能力；当前不伪造这些扩展。 |
| Feed sort | `PostSort = "best" | "hot" | "new" | "top" | "rising"`；路由已有 `/`、`/best`、`/hot`、`/new`、`/top`、`/rising`。2026-06-09 复核本地后端 API，`sort=best|hot|new|top|rising` 均返回 200；`check:main-path` 已把五种排序纳入严格验收。 | 前端 URL / UI 和后端排序运行态已对齐。 | `top` 的时间范围 `t=day|week|month|year|all` 仍是后续合同；前端不伪造时间窗口。 |
| Feed source | `src/features/feed/source.ts` 已集中定义推荐 / 全站 / 关注信息源标签和 URL；左侧导航已有首页、全站、关注、社区；首页信息流可在 `/`、`/all`、`/following` 及各自排序子路径之间切换。`/following` 未登录时显示登录门禁，登录后显示“关注信息流暂未开放”，不会请求 `source=following` 或用普通公开帖子填充。`src/features/post/types.ts` 用 `ReadableFeedSource` 把真实帖子列表 API 限定为 `recommended | all`。 | 前端 URL / UI 基础落地，关注流不伪造。 | 仍需后端补齐或明确关注流合同；补齐前只保留入口和说明。 |
| 评论 sort | 帖子详情已支持 Reddit 式 `?sort=best|top|new|old|controversial`，评论区有排序 tabs，树状评论层级保持不变；2026-06-09 复核本地后端 API，五种评论排序均返回 200；同时兼容旧规划中的 `comment_sort` query。 | 前端 URL / UI 和后端排序运行态已对齐。 | 后续只保留浏览器 QA 和更复杂数据下的排序体验复验。 |
| 评论投票 | `src/features/vote/api.ts` 已接入 `PUT /api/v1/comments/:id/vote` 和 `DELETE /api/v1/comments/:id/vote`；`CommentTree` 和用户评论列表每条评论都复用 `RedditVoteControl targetType="comment"`，成功后刷新当前帖子评论树和用户评论列表；失败时统一弹出可见 toast，不只写入 `sr-only`。 | 登录态投票 / 取消 / 反对、真实后端失败回滚和移动端触控已完成浏览器 QA。 | 当前不做积分特效；后续只保留完整浏览器 QA 和更复杂数据下的回归复验。 |
| Markdown 阅读态 | `ContentBody` 使用 `react-markdown` + `remark-gfm`，`skipHtml`，安全 URL，帖子和评论复用；移动端已用真实帖子验证宽表格、长代码块、任务列表和外部 Markdown 图片提示不会撑破页面，表格和代码块只在自身容器内横向滚动。`check:content-boundary` 已固化阅读态移动端溢出边界。 | 基础落地，移动端关键边界已有浏览器 QA。 | 仍需继续做更完整的 Reddit parity 用例审计，例如更多边界语法、深层评论组合和复杂嵌套内容。 |
| Markdown 写作态 | `MarkdownComposerField` 已统一发帖、评论、回复、帖子编辑、评论编辑，改为 Tiptap 单一实时渲染编辑面；工具栏对当前选区或当前块执行格式命令，覆盖行内代码和代码块。Markdown 源码不作为默认编辑 UI 暴露，`editor.getMarkdown()` 负责提交格式。 | 基础落地。 | 仍需继续做 Reddit parity 用例审计和移动端完整 QA。 |
| 图片与正文一体化 | 图片上传后进入 Tiptap image 节点并序列化为 `![说明](nexus-attachment:<id>)`；发布帖子、评论和编辑保存都会按正文出现顺序提交实际引用的 `attachment_ids`；阅读态只渲染正文内 marker 引用到的 attachments，不再把未引用附件追加成底部外置图集；外置图片管理组件已移除；上传中会保持最短可见等待提示并通过 `onUploadingChange` 禁用提交；`check:v2-path` 已覆盖正文内图片 marker 提交、读取保留、编辑替换图片和编辑删除图片后的解绑状态；`check:content-segments` 覆盖批量图片插入顺序和发布绑定过滤，`check:content-boundary` 固化 Tiptap 写作入口、剪贴板图片入口、编辑态新增图片绑定已接入、内联图片约束和上传等待态。 | 基础落地。 | 历史未插入正文的附件不会在发布态外挂展示；新增图片只通过编辑器正文位置进入内容，删除正文里的图片后不会随内容提交。 |
| 普通外链 | Markdown 链接可渲染安全链接；信息流已有保守链接卡，优先消费后端 `preview.link`，否则只显示正文里首个安全外链的域名和链接文字。 | 基础落地。 | 完整网页标题、描述、缩略图和失败降级仍需要后端解析缓存；前端不抓取任意远端网页。 |
| 白名单 embed | `ContentBody` 和 Tiptap 写作器会把裸贴的 Bilibili、抖音、网易云、QQ 音乐 canonical URL 渲染为受控播放器；自定义文字 Markdown 链接仍保持普通链接；源码中只允许白名单播放器组件使用 iframe。 | 前端基础落地。 | 后端已补 provider resolve、短链展开、元数据、审核状态和 `embed.id` 持久化；剩余是前端接线。 |
| 评论树 | 评论树、回复、折叠、最大深度、评论投票和五种评论排序已有基础实现。 | 基础落地。 | 积分特效、贴图仍未实现。 |

## 本次浏览器 QA 证据

- 2026-06-10 全局 404 状态页 QA：`/route-smoke-not-found` 桌面和 `390px` 移动端均显示 `这个页面不存在或已经移动`、`返回最新讨论` 和 `浏览社区索引`；页面不显示 `错误标识`、`digest` 或 Next.js 默认错误页文案；两种视口下 `scrollWidth` 均等于 `clientWidth`，控制台 error 数为 0。`check:ui-primitives` 已固化错误页不暴露技术标识、404 保留稳定出口和 loading 使用 Skeleton 骨架；`check:routes` 已覆盖 404 中文文案和出口。
- 2026-06-08 Tiptap 写作器重测：登录测试账号打开 `/communities/public/new`，页面只有一个 `.ProseMirror` 编辑面，`textarea` 数量为 0，不出现“源码编辑 / 开始写作 / 编辑正文 / 发布效果”旧文案；工具栏包含加粗、斜体、标题、删除线、引用、列表、代码、代码块、链接、涂黑、表格和添加图片。
- 选区格式 smoke：在写作器输入 `这段文字应该被加粗` 后全选并点击“加粗”，编辑器 DOM 变为 `<strong>这段文字应该被加粗</strong>`，不是插入 `**` 源码。
- 白名单媒体 smoke：在写作器输入 `https://www.bilibili.com/video/BV1xx411c7mD` 后，编辑态生成 `data-media-editor-node="true"` 的媒体块，显示 Bilibili 播放器 iframe；媒体 NodeView 是普通 DOM 节点，不再走 Tiptap React NodeView。
- 发布 smoke 帖子 `3246bcba-580a-4029-91c4-2f77f09b5ee8`：标题 `Tiptap 编辑器 smoke 验证`，详情页阅读态显示 Bilibili 播放器，页面文本不直接暴露原始 URL。
- 帖子编辑弹窗 smoke：打开作者编辑弹窗后仍然只有 `.ProseMirror` 编辑面，`textarea` 数量为 0，原正文直接显示为 Bilibili 播放器块，不显示 `nexus-attachment:`、`![...]` 或源码切换文案。
- 登录态发帖页 `/communities/public/new`：统一 Tiptap 写作器、格式工具栏和图片入口可见；正文编辑区直接显示排版后的内容，不显示 Markdown 源码 textarea。
- UI 发布 smoke 帖子 `3777ac41-d402-4c57-986e-877d45dbdfe3`：提交后进入详情页，正文 Markdown 渲染出 heading、strong、emphasis、list、table、link 和 spoiler，不显示原始表格或 spoiler 语法。
- 根评论提交：评论树从空态变成 `TREE / 1 条评论`，评论中的 strong、table 和 spoiler 正常渲染，提交后编辑器清空。
- 子评论回复：回复后评论树变成 `TREE / 2 条评论`，子评论深度为 1，spoiler 不露原始语法。
- 帖子编辑弹窗：打开后直接是排版后的编辑器，可编辑当前正文；可见正文不包含 `nexus-attachment:`、`![...]` 或 `>! ... !<` 源码。
- 评论编辑弹窗：打开后直接是排版后的编辑器，可编辑当前评论；可见正文不包含 `nexus-attachment:`、`![...]` 或 `>! ... !<` 源码。
- 发帖页剪贴板图片：登录测试账号后在 `/communities/public/new` 用系统剪贴板粘贴 PNG，写作器上传图片并在当前位置渲染图片节点；提交时仍序列化为 `nexus-attachment` Markdown marker 和 `attachment_ids`。
- 评论区剪贴板图片：评论写作器同样支持粘贴 PNG，上传后在当前位置渲染图片节点；提交时仍序列化为 `nexus-attachment` Markdown marker 和 `attachment_ids`。
- 本地运行时注意：后端源码和远端 `main` 已放行 CORS `PATCH`，但旧 Docker 容器曾返回 `GET, POST, PUT, DELETE, OPTIONS`，导致浏览器保存失败。重建 `cumt-nexus-api:local` 并按现有数据卷账号恢复 prod compose 后，`OPTIONS` 返回 `GET, POST, PUT, PATCH, DELETE, OPTIONS`，编辑保存通过。
- 2026-06-08 Feed source UI 重测历史证据：桌面 `/`、`/all/hot`、`/following` 均显示首页 / 全站 / 关注 / 社区左侧导航和源 / 排序双 tabs；当时 `/following` 在登录态浏览器按关注源请求。2026-06-10 已调整为关注流合同未确认时不请求 `source=following`，登录后展示“关注信息流暂未开放”，无 token 的 `/following` 门禁仍由 `check:routes` 的服务端请求覆盖。
- 2026-06-10 `/following` 浏览器复验：桌面未登录态显示“登录后查看关注信息流”和“关注流不会用普通公开帖子填充”，没有 `/api/v1/posts?source=following` 请求，`scrollWidth` 等于 `clientWidth`。390px 移动端用真实后端 smoke 账号从 `/login?next=%2Ffollowing` 登录后进入 `/following`，显示“关注信息流暂未开放”、浏览全站 / 浏览社区出口和“不展示普通公开帖子”说明，没有 `source=following` 请求、无横向溢出、控制台 error 数为 0。
- 2026-06-10 Feed source 合同复核：`cumt-nexus-api` 当前源码 `PostFeedSource` 只定义 `all` 和 `recommended`，`normalizePostFeedSource` 会拒绝其他值；合同文档也写明 `GET /api/v1/posts` 的 `source=all|recommended`。当前本地运行后端实测 `source=recommended` 和 `source=all` 返回 200，`source=following` 也返回 200 且返回普通帖子流，说明运行态可能存在未重建或旧版本漂移，不能作为关注流已完成证据。前端继续保持 `/following` 占位，不请求 `source=following`。
- 2026-06-10 通知中心浏览器 QA：用真实后端 QA 账号 `qa_notify_20260610210318` seed `post_reply`、`mention`、`post_like`、`system` 四类通知，API 直读 `unread-summary` 为 `total=4, replies=1, mentions=1, likes=1, system=1`。桌面 `/notifications` 显示 `全部 / 回复 / @ / 赞 / 系统` 分类 tabs、右栏“分类未读”和“全部标记已读”；逐个点击分类时每类只显示对应 1 条通知，`scrollWidth` 等于 `clientWidth`。390px 移动端同页显示 4 条通知、分类 tabs、分类未读和全部标记已读，无横向溢出，控制台 error 数为 0。点击“全部标记已读”后页面显示“没有未读通知”，分类未读全部归零，数据库中 4 条通知 `read_at` 均已写入。
- 2026-06-10 通知分类 URL 回归：`/notifications/replies`、`/notifications/mentions`、`/notifications/likes`、`/notifications/system` 复用同一个 `NotificationCenter`，分别以回复、@、赞、系统作为初始分类；未登录态登录门禁会保留对应 `next` 回跳；`/notifications/unknown` 返回项目统一 404。`check:routes` 和 `check:api-boundary` 已把分类 URL、路由 guard 和 tab URL 同步纳入检查。桌面浏览器从 `/notifications/replies` 点击“赞”和“系统”后分别进入 `/notifications/likes`、`/notifications/system`，页面显示对应 `未读 / 赞`、`未读 / 系统`，无横向溢出且控制台 error 数为 0。390px 移动端直达 `/notifications/mentions` 显示 `未读 / @`、分类 tabs 和“分类未读”，`scrollWidth` 等于 `clientWidth`，控制台 error 数为 0。
- 2026-06-10 通知来源解析代码回归：后端合同确认通知响应只有 `source_type` 和 `source_id`，没有 `target_url` 或评论所属帖子 ID。前端新增 `src/features/notification/targets.ts` 集中解析现有来源：`post`、`community`、`report/moderation_report` 生成可点击目标；`comment` 不再尝试伪造帖子链接，列表显示“等待评论上下文”和“后端尚未返回所属帖子 ID”。`check:api-boundary` 已固化 resolver、评论不误链和通知中心使用共享 resolver。
- 2026-06-10 通知来源解析浏览器 QA：用真实后端 QA 账号 `qantmq86cevkgiry` seed `post`、`comment`、`community`、`report` 四类来源通知。桌面 `/notifications` 显示 4 条通知：`post` 行有 `查看帖子` 链接到 `/posts/cd3e0a1f-6b9d-482c-a282-8d2df3951675`，`community` 行有 `查看社区` 链接到 `/communities/public`，`report` 行有 `查看举报` 链接到 `/moderation/reports/fbcf1d84-f198-4091-a031-9a6dfbdeed32`；`comment` 行显示 `等待评论上下文` 和 `后端尚未返回所属帖子 ID`，且该行没有目标 `<a>`。桌面和 `390px` 移动端均无横向溢出，控制台 error/warn 数为 0。
- 2026-06-10 审核台权限态回归：`ModerationConsole` 和 `ModerationReportDetail` 已先通过 `useCurrentUserQuery()` 确认 `/me.is_platform_staff`，只有 staff 才启用 `useModerationReportsQuery` / `useModerationReportQuery`；非 staff 显示“需要平台权限”，身份读取失败显示“无法确认用户身份”。普通登录用户 `qafile19eb21425cf` 桌面和 `390px` 移动端访问 `/moderation`、`/moderation/reports/fbcf1d84-f198-4091-a031-9a6dfbdeed32` 均显示对应权限说明，`scrollWidth` 等于 `clientWidth`，控制台 error/warn 数为 0。`check:api-boundary` 已固化举报列表和详情不能退回 token-only gate。
- 2026-06-10 社区详情权限入口与管理概览回归：`CommunityDetail` 已按后端 `viewer_permissions.can_post/can_manage/can_moderate` 控制 `发布帖子`、`申请社区`、`登录后参与` 和 `管理社区`；`/communities/:slug/manage` 已接入 `GET /api/v1/communities/:slug/manage`、`/manage/posts`、`/manage/comments`、`/manage/reports`、`/manage/members`、`/manage/settings` 和 `/manage/rules` 的真实读取。管理页先读取公开社区详情确认 viewer 权限，只有 `can_manage` 或 `can_moderate` 才启用受保护管理 query。普通登录用户 `qafile19eb21425cf` 桌面和 `390px` 移动端访问 `/communities/public` 均只显示 `申请社区`，不显示 `发布帖子` 或 `管理社区`；访问 `/communities/public/manage` 均显示 `需要社区权限`，不显示通用 `无法加载社区管理` 或 `服务暂时不可用`，页面无横向溢出，控制台 error/warn 数为 0。`check:api-boundary` 已固化社区详情权限入口、管理页先读 viewer 权限、管理 API/query 边界、资料 / 规则写操作、成员只读边界和真实管理路由；`check:routes` 已覆盖未登录 `/communities/public/manage` 登录门禁和 `next` 回跳。
- 2026-06-11 社区管理 owner 写操作 QA：本地 `cumt-nexus-api:local` 已按后端当前工作树重建并迁移到 version 16 dirty=false，`/manage/members` 从旧运行态 404 对齐为真实鉴权接口。用真实后端路径创建普通用户 `qa_manage_user_0588ky`、owner 用户 `qa_manage_owner_0588ky` 和审批通过社区 `/qa-manage-0588ky`，后端直连确认 owner 可读 `/manage/members`、`/manage/settings`、`/manage/rules`，普通用户读取受保护成员接口返回 403。浏览器桌面访问 `/communities/qa-manage-0588ky/manage`：普通用户显示 `需要社区权限`，不显示 owner 成员用户名，不出现 `无法加载社区管理` 或 `服务暂时不可用`；owner 显示成员、资料编辑、规则编辑和“资料和规则写操作走真实后端接口；成员管理仍保持只读。”。owner 桌面写入社区名称 `QA Manage 0588ky` 和简介 `Browser QA settings write 2026-06-11 0053` 后出现 `资料已更新` / `社区资料已保存`；新增规则 `QA rule 2026-06-11 0054` 后出现 `已新增规则`，编辑为 `QA rule edited 2026-06-11 0056` 后出现 `已更新规则`，删除后出现 `规则已删除` 且规则列表回到空态。删除成功后弹层已关闭，不再残留 `删除社区规则` 或 `确认删除`。桌面过程无横向溢出，QA 开始后的控制台 error/warn 数为 0。
- 2026-06-11 社区管理移动端写操作 QA：`390px` 移动端访问 `/communities/qa-manage-0588ky/manage` 显示 `社区管理`、`保存资料`、`新增规则` 和成员只读说明，不显示权限门禁或加载错误，`scrollWidth` 等于 `clientWidth`。移动端新增规则 `QA mobile rule 2026-06-11 0102` 后出现 `已新增规则`，编辑 / 删除入口出现；删除后出现 `规则已删除`、规则列表回到 `暂无社区规则`，删除弹层关闭。移动端写操作期间无横向溢出，控制台 error/warn 数为 0。
- 2026-06-10 评论投票浏览器 QA：用作者账号 `qavoteauthormq86k1mj9ivf` 创建帖子 `6aa741f3-e9f0-4284-885c-275d4932eac0` 和评论 `0eed8f16-e77f-46a3-8a42-cf80a35ada11`，再用登录 QA 账号 `qantmq86cevkgiry` 操作该评论。桌面 `/posts/6aa741f3-e9f0-4284-885c-275d4932eac0` 初始分数为 `0`，点击 `赞同` 后分数变为 `1`、赞同按钮 `aria-pressed=true`；再次点击赞同后分数回到 `0`；点击 `反对` 后分数变为 `-1`、反对按钮 `aria-pressed=true`。`390px` 移动端复验反对票取消后分数回到 `0`，两种视口均无横向溢出，控制台 error/warn 数为 0。
- 2026-06-10 评论投票失败回滚 QA：先用真实后端确认已删除评论投票返回 `404 not_found`，再分别在桌面和 `390px` 移动端保留旧页面上的可见评论后由后端删除该评论并点击旧投票按钮。桌面帖子 `0eb0731e-9933-4803-a3bf-cc027750a722` / 评论 `391300c1-4b55-48ad-856b-eb089dba9d92`，移动端帖子 `3056aa94-3a56-40ad-a1a0-e0a6c444edee` / 评论 `195852ff-902c-4c72-8f52-0ed8d9bb2e32` 均显示可见 toast `没有找到对应内容。`，分数保持 `0`，赞同 / 反对按钮保持 `aria-pressed=false`，页面无横向溢出，控制台无 error/warn。`RedditVoteControl` 的可见 `toast.error` 和失败反馈边界已由 `check:actions` 固化。
- 2026-06-10 Markdown 阅读态移动端边界 QA：用真实后端账号 `qamdb19eb2197f00` 创建帖子 `70d3e224-e88d-4876-845f-e339c80bca21` 和评论 `ecb61621-7f5e-44b2-8ec2-622a9189b659`，正文同时覆盖宽表格、fenced code 长行、任务列表、引用和外部 Markdown 图片。`390px` 视口打开帖子详情后，整页 `scrollWidth` 等于 `clientWidth`；帖子和评论各自的表格 wrapper 均为 `overflow-x: auto`，表格宽度 `560px` 只在 wrapper 内滚动；帖子代码块 `scrollWidth=1197/clientWidth=273`、评论代码块 `scrollWidth=766/clientWidth=287`，均只在 `pre` 内横向滚动；页面出现 2 处 `外部图片不会直接渲染；请上传图片后放入正文。`，任务列表 checkbox 带 `已完成 / 未完成` 中文 aria label，控制台 error/warn 数为 0。`check:content-boundary` 已新增阅读态移动端溢出边界。
- 2026-06-10 编辑图片绑定回归：`check:v2-path` 已补充真实后端验收，覆盖帖子编辑替换图片、帖子编辑删除正文图片并提交空 `attachment_ids`、帖子详情不再返回旧图片 marker / attachment，评论编辑替换图片、评论编辑删除正文图片并提交空 `attachment_ids`、评论树不再返回已删除图片绑定；同轮严格 `npm run check:v2-path` 通过。
- 2026-06-10 媒体编辑弹窗移动 QA：390px 移动端真实登录账号打开 `/communities/public/new`，正文工具栏 13 个按钮保留在单条横向滚动 toolbar 内，页面 `scrollWidth` 等于视口宽度。用真实后端数据创建带图片帖子和带图片评论后，打开帖子编辑弹窗和评论编辑弹窗均不再触发 Tiptap 图片解析崩溃；弹窗 `scrollWidth` 等于 `clientWidth`，工具栏 `overflow-x: auto`，删除正文图片后出现“已从正文删除的历史图片不会随本次保存继续绑定”提示，帖子和评论各自保留“删除正文里的图片并保存后会解绑”的保存前说明。
- 2026-06-10 图片上传等待态代码回归：`MarkdownComposerField` 的文件选择、粘贴和拖放图片上传都会进入共享上传中状态，保持最短可见提示，上传完成前通过 `onUploadingChange` 让外层保存 / 发布按钮保持禁用；`npm run check:content-boundary` 已把等待态、正文图片入口和上传中禁用约束纳入静态验收。本条不替代真实系统文件选择浏览器 QA。
- 2026-06-10 图片粘贴上传等待态浏览器 QA：375px 移动端真实登录账号打开 `/communities/public/new`，通过浏览器 PNG 剪贴板粘贴图片，上传中显示“正在上传图片，保存按钮会暂时禁用”，发布按钮变为“图片上传中...”且 disabled；完成后正文中出现真实后端图片 URL，不显示 `nexus-attachment` 源码，不出现未引用图片提示，`scrollWidth` 等于 `clientWidth`，测试开始后控制台 error 数为 0。
- 2026-06-08 评论排序 UI 重测历史证据（已由 2026-06-09 回归覆盖）：当时本地 API 探测 `GET /api/v1/posts/:id/comments?sort=best|top|old|controversial` 均返回 `400 invalid_argument`，`sort=new` 成功；桌面打开 `/posts/ec895728-1533-4886-a9cb-f84cac830cf3?sort=top`，评论区显示最佳 / 最高 / 最新 / 最早 / 争议 tabs，最高 tab 选中，显示“后端暂未提供最高评论排序，当前展示最新评论。”，无横向溢出且控制台 error 数为 0；点击“最早”后 URL 变为 `?sort=old`，最早 tab 选中并显示对应降级提示。移动端 390px 同一路径无横向溢出。
- 2026-06-08 公开路由 SSR 预取重测：`/new`、`/hot`、`/all`、`/all/hot` 不再被后端慢响应拖到路由 smoke 超时；服务端首屏预取使用短超时，失败后先返回页面壳和公开导航，客户端保留正常查询 / 重试路径。
- 2026-06-08 评论排序浏览器 smoke 历史证据（已由 2026-06-09 回归覆盖）：打开 `/posts/500b91a2-73b2-4f36-8c25-cb9a3d97b473?sort=top` 后，评论排序 tabs 显示“最高”激活；本地后端未支持该排序时，页面提示“后端暂未提供最高评论排序，当前展示最新评论”，评论树继续展示真实 `new` 数据。
- 2026-06-08 收藏链路 smoke：`check:routes` 覆盖未登录 `/saved` 登录门禁和 App Shell 导航；`check:main-path` 覆盖保存新建帖子、`/api/v1/me/saved-posts` 出现该帖子、取消保存后列表移除；列表项和详情页复用同一个收藏按钮。浏览器使用临时账号 `saved_ui_mq5e0pm9` 验证：登录后 `/saved` 初始空态，打开帖子 `b61fe613-d7ca-454a-b583-3ce6f2471ce3` 点击收藏后详情显示“取消收藏”，`/saved` 展示该帖子，取消收藏后回到空态，控制台 error 数为 0。
- 2026-06-09 收藏和返回入口浏览器回归：登录态桌面打开 `/saved`，显示“我的收藏”和“收藏上下文”，无横向溢出，控制台 error 数为 0；`/new` 信息流每条帖子动作区显示同一套“分享 / 收藏”动作，未出现 `Auth` / `OK` 调试文案；从 `/new` 点击帖子进入详情后，返回入口为 `返回最新` 且 href 为 `/new`，详情页 footer 复用收藏按钮；390px 移动端检查 `/saved` 和 `/new` 均无横向溢出，移动导航按钮和收藏动作可见。
- 2026-06-10 帖子详情返回来源回归：`check:actions` 新增 `post navigation source` 门禁，覆盖入口来源写入、详情页读取、内部 href 过滤、社区 fallback、搜索 query 保留和禁止公开 `return_to`。桌面从 `/new?qa=post-return-source` 点击帖子 `a319c4f5-509e-4f0a-819f-9cdfd5fd19fe` 进入详情后返回入口为 `返回最新`，href 为 `/new`；刷新同一详情页后仍保持 `返回最新`。未通过列表点入的帖子 `da9d6f0a-e0a2-4a7f-8b99-4aa84989a800` 直接打开时 fallback 为 `返回 /public`，href 为 `/communities/public`。从 `/communities/public?qa=community-return-source` 点击同一帖子进入详情后，来源覆盖为 `返回 /public`，不粘连前一次 `/new` 来源。375px 移动端从 `/new?qa=post-return-source-mobile` 点击同帖进入详情，返回入口仍为 `返回最新`，href 为 `/new`，`scrollWidth` 等于 `clientWidth`，控制台 error 数为 0。
- 2026-06-10 搜索公开合同和可视回归：后端匿名 `GET /api/v1/search?q=public&scope=all&limit=3&offset=0` 返回 `HTTP 200`，包含 `/public` 社区和真实 visible 帖子；前端 `searchContent` 使用 `token: null` 公开读取，错误态不再展示“公开搜索暂不可用”。`check:api-boundary` 已固化搜索公开读取和旧文案禁用，`check:routes` 已把旧搜索登录墙 / 身份上下文提示 / 不可用面板纳入 forbidden marker。桌面浏览器打开 `/search?q=public&scope=all` 显示真实 `/public` 社区和多条公开帖子结果；`390px` 移动端同页显示公开帖子结果；两种视口下 `scrollWidth` 均等于 `clientWidth`，控制台 error 数为 0。
- 2026-06-09 信息流链接预览浏览器 QA：通过后端创建帖子 `Link preview UI smoke mq5fk5ge_nuyrj`，正文包含 `[OpenAI research](https://openai.com/research/)`；桌面 `/new` 信息流显示链接卡域名 `openai.com` 和链接文字 `OpenAI research`，外链带 `target="_blank"` 和 `rel="nofollow ugc noopener noreferrer"`，正文摘要仍在链接卡下方，无横向溢出，控制台 error 数为 0；390px 移动端同帖链接卡、摘要和移动导航按钮可见，无横向溢出。
- 2026-06-09 排序合同回归：重建本地 `cumt-nexus-api:local` 后运行 `npm run check:main-path`，帖子 `sort=best|hot|new|top|rising` 全部返回 200，评论 `sort=best|top|new|old|controversial` 全部返回 200；脚本现在把这些排序作为严格验收项，不再接受旧后端的 `400 invalid_argument` 降级作为通过。

## 后端需要补或确认

以下不要直接改后端；需要进入后端文档或后端任务：

- Feed source 合同：推荐、全站、关注、社区、用户、搜索结果之间的统一接口或明确拆分接口。当前前端只把真实帖子列表 API 限定为 `source=recommended|all`；`/following` 只保留入口和状态说明，等待后端关注流合同后再接入真实数据。2026-06-10 复核时发现本地运行态仍对 `source=following` 返回普通帖子流，需后端重建或修正运行版本后再确认。
- Feed sort 时间窗口：`best | hot | new | top | rising` 基础排序已通过本地运行态验收；`top` 的 `t=day|week|month|year|all` 时间范围仍需后端合同。
- 个性化推荐和关注 feed：关注关系、推荐排序、登录 / 未登录降级策略。前端当前只做 URL / UI 和未登录门禁，不伪造关注结果。
- 通知 target 精度：回复、@、赞、系统的后端分类、未读摘要和全部标记已读合同已经接入并通过浏览器 QA；前端已集中解析现有来源并避免评论通知误跳。仍需后端给评论类通知提供可跳到所属帖子 / 评论锚点的 target，并补齐审核、社区申请类通知的稳定类型和目标。
- 链接预览：普通网页解析、缓存、失败降级、图片安全策略。
- 白名单 embed 后端合同：Bilibili、抖音、网易云、QQ 音乐 provider resolve、短链展开、元数据、审核状态和 `embed.id` 持久化；前端 canonical 裸链接播放器已先落地。
- 图片后处理：缩略图 URL、对象物理删除、未绑定对象 TTL、失败对象回收。
- 编辑绑定图片：2026-06-08 复核后端当前源码和合同，发布帖子 / 评论请求、`PATCH /api/v1/posts/:id` 和 `PATCH /api/v1/comments/:id` 均已支持 `attachment_ids`。编辑态新增图片绑定已接入，前端保存时按正文实际引用顺序提交图片 ID，后端按帖子 / 评论所有权重新绑定，响应继续返回最新 `attachments`。

## 下一步建议

不要再按“规划是否完成”讨论。后续按体验任务推进：

1. 补一轮系统文件选择器的真实人工 QA；图片粘贴上传等待态已用浏览器 PNG 剪贴板验证，当前共享写作器已有最短可见上传中提示、上传中禁用和状态条，代码边界由 `check:content-boundary` 覆盖，数据绑定正确性已由 `check:v2-path` 覆盖。
2. 推进后端 Feed source 运行态对齐：源码和合同只承认 `source=all|recommended`，但当前本地运行态仍对 `source=following` 返回普通帖子流；在后端重建或修正合同前，前端继续保持关注流占位。
3. 通知中心分类、未读摘要、全部标记已读和现有来源解析已完成接入，并已补桌面 / 移动端可视 QA；下一步只围绕后端评论 target、审核 / 社区申请事件覆盖和完整浏览器 QA 继续。
4. 社区详情权限入口、管理读取、资料写操作和规则写操作已接入，并已补普通用户门禁、owner 桌面写操作和移动端写操作浏览器 QA；下一步如继续社区管理，应补成员编辑 / 邀请 / 角色调整和具体子页，并继续避免把后端未完成能力伪造成已完成。
5. 做链接预览和 embed 后端合同接入：链接预览仍未实现；embed 前端 canonical 裸链接已可显示，下一步是接后端结构化 `embed.id`。
6. 按 `docs/internal/engineering/browser-qa.md` 跑完整桌面 / 移动端人工 QA，把“反人类”的页面按 P0 / P1 任务修。
