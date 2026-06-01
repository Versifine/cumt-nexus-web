# Component Rules

本文定义 `cumt-nexus-web` 的组件使用规则。组件必须统一、可复用、可维护。

## 基本原则

- 优先使用 shadcn/ui。
- Tailwind CSS 负责样式。
- lucide-react 负责图标。
- Motion 只做克制动效。
- 组件的用户可见文案默认使用简体中文，包括 `aria-label`、placeholder、表单校验、空状态和错误兜底。
- 不允许重复造多个风格不同的 Button、Card、Dialog、Form。
- 不允许引入第二套 UI 库解决单个组件问题。
- 当前视觉方向是暗色 editorial product。组件质感优先来自版式、线条和信息层级，不来自堆叠阴影和大圆角卡片。

## 缺组件时怎么做

如果 shadcn/ui 没有现成组件：

1. 先确认是否能用 Radix primitive + Tailwind 封装。
2. 封装到 `src/components/ui/` 或业务组件目录。
3. 使用 `cn()` 合并 className。
4. 支持 `className` 扩展。
5. 保持 token、圆角、边框、字体和状态与 `DESIGN.md` 一致。
6. 不复制外部组件库的大段风格。

封装前必须检查是否已有同类组件。

## Button

使用场景：

- 页面主动作。
- 表单提交。
- 次要动作。
- 图标工具按钮。

规则：

- 统一使用 shadcn/ui Button。
- variant 必须有限：`default`、`secondary`、`outline`、`ghost`、`destructive`、`link`。
- 主动作每个区域最多一个。
- 图标按钮必须使用 lucide-react 图标，并提供 `aria-label` 或 tooltip。
- loading 时禁用重复提交。
- disabled 不能完全不可读。

不要：

- 为不同页面复制新的 Button 组件。
- 使用渐变按钮作为默认按钮。
- 让按钮 hover 改变尺寸。

## Card

使用场景：

- 帖子列表项。
- 社区列表项。
- 设置分组。
- 轻量信息容器。

规则：

- Card 是内容容器，不是页面 section 的默认包裹。
- 帖子流、社区流和右侧上下文栏不默认使用 Card；能用分割线和 section 完成时优先用分割线。
- 不能卡片套卡片。
- 边框优先，阴影克制。
- hover 可改变边框或背景，不改变尺寸。
- 列表 Card 信息密度要可扫读。

不要：

- 把整个页面放进一个大 Card。
- 每种资源做一种完全不同的 Card 风格。
- 用发光边框作为常规 hover。

## Dialog

使用场景：

- 删除或危险操作确认。
- 需要打断流程的短表单。
- 关键确认。

规则：

- 使用 shadcn/ui Dialog。
- 标题必须具体。
- 描述必须说明后果。
- 主按钮和取消按钮位置稳定。
- 危险操作使用 `destructive`。
- 移动端不能溢出屏幕。

不要：

- 用 Dialog 承载长页面。
- 用 Dialog 展示普通成功消息。
- 嵌套多个 Dialog。

## Form

使用场景：

- 登录、注册。
- 发帖。
- 评论。
- 社区申请。
- 设置修改。

规则：

- 使用 react-hook-form + zod。
- 字段错误贴近字段。
- 表单级错误放在字段上方的 Alert。
- 提交中禁用按钮。
- 成功后进入下一步或显示明确 submitted 状态。
- 必填字段不靠 placeholder 表达。

不要：

- 只用 toast 显示字段错误。
- 在页面组件中散写校验逻辑。
- 提交失败后清空用户输入。

## Table

使用场景：

- 管理型数据。
- 多列比较。
- 设置或审查类列表。

规则：

- 首版社区内容列表优先用 List，不默认用 Table。
- 表格列数要克制。
- 移动端必须有横向滚动或切换为列表。
- 表头固定文案清楚。
- 空表格必须有 empty state。

不要：

- 用 Table 做帖子流。
- 在移动端把列挤到不可读。
- 用表格展示少量键值详情。

## Badge

使用场景：

- 社区 slug。
- 状态。
- 角色。
- 数量或轻量分类。

规则：

- Badge 文案短。
- variant 数量有限。
- 状态颜色符合 `DESIGN.md`。
- 不用 Badge 承载长句。

不要：

- 把 Badge 当按钮，除非明确是可点击筛选。
- 每个页面定义新颜色。

## Tabs

使用场景：

- 同一资源下的视图切换。
- 最新/我的/已归档等同层级内容。

规则：

- 使用 shadcn/ui Tabs。
- tab 数量建议 2 到 5 个。
- 当前 tab 状态必须清楚。
- URL 是否同步按页面需求决定；可分享视图应同步 query 或 path。

不要：

- 用 Tabs 做主导航。
- tab 文案过长。
- 嵌套 Tabs。

## Dropdown

使用场景：

- 用户菜单。
- 行内更多操作。
- 排序或轻量筛选。

规则：

- 使用 shadcn/ui DropdownMenu。
- 菜单项文案用动词开头。
- 危险操作分组并使用危险样式。
- 图标可选，但同一菜单内要统一。

不要：

- 把主要动作藏进 Dropdown。
- 菜单里放复杂表单。

## Sidebar

使用场景：

- 登录后 App Shell 主导航。
- Settings 页面二级导航。

规则：

- 桌面端 Sidebar 稳定显示。
- 移动端使用 Sheet 或折叠菜单。
- 当前路由高亮明确。
- 图标来自 lucide-react。
- 导航项文案短，顺序稳定。

不要：

- 每个页面重新定义 Sidebar。
- Sidebar 放大量说明文字。
- 移动端让 Sidebar 挤压内容到不可读。

## 图标

规则：

- 统一使用 lucide-react。
- 默认尺寸 `16px` 或 `18px`。
- 导航图标可用 `18px - 20px`。
- 图标按钮必须有无障碍名称。
- 图标颜色跟随文本或状态 token。

不要：

- 混用 Heroicons、Font Awesome、Material Icons。
- 手写 SVG 图标，除非 lucide 没有对应表达且确实必要。

## Motion 边界

允许：

- Dialog、Dropdown、Sheet 进出。
- 列表项轻微进入。
- 投票、保存、提交的局部反馈。
- 页面内容轻微淡入。

规则：

- 默认不超过 `240ms`。
- 不影响布局稳定。
- 不隐藏真实 loading。
- 尊重 `prefers-reduced-motion`。

不要：

- 背景持续动画。
- 滚动炫技。
- 多组件同时大幅移动。
- 每个页面定义不同动效语言。
