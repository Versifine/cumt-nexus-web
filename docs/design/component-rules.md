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
- 当前视觉方向是暗色 editorial product，并以 Nexus Surface 第四版样张为面层基准。组件质感优先来自版式、面层深浅、间距和信息层级，不来自堆叠阴影、大圆角卡片或高频分割线。

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
- Button 只用于真正的主命令：提交、确认、创建、登录等。
- `Button asChild` 不用于普通导航链接；登录跳转、注册跳转、返回入口和侧栏入口使用 `TextAction`。
- 主动作每个区域最多一个；同一区域不要放多个同等重量按钮。
- 导航、跳转和次级动作优先使用文字动作，不默认使用 Button。
- 图标按钮必须使用 lucide-react 图标，并提供 `aria-label` 或 tooltip。
- loading 时禁用重复提交。
- disabled 不能完全不可读。

不要：

- 为不同页面复制新的 Button 组件。
- 使用渐变按钮作为默认按钮。
- 让按钮 hover 改变尺寸。
- 把普通链接做成 outline button。

检查：

- `npm run check:actions` 会阻止页面中继续使用 `Button asChild` 承载普通链接。

## Text Action

使用场景：

- 顶部导航动作。
- 右侧栏入口。
- 列表行内跳转。
- 非提交型次级动作。

规则：

- 使用文字、短标签、`+`、箭头或编号表达动作。
- hover 可以出现色块 bar、下划线、轻微文字位移或颜色切换。
- 文字动作必须仍然有清楚的 focus-visible 状态。
- 文案要短，优先动词或目标名，例如 `浏览社区 +`、`申请社区 +`。
- 色块提示使用项目主色或前景色，不新增随机颜色。
- `variant="bar"` 是列表行，不是独立圆角按钮；连续出现时只保留整组外轮廓，内部行不能各自带圆角粘在一起。

不要：

- 不把文字动作做成难以点击的小灰字。
- 不用复杂动画隐藏真实可点击区域。
- 不在同一区域混用多个风格不同的文字动作。

## Card

使用场景：

- 帖子列表项。
- 社区列表项。
- 设置分组。
- 轻量信息容器。

规则：

- Card 是内容容器，不是页面 section 的默认包裹。
- 帖子流、社区流和右侧上下文栏不默认使用 Card；优先用面层深浅、间距和列表节奏区分内容，必要时才补低对比分割线。
- 不能卡片套卡片。
- 边框辅助，阴影克制；不要让 Card 默认变成一圈硬边框。
- hover 可改变背景或极轻边界，不改变尺寸。
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
- 色块可以用于当前栏目、实时状态、数据强调和轻量分类，但要保持扁平。
- 圆角面层的当前态、成功/错误态和引用态不使用贴边竖条、弧条或单边 inset 色条；优先用面层深浅、文字/图标 token、独立小点或完整低对比描边表达。

不要：

- 把 Badge 当按钮，除非明确是可点击筛选。
- 每个页面定义新颜色。

## Data Display

使用场景：

- 页面顶部数据块。
- 右侧栏键值信息。
- 编号说明列表。
- 社区、帖子和状态短标签。

规则：

- 统一使用 `src/components/ui/data-display.tsx` 中的 `MetricBlock`、`InfoRow`、`IndexedInfoRow`、`MetaCell` 和 `StatusToken`。
- 数据块使用面层、色块和字体层级表达重点；边框只在密集键值信息需要边界时使用，不新增阴影、渐变或大圆角。
- `MetricBlock` 和 `MetaCell` 是内容单元，不自带独立面层和圆角；父容器负责 `surface-raised`、圆角和整体边界。
- 多个指标或元信息并列时，禁止把多个自带圆角的矩形无间距粘在一起；应该使用一个连续面层承载分栏内容。
- 状态标签 tone 必须复用 `default`、`primary`、`success`、`warning`、`danger`。
- 页面里不要重复定义局部 `MetricBlock`、`InfoRow` 或 `StatusToken`。
- 新增同类数据展示基础件时，必须同步更新 `npm run check:ui-primitives`。

不要：

- 不让每个页面复制一套略有不同的数据块。
- 不用 Badge 或 Button 临时替代稳定的数据展示组件。
- 不用随机颜色表达状态。

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
