# 平台管理权限与流程修复计划

日期：2026-06-17

状态：实施中

范围：`src/app/admin/*`、`src/features/admin/*`、平台管理入口显隐、平台管理静态校验脚本。

## 背景

平台管理 Reddit 化改造后，当前代码存在“静态检查通过，但业务流程没有真正可用”的问题。核心原因不是后端合同缺失，而是前端把部分操作藏进了已经不渲染的上下文栏，同时对 legacy staff 兼容标记做了过度授权。

本计划只修前端，不修改后端。后端当前账本已经把平台角色、站点负责人交接、社区接管、管理队列和审计筛选列为 READY；前端必须按真实合同接入，不再把可用性问题解释为后端缺口。

## 修复目标

- 平台管理不再依赖右侧栏承载关键操作；已经传入但没有渲染的操作必须迁移到主流程、详情页、展开区或弹层。
- 所有平台权限判断优先使用 `platform_role`，`is_platform_staff` 只作为兼容提示，不得放大为 owner/admin 权限。
- 路由权限、导航显隐、页面数据加载、危险操作按钮和提交前校验必须使用同一套角色矩阵。
- 站点负责人交接、平台角色调整、社区接管、运行开关、用户处罚等高风险操作必须有原因、二次确认、提交中禁用、成功后刷新和审计回看。
- 修复过程不恢复拥挤右侧栏，不把所有工具挤回一页；该拆分的资源详情拆成独立页面或主区详情。
- 管理入口不放到右上角悬浮账号卡、全站左侧栏或移动导航里制造误导；入口只在资源上下文、通知、独立收件页和对应管理工作区出现。
- 平台和社区治理记录必须支持搜索、筛选、目标直达和审计回看，不能只依赖一页一页翻。

## 角色矩阵

| 页面或能力 | 未登录 | 普通用户 | 平台审核员 `staff` | 平台管理员 `admin` | 站点负责人 `owner` |
| --- | --- | --- | --- | --- | --- |
| `/admin` 总览 | 登录门禁 | 无权限 | 可看审核工作台 | 可看日常治理工作台 | 可看完整工作台 |
| `/admin/reports` 全站队列 | 登录门禁 | 无权限 | 可看可处理 | 可看可处理 | 可看可处理 |
| `/admin/community-applications` 社区审批 | 登录门禁 | 无权限 | 可看可处理 | 可看可处理 | 可看可处理 |
| `/admin/users` 用户治理 | 登录门禁 | 无权限 | 无权限 | 可看，可治理普通账号 | 可看，可治理非 owner 账号并管理 admin/staff/null |
| `/admin/owner-transfer` 站点负责人交接 | 登录门禁 | 无权限 | 无权限 | 只读交接上下文 | 可发起、取消 pending 交接 |
| `/owner-transfer/:id` 接受站点负责人交接 | 登录门禁 | 仅目标账号可接受 | 仅目标账号可接受 | 仅目标账号可接受 | 仅目标账号可接受 |
| `/admin/communities` 平台社区治理 | 登录门禁 | 无权限 | 无权限 | 可做合同允许的社区状态治理和异常接管 | 可做合同允许的社区状态治理和异常接管 |
| `/admin/settings` 运行开关 | 登录门禁 | 无权限 | 无权限 | 可看可改 | 可看可改 |
| `/admin/audit-logs` 审计 | 登录门禁 | 无权限 | 无权限 | 可看 | 可看 |
| `/admin/growth` 成长系统 | 登录门禁 | 无权限 | 无权限 | 可看可改 | 可看可改 |

说明：

- 当前 `backend-api-needs.md` 允许平台 `admin` 做异常社区接管；如果产品决定收紧为 owner-only，必须先更新 `backend-api-needs.md`、`platform-admin-design.md` 和本矩阵，再改 UI。
- `is_platform_staff=true` 但 `platform_role` 缺失时，前端只能提示“平台角色待同步 / 请刷新登录态 / 后端版本不匹配”。它不能绕过 owner/admin 页面门禁，也不能显示高风险操作。
- 后端 `401/403` 仍是最终判定；前端矩阵负责不展示明显越权入口，减少误导和无效提交。

## 当前必须修复的问题

### P0：`AdminQueueLayout` 丢弃 `rail`，导致关键操作不可见

现状：

- `src/features/admin/admin-queue.tsx` 的 `AdminQueueLayout` 类型要求 `rail`，但组件只渲染 `children`。
- `admin-users-page.tsx`、`admin-communities-page.tsx`、`admin-settings-page.tsx`、`admin-mod-queue-page.tsx`、`admin-audit-logs-page.tsx`、`growth-admin-page.tsx` 都仍把详情和操作传给 `rail`。
- 结果是用户角色调整、用户状态、处罚、社区接管、社区状态、运行开关、单条队列处理和审计详情等能力在 UI 中消失。

修复策略：

1. 不恢复平台管理右侧栏。
2. 删除 `AdminQueueLayout` 的 `rail` prop，让 TypeScript 直接暴露所有仍在传 `rail` 的页面。
3. 按资源拆分主流程：
   - `/admin/users`：列表页只负责筛选、搜索、分页和行摘要；用户详情与操作迁移到 `/admin/users/:id` 或主区展开详情。
   - `/admin/communities`：列表页只负责筛选、搜索、分页和状态摘要；社区状态、异常接管、审计入口迁移到 `/admin/communities/:id` 或主区展开详情。
   - `/admin/settings`：运行开关操作直接放在每个设置项的主区动作弹层，不需要详情栏。
   - `/admin/reports`：单条处理优先进入 `/admin/reports/:id`，列表只保留批量或轻量处理。
   - `/admin/audit-logs`：详情用行内展开或独立详情页展示 JSON，不依赖右侧栏。
   - `/admin/growth`：保持 tab 拆分，具体资源操作放在当前 tab 主区。
4. 删除或降级 `AdminDetailRail` 在平台管理中的使用；如社区管理仍需要上下文面板，应放在社区管理专属组件中，不复用平台管理右侧栏。

验收：

- `rg "rail=\\{" src/features/admin src/app/admin` 不再命中平台管理页面。
- 所有原先在 `rail` 中的写操作都有新的可见入口。
- 360px、768px、桌面宽度下没有中文单字竖排、按钮文字飘出或横向溢出。

### P0：legacy staff-only 兼容逻辑过度授权

现状：

- `permission-gate.tsx` 允许 `hasLegacyPlatformStaffOnly` 绕过 `allowedRoles`。
- `admin-shell.tsx` 在 legacy staff-only 状态下跳过导航过滤，导致所有后台入口都可见。
- `admin-dashboard.tsx` 把 legacy staff-only 当作 operational admin，可能加载设置和日常治理入口。
- `admin-owner-transfer-page.tsx` 允许 legacy staff-only 尝试站点负责人交接。

修复策略：

1. `resolvePlatformRole(currentUser)` 成为唯一角色来源。
2. `hasLegacyPlatformStaffOnly` 只用于显示兼容警告，不参与 `allowedRoles` 通过判断。
3. `AdminPermissionGate` 判断顺序固定为：
   - 未登录：登录门禁。
   - `platform_role` 为空：无权限；如果 `is_platform_staff=true`，展示“角色待同步”说明。
   - `platform_role` 不在 `allowedRoles`：无权限。
   - 命中角色：进入页面。
4. `AdminShell` 导航只按 `platform_role` 过滤；没有明确角色时不展示任何 owner/admin/staff 导航。
5. `AdminDashboard` 按角色分区加载数据；staff 不加载运行开关、成长系统、用户治理和社区治理摘要。

验收：

- staff 看不到用户、负责人交接、运行开关、审计、成长、社区治理入口。
- legacy staff-only 看不到 owner/admin 能力；页面明确提示角色数据不完整。
- owner 不再被错误显示为“平台审核员”。

### P1：站点负责人交接流程的前端角色边界不完整

现状：

- `/admin/owner-transfer` 允许 owner/admin 进入，但 pending 交接取消面板没有按 owner 限制。
- 发起交接仍偏向 raw user id 输入，容易填错。
- 接受页没有在前端判断当前账号是不是目标账号，非目标账号也能看到提交按钮。
- 被交接人目前主要依赖发起人手动复制 `/owner-transfer/:transfer_id` 链接，站内通知和待接受收件箱闭环不完整。

修复策略：

1. `/admin/owner-transfer` 页面保留 admin 只读上下文，但发起和取消入口只在 `platform_role === "owner"` 时渲染。
2. `CancelOwnerTransferPanel` 必须接收 actor role 或 `canCancel`，禁止在组件内部默认可操作。
3. 发起交接改为精确用户选择：
   - 搜索用户。
   - 显示 username、display name、短 ID。
   - 选择后锁定 user id。
   - 提交前要求原因、当前密码、二次确认。
4. 接受页读取公开详情和当前用户：
   - pending 且当前账号是目标账号，才显示提交表单。
   - 非目标账号显示“这不是发给当前账号的交接”，提供切换账号或返回入口。
   - accepted/cancelled/expired 均展示只读状态，不显示提交按钮。
5. 创建交接后必须形成被交接人触达闭环：
   - 后端创建系统通知，目标账号为 `target_user_id`。
   - 通知使用 `source_type=platform_owner_transfer`，`source_id=<transfer_id>`。
   - 前端通知解析器跳转到 `/owner-transfer/:transfer_id`。
   - 在通知未接入前，前端不能把“复制链接”描述成完整交接通知能力。
6. 可选补强独立收件箱：
   - 新增 `/owner-transfers` 或 `/settings/owner-transfers` 作为“待接受站点负责人交接”页面。
   - 后端提供 `GET /api/v1/me/owner-transfers?status=pending&limit=20&offset=0`。
   - 该入口不放入左侧栏或移动导航，只从通知、接受页和账号相关入口进入。
7. 成功后刷新 `currentUser`、owner-transfer query、admin audit logs、通知 query，并提供进入 `/admin` 的入口。

验收：

- admin 可以查看交接上下文，但看不到发起和取消按钮。
- owner 可以发起和取消 pending 交接。
- 目标账号可以接受；非目标账号无法点击提交。
- 接受成功后当前用户平台角色刷新为 owner。
- 创建交接后，目标账号能在系统通知中看到请求，并点击进入 `/owner-transfer/:transfer_id`。
- 若实现收件箱，目标账号即使错过通知，也能在待接受交接页看到 pending 请求。

### P1：平台社区治理入口和异常接管需要按合同收敛

现状：

- `/admin/communities` 路由允许 owner/admin。
- 页面里“进入社区内管理”只给 owner，但异常接管动作本身没有独立解释清楚角色边界。
- 接管表单仍容易退化为 raw id 输入，失败时用户只能看到“没有找到对应内容”。

修复策略：

1. `/admin/communities` 不重新放回全站左侧栏、移动导航或右上角悬浮卡片；它属于平台管理内部能力。
2. 保持 `/admin/communities` 路由，用于平台 owner/admin 的站点级社区状态治理和异常接管。
3. 异常接管入口按当前合同给 owner/admin，staff 不可见；如果后续收紧 owner-only，先改合同文档。
4. 接管表单必须改为用户搜索精确选择，不允许只填 raw id：
   - 搜索结果显示 `@username`、display name、短 ID。
   - 选择后提交 `user_id`。
   - 目标用户不存在、非 active 或搜索为空时，在表单内给出明确原因。
5. 接管必须填写原因并二次确认；成功后刷新社区列表、社区详情、审计日志。
6. 社区内管理入口只在当前账号确实拥有社区管理权限或平台 owner 覆盖权限时展示；没有权限就不展示入口。

验收：

- staff 直接访问 `/admin/communities` 得到无权限状态。
- admin/owner 能访问 `/admin/communities`，但入口位置只在平台管理内部。
- 接管失败能区分目标用户不可用、社区不可用、权限不足和服务错误。

### P1：社区管理入口必须基于真实可管理权限

现状：

- 社区公开页可以展示 `/communities/:slug/manage` 入口，但入口必须严格依赖后端返回的 `viewer_permissions.can_manage/can_moderate` 或平台 owner 覆盖权限。
- 平台 `owner` 覆盖进入社区管理，不等于真实社区角色变成社区版主；页面必须保留“平台 owner 覆盖”提示。
- 平台 `admin/staff` 不自动获得社区管理权限；如果当前账号没有社区管理权限，就不应该看到“管理社区”入口。
- 右上角悬浮账号卡、移动导航、全站左侧栏不承载单个社区的管理入口，避免用户以为自己能管理所有社区。

修复策略：

1. 社区公开页只在 `can_manage/can_moderate` 或 `platform_owner_override` 为真时展示“管理社区”。
2. 没有权限时不显示入口，只展示解释文案，不提供不可点击的假按钮。
3. 社区管理的待接受版主交接入口不放左侧栏或移动导航；只从系统通知、`/communities/owner-transfers` 独立收件页、接受页返回入口进入。
4. 平台 owner 覆盖进入 `/communities/:slug/manage` 时，所有写操作仍由后端二次校验，并明确标注真实社区角色没有变化。

验收：

- 普通用户、成员、平台 admin、平台 staff 在没有社区级权限时看不到“管理社区”入口。
- 平台 owner 能看到入口，并能看到覆盖说明。
- 真实社区版主和社区管理员能看到入口。
- 移动导航、全站左侧栏和右上角悬浮账号卡不出现“社区管理”或“平台社区治理”入口。

### P1：治理记录不能退化为单向翻页

现状：

- 平台审计已经有 `target_type/target_id/q/limit/offset`，但页面体验和交叉入口必须稳定使用这些过滤条件。
- 社区 Mod Log 已有 `action/actor_id/target_type/target_id/limit/offset`，但大量记录后不能让用户只能一页一页翻。

修复策略：

1. 平台审计页必须保留搜索和资源级过滤：
   - `target_type`
   - `target_id`
   - `q`
   - `limit/offset/next_offset/has_more`
2. 社区 Mod Log 必须保留组合筛选：
   - 动作类型 `action`
   - 操作者 `actor_id`
   - 目标类型 `target_type`
   - 目标 ID `target_id`
3. 每个写操作成功提示旁边都要能形成审计回看路径：
   - 平台操作跳 `/admin/audit-logs?target_type=...&target_id=...`
   - 社区操作跳对应社区 Mod Log 并带目标筛选。
4. 长期增强记录为后端 FUTURE，而不是前端假实现：
   - 时间范围筛选。
   - 操作者用户名搜索。
   - 动作类型枚举接口。
   - 导出和保存筛选。
   - cursor 分页或稳定排序游标。

验收：

- 用户、社区、内容、设置、成长相关写操作成功后都能进入对应审计过滤结果。
- 管理员能通过搜索或目标 ID 直接定位记录，不需要从第一页一直翻。
- 移动端审计 JSON 和长 ID 不撑破页面。

### P2：平台管理动作弹层需要兜住异步异常

现状：

- `AdminActionDialog` 直接把 `onConfirm` 绑给按钮点击。
- 多个调用方直接 `await mutation.mutateAsync()`，失败时依赖 mutation error 渲染，但 promise rejection 可能在控制台留下未处理异常。

修复策略：

1. `AdminActionDialog` 内部统一 `try/catch/finally`。
2. `onConfirm` 失败时不关闭弹层。
3. 调用方可以继续传 mutation error，但组件要支持本地 fallback error。
4. 成功后由调用方显式关闭或组件支持 `closeOnSuccess`，避免失败时 UI 误关闭。

验收：

- 断网、403、404、422、500 下弹层不关闭，按钮恢复可点，错误文案稳定显示。
- 控制台没有 unhandled promise rejection。

## 静态校验补强

新增或扩展脚本，不依赖人工记忆：

1. `check:admin-permissions`
   - 校验每个 `src/app/admin/**/page.tsx` 的 `allowedRoles` 符合本计划角色矩阵。
   - 禁止在 `AdminPermissionGate` 中用 `is_platform_staff` 或 `hasLegacyPlatformStaffOnly` 绕过 `allowedRoles`。
   - 禁止 `admin-shell.tsx` 在缺少 `platform_role` 时展示全量导航。

2. 扩展 `check:actions`
   - 检查高风险操作组件必须传入 actor role 或 explicit capability。
   - 覆盖 owner-transfer create/cancel、community owner takeover、platform-role update、user status update、sanction create/revoke、setting patch。

3. 扩展 `check:ui-primitives`
   - 禁止平台管理页面继续向 `AdminQueueLayout` 传 `rail`。
   - 禁止平台管理页面新增固定窄列承载长中文按钮。
   - 管理动作区必须使用可换行布局或主区弹层。

4. 扩展 `check:routes`
   - 覆盖 `/admin/users`、`/admin/owner-transfer`、`/admin/communities`、`/admin/settings`、`/admin/audit-logs`、`/admin/growth` 的未登录、普通用户、staff、admin、owner 门禁预期。

## 实施顺序

1. 先修角色源和导航过滤：移除 legacy staff-only 放权，避免继续扩大越权 UI。
2. 删除平台管理 `rail` 依赖：让编译暴露所有隐藏操作，再逐页迁移。
3. 重做 `/admin/users` 和 `/admin/communities` 的列表 / 详情 / 操作拆分。
4. 修复 `/admin/owner-transfer` 发起、取消、接受三段流程。
5. 修复 `/admin/settings`、`/admin/audit-logs`、`/admin/growth` 中原本藏在详情栏的入口。
6. 补齐 `AdminActionDialog` 异常处理和重复提交保护。
7. 增加静态校验脚本。
8. 做角色矩阵人工 QA 和浏览器响应式 QA。

## 手工 QA 清单

账号维度：

- 未登录。
- 普通登录用户。
- legacy `is_platform_staff=true` 但 `platform_role=null`。
- 平台审核员 `staff`。
- 平台管理员 `admin`。
- 站点负责人 `owner`。

页面维度：

- `/admin`
- `/admin/reports`
- `/admin/community-applications`
- `/admin/users`
- `/admin/owner-transfer`
- `/owner-transfer/:transfer_id`
- `/notifications/system`
- `/admin/communities`
- `/admin/settings`
- `/admin/audit-logs`
- `/admin/growth`

必须验证：

- 导航入口是否只显示当前角色可用页面。
- 直接访问越权页面是否显示无权限，不触发无意义业务请求。
- 所有写操作都有 loading、disabled、success、error 和重复提交保护。
- 所有写操作成功后刷新相关列表、详情和审计。
- owner 发起站点负责人交接后，目标账号能通过系统通知进入接受页。
- 404/403/422/500 的错误文案能指导下一步，而不是只显示“服务暂时不可用”。
- 360px、768px、桌面宽度无横向溢出，无中文单字竖排。

## 完成标准

- `npm run typecheck`
- `npm run lint`
- `npm run check:routes`
- `npm run check:actions`
- `npm run check:api-boundary`
- `npm run check:ui-primitives`
- 新增的 `check:admin-permissions` 通过。
- 用真实或可控测试账号完成 staff/admin/owner 三角色浏览器 QA。
- 平台管理中不再存在“按钮看得见但当前角色不能用”或“能力真实存在但入口被隐藏”的主要路径。
