# Frontend Review Template

复制下面模板给 Codex，用于审查已有页面、组件或任务。

```text
请先阅读：
- AGENTS.md
- docs/design/DESIGN.md
- docs/design/page-patterns.md
- docs/design/component-rules.md

现在审查：[页面/组件/任务名称]

审查范围：
- [列出要审查的文件或目录]

请重点检查：

1. 风格统一性
- 是否符合 dark editorial product / magazine-grade campus community interface 风格。
- 是否深色模式优先。
- 是否出现每个页面一种风格的问题。
- 是否有彩虹渐变、光污染、玻璃拟态泛滥、模板化 hero。

2. DESIGN.md 合规性
- 颜色、间距、圆角、阴影、边框是否符合规范。
- 字体层级是否克制。
- Motion 是否只用于克制动效。
- 用户可见文案是否默认使用简体中文，是否有不必要的中英文混用。
- 是否尊重响应式和可读性。

3. 依赖和 UI 系统
- 是否只使用 shadcn/ui 作为主组件系统。
- 是否引入多余依赖。
- 是否混用了其他 UI 库。
- 图标是否统一使用 lucide-react。

4. 组件组织
- 是否重复造多个风格不同的 Button/Card/Dialog/Form。
- 组件拆分是否清楚。
- 页面组件是否过重。
- API、auth、query 逻辑是否散落在页面里。

5. 状态完整性
- 是否有 loading 状态。
- 是否有 empty 状态。
- 是否有 error 状态。
- 是否有 success/submitted 状态。
- 是否有 disabled/submitting 状态。

6. 响应式
- 移动端是否可用。
- 是否有横向溢出。
- 长标题、长用户名、长 slug 是否处理。
- 触控目标是否足够大。

7. 产品真实性
- 是否伪造后端未完成能力。
- 是否有无意义装饰压过内容。
- 页面是否像真实可用产品，而不是展示稿。

输出格式：
- Findings：按严重程度列出问题，包含文件和行号。
- Open questions：需要用户确认的问题。
- Suggested fixes：给出最小修复建议。
- Pass summary：如果没有明显问题，说明仍然存在的风险或测试缺口。
```
