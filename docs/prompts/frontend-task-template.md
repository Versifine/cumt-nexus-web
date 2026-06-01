# Frontend Task Template

复制下面模板给 Codex，用于实现一个前端页面、组件或纵向切片。

```text
请先阅读：
- AGENTS.md
- docs/design/DESIGN.md
- docs/design/page-patterns.md
- docs/design/component-rules.md

现在实现：[任务名称]

任务目标：
- [说明这个切片要完成的用户价值]
- [说明成功后用户可以做什么]

涉及文件：
- [列出预计要创建或修改的文件]
- 如果你判断还需要新增文件，请先说明原因再修改。

页面/组件类型：
- 参考 docs/design/page-patterns.md 中的 [Landing/Auth/Dashboard/List/Detail/Form/Settings] Page。

视觉要求：
- 必须符合 dark editorial product / magazine-grade campus community interface 风格。
- 深色模式优先。
- Web 界面默认使用简体中文；除品牌名、技术名、URL slug、API 字段名和用户生成内容外，不要混用英文产品文案。
- 使用 shadcn/ui + Tailwind CSS。
- 图标使用 lucide-react。
- Motion 只做克制的状态过渡。
- 不允许换一套审美，不允许彩虹渐变、光污染或模板化 hero。

交互要求：
- [列出主要交互，例如提交、筛选、打开详情、投票、评论]
- 必须覆盖 loading、empty、error、success/disabled 状态。
- 必须考虑移动端布局。

API/数据要求：
- [列出接口或 mock 数据边界]
- API 调用必须走项目统一 client。
- 不要伪造后端未完成能力。

不做什么：
- [列出本次明确不做的能力]
- 不做大范围重构。
- 不引入新依赖，除非先说明并获得同意。
- 不混用 UI 库。

完成后请按以下格式汇报：
1. 改了什么
2. 创建/修改了哪些文件
3. 如何运行或验证
4. 未完成事项
5. 是否新增依赖
```

使用示例：

```text
请先阅读 AGENTS.md 和 docs/design/*。

现在实现登录页面。

任务目标：
- 用户可以输入 username/password 登录。
- 登录成功后保存 access token 并进入首页。

涉及文件：
- src/app/login/page.tsx
- src/features/auth/*
- src/lib/api/*

页面类型：
- Auth Page。

不做什么：
- 不做第三方登录。
- 不做找回密码。
- 不引入新的 UI 库。
```
