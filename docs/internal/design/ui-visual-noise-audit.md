# UI 视觉噪音排查与改进指南

本文档记录当前 cumt-nexus-web 界面存在的视觉噪音来源，以及对应的改进方向。
供后续实现参考，不是设计方向调整，属于执行质量修缮。

---

## 问题一：帖子列表"框中框"——投票栏边框与背景

### 现状

`reddit-post-list-item.tsx` 中，每条帖子的投票栏通过以下方式渲染：

```tsx
// 帖子外层
<article className="grid grid-cols-[42px_minmax(0,1fr)] border-b border-border ...">

  // 投票栏：有独立 border-r + bg-background-soft，像一个嵌入的小面板
  <RedditVoteControl
    className="border-r border-border bg-background-soft/45 py-3"
    ...
  />

  // 正文：px-3/px-4
  <PostPreviewAttribution className="px-3 py-3 sm:px-4" ...>
```

这会在每条帖子的左侧产生一个有明显背景色差异的竖带区域，配合外层列表容器的 `border-x border-border`，整体观感是**三层边框叠加**：

```
列表容器 border-x
  └── 帖子 border-b
       └── 投票栏 border-r + 背景色块
```

### 目标

投票控件左侧不再做"面板化"处理，改为与帖子正文背景一致、靠左对齐的轻量列控件。
投票按钮的上下箭头和得分数字直接在白纸（深色背景）上呈现，没有色块包裹。

边框只保留帖子间的 `border-b`，不再给投票栏加 `border-r`。

### 改法

```tsx
// 移除 className="border-r border-border bg-background-soft/45 py-3"
// 改为直接包在轻量 div 中
<div className="flex w-10 shrink-0 flex-col items-center pt-3 sm:w-11">
  <RedditVoteControl ... />
</div>
```

`RedditVoteControl` 自身不再接受外部 border/background className，由调用方决定间距。

---

## 问题二：section 容器嵌套——外层 border 套内层 border-x

### 现状

`home-shell.tsx`、`community-detail.tsx`、`community-list.tsx` 中普遍出现：

```tsx
// 头部 section
<section className="border border-border bg-background">
  <CommunityHeader ... />
</section>

// 列表 section（紧跟在头部下方，加了 mt-3）
<section className="mt-3 border-x border-border bg-background">
  <div className="border-b border-border ...">列表工具栏</div>
  {posts.map(post => <RedditPostListItem ... />)}
</section>
```

效果：
- 头部四面有完整边框
- 列表区域只有左右边框（`border-x`），每条帖子有 `border-b`
- 两个 section 之间有 `mt-3` 间距，但背景色相同，视觉上两个方块紧贴但中间断开

整体观感是**两个有框盒子叠放**，像 card 套 card。

### 目标

整个页面主内容区是一个**统一的竖向无框内容区**，依靠分割线而不是外框区分不同区块：

- 头部信息区和列表区之间用一条 `border-b` 分割，不额外加间距和外框
- 列表区不再有独立的 `border-x`，外层只保留顶部一条入口线和底部结束线
- 整体像报纸版面：文字、线、留白，而不是一组卡片堆叠

### 改法

```tsx
// 合并为一个容器，取消 section 之间的 mt-3
<div className="border-y border-border bg-background">
  <CommunityHeader ... />  {/* 底部带 border-b */}
  <div className="border-b border-border px-3 py-3">工具栏</div>
  {posts.map(post => <RedditPostListItem ... />)}
</div>
```

---

## 问题三：信息重复——头部 HeaderMetric 和右侧栏 InfoRow 内容相同

### 现状

`community-detail.tsx` 和 `community-list.tsx` 中，同一份数据出现在两个地方：

**主内容区头部（HeaderMetric）：**
```
帖子   总分   作者
  5     12     3
```

**右侧栏（InfoRow）：**
```
Slug      /cs
状态      活跃
可见性    公开
类型      普通
创建      6月13日
```

`community-list.tsx` 的右侧栏同样有 `全部 / 启用 / 公开` 三行 InfoRow，完全复制了头部 HeaderMetric 的内容。

### 目标

- 头部只保留**名称、slug、一句描述和状态标签**，不做数字统计块
- 右侧栏保留**上下文信息（slug、状态、类型、创建日期、管理入口）**
- 两处信息互补，不重叠
- HeaderMetric 的三格统计块在首屏没有实际意义时（数据是 0 或加载中占位）可以省略，不强制展示

---

## 问题四：EmptyState 在有框容器内再加虚线圆角框

### 现状

`empty-state.tsx`：

```tsx
<div className="rounded-xl border border-dashed border-border bg-background-soft px-4 py-6 text-center">
```

但 EmptyState 通常被放置在已经有 `border` 的 section 容器内部，并再套一层 `border-b border-border p-4` 的 div。
结果是：外框 → 内框 padding → 虚线圆角框，**三重边框嵌套**。

### 目标

EmptyState 改为**无框纯文本居中布局**，依靠内外容器提供边距，不自带边框和背景色：

```tsx
<div className="px-4 py-10 text-center">
  <p className="text-sm font-medium text-foreground">{title}</p>
  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
  {action ? <div className="mt-4">{action}</div> : null}
</div>
```

---

## 问题五：帖子操作栏视觉散乱

### 现状

`reddit-post-list-item.tsx` 的操作栏：

```tsx
<div className="mt-3 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
  <PostActionLink> <MessageSquare /> N 条评论 </PostActionLink>
  <button> <Share2 /> 分享 </button>
  <PostSaveButton ... />
  <span> <ImageIcon /> 图片 </span>   {/* 仅标注类型，无动作 */}
  <span> <ExternalLink /> 播放器 </span>
  <span> <LinkIcon /> 链接 </span>
</div>
```

问题：
1. 类型标注（"图片"、"播放器"、"链接"）和可交互动作（"评论"、"分享"、"收藏"）混排，视觉权重相同
2. `h-8` 触控高度 + `text-xs` 字号，操作区高度感觉浪费
3. 操作区和正文之间间距 `mt-3` 偏大，帖子内部显得松散

### 目标

- 类型标注缩小为低对比度的辅助文字，或直接去掉（信息本身已经通过媒体预览传达）
- 可交互操作保持简洁：评论数、分享、收藏，最多三项
- `h-7` + 更紧凑的 `gap-0.5`，整体压缩，更贴近正文底部
- 类型标注如保留，用 `text-muted-foreground/50` 降低存在感

---

## 问题六：右侧栏信息冗余与视觉割裂

### 现状

右侧栏（RightRail）由多个 `<section className="border-b border-border pb-6">` 构成，每段都有自己的 `border-y border-border` 分割线和 `divide-y divide-border`。

`home-shell.tsx` 右侧栏结构：
```
section 1: 标题 + 说明 + 两个 TextAction（选择社区 / 申请社区）
section 2: 高分讨论 TOP N（帖子列表）
section 3: 社区使用提示（三条固定文字）
```

问题：
- "社区使用提示"三条固定说明文字对回访用户价值几乎为零，但每次都占据大块空间
- 三个 section 都有独立 `border-b`，加上内部 `border-y`，分割线密度高
- 整体右侧栏背景色 `bg-background-soft/45` 与主内容区有微弱色差，形成视觉分层但又不够明显，产生模糊感

### 目标

- "使用提示"降权：改为超小字号、低对比度的纯文字注脚，或首次登录后不再展示
- 减少 section 间的重复 border，改用更大的 `space-y` 留白区分，减少线条密度
- 右侧栏背景色统一为 `bg-background`，与主内容区一致，靠 `border-l` 分隔而不是色差

---

## 总结：改动优先级

| 问题 | 视觉影响 | 改动范围 | 优先级 |
|------|---------|---------|--------|
| 投票栏 border-r + 背景块 | 高 | reddit-post-list-item | P0 |
| section 容器嵌套 border | 高 | home-shell, community-detail, community-list | P0 |
| EmptyState 三重框 | 中 | empty-state.tsx + 所有调用方 | P1 |
| 操作栏散乱 | 中 | reddit-post-list-item | P1 |
| 信息重复 | 低 | community-detail, community-list | P2 |
| 右侧栏冗余 | 低 | home-shell, community-detail | P2 |

P0 改动不涉及逻辑，只改 className，风险低。
P1 改动需要调整 EmptyState 组件接口和调用方，需同步更新。
P2 改动涉及信息架构决策，建议单独讨论后再改。
