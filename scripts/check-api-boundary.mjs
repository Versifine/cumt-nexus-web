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
    (file) => file.path === "src/app/(feed)/home-feed-page.tsx",
  );
  const homeShellFile = sourceFiles.find(
    (file) => file.path === "src/components/app-shell/home-shell.tsx",
  );
  const problems = [];

  if (!typesFile) {
    problems.push("src/features/post/types.ts is missing");
  } else if (!typesFile.content.includes("export type ReadableFeedSource = FeedSource")) {
    problems.push("post types must allow following as a readable feed source");
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

    if (!apiFile.content.includes('params.set("source", source)')) {
      problems.push("post API must pass the selected feed source to /api/v1/posts");
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
    problems.push("src/app/(feed)/home-feed-page.tsx is missing");
  }

  if (!homeShellFile) {
    problems.push("src/components/app-shell/home-shell.tsx is missing");
  } else {
    for (const token of [
      "const isFollowingFeed = source === \"following\"",
      "const canReadLatestPosts = isReady && (!requiresAuth || Boolean(token))",
      "source,",
      "只展示你关注的社区和用户发布的公开讨论",
      "关注流还没有帖子",
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
    "latest post requests include recommended/all/following and /following uses the real backend feed",
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
      '"interactions"',
      '"system"',
      "next_offset",
      "has_more",
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
      'category = "interactions"',
      "category,",
      "limit: String(limit)",
      "offset: String(offset)",
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
      "notificationQueryKeys.list(category, limit, offset)",
      'category = "interactions"',
      "listNotifications({ category, limit, offset })",
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
      "后端尚未返回所属帖子，暂不能直达评论",
      'case "moderation_report"',
      'href: `/admin/reports/${encodeURIComponent(sourceId)}`',
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
      "NotificationCategoryNav",
      "notificationCategoryOptions",
      "formatNotificationMessage(notification)",
      "resolveNotificationTarget(notification)",
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
    "notifications use interactions/system category filters without read state UI",
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
      "moderation platform role gate",
      "src/features/moderation/moderation-console.tsx is missing",
    );
    return;
  }

  for (const token of [
    "useCurrentUserQuery",
    "resolvePlatformRole",
    "const platformRole = resolvePlatformRole(currentUserQuery.data);",
    "const canLoadReports = isReady && Boolean(token) && Boolean(platformRole);",
    "const canLoadReport = isReady && Boolean(token) && Boolean(platformRole);",
    "需要平台权限",
    "当前账号没有平台管理权限，不能查看举报列表或执行审核处理。",
    "当前账号没有平台管理权限，不能查看举报详情或执行审核处理。",
    "无法确认用户身份",
  ]) {
    if (!consoleFile.content.includes(token)) {
      problems.push(`moderation console staff gate missing ${token}`);
    }
  }

  if (consoleFile.content.includes("currentUserQuery.data?.is_platform_staff === true")) {
    problems.push("moderation report gate must use platform_role with legacy staff fallback");
  }

  if (/const canLoadReports\s*=\s*isReady\s*&&\s*Boolean\(token\)\s*;/.test(consoleFile.content)) {
    problems.push("moderation report list must not load with token-only gate");
  }

  if (/const canLoadReport\s*=\s*isReady\s*&&\s*Boolean\(token\)\s*;/.test(consoleFile.content)) {
    problems.push("moderation report detail must not load with token-only gate");
  }

  if (problems.length > 0) {
    addFail("moderation platform role gate", problems.join("; "));
    return;
  }

  addPass(
    "moderation platform role gate",
    "moderation list and detail resolve platform_role before loading protected report data",
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
  const moderationApiFile = sourceFiles.find(
    (file) => file.path === "src/features/moderation/api.ts",
  );
  const moderationQueriesFile = sourceFiles.find(
    (file) => file.path === "src/features/moderation/queries.ts",
  );
  const quickActionsFile = sourceFiles.find(
    (file) => file.path === "src/features/moderation/moderation-quick-actions.tsx",
  );
  const bulkActionsFile = sourceFiles.find(
    (file) => file.path === "src/features/moderation/moderation-bulk-actions.tsx",
  );
  const removeDialogFile = sourceFiles.find(
    (file) => file.path === "src/features/moderation/moderation-remove-dialog.tsx",
  );
  const postListItemFile = sourceFiles.find(
    (file) => file.path === "src/features/post/reddit-post-list-item.tsx",
  );
  const hoverCardFile = sourceFiles.find(
    (file) => file.path === "src/features/community/community-hover-card.tsx",
  );
  const communityPermissionsFile = sourceFiles.find(
    (file) => file.path === "src/features/community/permissions.ts",
  );
  const adminReportsRouteFile = sourceFiles.find(
    (file) => file.path === "src/app/admin/reports/page.tsx",
  );
  const adminModQueuePageFile = sourceFiles.find(
    (file) => file.path === "src/features/admin/admin-mod-queue-page.tsx",
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
      "platform_owner_override?: boolean",
      "GetCommunityManageContextResponse",
      "CommunityManagePost",
      "CommunityManageComment",
      "CommunityManageReport",
      "CommunityMember",
      "ModerationUserProfile",
      "ModeratorNote",
      "GetCommunityModerationUserProfileResponse",
      "ListCommunityModeratorNotesResponse",
      "CreateCommunityModeratorNoteResponse",
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
      "listCommunityModerationTemplates",
      "createCommunityModerationTemplate",
      "updateCommunityModerationTemplate",
      "deleteCommunityModerationTemplate",
      "listCommunityUserStates",
      "upsertCommunityUserState",
      "deleteCommunityUserState",
      "listCommunityModLogs",
      "getCommunityModerationUserProfile",
      "listCommunityModeratorNotes",
      "createCommunityModeratorNote",
      "deleteCommunityModeratorNote",
      "updateCommunityManageSettings",
      "createCommunityRule",
      "updateCommunityRule",
      "deleteCommunityRule",
      "/manage/members",
      "/manage/settings",
      "/manage/rules",
      "getModerationTemplatePath",
      "removal-reasons",
      "saved-responses",
      "getUserStatePath",
      "/moderation/logs",
      "/moderation/users/${encodeURIComponent(user_id)}/profile",
      "/moderation/users/${encodeURIComponent(user_id)}/notes",
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
      "useCommunityModerationTemplatesQuery",
      "useCreateCommunityModerationTemplateMutation",
      "useUpdateCommunityModerationTemplateMutation",
      "useDeleteCommunityModerationTemplateMutation",
      "useCommunityUserStatesQuery",
      "useUpsertCommunityUserStateMutation",
      "useDeleteCommunityUserStateMutation",
      "useCommunityModLogsQuery",
      "useCommunityModerationUserProfileQuery",
      "useCommunityModeratorNotesQuery",
      "useCreateCommunityModeratorNoteMutation",
      "useDeleteCommunityModeratorNoteMutation",
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
      "canAccessCommunityManagement",
      "canManageThisCommunity(community, platformRole)",
      "canManageCommunity={canManageCommunity}",
      "`/communities/${encodeURIComponent(community.slug)}/manage`",
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
      "useAppointCommunityModeratorMutation",
      "useRemoveCommunityModeratorMutation",
      "useCreateCommunityOwnerTransferMutation",
      "useCommunityModQueueQuery",
      "ModerationQuickActions",
      "ModerationBulkActions",
      "ManageUserStatesPanel",
      "ManageUserProfilePanel",
      "ModerationUserProfileBlock",
      "ModeratorNotesList",
      "ManageModerationTemplatePanel",
      "ManageModLogPanel",
      "CommunityToolsNav",
      "CommunityQueueWorkspace",
      "ModQueueItemList",
      "isModToolsQueue",
      "const canManageCommunity =",
      "canLoadManage =",
      "communityQuery.isSuccess && canManageCommunity",
      "ManageMemberGovernance",
      "ManageSettingsEditor",
      "ManageRuleManager",
      "CreateRuleForm",
      "RuleEditForm",
      "canAccessCommunityManagement(",
      "viewerCommunity,",
      "platformRole,",
      "canEditCommunityConfiguration(community, platformRole)",
      "canModerateCommunityContent(community, platformRole)",
    ]) {
      if (!managePageFile.content.includes(token)) {
        problems.push(`community manage page missing ${token}`);
      }
    }

    if (/const canLoadManage\s*=\s*isReady\s*&&\s*Boolean\(token\)\s*;/.test(managePageFile.content)) {
      problems.push("community manage page must not load protected manage data with token-only gate");
    }
  }

  if (!moderationApiFile) {
    problems.push("src/features/moderation/api.ts is missing");
  } else {
    for (const token of [
      "listAdminModQueue",
      "listCommunityModQueue",
      "/api/v1/admin/mod-queues/actions",
      "`/api/v1/communities/${encodeURIComponent(slug)}/mod-queues/actions`",
      "applyAdminModQueueAction",
      "applyCommunityModQueueAction",
    ]) {
      if (!moderationApiFile.content.includes(token)) {
        problems.push(`moderation mod queue API contract missing ${token}`);
      }
    }
  }

  if (!moderationQueriesFile) {
    problems.push("src/features/moderation/queries.ts is missing");
  } else {
    for (const token of [
      "useCommunityModQueueQuery",
      "useApplyCommunityModQueueActionMutation",
      "useApplyAdminModQueueActionMutation",
      "moderationQueryKeys.communityModQueues(slug)",
    ]) {
      if (!moderationQueriesFile.content.includes(token)) {
        problems.push(`moderation mod queue query boundary missing ${token}`);
      }
    }
  }

  if (!adminReportsRouteFile) {
    problems.push("src/app/admin/reports/page.tsx is missing");
  } else if (!adminReportsRouteFile.content.includes("AdminModQueuePage")) {
    problems.push("/admin/reports must render the real admin Mod Queue workspace");
  }

  if (!adminModQueuePageFile) {
    problems.push("src/features/admin/admin-mod-queue-page.tsx is missing");
  } else {
    for (const token of [
      "useAdminModQueueQuery",
      "useAdminAuditLogsQuery",
      "QueueLayout",
      "ModerationQuickActions",
      "ModerationBulkActions",
      "queueTabs",
      "reports",
      "spam",
      "removed",
      "edited",
      "unmoderated",
      "needs_review",
    ]) {
      if (!adminModQueuePageFile.content.includes(token)) {
        problems.push(`admin mod queue workspace missing ${token}`);
      }
    }
  }

  if (!quickActionsFile) {
    problems.push("src/features/moderation/moderation-quick-actions.tsx is missing");
  } else {
    for (const token of [
      "useApplyCommunityModQueueActionMutation",
      "useApplyAdminModQueueActionMutation",
      "approve",
      "spam",
      "ignore_reports",
      "lock",
      "pin",
      "mark_nsfw",
      "mark_spoiler",
      "set_flair",
      "communityManageHref",
      "targetAuthorId",
      "useUpsertCommunityUserStateMutation",
      "useCommunityModerationUserProfileQuery",
      "useCreateCommunityModeratorNoteMutation",
      "查看用户画像 / Mod Note",
      "封禁作者",
      "禁言作者",
      "completedActions",
      "ModerationActionButton",
    ]) {
      if (!quickActionsFile.content.includes(token)) {
        problems.push(`moderation quick actions boundary missing ${token}`);
      }
    }
  }

  if (!bulkActionsFile) {
    problems.push("src/features/moderation/moderation-bulk-actions.tsx is missing");
  } else {
    for (const token of [
      "useApplyAdminModQueueActionMutation",
      "useApplyCommunityModQueueActionMutation",
      "targets: selectedTargets.map",
      "reasonRequired",
      "批量处理原因",
      "onCompleted",
    ]) {
      if (!bulkActionsFile.content.includes(token)) {
        problems.push(`moderation bulk actions boundary missing ${token}`);
      }
    }
  }

  if (!removeDialogFile) {
    problems.push("src/features/moderation/moderation-remove-dialog.tsx is missing");
  } else {
    for (const token of [
      "useCommunityModerationTemplatesQuery",
      "removal_reason_id",
      "notify_author",
      "移除原因模板",
      "通知作者本次移除原因",
    ]) {
      if (!removeDialogFile.content.includes(token)) {
        problems.push(`moderation remove reason boundary missing ${token}`);
      }
    }
  }

  if (!postListItemFile) {
    problems.push("src/features/post/reddit-post-list-item.tsx is missing");
  } else {
    for (const token of [
      "canUsePostCommunityManage",
      "canAccessCommunityManagement(post.community, platformRole)",
      "ModerationQuickActions",
      "targetAuthorId={post.author_id}",
    ]) {
      if (!postListItemFile.content.includes(token)) {
        problems.push(`post list item must expose quick management shortcut ${token}`);
      }
    }
  }

  if (!hoverCardFile) {
    problems.push("src/features/community/community-hover-card.tsx is missing");
  } else {
    for (const token of [
      "canAccessCommunityManagement(profile, platformRole)",
      "`/communities/${encodeURIComponent(liveSlug)}/manage`",
    ]) {
      if (!hoverCardFile.content.includes(token)) {
        problems.push(`community hover card manage shortcut missing ${token}`);
      }
    }
  }

  if (!communityPermissionsFile) {
    problems.push("src/features/community/permissions.ts is missing");
  } else {
    for (const token of [
      "canAccessCommunityManagement",
      "canEditCommunityConfiguration",
      "canModerateCommunityContent",
      "permissions?.platform_owner_override === true",
    ]) {
      if (!communityPermissionsFile.content.includes(token)) {
        problems.push(`community permission helper missing ${token}`);
      }
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
    "community management has visible entrypoints, protected gates, shared quick actions, and real mod queue contracts",
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
