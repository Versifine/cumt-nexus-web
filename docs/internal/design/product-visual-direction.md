# 产品视觉方向

本文件保留为内部文档索引。后续 UI/UX 权威规范已经迁移到 `docs/design/`，避免同一项目存在两套审美规则。

必须优先阅读：

- `docs/design/DESIGN.md`
- `docs/design/page-patterns.md`
- `docs/design/component-rules.md`

当前固定视觉方向：

```text
dark editorial product / magazine-grade campus community interface
```

当前样张基准：

```text
Nexus Surface / 面层式暗色社区界面
```

执行口径：

- 以背景深浅、间距、字重、编号和局部色块建立层级。
- 分割线只用于 App Shell 边界、表格、密集数据和必须明确边界的区域。
- 不再把 `border-b`、`divide-y` 或 `border-x` 当作普通 section 的默认结构。
- 青绿色主色只用于主动作、当前态和少量关键状态。
- 保留当前社区产品骨架，不把页面重做成营销站或展示稿。

长期约束：

- 深色模式优先。
- shadcn/ui 是唯一主组件系统。
- Tailwind CSS 负责样式。
- Motion 只做克制动效。
- 不允许随机换审美。
- 不允许每个页面一种风格。
- 不允许彩虹渐变、油腻光污染和模板化 AI 风格。
