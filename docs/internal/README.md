# CUMT Nexus Web 内部文档

内部文档只保留当前决策和当前阶段可执行信息。阶段变更时，根目录 `README.md`、`tasks.md`、内部文档和 `.ai/slices/` 要一起同步。

## 文档索引

- `architecture/frontend-v1.md`：前端 V1 架构、路由、模块和 API 协作边界。
- `product/frontend-information-architecture.md`：前端信息架构、页面拓扑、URL、权限边界和后端目标合同蓝图。
- `product/frontend-planning-completion.md`：前端规划收口证明，确认哪些决策已经冻结、哪些属于实现或后端待办。
- `product/product-targets.md`：产品目标总表，统一记录已实现能力、前端后续增强、后端缺口和派工顺序。
- `product/v2-roadmap.md`：V2 后端能力全量前端接入路线图。
- `product/frontend-experience-rebuild.md`：从真实页面体验反馈出发的前端重修拆分方案。
- `architecture/content-system.md`：Reddit Markdown 正文、Reddit-style 评论树、图片和外链嵌入的产品/架构讨论稿。
- `architecture/content-media-api-gaps.md`：图片、对象存储、链接预览和白名单 embed 的后端合同核对文档。
- `architecture/markdown-rendering.md`：Reddit Markdown renderer 选型、安全边界、组件组织和实施切片。
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

- 当前阶段：`V2 后端能力全量前端接入`
- 当前工单板：根目录 `tasks.md`
- 当前切片：`.ai/slices/stage-02-v2-productization/`

阶段 0 的技术栈、产品范围和视觉基线已经完成；阶段 1 Web 主链路已经形成本地闭环。前端规划部分已经收口，完成证明见 `product/frontend-planning-completion.md`。V2 后端能力全量前端接入已完成本地初版收口，V2.1 已补齐社区申请列表 / 详情审核台和 staff 入口显隐；当前已覆盖 Reddit Markdown、单一写作面板、图片上传、new/hot 排序、搜索、通知、举报审核、community application list/detail/approve/reject 和 moderation remove。

当前没有阻塞 V2.1 的 P0 后端缺口。后续新增前端所需后端接口时，继续记录到根目录 `backend-api-needs.md`，该文件已加入 `.gitignore`。本地 CORS 预检已修复并通过严格 `check:readiness`；没有正式域名前，生产 HTTPS、正式 API origin 和生产 CORS 继续作为 deferred 项，不阻塞 V2 本地初版结论。
