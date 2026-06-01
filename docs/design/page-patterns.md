# Page Patterns

本文定义 `cumt-nexus-web` 常见页面结构。实现页面前必须先匹配一个页面类型，再按对应结构推进。

所有页面默认使用简体中文文案。除品牌名、技术名、URL slug、API 字段名和用户生成内容外，不要在页面标题、按钮、表单、状态提示中混用英文。

## Landing Page

### 页面目标

提供产品入口和登录后的默认落点。CUMT Nexus 的 landing 不做传统营销页，优先呈现真实社区内容或登录入口。

### 页面布局

- 未登录：紧凑介绍 + 登录/注册入口 + 少量产品能力说明。
- 已登录：直接进入全站最新流或社区内容。
- 不使用全屏 hero。
- 不使用大面积插画或彩虹背景。

### 主要组件

- App header
- Primary action button
- Community/feed preview
- Feature row, 最多 3 项
- Footer links, 如需要

### 主要用户动作

- 登录
- 注册
- 进入最新流
- 进入社区列表

### 必备状态

- 未登录
- 已登录
- feed loading
- feed empty
- feed error

### 不该做什么

- 不写空泛标语。
- 不做一屏大 hero。
- 不用随机生成的装饰背景。
- 不把公共总版伪装成全站 feed。

## Auth Page

### 页面目标

让用户快速完成登录或注册，并清楚处理失败状态。

### 页面布局

- 居中窄表单，宽度 `360px - 420px`。
- 左上或顶部保留品牌返回入口。
- 表单区域使用单层 panel，不要卡片套卡片。
- 移动端保持 `16px` 页面边距。

### 主要组件

- Form
- Input
- Password input
- Button
- Field error
- Auth switch link
- Alert, 用于非字段错误

### 主要用户动作

- 输入用户名。
- 输入密码。
- 提交。
- 切换登录/注册。

### 必备状态

- idle
- submitting
- field validation error
- invalid credentials
- username conflict
- success redirect

### 不该做什么

- 不把登录页做成营销海报。
- 不使用社交登录占位，除非后端已经支持。
- 不在页面里硬编码 token 处理。
- 不用 toast 替代表单错误。

## Dashboard Page

### 页面目标

承载登录后主要工作区，让用户看到最新内容、社区入口和个人上下文。

### 页面布局

- 桌面：Sidebar + content column + optional right rail。
- 移动端：top bar + single column。
- 内容区优先显示真实数据。
- 页面标题不超过一行，副信息保持克制。

### 主要组件

- App shell
- Sidebar
- Nav item
- Feed list
- Community shortcut
- User menu
- Skeleton
- Error panel

### 主要用户动作

- 切换导航。
- 打开帖子。
- 打开社区。
- 发帖。
- 退出登录。

### 必备状态

- app boot loading
- unauthenticated
- feed loading
- feed empty
- feed error
- mobile nav open/closed

### 不该做什么

- 不做分析大屏风格。
- 不塞无后端支持的统计卡。
- 不在 dashboard 上堆装饰组件。
- 不让 sidebar 和内容区使用两套视觉语言。

## List Page

### 页面目标

让用户快速扫读一组资源并进入详情，例如社区列表、帖子列表、评论列表。

### 页面布局

- 顶部：标题、简短描述、主要动作。
- 中部：筛选或 tabs，如果当前确实需要。
- 主体：列表。
- 底部：分页或加载更多。

### 主要组件

- Page header
- Button
- Tabs, 可选
- List item
- Badge
- Skeleton rows
- Empty state
- Error state

### 主要用户动作

- 打开详情。
- 创建资源。
- 翻页或加载更多。
- 重试。

### 必备状态

- loading
- empty
- error
- partial data
- pagination disabled/end

### 不该做什么

- 不把每个列表项做成巨大宣传卡。
- 不为了视觉效果降低信息密度。
- 不在没有筛选需求时放复杂筛选栏。
- 不让 hover 改变布局尺寸。

## Detail Page

### 页面目标

展示单个资源的完整上下文，并支持该资源下的主要动作，例如帖子详情、社区详情。

### 页面布局

- 顶部：返回入口、资源标题、元信息。
- 主体：内容正文或详情信息。
- 动作区：投票、评论、编辑或申请等。
- 下方：关联列表，例如评论。
- 右侧栏可放社区信息或上下文，但移动端下沉。

### 主要组件

- Breadcrumb/back button
- Detail header
- Badge
- Vote control
- Content panel
- Comment composer
- Related list
- Skeleton
- Error state

### 主要用户动作

- 返回列表。
- 投票。
- 评论。
- 打开作者或社区上下文。
- 重试加载。

### 必备状态

- loading
- not found
- error
- empty related list
- submitting comment
- optimistic or pending vote

### 不该做什么

- 不让右侧栏抢正文焦点。
- 不隐藏关键元信息。
- 不把评论区做成复杂树，除非后端支持。
- 不把投票失败伪装成成功。

## Form Page

### 页面目标

完成一个明确提交任务，例如发帖、提交社区申请、设置更新。

### 页面布局

- 顶部：标题和返回入口。
- 中部：单列表单，宽度 `560px - 720px`。
- 底部：主操作和取消。
- 辅助说明靠近字段，不集中堆在顶部。

### 主要组件

- Form
- Input
- Textarea
- Select, 如需要
- Button
- Field description
- Field error
- Alert

### 主要用户动作

- 输入。
- 提交。
- 取消或返回。
- 修正错误。

### 必备状态

- pristine
- dirty
- invalid
- submitting
- submit error
- submitted success
- disabled

### 不该做什么

- 不一次展示过多字段。
- 不用 toast 替代字段错误。
- 不在未提交成功时提前更新资源状态。
- 不把帮助文案写成长教程。

## Settings Page

### 页面目标

管理用户或产品配置。当前项目首版设置能力有限，不能伪造不存在的后端能力。

### 页面布局

- 桌面：左侧设置导航 + 右侧表单区。
- 移动端：设置分组纵向排列。
- 每个设置分组使用单层 section。
- 危险操作独立分组。

### 主要组件

- Settings nav
- Section header
- Form
- Switch
- Button
- Dialog for destructive action
- Badge
- Alert

### 主要用户动作

- 查看配置。
- 修改字段。
- 保存。
- 取消。
- 执行危险操作前确认。

### 必备状态

- loading
- unchanged
- dirty
- saving
- save success
- save error
- disabled/unavailable

### 不该做什么

- 不显示后端不支持的设置项。
- 不把危险操作放在普通按钮旁边。
- 不把每个设置分组做成不同风格。
- 不用复杂动画装饰设置页。
