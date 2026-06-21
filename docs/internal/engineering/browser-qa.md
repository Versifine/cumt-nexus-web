# 浏览器人工 QA

本文定义 `cumt-nexus-web` 上线前必须人工走完的真实浏览器检查。自动脚本只能证明接口和静态路由没有明显断裂；登录后表单、跳转、浏览器 CORS、localStorage 会话、TanStack Query 水合、移动端触控和视觉状态必须在浏览器里确认。

## 执行前准备

后端必须运行并允许当前前端 origin：

```powershell
$env:HTTP_CORS_ALLOWED_ORIGINS='http://localhost:3000'
```

后端 CORS 方法也必须覆盖浏览器会发起预检的写操作。至少确认：

```text
Access-Control-Allow-Methods 包含 PATCH
```

如果 `PATCH` 未放行，帖子编辑会在浏览器中保存失败，即使 shell 直连 API 可以成功。评论不提供编辑入口。

前端必须运行：

```powershell
npm run dev
```

执行人工 QA 前先跑自动检查：

```powershell
npm run lint
npm run typecheck
npm run build
npm run check:api-boundary
npm run check:dependencies
npm run check:env
npm run check:routes
npm run check:readiness
npm run check:main-path
npm run check:v2-path
```

`npm run check:env:production` 在没有正式 HTTPS 前端域名和 API 地址前会失败；该失败必须记录为生产配置阻塞，不能忽略。

## 测试账号

优先在浏览器中从 `/register` 创建一个新的 QA 账号，账号名带时间戳，便于和脚本 smoke 数据区分：

```text
用户名：qa_YYYYMMDD_HHMM
密码：qaPasswordYYYYMMDDHHMM
```

如果注册流程失败，不要改用脚本绕过；注册失败本身就是上线阻塞。只有在单独复测登录后页面时，才允许复用已经注册成功的 QA 账号。

## 桌面端主路径

桌面端使用 `1280px` 或更宽视口检查。

### 1. 未登录首页

路径：`/`

必须确认：

- 页面显示公开首页信息流文案，例如 `公开帖子流会直接展示给访客`。
- 页面接入统一 App Shell：桌面左侧只显示主导航和最近访问，顶部搜索输入框常驻。
- 不显示 `无法加载最新帖子`。
- 不显示 `登录后查看最新讨论`、`待登录` 或 `需要登录` 登录墙。
- 顶部搜索、发帖、通知、登录 / 注册都可点击或可聚焦；发帖、通知等受保护动作应进入登录门禁。
- 页面没有横向溢出。

### 2. 注册

路径：`/register`

必须确认：

- 空表单提交时字段附近显示中文校验错误。
- 输入新用户名和密码后，提交按钮进入 loading/disabled 状态。
- 注册成功后进入登录态，并跳转到首页或预期回跳页。
- 失败时不清空用户输入。
- 页面没有英文产品文案混入。

### 3. 登录和退出

路径：`/login`

必须确认：

- 错误密码显示中文错误，不使用 toast 替代表单错误。
- 正确账号登录后进入首页。
- 首页右上角显示当前用户名。
- 用户菜单可以打开，并且 `退出登录` 可用。
- 退出后回到登录页或未登录状态，首页不再显示用户菜单。

### 4. 社区列表

路径：`/communities`

必须确认：

- 社区列表可以加载真实后端数据。
- `public` 社区可以打开。
- 列表项 hover/focus 不改变布局尺寸。
- `申请社区 +` 是文字动作，不表现成厚重按钮。
- loading、empty、error 状态至少能从代码或受控后端状态确认；如果本轮无法制造 empty/error，记录为未覆盖项。

### 5. 社区详情

路径：`/communities/public`

必须确认：

- 社区标题、slug、状态、可见性和描述来自真实后端。
- 社区帖子列表可以加载真实数据。
- 未登录时可以看到社区详情和社区帖子流，不显示 `需要登录` 或 `请先登录后查看社区详情和帖子` 登录墙。
- 未登录点击 `发布帖子 +` 会进入登录门禁，并保留 `next=/communities/public/new` 回跳。
- 已登录时右栏上下文展示真实社区信息，不显示开发状态文案。
- `发布帖子 +` 进入 `/communities/public/new`。

### 6. 发帖

路径：`/communities/public/new`

必须确认：

- 未登录访问时进入登录门禁，并保留 `next` 回跳。
- 登录后返回本页可以继续发帖。
- 空表单提交显示字段级中文校验。
- 输入标题和正文后，提交按钮进入 loading/disabled 状态。
- 发帖成功后进入帖子详情页。
- 发帖失败不清空输入。
- 正文写入 Markdown 后，详情页阅读态正确渲染标题、加粗、斜体、列表、表格、链接和涂黑。
- 上传或粘贴图片后，正文中出现 `nexus-attachment` 图片引用；发布成功后图片显示在正文位置，而不是挂在正文外。

### 7. 帖子详情、评论和投票

路径：发帖成功后的 `/posts/:id`

必须确认：

- 未登录打开真实 `/posts/:id` 时可以看到帖子正文和评论区，不显示 `需要登录` 或 `请先登录后查看帖子详情、评论和投票` 登录墙。
- 帖子标题、正文、作者、分数和状态显示正确。
- 评论列表可以加载。
- 未登录时评论、投票和举报显示登录门禁，不会直接提交受保护写操作。
- 未登录和普通用户不显示 `平台移除` 审核动作。
- 空评论提交显示字段级中文校验。
- 发布评论后，评论列表出现新评论。
- 评论正文写入 Markdown 后，评论阅读态正确渲染加粗、表格、链接和涂黑。
- 回复评论后，子评论进入树状结构，Markdown 渲染不破坏评论缩进。
- 作者编辑帖子后，标题和 Markdown 正文保存成功，刷新后仍保留格式。
- 评论不显示编辑入口，作者只保留删除等允许的生命周期动作。
- upvote、downvote 和取消投票都会更新当前帖子状态。
- 投票失败不能伪造成成功；如果本轮无法制造失败，记录为未覆盖项。
- 页面没有横向溢出，长标题和长正文不会挤压操作区。

### 7.1 Markdown / 图片专项

路径：发帖成功后的 `/posts/:id`

必须确认：

- 发帖、根评论、回复评论和帖子编辑都使用同一套 Markdown 写作器；评论不显示编辑入口。
- 工具栏至少覆盖加粗、斜体、标题、删除线、引用、无序列表、有序列表、行内代码、代码块、链接、涂黑和表格。
- 写作器只有一个实时渲染编辑面；输入或粘贴 Markdown 后应直接显示排版后的 Markdown、涂黑、正文内图片和白名单媒体播放器，不默认暴露源码 textarea。
- 工具栏点击不会让编辑器丢失当前选区或光标位置，也不会把表格和后续链接粘在同一行。
- 普通外部 Markdown 图片不会直接渲染远程图片，而是提示使用图片上传。
- 已上传图片可以插入正文，并在阅读态按正文位置显示。
- 移除正文图片后，正文内对应 `nexus-attachment` marker 被移除，发布态不再显示这张图片。
- 移动端表格和代码块可以横向滚动，不撑破页面。
- 编辑保存必须走真实浏览器操作验证；只用 shell 直连 `PATCH` 成功不能证明浏览器可用。

### 8. 社区申请

路径：`/community-applications/new`

必须确认：

- 未登录访问时进入登录门禁，并保留 `next` 回跳。
- 登录后返回本页可以填写申请。
- 空表单提交显示字段级中文校验。
- `requested_slug` 使用非法字符时显示中文校验。
- 提交成功后显示成功状态或明确下一步。
- 提交失败不清空输入。

## 移动端主路径

移动端使用 `390px x 844px` 或接近尺寸检查。

必须至少复查：

- `/`
- `/login`
- `/register`
- `/communities`
- `/communities/public`
- `/communities/public/new`
- `/posts/:id`
- `/community-applications/new`

每个页面必须确认：

- 没有横向溢出。
- 主要动作不小于可触控尺寸。
- 长标题、长 slug、长用户名不挤压按钮或右侧内容。
- 顶部导航和文字动作可点击。
- 表单字段、错误文案和提交按钮在一屏内可理解。
- 右侧栏内容在移动端下沉，不抢正文焦点。

## 视觉 QA

按 `docs/design/DESIGN.md` 检查：

- 整体仍是 `dark editorial product / magazine-grade campus community interface`。
- 整体符合 Nexus Surface 第四版：面层优先、分割线克制、主色只用于主动作和当前态。
- 不出现默认 SaaS 卡片堆叠。
- 不出现大面积彩虹渐变、发光光斑、玻璃拟态和油腻光污染。
- 次级跳转优先是文字动作、bar 或克制色块，不靠 outline button 堆叠。
- 页面层级不依赖大量 `border-b`、`divide-y` 或 `border-x`。
- Button 只用于提交、确认、登录、注册等真正命令。
- 页面之间风格一致，不像每页重新选了一套审美。
- loading、empty、error、success、disabled 状态都使用中文。

## 失败分级

P0，不能上线：

- 注册、登录、发帖、评论、投票任一主路径不可用。
- 浏览器 CORS 阻止前端访问后端。
- 生产环境 URL 仍是 localhost 或非 HTTPS。
- 页面出现 Next.js 错误页、白屏或无法恢复的运行时错误。
- 移动端主要页面横向溢出。

P1，上线前必须修：

- 未登录门禁丢失 `next` 回跳。
- 表单失败清空用户输入。
- loading、error、empty、success、disabled 状态缺失或英文混入。
- 视觉明显回到默认 shadcn/SaaS 卡片堆叠。
- 重复错误面板、`--` 占位上下文或开发状态文案暴露给用户。

P2，可排期但要记录：

- 个别 hover/focus 反馈不够清楚。
- 文案不够精炼但不影响理解。
- 可制造条件较难的失败状态本轮未覆盖。

## 记录模板

每次完整浏览器 QA 后，在 `docs/internal/engineering/launch-readiness.md` 的“最新浏览器 QA 记录”中补充摘要，并保留以下记录：

```text
日期：
执行人：
前端地址：
后端地址：
浏览器：
桌面视口：
移动视口：
测试账号：

自动检查：
- lint：
- typecheck：
- build：
- check:api-boundary：
- check:dependencies：
- check:env：
- check:routes：
- check:readiness：
- check:main-path：
- check:env:production：

桌面端结果：
- 未登录首页：
- 注册：
- 登录和退出：
- 社区列表：
- 社区详情：
- 发帖：
- 帖子详情、评论和投票：
- 社区申请：

移动端结果：
- /：
- /login：
- /register：
- /communities：
- /communities/public：
- /communities/public/new：
- /posts/:id：
- /community-applications/new：

发现的问题：
- [级别] 路径/功能：现象；是否已修复；修复提交。

未覆盖项：
- 项目：
- 原因：
- 下一步：
```

## 完成标准

人工 QA 只有在以下条件全部满足时才算通过：

- P0 和 P1 问题为 0。
- P2 问题已记录并不阻塞首版上线。
- 生产环境配置检查通过，或明确记录为当前上线阻塞。
- 桌面和移动端主路径都有结果记录。
- 记录中包含实际使用的前端地址、后端地址和测试账号。
