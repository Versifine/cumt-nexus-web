# 前端 V1 架构

本文记录 `cumt-nexus-web` 的 V1 前端架构和产品边界。前端服务于 CUMT Nexus 校园社区内容平台，对接后端 `D:\Projects\cumt-nexus-api`。

## 架构目标

V1 前端要形成这些闭环：

- 用户注册、登录、当前用户识别。
- 社区列表、社区详情和社区帖子列表。
- 发布帖子。
- 帖子详情、评论列表和发布评论。
- 社区创建申请。
- 全站最新帖子流。
- 帖子 upvote/downvote 操作和状态展示。

V1 前端不做：

- 复杂后台审批台。
- 申请列表和申请取消。
- 富文本编辑器。
- 图片上传和媒体管理。
- 个性化推荐。
- hot feed。
- 评论投票。
- 通知、私信和实时能力。

## 技术栈

```text
Next.js App Router
React
TypeScript
Tailwind CSS
shadcn/ui
Motion
TanStack Query
react-hook-form
zod
lucide-react
```

约束：

- 页面优先使用 App Router 的布局能力。
- 和后端 API 交互统一走 client 层，不在页面中散写 `fetch`。
- 服务端状态统一交给 TanStack Query。
- 表单统一使用 react-hook-form + zod。
- shadcn/ui 是基础组件来源，不是视觉成品。
- Motion 用于微交互，不作为页面主要视觉卖点。

## 路由地图

```text
/login
/register
/
/communities
/communities/:slug
/communities/:slug/new
/posts/:id
/community-applications/new
```

页面职责：

| 路由 | 职责 |
| --- | --- |
| `/login` | 登录并写入本地登录态 |
| `/register` | 注册并写入本地登录态 |
| `/` | 全站最新流；后端 feed 未完成时临时显示社区列表或公共总版帖子 |
| `/communities` | 社区列表 |
| `/communities/:slug` | 社区详情和该社区帖子列表 |
| `/communities/:slug/new` | 在指定社区发布帖子 |
| `/posts/:id` | 帖子详情、投票、评论列表和评论发布 |
| `/community-applications/new` | 提交社区创建申请 |

## 模块边界

建议目录结构：

```text
src/
  app/
  components/
    app-shell/
    feedback/
    post/
    community/
    comment/
  features/
    auth/
    community/
    post/
    comment/
    vote/
    feed/
  lib/
    api/
    auth/
    query/
    time/
  styles/
```

边界规则：

- `lib/api` 只负责 HTTP、token、错误映射和基础序列化。
- `features/*` 负责业务 query、mutation、schema 和页面级组合。
- `components/*` 负责可复用 UI，不直接知道后端 URL。
- `app/*` 负责路由、布局和页面组合。
- `vote` 和 `feed` 独立成 feature，不塞进 `post` 页面组件内部。

## API 协作

后端基础地址通过环境变量配置：

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

认证：

```http
Authorization: Bearer <access_token>
```

错误响应：

```json
{
  "error": {
    "code": "unauthenticated",
    "message": "authentication required"
  }
}
```

前端错误处理规则：

- `unauthenticated`：清理 token，跳转登录或显示登录入口。
- `forbidden`：保留页面上下文，提示当前身份不可操作。
- `not_found`：进入资源不存在状态。
- `conflict`：表单内展示冲突原因。
- `invalid_argument`：表单字段或页面顶部错误。
- `internal`：展示通用错误，不暴露技术细节。

## API 清单

当前首版依赖：

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
GET  /api/v1/me
GET  /api/v1/communities
GET  /api/v1/communities/:slug
POST /api/v1/community-applications
POST /api/v1/communities/:slug/posts
GET  /api/v1/communities/:slug/posts
GET  /api/v1/posts/:id
POST /api/v1/posts/:id/comments
GET  /api/v1/posts/:id/comments
```

阶段 6 依赖：

```text
GET    /api/v1/posts
PUT    /api/v1/posts/:id/vote
DELETE /api/v1/posts/:id/vote
```

阶段 6 帖子读取视角应返回：

```json
{
  "upvote_count": 12,
  "downvote_count": 2,
  "score": 10,
  "my_vote": 1
}
```

前端兼容策略：

- `my_vote` 不存在时按 `0` 处理，但不主动伪造投票成功。
- `upvote_count` 和 `downvote_count` 不存在时隐藏投票计数。
- `GET /api/v1/posts` 不可用时，首页退回社区列表或公共总版帖子列表。

## 登录态

阶段 1 可先使用 localStorage 保存 access token。封装要求：

- token 读写只允许出现在 `lib/auth`。
- API client 从 auth store 获取 token。
- 登录和注册成功后保存 token 与 user。
- `/me` 用于刷新当前用户，不把 token claims 当作用户资料。
- `401 unauthenticated` 必须清登录态。

后续如果需要更强安全边界，再迁移到 BFF 或 httpOnly cookie。

## 数据请求

TanStack Query key 建议：

```text
["me"]
["communities"]
["community", slug]
["community-posts", slug, { limit, offset }]
["post", id]
["post-comments", id, { limit, offset }]
["feed", { limit, offset }]
```

mutation 成功后的失效规则：

- 登录、注册：invalidate `["me"]`。
- 发帖：invalidate `["community-posts", slug]` 和 `["feed"]`。
- 评论：invalidate `["post-comments", postId]`。
- 投票：更新 `["post", id]`，并 invalidate 相关列表。
- 申请社区：不自动创建社区，展示申请提交成功状态。

## 页面状态

每个数据页必须有：

- loading skeleton
- empty state
- error state
- authenticated guard
- retry action

不使用大段说明文字解释功能。空状态只告诉用户当前没有什么，以及下一步可做什么。
