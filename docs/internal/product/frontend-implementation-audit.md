# 前端规划落地摸排

日期：2026-06-07
更新：2026-06-09

本文回答“之前的前端规划完成了多少”。结论先写清楚：规划文档已经收口，但实现没有完全达到规划和上线体验要求。`tasks.md`、`v2-roadmap.md` 中的 `DONE` 只能说明当时的脚本和局部验收通过，不能等同于所有页面体验已经可上线。

本次摸排依据：

- 静态扫描 `src/app` 路由、`src/components/app-shell`、`src/features/*`。
- 代码核对 `AppShell`、`HomeShell`、`PostSort`、`SearchPage`、`NotificationCenter`、`PublicUserProfile`、`ContentBody`、`MarkdownComposerField`。
- 浏览器抽查首页、一条已有图片帖子、`check:v2-path` 新建的正文内图片 marker smoke 帖子，以及 UI 发帖 / 评论 / 回复 / 编辑弹窗。
- 本次不是完整桌面 / 移动端人工 QA，不覆盖全部页面点击验证。

## 总体结论

当前前端不是“完全没做”，但也不是“规划已经全部落地”。更准确的状态是：

- App Shell、基础路由、顶部搜索、顶部通知入口、头像菜单、最近访问社区、个人主页基础壳已经落地。
- 未登录公开读取在前端意图上已经打开，但仍依赖后端 optional Bearer / 公开读取合同保持一致。
- 帖子和评论 Markdown / 图片一体化已补齐统一入口；发帖、评论、回复、帖子编辑、评论编辑都复用同一 Tiptap 实时渲染写作器。发帖、评论发布和帖子 / 评论编辑都会提交正文引用到的 `attachment_ids`，正文内容仍以 Markdown 提交给后端。
- Feed 规划仍未完整落地：前端已有 `best | hot | new | top | rising` 和推荐 / 全站 / 关注 source 的 URL / UI 基础；本地运行时已证明帖子五种排序可用，但 source 合同仍未完全证明。
- 保存收藏链路已接入当前后端合同；帖子列表和详情可以收藏 / 取消收藏，用户菜单进入 `/saved` 查看真实账号收藏列表。
- 通知中心前端已改为回复、@、赞、系统的分类视图，同时保留未读 / 全部 / 已读状态筛选；分类准确度仍依赖后端稳定事件类型继续增强。
- 积分特效和个性化推荐没有落地；链接预览已有前端保守链接卡，后端网页元数据解析缓存仍未接入；评论投票已复用统一 Reddit 投票控件接入当前后端合同；Bilibili / 抖音 / 网易云 / QQ 音乐 canonical 裸链接白名单 embed 已在前端阅读态和写作器编辑态落地，但后端结构化 resolve、短链和 `embed_ids` 持久化仍未接入。

## 落地矩阵

| 能力 | 当前代码事实 | 判定 | 后续处理 |
| --- | --- | --- | --- |
| 全局 App Shell | `src/components/app-shell/app-shell.tsx` 提供左侧首页 / 社区、最近访问、顶部搜索、通知 bell、头像菜单；主要页面已包 `AppShell`。 | 已落地，仍需全站视觉 QA。 | 后续反馈按具体页面任务调整，不重建第二套导航。 |
| 搜索入口 | 顶部搜索输入不会点击即跳转，提交后进入 `/search?q=...&scope=all`；搜索页有 `all | communities | posts`。 | 基础落地。 | 如需 Reddit 式联想 / 快捷搜索，需要单独任务和后端合同。 |
| 通知入口 | 通知不在左侧栏，顶部 bell 进入 `/notifications`；未登录会跳登录。 | 入口落地。 | 通知内容组织仍未达到规划。 |
| 通知中心 | `NotificationCenter` 已提供 `全部 / 回复 / @ / 赞 / 系统` 分类视图，并保留 `未读 / 全部 / 已读` 状态筛选；当前按现有 `type`、`source_type`、标题做保守归类。 | 前端基础落地。 | 后端仍需要稳定事件类型和 target，让回复、@、赞、系统、审核 / 申请分类更精确。 |
| 社区申请入口 | 申请入口出现在首页右栏、社区相关出口和头像 staff 工作台；不在左侧主导航。 | 基础落地。 | 社区详情内的申请 / 管理入口还需要按权限和具体页面体验继续打磨。 |
| 审核入口 | staff 头像菜单进入举报审核和社区审批；不在左侧主导航。 | 基础落地。 | 需要继续做权限态、空错态和移动端 QA。 |
| 帖子详情返回 | 列表进入帖子时写入 sessionStorage 来源；无来源时 fallback 到所属社区，否则社区索引。 | 已落地。 | 需要浏览器历史、刷新、直接打开三类场景继续 QA。 |
| 个人主页 | `/users/[username]`、`/posts`、`/comments` 已存在；展示头像、昵称、简介、徽章、统计和公开内容入口。 | 基础落地。 | 仍不是完整个人中心；资料编辑、关注、漂亮展示信息需要后端和后续任务。 |
| 首页 / 社区 feed item | 列表项展示社区、作者、标题、摘要、分数、评论数、图片预览；没有图片时会从后端 `preview.link` 或正文首个安全 http/https 外链生成保守链接卡，显示域名、链接文字或后端标题，不抓取远端、不伪造元数据。 | 基础落地。 | 推荐 / 关注 feed 未证明；完整网页标题、描述、缩略图仍需要后端解析缓存。 |
| 保存收藏 | `POST /api/v1/posts/:id/save`、`DELETE /api/v1/posts/:id/save` 和 `GET /api/v1/me/saved-posts` 已接入；列表项和详情 footer 显示收藏动作及公开计数；`/saved` 登录后读取真实收藏列表，未登录显示登录门禁；从收藏列表进入帖子详情会记录“返回收藏”。 | 基础落地。 | 仍需后端补更完整的个性化收藏排序、分页加载和收藏夹能力；当前不伪造这些扩展。 |
| Feed sort | `PostSort = "best" | "hot" | "new" | "top" | "rising"`；路由已有 `/`、`/best`、`/hot`、`/new`、`/top`、`/rising`。2026-06-09 复核本地后端 API，`sort=best|hot|new|top|rising` 均返回 200；`check:main-path` 已把五种排序纳入严格验收。 | 前端 URL / UI 和后端排序运行态已对齐。 | `top` 的时间范围 `t=day|week|month|year|all` 仍是后续合同；前端不伪造时间窗口。 |
| Feed source | `src/features/feed/source.ts` 已集中定义推荐 / 全站 / 关注信息源标签和 URL；左侧导航已有首页、全站、关注、社区；首页信息流可在 `/`、`/all`、`/following` 及各自排序子路径之间切换。`/following` 未登录时显示登录门禁，不展示假关注内容。 | 前端 URL / UI 基础落地。 | 仍需后端证明 `source=recommended|all|following` 会返回对应真实数据；关注流还需要关注关系合同。 |
| 评论 sort | 帖子详情已支持 Reddit 式 `?sort=best|top|new|old|controversial`，评论区有排序 tabs，树状评论层级保持不变；2026-06-09 复核本地后端 API，五种评论排序均返回 200；同时兼容旧规划中的 `comment_sort` query。 | 前端 URL / UI 和后端排序运行态已对齐。 | 后续只保留浏览器 QA 和更复杂数据下的排序体验复验。 |
| 评论投票 | `src/features/vote/api.ts` 已接入 `PUT /api/v1/comments/:id/vote` 和 `DELETE /api/v1/comments/:id/vote`；`CommentTree` 每条评论复用 `RedditVoteControl targetType="comment"`，成功后刷新当前帖子评论树和用户评论列表。 | 基础落地。 | 仍需浏览器覆盖登录态投票、取消投票、失败回滚和移动端触控体验；当前不做积分特效。 |
| Markdown 阅读态 | `ContentBody` 使用 `react-markdown` + `remark-gfm`，`skipHtml`，安全 URL，帖子和评论复用；本轮已验证帖子详情移动端长代码块不撑破页面，代码块内部横向滚动。 | 基础落地。 | 仍需 Reddit parity 用例审计，例如边界语法、移动端表格和评论深层场景。 |
| Markdown 写作态 | `MarkdownComposerField` 已统一发帖、评论、回复、帖子编辑、评论编辑，改为 Tiptap 单一实时渲染编辑面；工具栏对当前选区或当前块执行格式命令，覆盖行内代码和代码块。Markdown 源码不作为默认编辑 UI 暴露，`editor.getMarkdown()` 负责提交格式。 | 基础落地。 | 仍需继续做 Reddit parity 用例审计、移动端完整 QA，以及真实编辑弹窗新增 / 删除图片的手动复验。 |
| 图片与正文一体化 | 图片上传后进入 Tiptap image 节点并序列化为 `![说明](nexus-attachment:<id>)`；发布帖子、评论和编辑保存都会按正文出现顺序提交实际引用的 `attachment_ids`；阅读态只渲染正文内 marker 引用到的 attachments，不再把未引用附件追加成底部外置图集；外置图片管理组件已移除；`check:v2-path` 已覆盖正文内图片 marker 提交和读取保留，`check:content-segments` 覆盖批量图片插入顺序和发布绑定过滤，`check:content-boundary` 固化 Tiptap 写作入口、剪贴板图片入口、编辑态新增图片绑定已接入和内联图片约束。 | 基础落地。 | 历史未插入正文的附件不会在发布态外挂展示；新增图片只通过编辑器正文位置进入内容，删除正文里的图片后不会随内容提交。 |
| 普通外链 | Markdown 链接可渲染安全链接；信息流已有保守链接卡，优先消费后端 `preview.link`，否则只显示正文里首个安全外链的域名和链接文字。 | 基础落地。 | 完整网页标题、描述、缩略图和失败降级仍需要后端解析缓存；前端不抓取任意远端网页。 |
| 白名单 embed | `ContentBody` 和 Tiptap 写作器会把裸贴的 Bilibili、抖音、网易云、QQ 音乐 canonical URL 渲染为受控播放器；自定义文字 Markdown 链接仍保持普通链接；源码中只允许白名单播放器组件使用 iframe。 | 前端基础落地。 | 后端仍需 provider resolve、短链展开、元数据、审核状态和 `embed_ids` 持久化。 |
| 评论树 | 评论树、回复、折叠、最大深度、评论投票和五种评论排序已有基础实现。 | 基础落地。 | 积分特效、贴图仍未实现。 |

## 本次浏览器 QA 证据

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
- 2026-06-08 Feed source UI 重测：桌面 `/`、`/all/hot`、`/following` 均显示首页 / 全站 / 关注 / 社区左侧导航和源 / 排序双 tabs；`/` 与 `/all/hot` 有帖子或公开空态，`/following` 在当前登录态浏览器按关注源请求。移动端 390px 检查 `/all/hot` 和 `/following` 无横向溢出，控制台 error 数为 0。无 token 的 `/following` 门禁由 `check:routes` 的服务端请求覆盖。
- 2026-06-08 评论排序 UI 重测历史证据（已由 2026-06-09 回归覆盖）：当时本地 API 探测 `GET /api/v1/posts/:id/comments?sort=best|top|old|controversial` 均返回 `400 invalid_argument`，`sort=new` 成功；桌面打开 `/posts/ec895728-1533-4886-a9cb-f84cac830cf3?sort=top`，评论区显示最佳 / 最高 / 最新 / 最早 / 争议 tabs，最高 tab 选中，显示“后端暂未提供最高评论排序，当前展示最新评论。”，无横向溢出且控制台 error 数为 0；点击“最早”后 URL 变为 `?sort=old`，最早 tab 选中并显示对应降级提示。移动端 390px 同一路径无横向溢出。
- 2026-06-08 公开路由 SSR 预取重测：`/new`、`/hot`、`/all`、`/all/hot` 不再被后端慢响应拖到路由 smoke 超时；服务端首屏预取使用短超时，失败后先返回页面壳和公开导航，客户端保留正常查询 / 重试路径。
- 2026-06-08 评论排序浏览器 smoke 历史证据（已由 2026-06-09 回归覆盖）：打开 `/posts/500b91a2-73b2-4f36-8c25-cb9a3d97b473?sort=top` 后，评论排序 tabs 显示“最高”激活；本地后端未支持该排序时，页面提示“后端暂未提供最高评论排序，当前展示最新评论”，评论树继续展示真实 `new` 数据。
- 2026-06-08 收藏链路 smoke：`check:routes` 覆盖未登录 `/saved` 登录门禁和 App Shell 导航；`check:main-path` 覆盖保存新建帖子、`/api/v1/me/saved-posts` 出现该帖子、取消保存后列表移除；列表项和详情页复用同一个收藏按钮。浏览器使用临时账号 `saved_ui_mq5e0pm9` 验证：登录后 `/saved` 初始空态，打开帖子 `b61fe613-d7ca-454a-b583-3ce6f2471ce3` 点击收藏后详情显示“取消收藏”，`/saved` 展示该帖子，取消收藏后回到空态，控制台 error 数为 0。
- 2026-06-09 收藏和返回入口浏览器回归：登录态桌面打开 `/saved`，显示“我的收藏”和“收藏上下文”，无横向溢出，控制台 error 数为 0；`/new` 信息流每条帖子动作区显示同一套“分享 / 收藏”动作，未出现 `Auth` / `OK` 调试文案；从 `/new` 点击帖子进入详情后，返回入口为 `返回最新` 且 href 为 `/new`，详情页 footer 复用收藏按钮；390px 移动端检查 `/saved` 和 `/new` 均无横向溢出，移动导航按钮和收藏动作可见。
- 2026-06-09 信息流链接预览浏览器 QA：通过后端创建帖子 `Link preview UI smoke mq5fk5ge_nuyrj`，正文包含 `[OpenAI research](https://openai.com/research/)`；桌面 `/new` 信息流显示链接卡域名 `openai.com` 和链接文字 `OpenAI research`，外链带 `target="_blank"` 和 `rel="nofollow ugc noopener noreferrer"`，正文摘要仍在链接卡下方，无横向溢出，控制台 error 数为 0；390px 移动端同帖链接卡、摘要和移动导航按钮可见，无横向溢出。
- 2026-06-09 排序合同回归：重建本地 `cumt-nexus-api:local` 后运行 `npm run check:main-path`，帖子 `sort=best|hot|new|top|rising` 全部返回 200，评论 `sort=best|top|new|old|controversial` 全部返回 200；脚本现在把这些排序作为严格验收项，不再接受旧后端的 `400 invalid_argument` 降级作为通过。

## 后端需要补或确认

以下不要直接改后端；需要进入后端文档或后端任务：

- Feed source 合同：推荐、全站、关注、社区、用户、搜索结果之间的统一接口或明确拆分接口。前端已发送 `source=recommended|all|following` 并提供 URL / UI，但不能证明后端当前运行时已经真实区分这些数据源。
- Feed sort 时间窗口：`best | hot | new | top | rising` 基础排序已通过本地运行态验收；`top` 的 `t=day|week|month|year|all` 时间范围仍需后端合同。
- 个性化推荐和关注 feed：关注关系、推荐排序、登录 / 未登录降级策略。前端当前只做 URL / UI 和未登录门禁，不伪造关注结果。
- 通知事件类型：回复、@、赞、系统、审核、社区申请必须有稳定 type 和 target。
- 链接预览：普通网页解析、缓存、失败降级、图片安全策略。
- 白名单 embed 后端合同：Bilibili、抖音、网易云、QQ 音乐 provider resolve、短链展开、元数据、审核状态和 `embed_ids` 持久化；前端 canonical 裸链接播放器已先落地。
- 图片后处理：缩略图 URL、对象物理删除、未绑定对象 TTL、失败对象回收。
- 编辑绑定图片：2026-06-08 复核后端当前源码和合同，发布帖子 / 评论请求、`PATCH /api/v1/posts/:id` 和 `PATCH /api/v1/comments/:id` 均已支持 `attachment_ids`。编辑态新增图片绑定已接入，前端保存时按正文实际引用顺序提交图片 ID，后端按帖子 / 评论所有权重新绑定，响应继续返回最新 `attachments`。

## 下一步建议

不要再按“规划是否完成”讨论。后续按体验任务推进：

1. 用浏览器继续完成帖子编辑和评论编辑的新增 / 删除图片保存复验，覆盖真实上传、保存、重新打开详情和阅读态渲染。
2. 继续核对后端 Feed source 的真实合同：前端 URL / UI 已有，帖子和评论排序已通过运行态验收；仍需要证明推荐、全站、关注真正区分。
3. 通知分类页前端壳已落地；继续对接后端稳定事件类型、target 和未读计数。
4. 做链接预览和 embed 后端合同接入：链接预览仍未实现；embed 前端 canonical 裸链接已可显示，下一步是接后端结构化 resolve 和短链。
5. 按 `docs/internal/engineering/browser-qa.md` 跑完整桌面 / 移动端人工 QA，把“反人类”的页面按 P0 / P1 任务修。
