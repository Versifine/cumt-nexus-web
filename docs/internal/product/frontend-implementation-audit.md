# 前端规划落地摸排

日期：2026-06-07
更新：2026-06-08

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
- Feed 规划明显没有完整落地：当前只有 `new | hot`，没有 `best | top | rising`，也没有推荐 / 全站 / 关注 feed source 的独立前端架构。
- 通知中心只是最低可用列表，不是规划里的 Bilibili 式分类通知中心。
- 链接预览、评论投票、积分特效和个性化推荐都没有落地；Bilibili / 抖音 / 网易云 / QQ 音乐 canonical 裸链接白名单 embed 已在前端阅读态和写作器编辑态落地，但后端结构化 resolve、短链和 `embed_ids` 持久化仍未接入。

## 落地矩阵

| 能力 | 当前代码事实 | 判定 | 后续处理 |
| --- | --- | --- | --- |
| 全局 App Shell | `src/components/app-shell/app-shell.tsx` 提供左侧首页 / 社区、最近访问、顶部搜索、通知 bell、头像菜单；主要页面已包 `AppShell`。 | 已落地，仍需全站视觉 QA。 | 后续反馈按具体页面任务调整，不重建第二套导航。 |
| 搜索入口 | 顶部搜索输入不会点击即跳转，提交后进入 `/search?q=...&scope=all`；搜索页有 `all | communities | posts`。 | 基础落地。 | 如需 Reddit 式联想 / 快捷搜索，需要单独任务和后端合同。 |
| 通知入口 | 通知不在左侧栏，顶部 bell 进入 `/notifications`；未登录会跳登录。 | 入口落地。 | 通知内容组织仍未达到规划。 |
| 通知中心 | `NotificationCenter` 只有 `未读 / 全部 / 已读`，类型显示依赖后端 `type` 字符串。 | 部分落地。 | 需要回复、@、赞、系统、审核 / 申请分类；后端也需要稳定事件类型。 |
| 社区申请入口 | 申请入口出现在首页右栏、社区相关出口和头像 staff 工作台；不在左侧主导航。 | 基础落地。 | 社区详情内的申请 / 管理入口还需要按权限和具体页面体验继续打磨。 |
| 审核入口 | staff 头像菜单进入举报审核和社区审批；不在左侧主导航。 | 基础落地。 | 需要继续做权限态、空错态和移动端 QA。 |
| 帖子详情返回 | 列表进入帖子时写入 sessionStorage 来源；无来源时 fallback 到所属社区，否则社区索引。 | 已落地。 | 需要浏览器历史、刷新、直接打开三类场景继续 QA。 |
| 个人主页 | `/users/[username]`、`/posts`、`/comments` 已存在；展示头像、昵称、简介、徽章、统计和公开内容入口。 | 基础落地。 | 仍不是完整个人中心；资料编辑、关注、漂亮展示信息需要后端和后续任务。 |
| 首页 / 社区 feed item | 列表项展示社区、作者、标题、摘要、分数、评论数、图片预览。 | 部分落地。 | 链接预览未落地；推荐 / 关注 feed 未落地。 |
| Feed sort | `PostSort = "new" | "hot"`；路由只有 `/`、`/new`、`/hot`；2026-06-08 复核本地后端 API，`sort=best`、`sort=top`、`sort=rising` 均返回 `400 invalid_argument`。 | 明显未完成。 | 需要后端补 `best | top | rising`，`top` 还需要时间范围；前端不伪造排序。 |
| Feed source | 当前没有 `src/features/feed`；首页仍复用 `features/post` 的最新帖子接口。 | 明显未完成。 | 需要推荐 feed、全站 feed、关注 feed、社区 feed 的前后端合同。 |
| 评论 sort | 帖子详情评论请求固定 `sort="new"`，没有评论 sort UI。 | 未完成。 | 若按 Reddit，需要评论区 `best | new | top` 等 query 合同和 UI。 |
| Markdown 阅读态 | `ContentBody` 使用 `react-markdown` + `remark-gfm`，`skipHtml`，安全 URL，帖子和评论复用；本轮已验证帖子详情移动端长代码块不撑破页面，代码块内部横向滚动。 | 基础落地。 | 仍需 Reddit parity 用例审计，例如边界语法、移动端表格和评论深层场景。 |
| Markdown 写作态 | `MarkdownComposerField` 已统一发帖、评论、回复、帖子编辑、评论编辑，改为 Tiptap 单一实时渲染编辑面；工具栏对当前选区或当前块执行格式命令，覆盖行内代码和代码块。Markdown 源码不作为默认编辑 UI 暴露，`editor.getMarkdown()` 负责提交格式。 | 基础落地。 | 仍需继续做 Reddit parity 用例审计、移动端完整 QA，以及真实编辑弹窗新增 / 删除图片的手动复验。 |
| 图片与正文一体化 | 图片上传后进入 Tiptap image 节点并序列化为 `![说明](nexus-attachment:<id>)`；发布帖子、评论和编辑保存都会按正文出现顺序提交实际引用的 `attachment_ids`；阅读态只渲染正文内 marker 引用到的 attachments，不再把未引用附件追加成底部外置图集；外置图片管理组件已移除；`check:v2-path` 已覆盖正文内图片 marker 提交和读取保留，`check:content-segments` 覆盖批量图片插入顺序和发布绑定过滤，`check:content-boundary` 固化 Tiptap 写作入口、剪贴板图片入口、编辑态新增图片绑定已接入和内联图片约束。 | 基础落地。 | 历史未插入正文的附件不会在发布态外挂展示；新增图片只通过编辑器正文位置进入内容，删除正文里的图片后不会随内容提交。 |
| 普通外链 | Markdown 链接可渲染安全链接。 | 基础落地。 | 普通网页链接预览未实现，需要后端解析缓存。 |
| 白名单 embed | `ContentBody` 和 Tiptap 写作器会把裸贴的 Bilibili、抖音、网易云、QQ 音乐 canonical URL 渲染为受控播放器；自定义文字 Markdown 链接仍保持普通链接；源码中只允许白名单播放器组件使用 iframe。 | 前端基础落地。 | 后端仍需 provider resolve、短链展开、元数据、审核状态和 `embed_ids` 持久化。 |
| 评论树 | 评论树、回复、折叠和最大深度已有基础实现。 | 基础落地。 | 评论投票、特效、贴图和排序未实现。 |

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

## 后端需要补或确认

以下不要直接改后端；需要进入后端文档或后端任务：

- Feed source 合同：推荐、全站、关注、社区、用户、搜索结果之间的统一接口或明确拆分接口。
- Feed sort 合同：`best | hot | new | top | rising`，其中 `top` 需要时间范围。当前运行时只接受 `new | hot`，`best/top/rising` 返回 `400 invalid_argument`；前端只能先保留真实可用排序。
- 评论 sort 合同：评论区是否支持 `best | new | top`，以及 URL query 是否持久化。
- 个性化推荐和关注 feed：关注关系、推荐排序、登录 / 未登录降级策略。
- 通知事件类型：回复、@、赞、系统、审核、社区申请必须有稳定 type 和 target。
- 链接预览：普通网页解析、缓存、失败降级、图片安全策略。
- 白名单 embed 后端合同：Bilibili、抖音、网易云、QQ 音乐 provider resolve、短链展开、元数据、审核状态和 `embed_ids` 持久化；前端 canonical 裸链接播放器已先落地。
- 图片后处理：缩略图 URL、对象物理删除、未绑定对象 TTL、失败对象回收。
- 编辑绑定图片：2026-06-08 复核后端当前源码和合同，发布帖子 / 评论请求、`PATCH /api/v1/posts/:id` 和 `PATCH /api/v1/comments/:id` 均已支持 `attachment_ids`。编辑态新增图片绑定已接入，前端保存时按正文实际引用顺序提交图片 ID，后端按帖子 / 评论所有权重新绑定，响应继续返回最新 `attachments`。

## 下一步建议

不要再按“规划是否完成”讨论。后续按体验任务推进：

1. 用浏览器继续完成帖子编辑和评论编辑的新增 / 删除图片保存复验，覆盖真实上传、保存、重新打开详情和阅读态渲染。
2. 做 Feed source + 五种 sort 任务：先核对后端，再扩路由和 UI。
3. 做通知分类任务：先定义类型映射，再做 Bilibili 式分类页。
4. 做链接预览和 embed 后端合同接入：链接预览仍未实现；embed 前端 canonical 裸链接已可显示，下一步是接后端结构化 resolve 和短链。
5. 按 `docs/internal/engineering/browser-qa.md` 跑完整桌面 / 移动端人工 QA，把“反人类”的页面按 P0 / P1 任务修。
