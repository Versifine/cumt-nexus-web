#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import process from "node:process";

const root = process.cwd();
const sourceRoot = resolve(root, "src");
const sourceFiles = existsSync(sourceRoot)
  ? listSourceFiles(sourceRoot).map((filePath) => ({
      absolutePath: filePath,
      content: readFileSync(filePath, "utf8"),
      path: normalizePath(relative(root, filePath)),
    }))
  : [];

const allowedFetchFiles = new Set([
  "src/app/readyz/route.ts",
  "src/lib/api/client.ts",
]);
const allowedEnvFiles = new Set(["src/lib/api/client.ts"]);
const results = [];

console.log("CUMT Nexus Web API boundary check");
console.log("");

checkSourceRoot();
checkDirectFetchUsage();
checkApiBaseUsage();
checkBackendPathLocations();
checkApiRequestPaths();
checkReadableFeedSourceBoundary();
checkNotificationContractBoundary();
checkSearchContractBoundary();
checkModerationStaffGateBoundary();
checkCommunityManageBoundary();

for (const result of results) {
  console.log(`[${result.status.toUpperCase()}] ${result.name} - ${result.detail}`);
}

const failCount = results.filter((result) => result.status === "fail").length;
console.log("");

if (failCount > 0) {
  console.error(`API boundary check failed with ${failCount} blocker(s).`);
  process.exit(1);
}

console.log("API boundary check passed.");

function checkSourceRoot() {
  if (!existsSync(sourceRoot)) {
    addFail("source root", "src directory is missing");
    return;
  }

  addPass("source root", `${sourceFiles.length} source file(s) scanned`);
}

function checkDirectFetchUsage() {
  const offenders = [];
  const directFetchPattern = /(?<![A-Za-z0-9_$])fetch\s*\(/;

  for (const file of sourceFiles) {
    if (!directFetchPattern.test(file.content)) {
      continue;
    }

    if (!allowedFetchFiles.has(file.path)) {
      offenders.push(file.path);
    }
  }

  if (offenders.length > 0) {
    addFail(
      "direct fetch",
      `fetch() is only allowed in ${formatAllowed(allowedFetchFiles)}; found ${offenders.join(", ")}`,
    );
    return;
  }

  addPass("direct fetch", "backend fetch usage stays behind approved files");
}

function checkApiBaseUsage() {
  const offenders = [];

  for (const file of sourceFiles) {
    if (!file.content.includes("NEXT_PUBLIC_API_BASE_URL")) {
      continue;
    }

    if (!allowedEnvFiles.has(file.path)) {
      offenders.push(file.path);
    }
  }

  if (offenders.length > 0) {
    addFail(
      "api base env",
      `NEXT_PUBLIC_API_BASE_URL is only allowed in ${formatAllowed(allowedEnvFiles)}; found ${offenders.join(", ")}`,
    );
    return;
  }

  addPass("api base env", "API base URL is centralized");
}

function checkBackendPathLocations() {
  const offenders = [];

  for (const file of sourceFiles) {
    if (!file.content.includes("/api/v1")) {
      continue;
    }

    if (!isFeatureApiFile(file.path)) {
      offenders.push(file.path);
    }
  }

  if (offenders.length > 0) {
    addFail(
      "backend path location",
      `/api/v1 paths must stay in src/features/*/api.ts; found ${offenders.join(", ")}`,
    );
    return;
  }

  addPass("backend path location", "backend paths stay in feature API modules");
}

function checkApiRequestPaths() {
  const apiFiles = sourceFiles.filter((file) => isFeatureApiFile(file.path));
  const endpoints = [];
  const offenders = [];
  const apiRequestPattern =
    /apiRequest(?:<[\s\S]*?>)?\s*\(\s*([`'"])([\s\S]*?)\1/g;

  for (const file of apiFiles) {
    let match;

    while ((match = apiRequestPattern.exec(file.content)) !== null) {
      const path = match[2];
      endpoints.push(`${file.path}: ${formatEndpoint(path)}`);

      if (!path.startsWith("/api/v1")) {
        offenders.push(`${file.path}: ${formatEndpoint(path)}`);
      }
    }
  }

  if (endpoints.length === 0) {
    addFail("apiRequest paths", "no apiRequest calls were found in feature API modules");
    return;
  }

  if (offenders.length > 0) {
    addFail(
      "apiRequest paths",
      `all apiRequest paths must start with /api/v1; found ${offenders.join(", ")}`,
    );
    return;
  }

  addPass("apiRequest paths", `${endpoints.length} backend endpoint call(s) use /api/v1`);
}

function checkReadableFeedSourceBoundary() {
  const typesFile = sourceFiles.find(
    (file) => file.path === "src/features/post/types.ts",
  );
  const apiFile = sourceFiles.find(
    (file) => file.path === "src/features/post/api.ts",
  );
  const queriesFile = sourceFiles.find(
    (file) => file.path === "src/features/post/queries.ts",
  );
  const homePageFile = sourceFiles.find(
    (file) => file.path === "src/app/home-feed-page.tsx",
  );
  const homeShellFile = sourceFiles.find(
    (file) => file.path === "src/components/app-shell/home-shell.tsx",
  );
  const problems = [];

  if (!typesFile) {
    problems.push("src/features/post/types.ts is missing");
  } else if (
    !typesFile.content.includes(
      'export type ReadableFeedSource = Exclude<FeedSource, "following">',
    )
  ) {
    problems.push(
      "post types must define ReadableFeedSource without following",
    );
  }

  if (!apiFile) {
    problems.push("src/features/post/api.ts is missing");
  } else {
    for (const token of [
      "ReadableFeedSource",
      "source?: ReadableFeedSource",
      "const source: ReadableFeedSource",
      "source: ReadableFeedSource",
      'params.set("source", source)',
    ]) {
      if (!apiFile.content.includes(token)) {
        problems.push(`post API feed source boundary missing ${token}`);
      }
    }

    if (/params\.set\(\s*["']source["']\s*,\s*["']following["']\s*\)/.test(apiFile.content)) {
      problems.push("post API must not request source=following");
    }
  }

  if (!queriesFile) {
    problems.push("src/features/post/queries.ts is missing");
  } else {
    for (const token of [
      "ReadableFeedSource",
      "source: ReadableFeedSource = \"recommended\"",
      "queryFn: () => listLatestPosts(limit, offset, sort, { source })",
    ]) {
      if (!queriesFile.content.includes(token)) {
        problems.push(`latest post query boundary missing ${token}`);
      }
    }
  }

  if (!homePageFile) {
    problems.push("src/app/home-feed-page.tsx is missing");
  } else if (
    !homePageFile.content.includes('if (source === "following")') ||
    !homePageFile.content.includes("return undefined;")
  ) {
    problems.push("server feed prefetch must skip /following");
  }

  if (!homeShellFile) {
    problems.push("src/components/app-shell/home-shell.tsx is missing");
  } else {
    for (const token of [
      "const isFollowingFeed = source === \"following\"",
      "isReady && !isFollowingFeed",
      "关注信息流暂未开放",
      "关注流不会用普通公开帖子填充",
    ]) {
      if (!homeShellFile.content.includes(token)) {
        problems.push(`following feed UI boundary missing ${token}`);
      }
    }
  }

  if (problems.length > 0) {
    addFail("readable feed source", problems.join("; "));
    return;
  }

  addPass(
    "readable feed source",
    "latest post requests are limited to recommended/all while /following stays an explicit placeholder",
  );
}

function checkNotificationContractBoundary() {
  const typesFile = sourceFiles.find(
    (file) => file.path === "src/features/notification/types.ts",
  );
  const apiFile = sourceFiles.find(
    (file) => file.path === "src/features/notification/api.ts",
  );
  const queriesFile = sourceFiles.find(
    (file) => file.path === "src/features/notification/queries.ts",
  );
  const categoriesFile = sourceFiles.find(
    (file) => file.path === "src/features/notification/categories.ts",
  );
  const targetsFile = sourceFiles.find(
    (file) => file.path === "src/features/notification/targets.ts",
  );
  const centerFile = sourceFiles.find(
    (file) => file.path === "src/features/notification/notification-center.tsx",
  );
  const categoryRouteFile = sourceFiles.find(
    (file) => file.path === "src/app/notifications/[category]/page.tsx",
  );
  const problems = [];

  if (!typesFile) {
    problems.push("src/features/notification/types.ts is missing");
  } else {
    for (const token of [
      "export type NotificationCategory",
      '"replies"',
      '"mentions"',
      '"likes"',
      '"system"',
      "UnreadSummaryResponse",
      "MarkAllNotificationsReadResponse",
    ]) {
      if (!typesFile.content.includes(token)) {
        problems.push(`notification types contract missing ${token}`);
      }
    }
  }

  if (!apiFile) {
    problems.push("src/features/notification/api.ts is missing");
  } else {
    for (const token of [
      'category = "all"',
      "category,",
      "/api/v1/notifications/unread-summary",
      "/api/v1/notifications/read-all",
    ]) {
      if (!apiFile.content.includes(token)) {
        problems.push(`notification API contract missing ${token}`);
      }
    }
  }

  if (!queriesFile) {
    problems.push("src/features/notification/queries.ts is missing");
  } else {
    for (const token of [
      "NotificationCategory",
      "notificationQueryKeys.list(category, status, limit, offset)",
      "notificationQueryKeys.unreadSummary()",
      "useUnreadSummaryQuery",
      "useMarkAllNotificationsReadMutation",
    ]) {
      if (!queriesFile.content.includes(token)) {
        problems.push(`notification query contract missing ${token}`);
      }
    }
  }

  if (!categoriesFile) {
    problems.push("src/features/notification/categories.ts is missing");
  } else {
    for (const token of [
      "notificationCategoryOptions",
      "notificationCategorySegments",
      "isNotificationCategorySegment",
      "getNotificationCategoryHref",
      '"/notifications"',
      '`/notifications/${category}`',
    ]) {
      if (!categoriesFile.content.includes(token)) {
        problems.push(`notification category route contract missing ${token}`);
      }
    }
  }

  if (!targetsFile) {
    problems.push("src/features/notification/targets.ts is missing");
  } else {
    for (const token of [
      "resolveNotificationTarget",
      'case "post"',
      'href: `/posts/${encodeURIComponent(sourceId)}`',
      'case "comment"',
      'href: null',
      "等待评论上下文",
      "后端尚未返回所属帖子 ID",
      'case "moderation_report"',
      'href: `/moderation/reports/${encodeURIComponent(sourceId)}`',
    ]) {
      if (!targetsFile.content.includes(token)) {
        problems.push(`notification target resolver missing ${token}`);
      }
    }
  }

  if (!centerFile) {
    problems.push("src/features/notification/notification-center.tsx is missing");
  } else {
    for (const token of [
      "initialCategory",
      "getNotificationCategoryHref",
      "router.push(getNotificationCategoryHref(nextCategory))",
      "notificationCategoryOptions",
      "useUnreadSummaryQuery",
      "分类未读",
      "全部标记已读",
      "resolveNotificationTarget(notification)",
      "NotificationTargetAction",
    ]) {
      if (!centerFile.content.includes(token)) {
        problems.push(`notification center contract missing ${token}`);
      }
    }

    if (centerFile.content.includes("getNotificationTargetHref(")) {
      problems.push("notification center must use shared target resolver");
    }

    if (centerFile.content.includes("filterNotifications(")) {
      problems.push("notification center must not filter categories locally");
    }
  }

  if (!categoryRouteFile) {
    problems.push("src/app/notifications/[category]/page.tsx is missing");
  } else {
    for (const token of [
      "generateStaticParams",
      "notificationCategorySegments",
      "isNotificationCategorySegment",
      "notFound()",
      "initialCategory={category}",
    ]) {
      if (!categoryRouteFile.content.includes(token)) {
        problems.push(`notification category route missing ${token}`);
      }
    }
  }

  if (problems.length > 0) {
    addFail("notification contract", problems.join("; "));
    return;
  }

  addPass(
    "notification contract",
    "notifications use backend category filters, unread summary and read-all contract",
  );
}

function checkSearchContractBoundary() {
  const apiFile = sourceFiles.find(
    (file) => file.path === "src/features/search/api.ts",
  );
  const pageFile = sourceFiles.find(
    (file) => file.path === "src/features/search/search-page.tsx",
  );
  const problems = [];

  if (!apiFile) {
    problems.push("src/features/search/api.ts is missing");
  } else {
    for (const token of [
      "/api/v1/search?${params.toString()}",
      "token: null",
    ]) {
      if (!apiFile.content.includes(token)) {
        problems.push(`search API public contract missing ${token}`);
      }
    }
  }

  if (!pageFile) {
    problems.push("src/features/search/search-page.tsx is missing");
  } else {
    for (const token of [
      "公开搜索暂不可用",
      "当前服务还没有开放未登录搜索",
    ]) {
      if (pageFile.content.includes(token)) {
        problems.push(`search page must not show stale unavailable copy: ${token}`);
      }
    }

    for (const token of [
      "getSearchSourceHref(query, scope)",
      'label: "返回搜索结果"',
    ]) {
      if (!pageFile.content.includes(token)) {
        problems.push(`search result return source missing ${token}`);
      }
    }
  }

  if (problems.length > 0) {
    addFail("search public contract", problems.join("; "));
    return;
  }

  addPass(
    "search public contract",
    "search uses public anonymous reads and does not show stale backend-gap copy",
  );
}

function checkModerationStaffGateBoundary() {
  const consoleFile = sourceFiles.find(
    (file) => file.path === "src/features/moderation/moderation-console.tsx",
  );
  const problems = [];

  if (!consoleFile) {
    addFail(
      "moderation staff gate",
      "src/features/moderation/moderation-console.tsx is missing",
    );
    return;
  }

  for (const token of [
    "useCurrentUserQuery",
    "currentUserQuery.data?.is_platform_staff === true",
    "const canLoadReports =",
    "const canLoadReport =",
    "需要平台权限",
    "当前账号不是平台 staff，不能查看举报列表或执行审核处理。",
    "当前账号不是平台 staff，不能查看举报详情或执行审核处理。",
    "无法确认用户身份",
  ]) {
    if (!consoleFile.content.includes(token)) {
      problems.push(`moderation console staff gate missing ${token}`);
    }
  }

  if (/const canLoadReports\s*=\s*isReady\s*&&\s*Boolean\(token\)\s*;/.test(consoleFile.content)) {
    problems.push("moderation report list must not load with token-only gate");
  }

  if (/const canLoadReport\s*=\s*isReady\s*&&\s*Boolean\(token\)\s*;/.test(consoleFile.content)) {
    problems.push("moderation report detail must not load with token-only gate");
  }

  if (problems.length > 0) {
    addFail("moderation staff gate", problems.join("; "));
    return;
  }

  addPass(
    "moderation staff gate",
    "moderation list and detail confirm /me.is_platform_staff before loading protected report data",
  );
}

function checkCommunityManageBoundary() {
  const typesFile = sourceFiles.find(
    (file) => file.path === "src/features/community/types.ts",
  );
  const apiFile = sourceFiles.find(
    (file) => file.path === "src/features/community/api.ts",
  );
  const queriesFile = sourceFiles.find(
    (file) => file.path === "src/features/community/queries.ts",
  );
  const detailFile = sourceFiles.find(
    (file) => file.path === "src/features/community/community-detail.tsx",
  );
  const managePageFile = sourceFiles.find(
    (file) => file.path === "src/features/community/community-manage-page.tsx",
  );
  const manageRouteFile = sourceFiles.find(
    (file) => file.path === "src/app/communities/[slug]/manage/page.tsx",
  );
  const problems = [];

  if (!typesFile) {
    problems.push("src/features/community/types.ts is missing");
  } else {
    for (const token of [
      "CommunityViewerPermissions",
      "viewer_permissions?: CommunityViewerPermissions",
      "can_post?: boolean",
      "can_manage?: boolean",
      "can_moderate?: boolean",
      "GetCommunityManageContextResponse",
      "CommunityManagePost",
      "CommunityManageComment",
      "CommunityManageReport",
      "CommunityMember",
      "CommunityManageSettings",
      "CommunityRule",
      "ListCommunityMembersResponse",
      "GetCommunityManageSettingsResponse",
      "ListCommunityRulesResponse",
      "UpdateCommunityManageSettingsInput",
      "UpdateCommunityManageSettingsResponse",
      "CreateCommunityRuleInput",
      "CreateCommunityRuleResponse",
      "UpdateCommunityRuleInput",
      "UpdateCommunityRuleResponse",
      "DeleteCommunityRuleInput",
    ]) {
      if (!typesFile.content.includes(token)) {
        problems.push(`community manage type contract missing ${token}`);
      }
    }
  }

  if (!apiFile) {
    problems.push("src/features/community/api.ts is missing");
  } else {
    for (const token of [
      "getCommunityManageContext",
      "`/api/v1/communities/${encodeURIComponent(slug)}/manage`",
      "listCommunityManagePosts",
      "listCommunityManageComments",
      "listCommunityManageReports",
      "listCommunityMembers",
      "getCommunityManageSettings",
      "listCommunityRules",
      "updateCommunityManageSettings",
      "createCommunityRule",
      "updateCommunityRule",
      "deleteCommunityRule",
      "/manage/members",
      "/manage/settings",
      "/manage/rules",
      "method: \"PATCH\"",
      "method: \"POST\"",
      "method: \"DELETE\"",
      "getCommunityManageListPath",
    ]) {
      if (!apiFile.content.includes(token)) {
        problems.push(`community manage API contract missing ${token}`);
      }
    }
  }

  if (!queriesFile) {
    problems.push("src/features/community/queries.ts is missing");
  } else {
    for (const token of [
      "manageContext",
      "managePosts",
      "manageComments",
      "manageReports",
      "manageMembers",
      "manageSettings",
      "manageRules",
      "useCommunityManageContextQuery",
      "useCommunityManagePostsQuery",
      "useCommunityManageCommentsQuery",
      "useCommunityManageReportsQuery",
      "useCommunityMembersQuery",
      "useCommunityManageSettingsQuery",
      "useCommunityRulesQuery",
      "useUpdateCommunityManageSettingsMutation",
      "useCreateCommunityRuleMutation",
      "useUpdateCommunityRuleMutation",
      "useDeleteCommunityRuleMutation",
      'type CommunityQueryScope = "public" | "viewer"',
      'detail: (slug: string, scope: CommunityQueryScope = "viewer")',
      'token: scope === "public" ? null : undefined',
    ]) {
      if (!queriesFile.content.includes(token)) {
        problems.push(`community manage query boundary missing ${token}`);
      }
    }
  }

  if (!detailFile) {
    problems.push("src/features/community/community-detail.tsx is missing");
  } else {
    for (const token of [
      "canPostToCommunity(community, isAuthenticated)",
      'const communityQueryScope = isAuthenticated ? "viewer" : "public"',
      "isAuthenticated ? undefined : initialCommunityData",
      "community.viewer_permissions?.can_post !== false",
      "community.viewer_permissions?.can_manage === true",
      "community.viewer_permissions?.can_moderate === true",
      "管理社区",
      "`/communities/${encodeURIComponent(community.slug)}/manage`",
      "申请社区",
    ]) {
      if (!detailFile.content.includes(token)) {
        problems.push(`community detail permission action missing ${token}`);
      }
    }
  }

  if (!managePageFile) {
    problems.push("src/features/community/community-manage-page.tsx is missing");
  } else {
    for (const token of [
      "CommunityManagePage",
      "useCommunityQuery",
      "useCommunityManageContextQuery",
      "useCommunityManagePostsQuery",
      "useCommunityManageCommentsQuery",
      "useCommunityManageReportsQuery",
      "useCommunityMembersQuery",
      "useCommunityManageSettingsQuery",
      "useCommunityRulesQuery",
      "const canManageCommunity =",
      "canLoadManage =",
      "communityQuery.isSuccess && canManageCommunity",
      "登录后管理社区",
      "需要社区权限",
      "当前账号不是这个社区的 owner 或 moderator，不能查看社区管理。",
      "维护资料与规则",
      "资料和规则写操作走真实后端接口；成员管理仍保持只读。",
      "ManageMemberList",
      "ManageSettingsEditor",
      "ManageRuleManager",
      "CreateRuleForm",
      "RuleEditForm",
      "保存资料",
      "新增规则",
      "确认删除",
    ]) {
      if (!managePageFile.content.includes(token)) {
        problems.push(`community manage page missing ${token}`);
      }
    }

    if (/const canLoadManage\s*=\s*isReady\s*&&\s*Boolean\(token\)\s*;/.test(managePageFile.content)) {
      problems.push("community manage page must not load protected manage data with token-only gate");
    }
  }

  if (!manageRouteFile) {
    problems.push("src/app/communities/[slug]/manage/page.tsx is missing");
  } else {
    for (const token of [
      "CommunityManagePage",
      'contextLabel={`/${slug} 管理`}',
      "generateMetadata",
    ]) {
      if (!manageRouteFile.content.includes(token)) {
        problems.push(`community manage route missing ${token}`);
      }
    }
  }

  if (problems.length > 0) {
    addFail("community manage boundary", problems.join("; "));
    return;
  }

  addPass(
    "community manage boundary",
    "community detail uses viewer permissions, manage page gates protected reads, and settings/rules writes use real backend contracts",
  );
}

function listSourceFiles(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
      continue;
    }

    if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

function normalizePath(path) {
  return path.split(sep).join("/");
}

function isFeatureApiFile(path) {
  return /^src\/features\/[^/]+\/api\.ts$/.test(path);
}

function formatAllowed(values) {
  return [...values].join(", ");
}

function formatEndpoint(path) {
  return path.replace(/\s+/g, " ").trim();
}

function addPass(name, detail) {
  results.push({ detail, name, status: "pass" });
}

function addFail(name, detail) {
  results.push({ detail, name, status: "fail" });
}
