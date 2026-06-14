# 平台管理功能设计

本文定义 `cumt-nexus-web` 平台管理区的产品结构、页面职责、接口边界和首版落地范围。目标是把当前分散的举报审核、社区审批和后端已存在的 `/api/v1/admin/*` 能力组织成一个完整、可验收的站点级后台。

## 现状判断

当前前端已有：

- 用户菜单按 `is_platform_staff` 显示 staff 入口。
- `/moderation` 和 `/moderation/reports/:id`：全站举报审核。
- `/community-applications/review`：社区申请列表、详情、通过和拒绝。

当前缺口：

- 没有统一的 `/admin` 平台管理入口和二级导航。
- 举报审核、社区审批仍像两个孤立页面，缺少共同的管理上下文。
- 后端已提供的用户、社区、效果、运行开关、审计日志、积分流水、手工调分和头衔管理没有前端工作台。
- 没有统一的危险操作模式、审计可见性和操作后反馈规则。

## 设计原则

- 平台管理是站点级后台，不混入普通信息流导航；仍保留 App Shell 顶栏、搜索和账号菜单。
- 首版只展示后端已存在能力，不做虚假的数据大屏、聚合统计或不可用入口。
- 管理页以列表、详情、状态标签、右侧上下文栏和明确分页为主，不做营销式 hero 或复杂装饰。
- 所有写操作必须有提交中、成功、失败、禁用和重复提交保护；危险操作必须有明确后果说明。
- 所有管理写操作完成后刷新当前列表、详情和审计日志相关 query。
- 前端入口显隐只提升体验，最终权限仍以后端 `401/403` 为准。

## 路由拓扑

首版采用 `/admin/*` 作为统一平台管理路由，旧页面保留跳转兼容：

```text
/admin
/admin/reports
/admin/reports/:id
/admin/community-applications
/admin/users
/admin/communities
/admin/effects
/admin/settings
/admin/audit-logs
/admin/points
/admin/titles
```

兼容策略：

- `/moderation` 重定向或软迁移到 `/admin/reports`。
- `/moderation/reports/:id` 重定向或软迁移到 `/admin/reports/:id`。
- `/community-applications/review` 重定向或软迁移到 `/admin/community-applications`。
- 用户菜单只显示一个一级入口 `平台管理`，进入 `/admin`；二级入口在平台管理内部展示。

## 统一页面骨架

平台管理区使用 `AdminShell` 业务壳，不替代全站 `AppShell`：

- 左侧或顶部二级导航：总览、举报、社区审批、用户、社区、效果、运行开关、审计、积分、头衔。
- 主内容区：当前资源列表或详情。
- 右侧上下文栏：当前筛选、操作规则、审计入口和稳定出口。
- 移动端：二级导航折叠为横向 tabs 或下拉入口，主体单列，表格改为列表。

权限状态：

- 未登录：展示登录门禁，保留 `next`。
- 登录但非 staff：展示无权限状态，提供回到首页。
- staff 校验中：保留页面骨架和 skeleton。
- 后端返回 `unauthenticated` 或 `forbidden`：转为可理解中文错误，不伪造成空列表。

## 页面设计

### `/admin` 总览

职责：提供平台管理入口地图和最近工作上下文，不做不存在的统计聚合。

首版内容：

- 运行开关摘要：读取 `GET /api/v1/admin/settings`。
- 待处理入口：举报审核、社区审批，使用各自列表第一页作为摘要。
- 最近审计：读取 `GET /api/v1/admin/audit-logs?limit=5&offset=0`。
- 管理域入口：用户、社区、效果、积分、头衔。

不做：

- 全站用户数、社区数、举报总数这类后端没有提供的聚合指标。
- 图表大屏。

### `/admin/reports`

职责：全站举报队列。

沿用当前 `/moderation` 能力，调整到统一 admin 骨架：

- 状态 tabs：待处理、已处理、已驳回。
- 列表项显示目标类型、状态、时间、举报理由摘要、目标预览标题。
- 详情页支持驳回举报和移除目标。
- 操作成功后刷新举报列表、举报详情、目标详情、相关 feed/list 和审计日志。

### `/admin/community-applications`

职责：社区申请审批。

沿用当前审核台能力：

- 状态 tabs：待审核、已通过、已拒绝。
- 双栏布局：左侧申请列表，右侧详情和审批动作。
- 通过申请后显示创建出的社区入口。
- 拒绝申请必须填写原因。
- 操作成功后刷新申请列表、详情、社区列表和审计日志。

### `/admin/users`

职责：站点级用户管理。

接口：

- `GET /api/v1/admin/users?status=all|active|disabled|deleted&limit=20&offset=0`
- `PATCH /api/v1/admin/users/:id`
- `GET /api/v1/admin/users/:id/titles`
- `POST /api/v1/admin/users/:id/titles`
- `DELETE /api/v1/admin/users/:id/titles/:grant_id`
- `POST /api/v1/admin/users/:id/points/adjust`

首版 UI：

- 用户列表：用户名、状态、staff 标记、创建时间、更新时间。
- 状态筛选：全部、正常、禁用、已删除。
- 行内详情抽屉或右侧详情栏：用户基础信息、staff 标记、状态管理、积分调整、头衔授予。
- 禁用/恢复用户：二次确认，说明会影响登录和内容操作。
- staff 标记：高风险操作，必须确认，不允许当前用户把自己降级后页面继续假设有权限。
- 手工调分：输入 `delta` 和 `reason`，`delta=0` 前端禁用提交；提交后显示余额变化和新流水。
- 头衔授予：从头衔目录选择，填写原因和可选过期时间；撤销需要确认。

边界：

- 后端列表没有公开资料、邮箱和搜索字段，首版不做关键词搜索。
- 删除账号不是首版能力，除非后端合同新增明确接口。

### `/admin/communities`

职责：站点级社区治理。

接口：

- `GET /api/v1/admin/communities?status=all|active|suspended|archived&limit=20&offset=0`
- `PATCH /api/v1/admin/communities/:id`

首版 UI：

- 社区列表：名称、slug、类型、可见性、状态、创建者、更新时间。
- 状态筛选：全部、正常、已暂停、已归档。
- 状态变更：active、suspended、archived。
- 每行提供公共社区页入口和社区内管理页入口。
- 右侧栏解释站点级状态和社区 owner/moderator 管理权限的区别。

边界：

- 社区名称、简介、规则仍由社区管理页处理，不放到平台社区列表里重复编辑。
- 不做批量操作。

### `/admin/effects`

职责：评论效果目录运营。

接口：

- `GET /api/v1/admin/effects?active=all|true|false&limit=20&offset=0`
- `PATCH /api/v1/admin/effects/:id`

首版 UI：

- 效果列表：名称、描述、消耗积分、资源地址、动画 key、启用状态。
- 筛选：全部、启用、停用。
- 启用/停用：使用 switch 或文字动作，提交中禁用。
- 停用说明：历史评论效果仍展示，但不可再次购买。

边界：

- 创建效果、上传资源、编辑价格不在当前后端合同里，首版不展示入口。

### `/admin/settings`

职责：平台运行开关。

接口：

- `GET /api/v1/admin/settings`
- `PATCH /api/v1/admin/settings/:key`

首版 UI：

- `registration_enabled`：注册开关。
- `posting_enabled`：发帖和评论开关。
- `upload_enabled`：图片上传开关。
- 每个开关显示当前状态、最后更新人、最后更新时间。
- 关闭开关必须确认，并说明影响范围。

交互规则：

- switch 改动后不要立即静默提交；显示确认 dialog。
- 成功后刷新设置和审计日志。
- 如果接口未返回某个开关，按“后端默认启用但配置未落库”展示只读提示，不让用户误以为已经保存。

### `/admin/audit-logs`

职责：管理操作审计。

接口：

- `GET /api/v1/admin/audit-logs?target_type=&target_id=&limit=20&offset=0`

首版 UI：

- 审计列表：动作、目标类型、目标 ID、操作者、时间。
- 详情展开：`before` 和 `after` 使用格式化 JSON 区块展示。
- 筛选：目标类型、目标 ID。
- 从用户、社区、效果、设置、积分、头衔页面跳转审计时带上过滤参数。

边界：

- 后端没有 actor 用户名，首版显示 actor ID 短号。
- 不做审计导出。

### `/admin/points`

职责：积分流水查看和异常修正入口。

接口：

- `GET /api/v1/admin/point-transactions?user_id=<uuid>&limit=20&offset=0`
- `POST /api/v1/admin/users/:id/points/adjust`

首版 UI：

- 积分流水列表：用户 ID、变动值、变动后余额、来源、原因、时间。
- 可按用户 ID 过滤。
- 手工调分入口优先放在用户详情；本页提供“按用户 ID 调整”的窄表单。
- 调分成功后刷新流水和审计日志。

边界：

- 没有用户搜索接口时，不做用户名搜索选人。
- 不把经验 XP 和积分混在同一张列表里。

### `/admin/titles`

职责：头衔目录和授予治理。

接口：

- `GET /api/v1/admin/titles?scope_type=all|platform|system|community&active=all|true|false&limit=20&offset=0`
- `POST /api/v1/admin/titles`
- `PATCH /api/v1/admin/titles/:id`
- `GET /api/v1/admin/users/:id/titles`
- `POST /api/v1/admin/users/:id/titles`
- `DELETE /api/v1/admin/users/:id/titles/:grant_id`

首版 UI：

- 头衔目录列表：名称、描述、范围、scope ID、启用状态、创建者、更新时间。
- 创建头衔：名称、描述、范围、scope ID。
- 更新头衔：名称、描述、启用状态。
- 保留词错误按后端错误显示；前端只做长度和必填校验。
- 用户授予和撤销入口放在 `/admin/users` 的用户详情中，本页提供目录维护。

边界：

- 社区版主授予社区头衔属于社区管理后续能力，不放入平台首版。

## 组件和代码组织

建议新增：

```text
src/app/admin/
src/features/admin/
  api.ts
  queries.ts
  types.ts
  admin-shell.tsx
  admin-dashboard.tsx
  admin-users-page.tsx
  admin-communities-page.tsx
  admin-effects-page.tsx
  admin-settings-page.tsx
  admin-audit-logs-page.tsx
  admin-points-page.tsx
  admin-titles-page.tsx
```

复用：

- `AppShell`
- `TextAction`
- `StatusToken`
- `MetricBlock`、`InfoRow`、`MetaCell`
- `EmptyState`、`ErrorState`、`LoadingState`
- shadcn/ui `Button`、`Tabs`、`Dialog`、`Textarea`、`Input`、`Switch`

不要新增第二套 UI 库或管理后台模板。

## Query Key 和刷新规则

建议 query key：

```text
admin.all
admin.users(status, limit, offset)
admin.communities(status, limit, offset)
admin.effects(active, limit, offset)
admin.settings()
admin.auditLogs(targetType, targetId, limit, offset)
admin.pointTransactions(userId, limit, offset)
admin.titles(scopeType, active, limit, offset)
admin.userTitles(userId, limit, offset)
```

写操作后至少刷新：

- 对应资源列表。
- 当前详情或当前行数据。
- `admin.auditLogs`。
- 影响公共展示的资源 query，例如社区状态变更后刷新 `communities` 和对应社区详情。
- 影响当前用户权限的操作，例如 staff 标记变更后刷新 `currentUser`。

## 首版实施顺序

1. 建立 `/admin` 路由、`AdminShell`、统一权限门禁和二级导航。
2. 迁移举报审核和社区审批到 `/admin/*`，保留旧路由兼容。
3. 接入运行开关和审计日志，因为它们能验证所有后续写操作。
4. 接入用户和社区管理。
5. 接入效果、积分和头衔管理。
6. 补齐浏览器 QA：桌面、移动端、未登录、非 staff、staff、写操作成功/失败。

## 验收标准

- 非 staff 看不到用户菜单里的平台管理入口；直接访问 `/admin/*` 也得到无权限状态。
- staff 从 `/admin` 能到达所有已实现平台管理页。
- 所有列表有 loading、empty、error、分页结束和刷新状态。
- 所有写操作有 disabled、submitting、success、error 和重复提交保护。
- 危险操作必须确认，并说明后果。
- 操作成功后相关列表和审计日志刷新。
- 移动端无横向溢出，表格型信息退化为列表或可横向滚动。
- 页面文案为简体中文，视觉符合 `dark editorial product / magazine-grade campus community interface`。

## 后端缺口

首版不需要新增后端接口。

可选增强但不阻塞首版：

- 平台总览聚合统计：待处理举报数、待审批申请数、活跃用户数、社区数。
- 用户搜索：按 username 精确或前缀查找管理对象。
- 审计日志 actor/target 展示名补全。
- 社区级头衔授予工作流。
- 效果资源上传和价格编辑。
