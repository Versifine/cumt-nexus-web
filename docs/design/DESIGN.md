# CUMT Nexus Web Design System

本文是 `cumt-nexus-web` 的长期 UI/UX 规范。后续页面不能重新选择审美方向，所有页面、组件和交互都要回到本文。

## 固定视觉方向

整体风格固定为：

```text
modern dark SaaS / Linear / Vercel / Raycast inspired
```

解释：

- 现代暗色 SaaS：高信息密度、清晰层级、克制装饰。
- Linear：精确、安静、边框和状态细节干净。
- Vercel：留白清楚、排版克制、品牌感来自细节而不是堆装饰。
- Raycast：暗色优先、快捷、聚焦任务。

这不是营销展示站，也不是每个页面独立发挥的作品集。CUMT Nexus 是一个真实校园社区产品，页面要服务阅读、发帖、评论、投票和社区管理。

## 技术和组件边界

- 深色模式优先。
- shadcn/ui 是唯一主组件系统。
- Tailwind CSS 负责所有样式、布局和 token 使用。
- Motion 只做克制动效。
- lucide-react 是唯一图标来源。

不允许：

- 随机换审美。
- 每个页面一种风格。
- 大面积彩虹渐变。
- 油腻光污染。
- 玻璃拟态泛滥。
- 发光光斑、漂浮圆球、bokeh 背景。
- 把 Aceternity UI 风格整站套进项目。
- 引入 Ant Design、MUI、Mantine、Chakra 等第二套主 UI 系统。

## frontend-design skill 使用边界

项目包含 `.claude/skills/frontend-design/SKILL.md`，但它不是本项目的视觉规范。后续可以借鉴它对高设计质量、细节打磨和避免低质量 AI slop 的要求。

不能借鉴：

- 每个任务重新选择一个新艺术风格。
- 为了“惊艳”牺牲产品一致性。
- 把页面做成互相无关的作品集风格。
- 使用与本文冲突的高饱和、强装饰、强动效方向。

本项目唯一长期方向仍然是：

```text
modern dark SaaS / Linear / Vercel / Raycast inspired
```

## 色彩

默认使用暗色主题。颜色以中性灰为骨架，青绿作为品牌强调色，琥珀仅用于轻量提示。

建议 token：

```text
background:        #09090B
background-soft:   #0D0D10
surface:           #111113
surface-raised:    #18181B
surface-hover:     #1F1F23
border:            #27272A
border-strong:     #3F3F46
text:              #FAFAFA
text-muted:        #A1A1AA
text-subtle:       #71717A
primary:           #2DD4BF
primary-muted:     #134E4A
accent:            #FBBF24
danger:            #F87171
success:           #34D399
warning:           #F59E0B
info:              #38BDF8
```

使用规则：

- 背景必须以 `background` 和 `surface` 为主。
- 主操作使用 `primary`，不要每个页面换一个主色。
- `accent` 只用于少量强调，例如新内容提示或重点 badge。
- 危险操作只用 `danger`，不要用 downvote 颜色表达危险操作。
- 文字对比必须足够，正文不使用低对比灰。
- 允许极轻微的单色径向暗纹理，但不能出现彩虹渐变或彩色光污染。

## 间距

采用 4px 网格：

```text
xs: 4px
sm: 8px
md: 12px
lg: 16px
xl: 24px
2xl: 32px
3xl: 48px
```

布局建议：

- 页面外边距桌面端 `24px - 32px`。
- 移动端页面外边距 `16px`。
- 卡片内部间距 `16px - 20px`。
- 表单字段垂直间距 `16px`。
- 列表项间距 `8px - 12px`。
- 内容列宽优先控制在 `720px - 960px`，管理型页面可到 `1200px`。

不要通过随意加大留白制造高级感。社区产品需要可扫读的信息密度。

## 圆角

默认圆角：

```text
button/input: 8px
card/panel: 10px
dialog/popover: 12px
badge: 999px
avatar: 999px
```

规则：

- 不使用全站 20px 以上的大圆角。
- 同一层级组件圆角保持一致。
- 工具型按钮可以使用 8px 或圆形图标按钮。
- 卡片不能因为 hover 改变尺寸或圆角。

## 阴影和边框

暗色主题优先使用边框和背景层级，不依赖重阴影。

边框：

- 默认 `1px solid border`。
- 重要容器可使用 `border-strong`。
- 分割线使用低对比边框，不使用纯白线。

阴影：

```text
popover: 0 12px 40px rgb(0 0 0 / 0.35)
dialog:  0 24px 80px rgb(0 0 0 / 0.45)
card:    none or very subtle
```

不要使用彩色外发光作为常规状态。focus ring 可以有品牌色，但必须细。

## 字体层级

字体：

- 首选项目配置字体。
- 未配置时使用系统 sans 字体。
- 不使用装饰字体。

层级建议：

```text
page title:       24px / 32px / semibold
section title:    18px / 28px / semibold
card title:       16px / 24px / medium or semibold
body:             14px / 22px / regular
meta:             12px / 18px / regular
button:           14px / 20px / medium
```

规则：

- 不使用 viewport width 缩放字体。
- 不使用负字距。
- 不使用 oversized hero 标题作为应用内页面标题。
- 标题负责定位当前页面，不写空泛口号。
- 长标题必须换行或截断，不能挤压按钮。

## 动效

Motion 只用于帮助用户理解状态变化。

允许：

- 页面内容轻微淡入。
- 列表项进入。
- Dialog、Dropdown、Sidebar 进入退出。
- 投票、提交、保存等局部状态反馈。
- Skeleton 到内容的淡入。

禁止：

- 大面积背景动画。
- 持续循环装饰动画。
- 滚动驱动炫技页面。
- 复杂 3D 动效。
- 让主要内容晃动、漂浮或持续位移。

时长：

```text
micro: 120ms - 180ms
panel: 180ms - 240ms
page: 160ms - 220ms
```

缓动：

```text
ease-out for enter
ease-in for exit
ease-in-out for local state
```

必须尊重 `prefers-reduced-motion`。

## 状态规范

每个可交互页面必须覆盖这些状态。

### Loading

- 使用 Skeleton，不用整页 spinner。
- Skeleton 形状接近最终内容。
- 页面级 loading 保留导航和布局骨架。
- 按钮提交中显示 loading 状态并 disabled。

### Empty

- 说明当前没有什么。
- 提供一个明确下一步动作。
- 不写大段教育文案。
- 不使用夸张插画。

示例：

```text
还没有帖子
发布第一条帖子，开始这个社区的讨论。
```

### Error

- 展示可理解错误，不暴露技术栈。
- 提供重试、返回或登录动作。
- 表单错误贴近字段。
- 页面错误不破坏整体布局。

### Success

- 成功反馈要短。
- 表单提交成功后优先进入下一步页面或显示 submitted 状态。
- Toast 可用于轻量成功，不用于承载关键结果。

### Disabled

- disabled 必须有视觉差异。
- 禁用按钮不应完全不可读。
- 如果禁用原因不明显，附近需要有简短说明或 tooltip。

## 响应式

断点建议：

```text
mobile: < 640px
tablet: 640px - 1023px
desktop: >= 1024px
wide: >= 1280px
```

规则：

- 移动端单列布局。
- 桌面端可以使用左侧导航 + 中心内容 + 右侧上下文栏。
- 表格在移动端必须改为列表或横向滚动，不允许压缩到不可读。
- 主要操作在移动端必须容易点击，触控目标不小于 `40px`。
- 长标题、长用户名、长 slug 必须有换行或截断策略。
- 页面不能出现横向溢出。

## 产品质感检查清单

交付页面前检查：

- 是否仍然符合 dark SaaS / Linear / Vercel / Raycast 方向。
- 是否使用 shadcn/ui 作为主组件来源。
- 是否没有引入第二套 UI 风格。
- 是否覆盖 loading、empty、error、success、disabled。
- 是否在移动端可用。
- 是否避免彩虹渐变、光污染和模板化大 hero。
- 是否像真实产品页面，而不是展示页。
