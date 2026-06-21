# CUMT Nexus Web 文档入口

本文是前端文档总入口。新任务优先从这里判断应该阅读哪一组文档，再进入具体设计、产品、架构或工程文档。

## 权威规则

- `../AGENTS.md`：Codex 在本仓库工作的最高约束，包含技术栈、边界、执行方式和完成汇报要求。
- `design/DESIGN.md`：长期 UI/UX 规范。当前基准为 Nexus Surface 第四版：面层优先、分割线克制、主色只用于主动作和当前态。
- `design/page-patterns.md`：常见页面结构和状态要求。
- `design/component-rules.md`：组件复用、基础组件边界和 UI 原语规则。

## 任务模板

- `prompts/frontend-task-template.md`：前端实现任务模板。
- `prompts/frontend-review-template.md`：前端审查任务模板。
- `prompts/backend-content-media-target-template.md`：后端内容媒体能力目标模式提示词。

## 内部文档

内部文档只保留当前决策、当前阶段可执行信息和仍有参考价值的历史证据。索引见 `internal/README.md`。

主要分组：

- `internal/product/`：产品目标、路线图、功能设计和阶段性方案。
- `internal/architecture/`：前端架构、内容系统、Markdown 渲染和 API 缺口。
- `internal/design/`：设计方向索引和视觉噪音审计。
- `internal/engineering/`：工作流、Linux 开发环境、上线检查、部署和浏览器 QA。

## 使用顺序

1. 实现或调整 UI：先读 `../AGENTS.md`、`design/DESIGN.md`、`design/page-patterns.md`、`design/component-rules.md`。
2. 做产品能力：再读 `internal/product/product-targets.md` 和对应功能设计文档。
3. 涉及后端合同：读相关 `internal/architecture/*`，必要时同步根目录 `backend-api-needs.md`。
4. 上线或验收：读 `internal/engineering/workflow.md`、`internal/engineering/launch-readiness.md`、`internal/engineering/deployment.md`、`internal/engineering/server-docker-runbook.md` 和 `internal/engineering/browser-qa.md`。

新增、删除或重命名文档后，必须同步更新：

- `README.md`
- `docs/README.md`
- `docs/internal/README.md`
- `scripts/check-docs.mjs`

然后运行：

```powershell
npm run check:docs
```
