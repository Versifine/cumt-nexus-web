# CUMT Nexus Web 内部文档

内部文档只保留当前决策和当前阶段可执行信息。阶段变更时，根目录 `README.md`、`tasks.md`、内部文档和 `.ai/slices/` 要一起同步。

## 文档索引

- `architecture/frontend-v1.md`：前端 V1 架构、路由、模块和 API 协作边界。
- `product/product-targets.md`：产品目标总表，统一记录已实现能力、未实现能力、前后端缺口和派工顺序。
- `architecture/content-system.md`：Markdown-like 帖子、Reddit-style 评论树、图片和外链嵌入的产品/架构讨论稿。
- `architecture/content-media-api-gaps.md`：图片、对象存储、链接预览和白名单 embed 的后端 API 缺口。
- `architecture/markdown-rendering.md`：Markdown renderer 选型、安全边界、组件组织和实施切片。
- `design/product-visual-direction.md`：内部设计索引，指向 `docs/design/` 的权威规范。
- `engineering/workflow.md`：阶段、分支、工单、验证和后端同步规则。
- `engineering/launch-readiness.md`：上线前自检命令、阻塞项和人工 QA 范围。
- `engineering/deployment.md`：生产部署、环境变量、CORS、发布后验证和回滚标准。
- `engineering/browser-qa.md`：真实浏览器人工 QA 步骤、失败分级和记录模板。

## 设计规范

- `../design/DESIGN.md`：长期 UI/UX 风格、token、状态和响应式规则。
- `../design/page-patterns.md`：常见页面结构。
- `../design/component-rules.md`：组件使用规则。

页面实现前必须阅读 `docs/design/DESIGN.md` 和 `docs/design/page-patterns.md`。

## 当前阶段

- 当前阶段：`V1 本地版封版收口`
- 当前工单板：根目录 `tasks.md`
- 当前切片：`.ai/slices/stage-01-v1-local-freeze/`

阶段 0 的技术栈、产品范围和视觉基线已经完成；阶段 1 Web 主链路已经形成本地闭环。没有正式域名前，生产 HTTPS、正式 API origin 和生产 CORS 只作为 deferred 项，不阻塞 V1 本地版封版。
