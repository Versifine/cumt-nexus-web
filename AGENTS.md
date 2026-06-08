# AGENTS.md

本文件约束 Codex 后续在 `cumt-nexus-web` 中的工作方式。所有实现、重构、审查和文档改动都要遵守这里的规则。

## 项目边界

技术栈固定为：

```text
Next.js App Router
React
TypeScript
Tailwind CSS
shadcn/ui
Motion
TanStack Query
react-hook-form
zod
lucide-react
```

约束：

- 不允许把项目改成 Vite、Remix、Vue、Nuxt、Svelte 或其他框架。
- 不允许引入第二套主 UI 库，例如 Ant Design、MUI、Mantine、Chakra、DaisyUI。
- 不允许把 Aceternity UI 当作主组件系统；如需借鉴，只能借鉴局部交互思路，并改造成符合 `docs/design/DESIGN.md` 的风格。
- 不允许随意引入新依赖。新增依赖前必须说明用途、替代方案、影响范围，并得到明确同意。
- 不允许随机更换审美方向。长期视觉方向以 `docs/design/DESIGN.md` 为准。
- Web 界面默认使用简体中文。除品牌名、技术名、URL slug、API 字段名和用户生成内容外，不允许在用户可见文案里长期混用英文。
- `.claude/skills/frontend-design/SKILL.md` 只能借鉴“避免低质量 AI slop、追求高设计质量”的思想；不得采用其中“每次选择新的 bold aesthetic direction”的做法。

## 参考文档

前端实现、组件实现或视觉调整时，优先参考：

- `AGENTS.md`
- `docs/design/DESIGN.md`
- `docs/design/page-patterns.md`
- `docs/design/component-rules.md`

这些文档用于保持技术栈、设计方向和组件边界一致，不用于限制必要的大改、重写或一次性完成整条功能链路。已有上下文足够明确时，可以直接实现，不需要把阅读、映射页面类型或过程记录当作交付物。

涉及提示词或任务交接时，可以参考：

- `docs/prompts/frontend-task-template.md`
- `docs/prompts/frontend-review-template.md`

## 执行方式

用户在本项目没有前端练习需求。Codex 应以“把用户要求一次性做到可验收”为目标，而不是为了训练、演示或降低改动规模而拆成很多小步骤。

规则：

- 不要求每次执行前说明准备修改哪些文件、验收范围或非目标。
- 不强制拆成小任务；如果核心体验、页面结构或组件模型本身不合理，可以一次性大改、重构或重写。
- 用户要求实现某件事时，默认直接做完整闭环，包括必要的数据调用、UI、状态、响应式、错误处理和验证。
- 如果完成目标需要跨多个页面、多个 feature、共享组件或 API client 调整，可以一起改。
- 只有在需要新增依赖、改后端、执行破坏性操作、删除大量用户已有内容或存在高风险取舍时，才需要先明确提醒或征求确认。

## 禁止事项

- 允许为完成用户目标进行大范围重构、目录调整和组件重写；不要为了保留旧结构而牺牲最终体验。
- 大改时仍要保持技术栈、业务边界和可验证性，不做无关炫技或无目标迁移。
- 不允许把样式从 Tailwind 改成 CSS Module、styled-components、Emotion 或其他方案。
- 不允许混用 UI 库。
- 不允许复制多个风格不同的 Button、Card、Dialog、Form。
- 不允许为了视觉炫技加入大面积渐变、光污染、复杂背景动画或每页不同风格。
- 不允许绕过已有 `lib/api`、`features/*`、`components/*` 边界随手写 fetch 和业务逻辑。
- 不允许把未完成的后端能力伪造成已完成能力。

## 代码组织

推荐结构：

```text
src/
  app/
  components/
    ui/
    app-shell/
    feedback/
    post/
    community/
    comment/
  features/
    auth/
    community/
    post/
    comment/
    vote/
    feed/
  lib/
    api/
    auth/
    query/
    time/
  styles/
```

组织规则：

- `app/` 只负责路由、布局和页面组合。
- `components/ui/` 放 shadcn/ui 生成或封装后的基础组件。
- `components/*` 放跨 feature 的展示组件，不直接写后端 URL。
- `features/*` 放业务 query、mutation、schema、类型和页面组合逻辑。
- `lib/api/` 是唯一 HTTP client 入口。
- `lib/auth/` 是唯一 token/session 读写入口。
- `lib/query/` 放 TanStack Query provider、query key helper 和通用配置。
- 页面组件要轻，复杂逻辑下沉到 feature。

## UI 实现规则

- shadcn/ui 是唯一主组件系统。
- Tailwind CSS 负责样式和布局。
- lucide-react 是唯一图标来源。
- Motion 只做克制的进入、退出、状态反馈和布局过渡。
- 页面和组件必须符合 `docs/design/DESIGN.md`。
- 常见页面必须符合 `docs/design/page-patterns.md`。
- 组件使用必须符合 `docs/design/component-rules.md`。
- 即使使用 `frontend-design` skill，也必须维持本项目固定的 dark editorial product / magazine-grade campus community interface 方向。
- 交互视觉优先使用文字动作、色块、线条和编号控制注意力；Button 只用于真正主命令。

页面实现必须包含必要状态：

- loading
- empty
- error
- success 或 submitted
- disabled
- mobile responsive

## 后端协作

后端仓库：`D:\Projects\cumt-nexus-api`

实现 API 调用前必须确认后端当前接口和响应结构。不要只凭记忆写字段。

默认 API base：

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

错误结构：

```json
{
  "error": {
    "code": "unauthenticated",
    "message": "authentication required"
  }
}
```

## 完成后汇报

每次完成后简要说明：

- 实际完成了什么。
- 运行了哪些验证，结果如何。
- 是否有新增依赖、后端缺口或必须由用户知道的风险。

不要做冗长过程记录，不需要逐条复述修改过的文件；除非用户要求，否则只给能帮助用户判断结果的高信号信息。
