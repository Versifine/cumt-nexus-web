import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import type {
  ComponentInventoryGroup,
  ComponentInventoryItem,
  ComponentInventorySummary,
} from "./types";

type ComponentGroupDefinition = {
  description: string;
  id: string;
  label: string;
  match: (file: string) => boolean;
};

const groupDefinitions: ComponentGroupDefinition[] = [
  {
    id: "base-ui",
    label: "基础 UI",
    description: "shadcn/ui、Radix 封装和全站基础视觉原语。",
    match: (file) => file.startsWith("src/components/ui/"),
  },
  {
    id: "feedback",
    label: "反馈状态",
    description: "loading、empty、error、submitted 和状态页组件。",
    match: (file) => file.startsWith("src/components/feedback/"),
  },
  {
    id: "app-shell",
    label: "应用壳层",
    description: "顶部栏、侧栏、首页壳层和全站导航相关组件。",
    match: (file) => file.startsWith("src/components/app-shell/"),
  },
  {
    id: "feature-auth",
    label: "认证账号",
    description: "登录、注册、账号安全、权限要求和会话状态组件。",
    match: (file) => file.startsWith("src/features/auth/"),
  },
  {
    id: "feature-community",
    label: "社区",
    description: "社区列表、详情、申请、管理和社区悬浮预览组件。",
    match: (file) => file.startsWith("src/features/community/"),
  },
  {
    id: "feature-post",
    label: "帖子",
    description: "帖子列表项、详情、发布、收藏、归因和排序组件。",
    match: (file) => file.startsWith("src/features/post/"),
  },
  {
    id: "feature-comment",
    label: "评论",
    description: "评论树、评论表单、生命周期操作和评论效果组件。",
    match: (file) => file.startsWith("src/features/comment/"),
  },
  {
    id: "feature-content",
    label: "内容渲染",
    description: "富文本编辑、内容正文、图片画廊和媒体嵌入组件。",
    match: (file) => file.startsWith("src/features/content/"),
  },
  {
    id: "feature-profile",
    label: "个人主页",
    description: "公开主页、资料设置、身份标记、关注和成长展示组件。",
    match: (file) => file.startsWith("src/features/profile/"),
  },
  {
    id: "feature-message",
    label: "私信",
    description: "私信中心、会话线程、请求箱、分享入口和隐私设置组件。",
    match: (file) => file.startsWith("src/features/message/"),
  },
  {
    id: "feature-notification",
    label: "通知",
    description: "通知中心、通知行、分类导航和通知分页组件。",
    match: (file) => file.startsWith("src/features/notification/"),
  },
  {
    id: "feature-moderation",
    label: "审核治理",
    description: "举报、移除、审核控制台、批量操作和快捷治理组件。",
    match: (file) => file.startsWith("src/features/moderation/"),
  },
  {
    id: "feature-admin",
    label: "平台管理",
    description: "平台管理工作台、队列、用户、社区、设置和审计组件。",
    match: (file) => file.startsWith("src/features/admin/"),
  },
  {
    id: "feature-search",
    label: "搜索",
    description: "搜索页、结果行、范围切换、搜索右栏和摘要组件。",
    match: (file) => file.startsWith("src/features/search/"),
  },
  {
    id: "feature-vote",
    label: "投票",
    description: "帖子和评论投票控件。",
    match: (file) => file.startsWith("src/features/vote/"),
  },
  {
    id: "feature-media",
    label: "媒体",
    description: "头像、横幅和媒体裁剪编辑组件。",
    match: (file) => file.startsWith("src/features/media/"),
  },
  {
    id: "feature-style-guide",
    label: "样式台账",
    description: "当前工具页自身的展示组件。",
    match: (file) => file.startsWith("src/features/style-guide/"),
  },
  {
    id: "runtime",
    label: "运行时支撑",
    description: "Provider、主题、查询和路由记忆组件。",
    match: (file) => file.startsWith("src/lib/"),
  },
  {
    id: "routes",
    label: "路由页面",
    description: "App Router 页面、布局、错误页和加载页组合组件。",
    match: (file) => file.startsWith("src/app/"),
  },
];

const ignoredComponentNames = new Set(["Comp", "Icon"]);

export function collectComponentInventory(): {
  groups: ComponentInventoryGroup[];
  summary: ComponentInventorySummary;
} {
  const root = process.cwd();
  const sourceRoot = join(root, "src");
  const files = existsSync(sourceRoot) ? collectTsxFiles(sourceRoot, root) : [];
  const groupedItems = new Map<string, ComponentInventoryItem[]>();

  for (const file of files) {
    const absolutePath = join(root, file);
    const source = readFileSync(absolutePath, "utf8");
    const group = resolveGroup(file);
    const item: ComponentInventoryItem = {
      components: extractComponentNames(source),
      file,
    };
    const items = groupedItems.get(group.id) ?? [];
    items.push(item);
    groupedItems.set(group.id, items);
  }

  const groups = groupDefinitions
    .map<ComponentInventoryGroup>((definition) => ({
      description: definition.description,
      id: definition.id,
      items: (groupedItems.get(definition.id) ?? []).sort((a, b) =>
        a.file.localeCompare(b.file),
      ),
      label: definition.label,
    }))
    .filter((group) => group.items.length > 0);

  const fileCount = groups.reduce((count, group) => count + group.items.length, 0);
  const componentCount = groups.reduce(
    (count, group) =>
      count +
      group.items.reduce((itemCount, item) => itemCount + item.components.length, 0),
    0,
  );

  return {
    groups,
    summary: {
      componentCount,
      fileCount,
      groupCount: groups.length,
    },
  };
}

function collectTsxFiles(directory: string, root: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectTsxFiles(absolutePath, root));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".tsx")) {
      files.push(normalizePath(relative(root, absolutePath)));
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
}

function resolveGroup(file: string): ComponentGroupDefinition {
  return (
    groupDefinitions.find((definition) => definition.match(file)) ??
    groupDefinitions[groupDefinitions.length - 1]
  );
}

function extractComponentNames(source: string): string[] {
  const names = new Set<string>();
  const functionPattern =
    /(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s+([A-Z][A-Za-z0-9_]*)(?:<[^>{}]+>)?\s*\(/g;
  const arrowPattern =
    /(?:export\s+)?const\s+([A-Z][A-Za-z0-9_]*)\s*(?::[^=]+)?=\s*(?:\([^)]*\)|[A-Za-z0-9_]+)\s*=>/g;
  const componentBodyPattern = /return\s*(?:\(|<|null)/;

  for (const match of source.matchAll(functionPattern)) {
    const name = match[1];
    const body = source.slice(match.index ?? 0, Math.min(source.length, (match.index ?? 0) + 3000));

    if (isComponentName(name) && componentBodyPattern.test(body)) {
      names.add(name);
    }
  }

  for (const match of source.matchAll(arrowPattern)) {
    const name = match[1];
    const body = source.slice(match.index ?? 0, Math.min(source.length, (match.index ?? 0) + 3000));

    if (isComponentName(name) && (body.includes("=> (") || body.includes("=> <") || componentBodyPattern.test(body))) {
      names.add(name);
    }
  }

  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function isComponentName(name: string): boolean {
  return (
    !ignoredComponentNames.has(name) &&
    !/^[A-Z0-9_]+$/.test(name) &&
    /^[A-Z][A-Za-z0-9_]*$/.test(name)
  );
}

function normalizePath(file: string): string {
  return file.replaceAll("\\", "/");
}
