# 平台管理前端实施计划

本文把 `docs/internal/product/platform-admin-design.md` 落成前端可执行计划。平台角色、社区成员治理、平台接管社区负责人、账号处罚和社区范围内容移除已经有正式后端合同；前端实现必须走这些真实接口，不再保留“等待后端”的占位入口。

## 当前前提

已存在前端能力：

- `/moderation`：全站举报审核。
- `/moderation/reports/:id`：举报详情和处理。
- `/community-applications/review`：社区申请审核。
- `/admin/growth`：成长系统管理，已覆盖评论效果、头衔、授予和积分流水的一部分。

已存在后端合同，可直接接入：

- `GET /api/v1/admin/users?status=...&q=...`
- `PATCH /api/v1/admin/users/:id`
- `GET /api/v1/admin/communities?status=...&q=...`
- `PATCH /api/v1/admin/communities/:id`
- `GET /api/v1/admin/effects`
- `PATCH /api/v1/admin/effects/:id`
- `GET /api/v1/admin/settings`
- `PATCH /api/v1/admin/settings/:key`
- `GET /api/v1/admin/audit-logs?target_type=...&target_id=...&q=...`
- `GET /api/v1/admin/point-transactions`
- `POST /api/v1/admin/users/:id/points/adjust`
- `PATCH /api/v1/admin/users/:id/platform-role`
- `GET /api/v1/admin/users/:id/sanctions`
- `POST /api/v1/admin/users/:id/sanctions`
- `POST /api/v1/admin/user-sanctions/:sanction_id/revoke`
- `POST /api/v1/admin/communities/:id/owner`
- `POST /api/v1/communities/:slug/manage/moderators`
- `DELETE /api/v1/communities/:slug/manage/moderators/:user_id`
- `POST /api/v1/communities/:slug/manage/owner-transfer`
- `POST /api/v1/communities/:slug/manage/owner-transfer/:transfer_id/accept`
- `POST /api/v1/communities/:slug/moderation/posts/:id/remove`
- `POST /api/v1/communities/:slug/moderation/comments/:id/remove`
- `/api/v1/admin/titles` 和 `/api/v1/admin/users/:id/titles`

已开放的能力：

- 站点负责人在用户管理页设置平台管理员、平台审核员或移除平台权限。
- 用户管理页查看处罚记录，平台 owner/admin 按权限创建固定档位账号封禁并撤销 active 处罚。
- 平台社区页暂停、恢复、归档社区，并提供异常社区负责人接管。
- 社区管理页由社区负责人任命 / 取消版主、创建社区负责人转让；目标账号通过 `/communities/:slug/owner-transfer/:transferId/accept` 接受。
- 社区负责人或版主可在社区管理页移除本社区帖子、评论和举报目标。

暂不开放的能力：

- 在普通用户管理页新增或解除站点负责人。
- 站点负责人交接的发起、接受、取消；当前页面只展示后端合同未接入说明和恢复路径。
- 忘记密码离线恢复和被盗号紧急恢复的网页接管。
- 删除社区。

原因：站点负责人变更风险高于普通角色调整，且本地后端没有注册平台级 `/api/v1/admin/owner-transfer`；前端不复用用户列表里的角色按钮，删除社区仍不是当前后端合同。

站点负责人规则：

- 平台同一时间只允许 1 个 active 站点负责人。
- 站点负责人交接必须是独立页面或独立后台流程，不复用用户列表里的角色按钮。
- 交接采用双确认：当前站点负责人发起，目标账号接受，接受时后端事务替换唯一 owner。
- 平台站点负责人交接必须使用独立后端合同、bootstrap 或离线恢复；在本地后端未注册 `/api/v1/admin/owner-transfer` 时，前端不能用普通平台角色接口替代。
- 社区负责人转让使用 `/communities/:slug/owner-transfer/:transferId/accept`，只接受已经指向当前账号的 pending transfer，不提供接管能力。
- 站点负责人忘记密码优先走邮箱恢复；无法恢复或被盗号时走离线 recovery 脚本，不在前端提供“管理员接管 owner”按钮。
- 如果本地后端没有正式站点负责人交接合同，前端不能用普通平台角色接口替代提交；只能展示未接入说明和恢复路径。

## 目标体验

- 用户菜单只出现一个平台入口：`平台管理`，进入 `/admin`。
- `/admin` 内部提供统一二级导航：总览、举报、社区审批、用户、社区、成长、运行开关、审计。
- 所有 admin 页面共用权限门禁、页面骨架、右侧上下文栏、分页和错误状态。
- 平台审核员、平台管理员、站点负责人按 `platform_role` 做差异化显隐；后端未返回角色时用 `is_platform_staff` 兼容进入后台，但不开放角色调整。
- 高危能力先做可审计的真实操作：禁用 / 恢复用户、账号封禁 / 撤销、平台角色调整、暂停 / 归档社区、异常接管负责人、开关设置、积分调整、效果启停、头衔目录和授予。
- 帖子详情页为有权限用户提供管理快捷区：移除当前帖子、进入作者管理、查看帖子审计、进入社区管理。
- 不做假统计大屏；总览只展示真实接口第一页摘要和入口地图。

## 实施阶段

### 阶段 1：统一平台管理壳

目标：先建立 `/admin` 入口和统一管理导航，把分散后台页面收拢。

新增或调整文件：

```text
src/app/admin/page.tsx
src/features/admin/admin-shell.tsx
src/features/admin/admin-dashboard.tsx
src/features/admin/permission-gate.tsx
src/features/admin/display.ts
src/components/app-shell/app-shell.tsx
```

工作内容：

- 新增 `AdminShell`，放在 `AppShell` 内部，不替代全站顶栏。
- 二级导航包含：总览、举报、社区审批、用户、社区、成长、运行开关、审计。
- 新增 `AdminPermissionGate`：
  - 未登录：登录门禁，保留 `next`。
  - 非 staff：无权限状态。
  - staff 校验中：保留页面骨架和 skeleton。
  - 后端 `401/403`：展示中文错误。
- 用户菜单里的 `举报审核` 和 `社区审批` 合并为一个 `平台管理` 入口。
- `/admin` 总览只读取真实接口摘要：
  - `GET /api/v1/admin/settings`
  - `GET /api/v1/admin/audit-logs?limit=5&offset=0`
  - `GET /api/v1/moderation/reports?status=pending&limit=5&offset=0`
  - `GET /api/v1/community-applications?status=pending&limit=5&offset=0`

验收：

- 非 staff 不显示用户菜单平台入口。
- 直接访问 `/admin` 时未登录、非 staff、staff 三种状态都正确。
- `/admin` 页面没有假数据统计。
- 桌面和移动端无横向溢出。

### 阶段 2：迁移举报和社区审批

目标：把已有两个后台能力纳入统一 `/admin/*`，保留旧路由兼容。

新增或调整文件：

```text
src/app/admin/reports/page.tsx
src/app/admin/reports/[id]/page.tsx
src/app/admin/community-applications/page.tsx
src/app/moderation/page.tsx
src/app/moderation/reports/[id]/page.tsx
src/app/community-applications/review/page.tsx
src/features/moderation/moderation-console.tsx
src/features/community/community-application-review.tsx
```

工作内容：

- `/admin/reports` 复用现有 `ModerationConsole`，但改为 AdminShell 内页面。
- `/admin/reports/:id` 复用现有举报详情。
- `/admin/community-applications` 复用现有社区审批台。
- 旧路由策略：
  - 首选使用 `redirect()` 到新路由。
  - 如果需要过渡，也可以保留旧页面但用同一组件。
- 右侧栏中的“其他入口”改为 admin 内部入口。
- 审核成功后继续刷新举报、申请、目标详情和相关列表 query。

验收：

- 新旧路由都能到达同一能力。
- 举报和审批页面视觉骨架一致。
- 所有旧文案里的 `staff` 改为中文平台权限描述。

### 阶段 3：补齐 admin API 和 query 层

目标：把当前 admin API 拆成完整的平台管理数据层，支持用户、社区、设置、审计。

调整文件：

```text
src/features/admin/api.ts
src/features/admin/queries.ts
src/features/admin/types.ts
```

工作内容：

- 补充用户状态筛选：`status=all|active|disabled|deleted`。
- 补充用户更新：`PATCH /api/v1/admin/users/:id` 只处理账号状态；平台权限改用 `PATCH /api/v1/admin/users/:id/platform-role`，不再暴露旧 `is_platform_staff` 写入口。
- 补充社区列表和状态更新：
  - `GET /api/v1/admin/communities`
  - `PATCH /api/v1/admin/communities/:id`
- 补充运行开关：
  - `GET /api/v1/admin/settings`
  - `PATCH /api/v1/admin/settings/:key`
- 补充审计日志：
  - `GET /api/v1/admin/audit-logs?target_type=...&target_id=...&q=...`
- 完整 query key：

```text
admin.all
admin.dashboard
admin.users(status, limit, offset)
admin.communities(status, limit, offset)
admin.effects(active, limit, offset)
admin.settings()
admin.auditLogs(targetType, targetId, limit, offset)
admin.pointTransactions(userId, limit, offset)
admin.titles(scopeType, active, limit, offset)
admin.userTitles(userId, limit, offset)
```

验收：

- 所有 admin API 只通过 `src/features/admin/api.ts` 调用。
- 写操作成功后至少刷新对应列表和 `admin.auditLogs`。
- 没有页面内散写 `fetch`。

### 阶段 4：用户管理和社区管理

目标：接入真实用户、平台角色、账号处罚、社区状态和异常社区负责人接管能力。

新增文件：

```text
src/app/admin/users/page.tsx
src/app/admin/communities/page.tsx
src/features/admin/admin-users-page.tsx
src/features/admin/admin-communities-page.tsx
src/features/admin/admin-user-sanctions.tsx
```

用户管理首版：

- 用户列表：用户名、状态、平台角色、兼容 staff 标记、创建时间、更新时间。
- 状态筛选：全部、正常、禁用、已删除。
- 支持禁用 / 恢复用户，必须二次确认。
- 站点负责人可把普通用户设为平台管理员、平台审核员或移除平台权限；不在此处新增或解除站点负责人。
- 用户状态操作也按平台角色收紧：站点负责人账号不在网页后台禁用或恢复；平台管理员只能处理无平台角色的普通账号。
- 处罚记录弹层展示账号处罚，平台 owner/admin 按权限创建固定档位账号封禁，active 处罚可撤销。
- 手工调分和头衔授予可以链接到 `/admin/growth` 对应 tab，或后续整合进用户详情。

社区管理首版：

- 社区列表：名称、slug、类型、可见性、状态、创建者、更新时间。
- 状态筛选：全部、正常、已暂停、已归档。
- 支持暂停、恢复、归档，必须二次确认。
- 不使用“删除社区”文案。
- 平台 owner/admin 可在异常场景接管社区负责人；普通负责人转让不走平台社区列表。
- 每行提供公开社区页和社区内管理页入口。

验收：

- 平台审核员不能进入用户和社区治理页。
- 平台管理员不能设置平台角色，不能处罚或禁用 / 恢复有平台角色的账号。
- 用户管理页不能把账号设为站点负责人，也不能解除站点负责人。
- 禁用用户、创建封禁、撤销封禁、暂停社区、归档社区和接管负责人都有确认和错误回显。
- 操作成功后刷新用户 / 社区列表、相关公共列表和审计日志。

### 阶段 5：运行开关和审计

目标：让所有平台写操作都有可见审计闭环。

新增文件：

```text
src/app/admin/settings/page.tsx
src/app/admin/audit-logs/page.tsx
src/features/admin/admin-settings-page.tsx
src/features/admin/admin-audit-logs-page.tsx
```

运行开关：

- `registration_enabled`：注册开关。
- `posting_enabled`：发帖和评论开关。
- `upload_enabled`：图片上传开关。
- switch 不直接静默保存；点击后打开确认 dialog。
- 如果某个 key 未返回，显示“后端默认启用但配置未落库”的只读状态。

审计日志：

- 列表显示：动作、目标类型、目标 ID、操作者 ID、时间。
- 支持 `target_type` 和 `target_id` 过滤。
- `before` / `after` 用格式化 JSON 展开。
- 其他 admin 页面跳转审计时带过滤参数。

验收：

- 运行开关关闭类操作必须确认。
- 设置更新成功后审计列表可刷新看到记录。
- 审计 JSON 在移动端不撑破页面。

### 阶段 6：整理成长管理

目标：保留现有 `/admin/growth`，纳入统一平台管理骨架并减少越权表达。

调整文件：

```text
src/app/admin/growth/page.tsx
src/features/admin/growth-admin-page.tsx
```

工作内容：

- 用 `AdminShell` 包裹成长管理页面。
- 将右侧栏入口改为 `/admin/reports`、`/admin/community-applications`、`/admin/audit-logs`。
- 将“平台 staff”文案改为“平台权限”或“平台管理权限”。
- 当前后端未补角色前，成长管理仍以 `is_platform_staff` 控制。
- 按当前平台角色规则，积分调整、头衔目录和授予仅对站点负责人 / 平台管理员开放；平台审核员不可见。

验收：

- `/admin/growth` 与其他 admin 页面导航一致。
- 不出现“staff 可以任命 staff”的暗示。
- 现有效果、积分、头衔操作不回退。

### 阶段 7：角色和社区治理合同接入

新增或调整：

- 当前用户类型支持 `platform_role`。
- 用户菜单和 admin 权限门禁改用 `platform_role`，保留 `is_platform_staff` 兼容。
- 用户管理里开放平台角色调整，仅站点负责人可见。
- 社区管理里开放社区版主管理，仅社区负责人可见。
- 社区负责人转让使用创建 / 接受流程，接受页不要求目标账号已有社区管理权限。
- 平台接管社区负责人仅站点负责人 / 平台管理员可见。
- 站点负责人交接页面保持非提交状态；只能走后端专用 owner-transfer 合同、bootstrap 或离线恢复，不在用户管理行内直接设置 owner。

验收：

- 平台管理员和平台审核员都不能设置平台角色。
- 平台同一时间只有 1 个 active 站点负责人，不能取消最后一个站点负责人。
- 用户管理页不能把账号设为站点负责人，也不能解除站点负责人。
- 社区版主不能任命版主，不能操作社区负责人。
- 超过版主数量上限时前端禁用提交，后端仍返回明确错误。

## 不做范围

- 不做新的 UI 库或后台模板。
- 不做图表大屏。
- 不做硬删除社区。
- 不用永久 `disabled` 状态伪造账号处罚；封禁必须走 sanctions 合同。
- 用户和社区搜索走真实后端 `q` 参数；不做前端伪造的统计聚合。
- 不在普通平台后台里提供 owner 被盗号后的网页接管；这类恢复只走离线脚本。

## 验证计划

每阶段至少运行：

```powershell
npm run typecheck
npm run lint
```

涉及路由和 UI 骨架后运行：

```powershell
npm run check:routes
npm run check:actions
```

最终浏览器 QA：

- 桌面：`/admin`、`/admin/reports`、`/admin/community-applications`、`/admin/users`、`/admin/communities`、`/admin/settings`、`/admin/audit-logs`、`/admin/growth`。
- 移动端：同一组页面检查无横向溢出、二级导航可用、表格型内容可读。
- 权限：未登录、普通用户、兼容 staff。
- 写操作：成功、失败、重复提交、提交中 disabled、审计刷新。

## 推荐提交切片

1. `平台管理：建立统一后台壳和总览`
2. `平台管理：迁移举报审核和社区审批入口`
3. `平台管理：补齐 admin API 和 query`
4. `平台管理：接入用户和社区治理`
5. `平台管理：接入运行开关和审计日志`
6. `平台管理：统一成长管理入口`
