# 前端规划收口证明

本文用于判定“前端规划部分”是否已经完成。它不是新的产品蓝图，而是对现有规划文档的收口索引和完成审计。

规划权威顺序：

1. `docs/internal/product/frontend-information-architecture.md`
2. `docs/internal/product/frontend-experience-rebuild.md`
3. `docs/internal/product/product-targets.md`
4. `docs/internal/architecture/content-system.md`
5. `docs/internal/architecture/content-media-api-gaps.md`

后续实现不能重新设计一套拓扑、视觉方向或权限模型；只能在这些文档范围内按完整任务落地。

## 收口结论

截至 2026-06-07，前端规划部分已完成：

- 页面拓扑已固定。
- App Shell 职责已固定。
- 未登录和登录态权限边界已固定。
- Feed source、sort、URL 规则已固定。
- 帖子详情返回模型已固定。
- slug、id、昵称、头像和展示信息边界已固定。
- 帖子、评论、Markdown、图片、链接预览和白名单 embed 的内容模型已固定。
- 通知、社区申请、平台管理和社区管理入口职责已固定。
- 后端需要补齐的能力已经在产品目标和媒体合同文档中记录。

后续“未完成”主要是实现、后端合同或生产上线事项，不是规划未决。

## 已冻结决策

### 公开读取

未登录用户可以读取：

- 首页 feed。
- 全站 feed。
- 关注 feed 的页面壳；真实关注内容需要登录身份。
- 社区列表。
- 社区详情。
- 社区帖子流。
- 帖子详情。
- 评论树。
- 搜索页壳。
- 用户主页。
- 用户公开帖子列表。
- 用户公开评论列表。

未登录用户不能执行：

- 发帖。
- 评论。
- 投票。
- 举报。
- 通知读取。
- 社区申请。
- 审核。
- 平台管理。
- 社区管理。
- 保存、关注和其他个性化写操作。

受保护动作必须显示清楚登录门禁，并保留 `next` 回跳。

### App Shell

全站主工作区共享同一套 App Shell：

- 顶部 bar 常驻。
- 顶部搜索输入框常驻。
- 通知只在顶部 bell 和通知中心出现。
- 头像菜单只放账号相关入口和有权限的管理工作台。
- 桌面左侧栏常驻。
- 移动端左侧栏收进统一导航。
- 左侧主导航只承载稳定全局浏览入口。
- 左侧下方先展示最近访问社区，后续再加关注社区。
- 社区申请不放左侧栏，只在社区相关页面作为社区功能入口。
- 审核不放左侧栏，平台 staff 从用户菜单进入平台工作台。

### URL

Feed sort 使用路径：

```text
/
/best
/hot
/new
/top
/rising
```

其中 `/` 是推荐 feed 默认入口。`/all` 和 `/following` 是 feed source，不是 sort。

社区 feed 使用：

```text
/communities/:slug
/communities/:slug/best
/communities/:slug/hot
/communities/:slug/new
/communities/:slug/top
/communities/:slug/rising
```

评论 sort 使用 query：

```text
/posts/:id?sort=best
/posts/:id?sort=new
/posts/:id?sort=old
```

搜索保留 query：

```text
/search?q=keyword&scope=all
```

帖子详情不把 `return_to` 放进公开 URL。返回来源优先使用浏览器 history、sessionStorage 或客户端 route state。

### Feed

Feed source 固定为：

- 推荐 feed。
- 全站 feed。
- 关注 feed。
- 社区 feed。
- 用户帖子 feed。
- 搜索结果 feed。

Feed sort 固定为：

- `best`
- `hot`
- `new`
- `top`
- `rising`

`top` 后续需要时间范围：

- `day`
- `week`
- `month`
- `year`
- `all`

Feed item 必须展示：

- 社区 slug 和名称。
- 作者昵称、用户名、头像或头像占位。
- 标题。
- 正文摘要。
- 图片或链接预览。
- 分数、评论数和主要互动入口。
- 来源感知的帖子详情跳转。

不能把 raw id 或短 UUID 当作主要用户界面信息。

### 帖子和评论

帖子与评论共享同一内容模型：

- Reddit-style Markdown 正文。
- 图片附件。
- 普通外链。
- 白名单 embed：前端先支持 canonical 裸链接受控播放器，后端已负责短链、元数据、审核和 `embed.id` 持久化，前端继续接线。
- 统一写作器。
- 阅读态直接渲染最终内容。

不做：

- 用户 HTML。
- 任意 iframe。
- 任意远程图片 URL 当附件。
- 强制编辑 / 预览双模式。
- 前端伪造后端未提供的链接预览、短链解析、元数据、审核状态或 `embed.id` 持久化。canonical 白名单裸链接可由前端受控解析并渲染播放器。

当前 video 不做原生上传或原生播放器，只规划白名单外链播放器。

允许的外链播放器目标：

- Bilibili。
- 抖音。
- 网易云音乐。
- QQ 音乐。

投票和问答后续作为帖子工具能力进入写作器，不在当前规划里拆成完全不同的页面体系。

攻略贴后续可以作为帖子模板或内容工具扩展，底层仍归入帖子内容模型。

### 评论树

评论模型固定为树状讨论：

- 根评论和子评论同一数据结构。
- 支持回复。
- 支持折叠。
- 支持最大深度和继续展开。
- 子评论缩进不能挤压移动端正文。
- 评论正文与帖子正文复用安全渲染入口。

后续评论投票、积分特效、贴图和其他评论效果可以扩展，但不能破坏树状模型。

### 通知

通知入口固定在顶部 bell。

通知中心按类别组织，目标体验借鉴 Bilibili：

- 回复。
- `@`。
- 赞。
- 系统通知。
- 审核或社区申请相关通知。

通知不放左侧栏。通知是否能实时推送是后续能力；当前可轮询或普通列表读取。

### 管理

管理分两类：

- 平台管理：站点管理员或 staff 使用。
- 社区管理：社区 owner、moderator 或后续成员权限使用。

平台管理入口属于有权限用户的工作台，不属于普通左侧导航。

社区管理入口属于具体社区上下文，不属于全局左侧导航。

### 用户主页

用户主页是必需页面。

用户公开页面包括：

- `/users/:username`
- `/users/:username/posts`
- `/users/:username/comments`

用户展示优先使用：

- 昵称。
- 头像。
- 用户名。
- 签名。
- 徽章。
- 角色。
- 后续“漂亮信息”。

不使用 raw id 作为主要显示信息。

## 后端需求记录

这些后端需求已经写入现有文档，前端不能伪造。已补齐的前置合同应从阻塞项移出，只保留后续增强：

- 公开搜索可选 Bearer 已补齐；后续只继续拆评论搜索、标签搜索、高亮、排序和分析。
- 推荐、全站、关注和社区 feed 需要完整 source 合同。
- Feed sort 需要支持 `best | hot | new | top | rising`。
- `top` 需要时间范围。
- 用户公开评论列表需要返回帖子摘要和社区摘要。
- 通知事件源需要覆盖回复、`@`、赞、系统、审核和社区申请。
- 评论投票需要形成后端产品合同。
- 保存、关注和个性化推荐需要后端合同。
- 图片缩略图、对象物理删除、TTL 和失败对象回收需要后端合同确认。
- 普通网页链接预览需要后端解析和缓存。
- Bilibili、抖音、网易云音乐和 QQ 音乐 embed 的短链、元数据、审核状态和 `embed.id` 持久化已经由后端 provider 白名单和安全解析补齐；前端 canonical 裸链接播放器已先落地。
- 社区 staff、moderator、成员加入退出、私密社区和邀请制需要后端合同。

后续新增后端需求时，继续同步到 `docs/internal/product/product-targets.md` 或对应架构文档；如果需要交给后端仓库实施，再复制到后端任务文档。

## 规划完成检查表

- [x] 固定全站视觉方向。
- [x] 固定 App Shell 拓扑。
- [x] 固定未登录可读和禁止动作。
- [x] 固定搜索、通知、申请、审核和管理入口职责。
- [x] 固定 Feed source 和 sort 模型。
- [x] 固定 URL 设计规则。
- [x] 固定帖子详情返回模型。
- [x] 固定 slug、id 和显示信息边界。
- [x] 固定用户主页和公开用户列表。
- [x] 固定帖子和评论内容模型。
- [x] 固定评论树方向。
- [x] 固定通知分类方向。
- [x] 固定平台管理和社区管理分工。
- [x] 记录后端缺口。
- [x] 记录实现派工方式。

因此，后续工作应进入实现、QA、后端合同补齐或上线收口，不再继续做抽象规划。

## 后续执行方式

后续前端任务按真实页面反馈推进：

```text
按 docs/internal/product/frontend-information-architecture.md 和 docs/internal/product/frontend-planning-completion.md 修 [页面/流程]。
本轮围绕这个目标完整处理。
不要改后端；需要后端补什么写进文档。
```

AI 每次实现前必须：

- 读取 `AGENTS.md`。
- 读取 `docs/design/*`。
- 读取本规划收口证明。
- 映射到 `frontend-information-architecture.md` 和 `frontend-experience-rebuild.md`。
- 高风险时说明文件范围、验收范围和风险。
- 按完整任务实现和验证。
