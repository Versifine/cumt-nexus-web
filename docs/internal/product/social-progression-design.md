# 社交关系与成长系统设计

本文记录 CUMT Nexus 的关注、全站等级、头衔、积分和积分消费设计。当前结论来自产品讨论，后续前端和后端都以本文作为增长系统的设计基线。

本文不表示所有能力已经可用。前端实现必须以后端正式合同为准；后端未提供的字段不得在 UI 中伪造。

## 已定原则

```text
全站等级 = 长期资历，不可消费
头衔 = 版主、平台或系统授予，用户选择展示
积分 = 可消费余额，用于装饰和互动
```

明确不做：

- 不做社区等级。
- 不做签到主导升级。
- 不允许购买等级。
- 不允许购买官方、认证、管理员等权威头衔。
- 不允许购买置顶、热度、推荐权重或管理权限。
- 不允许前端自行计算等级、扣积分或判断头衔合法性。

## 关注系统

关注只负责信息来源，不参与等级计算。

| 类型 | 用途 | 当前后端状态 | 前端优先级 |
|---|---|---|---|
| 社区关注 | 订阅社区内容，构成关注流和左侧栏关注社区 | 已有真实合同 | 先做 |
| 用户关注 | 订阅作者动态，增强用户主页关系链 | 尚无正式合同 | 后做 |

社区关注已有合同：

```text
GET    /api/v1/me/followed-communities
POST   /api/v1/communities/:slug/follow
DELETE /api/v1/communities/:slug/follow
```

社区关注不等于社区成员关系。`viewer_is_following` 只表达订阅状态，`viewer_role` 和 `viewer_permissions` 继续表达成员、版主、owner 和权限。

## 全站等级

等级只做全站等级，表达用户在 CUMT Nexus 的长期贡献和资历。等级经验不可消费，积分消费不影响等级。

等级范围固定为：

```text
Lv.1 - Lv.30
```

后端按 `xp_total` 和固定等级表计算：

```text
level
level_name
xp_total
current_level_xp
next_level_xp
level_progress
```

前端只展示这些字段，不自行推导等级。

### 等级曲线

曲线目标：

- Lv.1-5：新用户快速获得反馈。
- Lv.6-15：普通活跃用户稳定成长。
- Lv.16-20：核心用户。
- Lv.21-25：长期骨干。
- Lv.26-30：站内资深身份。

累计经验表：

| 等级 | 累计经验 |
|---:|---:|
| Lv.1 | 0 |
| Lv.2 | 100 |
| Lv.3 | 260 |
| Lv.4 | 520 |
| Lv.5 | 900 |
| Lv.6 | 1,450 |
| Lv.7 | 2,200 |
| Lv.8 | 3,200 |
| Lv.9 | 4,500 |
| Lv.10 | 6,200 |
| Lv.11 | 8,400 |
| Lv.12 | 11,200 |
| Lv.13 | 14,800 |
| Lv.14 | 19,400 |
| Lv.15 | 25,200 |
| Lv.16 | 32,500 |
| Lv.17 | 41,600 |
| Lv.18 | 52,900 |
| Lv.19 | 66,800 |
| Lv.20 | 83,800 |
| Lv.21 | 104,500 |
| Lv.22 | 129,600 |
| Lv.23 | 159,900 |
| Lv.24 | 196,400 |
| Lv.25 | 240,000 |
| Lv.26 | 292,000 |
| Lv.27 | 354,000 |
| Lv.28 | 428,000 |
| Lv.29 | 516,000 |
| Lv.30 | 620,000 |

等级名称：

| 等级段 | 名称 |
|---|---|
| Lv.1-5 | 初来乍到 |
| Lv.6-10 | 熟悉校园 |
| Lv.11-15 | 活跃同学 |
| Lv.16-20 | 资深贡献者 |
| Lv.21-25 | 社区骨干 |
| Lv.26-30 | Nexus 老用户 |

### 经验来源

经验奖励应偏向真实贡献，不鼓励水评论和重复刷行为。

| 行为 | 经验 | 限制 |
|---|---:|---|
| 每日首次登录 | +5 | 同一用户同一天只计一次 |
| 发帖发布成功 | +20 | 被删除或审核移除后可撤销 |
| 评论发布成功 | +5 | 每日上限较低 |
| 帖子被点赞 | +3 | 同一用户对同一内容只计一次 |
| 评论被点赞 | +2 | 同一用户对同一内容只计一次 |
| 帖子被收藏 | +8 | 同一用户对同一内容只计一次 |
| 举报被采纳 | +15 | 防止滥用举报 |
| 内容被版主标记优质 | +50 | 需要审核或版主权限 |
| 社区管理有效操作 | +5 到 +20 | 仅记录真实管理行为 |

每日经验上限：

| 类型 | 每日上限 |
|---|---:|
| 登录经验 | 5 |
| 发帖经验 | 100 |
| 评论经验 | 80 |
| 被点赞经验 | 150 |
| 被收藏经验 | 120 |
| 举报采纳经验 | 60 |
| 优质内容经验 | 200 |
| 管理操作经验 | 100 |

后端必须保证事件幂等。例如一次点赞只能给同一目标作者发一次经验；取消点赞、删除内容、审核移除是否撤销经验，需要在后端规则里明确。

## 头衔系统

头衔是人工或系统认可，不是等级本身，也不是权限本身。用户可选择一个当前展示头衔。

头衔类型：

| 类型 | 授予人 | 展示范围 | 示例 |
|---|---|---|---|
| 平台头衔 | 平台管理员 | 全站 | `早期贡献者`、`资料整理者` |
| 社区头衔 | 对应社区版主或 owner | 对应社区优先展示 | `高数答疑员`、`考研资料官` |
| 系统头衔 | 后端规则 | 全站或活动范围 | `活跃同学`、`优质回复` |

版主可以给用户发社区头衔，但不能发容易冒充官方或权限的保留词。保留词包括但不限于：

```text
官方
管理员
认证
平台
系统
教务处
学生会
版主
owner
admin
official
verified
```

头衔 grant 建议字段：

```text
id
title
scope_type        platform | community | system
scope_id
granted_by
reason
expires_at
created_at
revoked_at
```

用户选择展示头衔时，只能从自己已获得且未失效的头衔中选择。

## 积分系统

积分参考 B 站式账户和流水设计。积分是可消费余额，和等级经验彻底分开。

当前后端已有积分账户雏形：

```text
GET /api/v1/me/points
```

账户字段：

```text
balance
lifetime_earned
lifetime_spent
updated_at
```

### 积分获得

积分获得比经验更保守，避免通胀。

| 行为 | 积分 |
|---|---:|
| 每日首次访问 | +5 |
| 发帖发布成功 | +5 |
| 评论发布成功 | +1 |
| 帖子被点赞 | +1 |
| 评论被点赞 | +1 |
| 帖子被收藏 | +3 |
| 举报被采纳 | +5 |
| 内容被标记优质 | +20 |
| 活动奖励 | 平台配置 |

每日积分上限：

| 类型 | 每日上限 |
|---|---:|
| 日常活跃 | 20 |
| 发帖 | 25 |
| 评论 | 15 |
| 被点赞 | 50 |
| 被收藏 | 45 |
| 举报采纳 | 20 |
| 优质内容 | 80 |

积分获得和经验获得可以来自同一行为，但必须分别写入不同账本。

### 积分流水

后端需要保存完整流水：

```text
id
user_id
delta
balance_after
reason
source_type
source_id
created_at
```

流水示例：

```text
获得 +5：发布帖子
获得 +1：评论被点赞
消费 -20：给评论送出感谢牌
获得 +20：内容被标记优质
```

管理员调整积分必须进入审计日志。

## 积分消费

积分消费参考 Steam 点数商店：只买装饰、表达和轻量社交反馈，不买权重和权力。

允许消费：

- 评论效果。
- 感谢牌。
- 个人主页装饰。
- 头像框。
- 资料卡背景。
- 头衔展示样式。
- 活动限定装饰。

明确禁止消费：

- 等级。
- 经验。
- 置顶。
- 热度。
- 推荐权重。
- 管理权限。
- 认证身份。
- 官方、管理员等权威头衔。

首版只做评论效果，避免系统过早膨胀。

首版效果建议：

| 效果 | 消耗 |
|---|---:|
| 灵感灯 | 10 |
| 感谢牌 | 20 |
| 重点标记 | 30 |
| 实用资料 | 50 |

评论展示必须克制，例如：

```text
感谢牌 x12 · 灵感灯 x3
```

不要做大动画，不要遮挡正文，不要让效果比评论内容更重要。

## 页面落点

### 作者身份行

帖子和评论中只展示轻量身份：

```text
Alice · Lv.16 · 高数答疑员
```

优先级：

```text
用户名 > 等级 > 当前头衔 > 社区角色/徽章
```

如果当前页面处于某个社区，并且用户有该社区授予头衔，则优先展示对应社区头衔；否则展示用户选择的全站头衔。

### 用户主页

用户主页展示完整成长资料：

```text
Nexus Lv.16
等级名称
经验进度
当前展示头衔
头衔来源
积分余额
累计获得 / 累计消费
获得过的头衔和徽章
```

积分明细可以后续单独进入 `/settings/points` 或 `/points`，不放在普通资料设置首屏。

### 评论树

评论动作栏新增特殊互动入口：

- 未登录：进入登录门禁。
- 余额不足：展示不可用原因。
- 效果停用：隐藏或禁用。
- 提交中：禁用重复点击。
- 成功：更新当前积分余额，并刷新评论效果摘要。

### 管理入口

当前后端已有：

```text
GET   /api/v1/admin/effects
PATCH /api/v1/admin/effects/:id
```

头衔、等级规则和积分规则的管理入口必须等后端合同落地后再做。前端不得提前展示不可用入口。

## 前端模块建议

```text
src/features/community/
  社区关注 API、query、mutation

src/features/progression/
  等级、经验、积分、头衔、效果目录、评论效果

src/features/profile/
  公开用户成长摘要、头衔选择

src/components/identity/
  作者身份行、等级标记、头衔展示、徽章组
```

## 后端合同拆分

### 已可直接接入

```text
GET    /api/v1/me/followed-communities
POST   /api/v1/communities/:slug/follow
DELETE /api/v1/communities/:slug/follow
GET    /api/v1/me/points
GET    /api/v1/effects/catalog
POST   /api/v1/comments/:id/effects
GET    /api/v1/admin/effects
PATCH  /api/v1/admin/effects/:id
```

### 需要后端补齐

全站等级和成长资料：

```text
GET /api/v1/me/progression
GET /api/v1/me/xp-events
```

公开用户响应扩展：

```text
level
level_name
xp_total
current_level_xp
next_level_xp
level_progress
active_title
titles_count
```

头衔：

```text
PATCH  /api/v1/me/title
POST   /api/v1/communities/:slug/members/:username/titles
DELETE /api/v1/communities/:slug/members/:username/titles/:grant_id
GET    /api/v1/admin/titles
POST   /api/v1/admin/titles
PATCH  /api/v1/admin/titles/:id
```

积分流水：

```text
GET  /api/v1/me/point-transactions
GET  /api/v1/admin/point-transactions
POST /api/v1/admin/users/:id/points/adjust
```

评论效果读取：

```text
comment.effects[]
effect.id
effect.name
effect.asset_url
effect.animation_key
applied_by_user
points_spent
created_at
```

用户关注后续合同：

```text
GET    /api/v1/me/followed-users
POST   /api/v1/users/:username/follow
DELETE /api/v1/users/:username/follow
```

## 实施顺序

1. 社区关注：社区详情、社区列表、左侧栏关注社区、`/following` 真实数据源。
2. 评论效果消费：积分余额、效果目录、评论效果应用；同时补评论 `effects[]` 读取字段。
3. 全站等级：等级曲线、经验事件、公开用户等级展示。
4. 头衔授予：平台头衔、社区版主授予头衔、用户选择展示头衔。
5. 积分流水：当前用户明细、管理员调整、审计日志。
6. 用户关注：用户主页、作者 hover card、关注用户列表和用户关系统计。

## 验收标准

- 未登录可读页面不因为等级、积分、头衔字段缺失报错。
- 未登录点击关注、特殊互动和头衔设置进入登录门禁。
- 等级只展示后端返回结果，前端不自行计算。
- 积分消费必须以后端成功响应为准，失败不能扣本地余额。
- 头衔只展示后端授予结果，不允许前端自由填写。
- 评论效果不能遮挡正文，移动端不能横向溢出。
- 所有新增 API 调用走 `src/lib/api` 和 feature-scoped API 文件。
