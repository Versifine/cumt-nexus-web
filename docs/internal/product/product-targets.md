# 产品目标总表

本文是 `cumt-nexus-web` 的产品能力目标总表，用来给后续派工、阶段切换和前后端协作提供统一入口。

本文不替代：

- `docs/design/DESIGN.md`：视觉和交互方向。
- `docs/internal/product/frontend-information-architecture.md`：前端信息架构、页面拓扑、URL、权限边界和后端目标合同蓝图。
- `docs/internal/product/v2-roadmap.md`：V2 产品路线图和实施顺序。
- `docs/internal/architecture/frontend-v1.md`：前端架构和模块边界。
- `docs/internal/architecture/content-system.md`：内容系统讨论稿。
- `docs/internal/engineering/launch-readiness.md`：上线前验收边界。

本文记录到产品能力层级，不细化到文件、组件或接口实现细节。实现任何能力前仍要重新核对后端当前合同，并按 `AGENTS.md` 的小纵向切片推进。

## 产品方向

CUMT Nexus Web 是公开可读、登录后参与的校园社区内容产品，不做营销首页。当前长期形态是：

```text
Reddit-style campus community content system
```

含义：

- 用户围绕社区发起帖子。
- 未登录用户可以阅读公开 feed、社区、帖子、评论、搜索和用户主页。
- 登录用户可以发帖、评论、投票、收藏、申请社区、接收通知和进入有权限的管理区。
- 帖子承载正文、评论、投票和后续媒体能力。
- 评论采用树状讨论结构。
- 正文能力以 Reddit Markdown 为理想形态，目标是让帖子和评论支持 Reddit 风格的完整格式能力。
- 写作体验不做“写 Markdown 文档 + 单独预览 tab”的割裂流程；更接近 Reddit：常用格式通过工具动作完成，高级用户仍可使用 Markdown 语法。
- 阅读态必须直接渲染最终内容。
- 不做任意 HTML 富文本编辑器，不保存用户生成 HTML。
- 媒体能力以后端为权威，不允许前端伪造上传、对象存储或播放器能力。
- 视觉上保持 `dark editorial product / magazine-grade campus community interface`，不照搬 Reddit 皮肤。

## 已实现能力

### 账号与会话

- 注册。
- 登录。
- 当前用户识别。
- 本地 access token 会话。
- 退出登录和会话失效后的 TanStack Query 缓存清理。
- 未登录访问受保护入口时提供登录 / 注册入口，并保留 `next` 回跳。

### 社区

- 社区列表。
- 社区详情。
- 社区帖子列表。
- 提交社区创建申请。

### 帖子

- 全站帖子流。
- 全站帖子流最新 / 热门切换。
- 在指定社区发布帖子。
- 帖子详情。
- 帖子 upvote / downvote / 取消投票。
- 作者编辑帖子。
- 作者软删除帖子。

### 评论

- 帖子评论列表。
- 发布根评论。
- 回复评论。
- Reddit-style 评论树展示。
- 折叠和展开评论分支。
- 作者编辑评论。
- 作者软删除评论。

### 内容编辑与渲染

- 帖子和评论阅读态复用 `ContentBody`。
- `react-markdown` + `remark-gfm` 安全渲染 Reddit-style Markdown 子集。
- 开启 `skipHtml`，不渲染用户 HTML。
- 链接只允许站内路径、锚点、`http`、`https` 和 `mailto`。
- 支持 GFM 表格、任务列表、删除线、代码块、引用、列表和标题。
- 支持 Reddit-style spoiler / 涂黑语法 `>! ... !<`。
- 支持 Reddit-style 上标预处理。
- 发帖、根评论、回复评论、帖子编辑和评论编辑使用单一写作面板，不提供编辑 / 预览双模式。
- 写作面板提供加粗、斜体、引用、代码、链接和涂黑格式工具动作。
- 用户内容渲染边界自检，禁止原始 HTML、未批准 iframe、`rehype-raw` 和 `dangerouslySetInnerHTML`。

### 媒体附件

- 发帖图片上传。
- 评论图片上传。
- 上传走 `POST /api/v1/uploads/images`。
- 发帖和评论提交 `attachment_ids`。
- 帖子详情展示图片附件。
- 评论树展示图片附件。
- 上传前提示并拦截后端默认限制：JPEG / PNG / WebP、单图 5MB、发帖最多 9 张、评论最多 1 张。
- 上传中、上传失败、失败重试、删除待提交附件、对象清理提示和 disabled 状态。

### 发现与反馈

- 搜索页 `/search`。
- 搜索 scope：`all | communities | posts`。
- 搜索关键词和 scope 同步到 URL query。
- 搜索 loading、empty、error 状态。
- 公开用户主页 `/users/:username` 基础资料页。
- 公开用户主页展示昵称、头像占位、签名、简介、徽章、角色和公开帖子 / 评论统计。
- 用户公开帖子列表 `/users/:username/posts`。
- 用户公开帖子列表支持未登录读取、最新 / 热门排序、empty、error 和返回用户主页。
- 用户公开评论列表 `/users/:username/comments`。
- 用户公开评论列表支持未登录读取、empty、error、返回用户主页和跳转原帖。
- 通知中心 `/notifications`。
- 通知全部 / 未读 / 已读视图。
- 通知标记已读。
- 通知来源的保守跳转。

### 举报与审核

- 普通用户举报帖子。
- 普通用户举报评论。
- 审核台举报列表。
- 审核台举报详情。
- 展示后端 `target_preview`。
- dismiss 举报。
- remove target。
- 帖子 moderation remove。
- 评论 moderation remove。
- staff-only 入口根据 `/api/v1/me.is_platform_staff` 精确显隐。
- forbidden 状态仍由后端权限校验兜底。

### 社区申请审批

- 提交社区创建申请。
- staff 审核入口 `/community-applications/review`。
- 按 `pending | approved | rejected` 查看社区申请列表。
- 查看社区申请详情。
- 对待审申请 approve。
- 对待审申请 reject，并填写拒绝原因。
- loading、error、success 和 disabled 状态。
- 审批通过后的社区创建和 owner 成员关系由后端事务保证。

### 工程与上线收口

- 全局错误页和 404。
- 页面级标题、描述、`robots.txt` 和 `sitemap.xml`。
- 基础 favicon、Web App Manifest、Open Graph 和 Twitter 分享元信息。
- 前端 `/healthz`。
- 前后端 `/readyz`。
- 基础安全响应头。
- 静态质量门禁、API 边界、依赖边界、中文文案边界、UI 基础件复用检查。
- 本地主链路检查、V2 主链路检查和公开路由 smoke 检查。
- 真实浏览器 QA 记录，包括帖子详情登录门禁、登录回跳、评论树、Reddit Markdown、搜索、通知、审核台、社区申请审核入口和移动端窄屏无横向溢出。

## 前端未完成能力

### P0 deferred：生产上线配置

用户当前还没有正式域名，因此以下事项不阻塞 V2 本地初版，但阻塞真实公网生产上线：

- 生产 `NEXT_PUBLIC_SITE_URL`。
- 生产 `NEXT_PUBLIC_API_BASE_URL`。
- 生产后端 CORS allowlist 复验。
- 生产发布后验证和回滚演练。
- 生产环境完整人工 QA。

### P1：内容系统后续增强

- 更接近 Reddit 的完整 Markdown 细节兼容性审查。
- Markdown 工具动作补齐列表、标题、删除线、代码块和表格快捷插入。
- 图片数量、类型、大小提示和失败重试已完成前端产品化；图片缩略图 URL、未绑定对象物理删除 / TTL 和失败对象回收仍需以后端后续合同为准继续细化。
- 白名单外链 embed 展示。
- 普通网页链接预览。

内容能力目标可以对齐 Reddit，但实现必须继续遵守本项目安全边界：不存用户 HTML、不开放任意 iframe、不绕过 `ContentBody`。

### P1：V2 产品化能力

V2 详细路线见 `docs/internal/product/v2-roadmap.md`。优先级固定为：

1. 新后端缺口继续同步到 `backend-api-needs.md`。
2. 统一 App Shell：首页、社区、搜索、通知、审核等主工作区必须共享左侧栏目、顶部 bar、移动端收起导航和当前路由高亮，避免页面之间像不同产品。
3. 图片限制、缩略图、失败重试和对象清理提示继续产品化。
4. 白名单 embed、链接预览、评论投票和通知事件源增强继续拆分。
5. 浏览器 QA 和生产 deferred 项继续拆分到后续上线切片。

### P2：产品扩展能力

- 个人资料编辑。
- 头像上传。
- 邮箱。
- 账号设置。
- 社区申请取消。
- 个性化推荐。
- 私信。
- 实时能力。

## 后端能力缺口或未完全收口

这些不是前端直接实现项，但会影响前端派工顺序。前端推进中发现的新接口需求，先写入根目录 `backend-api-needs.md`，并保持该文件在 `.gitignore` 中。

- 公开搜索仍有后端缺口：当前后端 `GET /api/v1/search` 注册在 `RequireAuth` 保护分组，合同 Auth 列仍是 Bearer，handler 还强制要求 `CurrentUserID`。产品目标要求未登录用户能搜索公开社区和公开帖子；后端需要把该读取接口改为可选 Bearer：无 token 时搜索 active public 社区和 visible public 帖子，有有效 token 时返回当前用户视角，无效 token 仍返回 `unauthenticated`。前端不能伪造搜索结果。
- 推荐、全站、关注和社区 feed 的完整排序仍有后端缺口：当前 `GET /api/v1/posts` 只接受 `sort=new|hot`，真实探测显示 `sort=best`、`sort=top` 和 `sort=rising` 返回 `400 invalid_argument`。产品目标要求 `best | hot | new | top | rising`，其中 `top` 还需要 `t=day|week|month|year|all` 时间范围；后端需要补齐排序合同和推荐 / 全站 / 关注 feed source，前端不能自己发明排序算法。
- 图片缩略图、对象清理、对象物理删除和失败对象回收是否已完成，仍需以后端最终合同复核；前端当前只展示待提交附件移除后的清理提示，不直接删除对象。
- 通知事件源是否覆盖回复、审核、内容生命周期等业务事件，仍需以后端最终合同复核。
- 社区 staff / moderator 管理、成员加入退出、私密社区和邀请制仍不是当前前端可接能力。
- 评论投票尚未形成后端产品合同。
- 用户公开评论列表当前后端只返回 `post_id`，未返回帖子标题、社区 slug 或评论所在上下文；前端先稳定链接到原帖，后续如果要做漂亮上下文，需要后端在 `GET /api/v1/users/:username/comments` 返回帖子摘要和社区摘要。
- 搜索增强仍未覆盖评论搜索、标签搜索、高亮、排序和分析。
- 如果后端需要区分纯文本、Reddit Markdown 和媒体附件，必须确认存储模型、读取返回结构、迁移策略和安全校验边界。

## 明确不做

当前阶段不做：

- 营销首页。
- 任意用户 HTML。
- 任意 iframe。
- 开放任意远程图片 URL 作为附件。
- 任意 HTML 富文本编辑器。
- 强制编辑 / 预览双模式。
- 大范围视觉改版。
- 第二套 UI 组件库。
- 在前端伪造后端未完成能力。

## 派工顺序建议

V2 本地初版已完成收口，后续前端优先顺序是：

1. 保持 `check:static`、`check:docs`、`check:routes`、`check:readiness`、`check:main-path` 和 `check:v2-path` 通过。
2. 把新增后端缺口同步给 `cumt-nexus-api`。
3. 先拆统一 App Shell 和主导航一致性，再继续拆分白名单 embed、链接预览、评论投票、通知事件源增强，以及图片缩略图 / 对象物理清理等后端合同项。

如果目标是首版上线，优先顺序是：

1. 本地封版验收。
2. 生产 HTTPS 前端地址。
3. 生产 API 地址。
4. 生产 CORS allowlist。
5. 发布后验证和回滚演练。

## 更新规则

出现以下情况时必须同步更新本文：

- 新增或完成一个产品能力。
- 后端新增、删除或改变前端可接入的产品合同。
- README 的已实现范围或暂不做范围发生变化。
- `tasks.md` 进入新阶段或记录新的上线收口结论。
- 新增产品能力相关架构文档或提示词模板。
