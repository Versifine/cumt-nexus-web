# CUMT Nexus Web 内部文档

内部文档用于保存当前决策、阶段方案、合同边界和 QA 证据。公共规则入口见 `../README.md`，视觉和组件权威规范见 `../design/`。

## Product

- `product/product-targets.md`：产品目标总表，记录已实现能力、前端后续增强、后端缺口和派工顺序。
- `product/v2-roadmap.md`：V2 后端能力全量前端接入路线图。
- `product/frontend-information-architecture.md`：前端信息架构、页面拓扑、URL、权限边界和后端目标合同蓝图。
- `product/frontend-planning-completion.md`：前端规划收口证明，确认规划已完成并区分实现待办和后端缺口。
- `product/frontend-implementation-audit.md`：前端规划落地摸排，区分已落地、部分落地和仍未实现的能力。
- `product/frontend-experience-rebuild.md`：从真实页面体验反馈出发的前端重修拆分方案。
- `product/post-media-profile-rebuild.md`：帖子媒体流、列表预览、详情页 lightbox 和公开用户主页重构计划。
- `product/social-progression-design.md`：关注、头衔、等级、积分和消耗型特殊互动的产品合同设计。
- `product/douyin-message-system-design.md`：抖音式私信系统设计，覆盖 PC 两栏聊天界面、陌生人请求、分享卡片、实时和风控边界。
- `product/platform-admin-design.md`：平台管理区的信息架构、路由拓扑、页面职责、接口边界和首版验收标准。
- `product/platform-admin-frontend-plan.md`：平台管理前端实施阶段、文件范围、接口接入顺序和验收计划。
- `product/platform-admin-repair-plan.md`：平台管理权限、流程、拆页和可用性问题的修复计划。

## Architecture

- `architecture/frontend-v1.md`：前端 V1 架构、路由、模块和 API 协作边界。
- `architecture/content-system.md`：Reddit Markdown 正文、Reddit-style 评论树、图片和外链嵌入的产品架构讨论稿。
- `architecture/content-media-api-gaps.md`：图片、对象存储、链接预览和白名单 embed 的后端合同核对文档。
- `architecture/markdown-rendering.md`：Reddit Markdown renderer 选型、安全边界、组件组织和实施切片。

## Design

- `design/product-visual-direction.md`：内部设计索引，指向 `docs/design/` 的权威规范。
- `design/ui-visual-noise-audit.md`：视觉噪音排查与改进记录，作为当前 UI 降噪问题库。

当前 UI 权威规范不在内部目录，而在：

- `../design/DESIGN.md`
- `../design/page-patterns.md`
- `../design/component-rules.md`

## Engineering

- `engineering/workflow.md`：阶段推进、分支、文档和验证规则。
- `engineering/launch-readiness.md`：上线前自检、阻塞项和人工 QA 范围。
- `engineering/deployment.md`：生产部署、环境变量、CORS、发布后验证和回滚标准。
- `engineering/browser-qa.md`：真实浏览器人工 QA 步骤、失败分级和记录模板。

## 当前阶段

- 当前阶段：`V2 后端能力全量前端接入` 后的产品化和视觉收口。
- 设计基准：`Nexus Surface / 面层式暗色社区界面`，详见 `../design/DESIGN.md`。
- 新增后端需求继续记录到根目录 `backend-api-needs.md`，该文件已加入 `.gitignore`。

## 维护规则

新增、删除或重命名内部文档时，必须同步更新：

- `docs/README.md`
- `docs/internal/README.md`
- 根目录 `README.md` 的“项目文档”
- `scripts/check-docs.mjs`

同步后运行：

```powershell
npm run check:docs
```
