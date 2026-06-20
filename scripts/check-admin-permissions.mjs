#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import process from "node:process";

const root = process.cwd();
const sourceRoot = resolve(root, "src");
const results = [];

console.log("CUMT Nexus Web admin permission check");
console.log("");

const sourceFiles = existsSync(sourceRoot)
  ? listSourceFiles(sourceRoot).map((filePath) => ({
      content: readFileSync(filePath, "utf8"),
      path: normalizePath(relative(root, filePath)),
    }))
  : [];

checkSourceRoot();
checkAdminRouteRoles();
checkLegacyStaffDoesNotBypassRoles();
checkAdminQueueLayoutDoesNotUseRailProp();
checkOwnerTransferFlowBoundaries();
checkOwnerTransferNotificationTarget();
checkCommunityTakeoverUsesUserSearch();
checkFloatingAccountMenuDoesNotExposeCommunityGovernance();
checkEffectiveAdminRoleProbe();

for (const result of results) {
  console.log(`[${result.status.toUpperCase()}] ${result.name} - ${result.detail}`);
}

const failCount = results.filter((result) => result.status === "fail").length;
console.log("");

if (failCount > 0) {
  console.error(`Admin permission check failed with ${failCount} blocker(s).`);
  process.exit(1);
}

console.log("Admin permission check passed.");

function checkSourceRoot() {
  if (!existsSync(sourceRoot)) {
    addFail("source root", "src directory is missing");
    return;
  }

  addPass("source root", `${sourceFiles.length} source file(s) scanned`);
}

function checkAdminRouteRoles() {
  const expectations = [
    {
      path: "src/app/admin/page.tsx",
      roles: null,
      shell: "AppShell",
    },
    {
      path: "src/app/admin/reports/page.tsx",
      roles: null,
      shell: "AppShell",
    },
    {
      path: "src/app/admin/reports/[id]/page.tsx",
      roles: null,
      shell: "AppShell",
    },
    {
      path: "src/app/admin/community-applications/page.tsx",
      roles: null,
      shell: "AppShell",
    },
    {
      path: "src/app/admin/users/page.tsx",
      roles: 'allowedRoles={["owner", "admin"]}',
      shell: "AdminShell",
    },
    {
      path: "src/app/admin/owner-transfer/page.tsx",
      roles: 'allowedRoles={["owner", "admin"]}',
      shell: "AdminShell",
    },
    {
      path: "src/app/admin/communities/page.tsx",
      roles: 'allowedRoles={["owner", "admin"]}',
      shell: "AdminShell",
    },
    {
      path: "src/app/admin/settings/page.tsx",
      roles: 'allowedRoles={["owner", "admin"]}',
      shell: "AdminShell",
    },
    {
      path: "src/app/admin/audit-logs/page.tsx",
      roles: 'allowedRoles={["owner", "admin"]}',
      shell: "AdminShell",
    },
    {
      path: "src/app/admin/growth/page.tsx",
      roles: 'allowedRoles={["owner", "admin"]}',
      shell: "AdminShell",
    },
  ];
  const problems = [];

  for (const expectation of expectations) {
    const file = readSourceFile(expectation.path);
    if (!file) {
      problems.push(`${expectation.path} is missing`);
      continue;
    }

    if (!file.includes(`<${expectation.shell}`)) {
      problems.push(`${expectation.path} must render through ${expectation.shell}`);
    }

    if (expectation.roles) {
      if (!file.includes(expectation.roles)) {
        problems.push(`${expectation.path} must use ${expectation.roles}`);
      }
    } else if (/allowedRoles=\{/.test(file)) {
      problems.push(`${expectation.path} should inherit owner/admin/staff access`);
    }
  }

  if (problems.length > 0) {
    addFail("admin route roles", problems.join("; "));
    return;
  }

  addPass("admin route roles", "admin route role gates match the platform matrix");
}

function checkLegacyStaffDoesNotBypassRoles() {
  const gate = readSourceFile("src/features/admin/permission-gate.tsx");
  const shell = readSourceFile("src/features/admin/admin-shell.tsx");
  const toolsNav = readSourceFile("src/features/admin/admin-tools-nav.tsx");
  const dashboard = readSourceFile("src/features/admin/admin-dashboard.tsx");
  const modQueue = readSourceFile("src/features/admin/admin-mod-queue-page.tsx");
  const problems = [];

  if (/hasOnlyLegacyStaffFlag/.test(gate)) {
    problems.push("AdminPermissionGate must not use legacy staff flag to pass allowedRoles");
  }

  if (/!allowedRoles\.includes\(platformRole\)\s*&&\s*!hasOnlyLegacyStaffFlag/.test(gate)) {
    problems.push("AdminPermissionGate still bypasses allowedRoles for legacy staff");
  }

  if (/hasOnlyLegacyStaffFlag/.test(toolsNav)) {
    problems.push("AdminToolsNav must not use legacy staff flag to unlock nav groups");
  }

  if (!shell.includes("platformRole={platformRole}")) {
    problems.push("AdminShell must pass the resolved platform role into AdminToolsNav");
  }

  if (
    !toolsNav.includes("item.roles.includes(platformRole)") ||
    !toolsNav.includes('item.roles.includes("staff")')
  ) {
    problems.push("AdminToolsNav must filter nav items by explicit resolved platform role");
  }

  if (!dashboard.includes('platformRole === "owner" || platformRole === "admin"')) {
    problems.push("AdminDashboard operational links must be owner/admin only");
  }

  if (!modQueue.includes('platformRole === "owner" || platformRole === "admin"')) {
    problems.push("Admin mod queue audit loading must be owner/admin only");
  }

  if (problems.length > 0) {
    addFail("legacy staff boundary", problems.join("; "));
    return;
  }

  addPass("legacy staff boundary", "legacy staff-only state does not unlock owner/admin surfaces");
}

function checkAdminQueueLayoutDoesNotUseRailProp() {
  const queue = readSourceFile("src/features/admin/admin-queue.tsx");
  const problems = [];

  if (/\brail\??:/.test(queue) || /AdminQueueLayout\(\{[^}]*\brail\b/.test(queue)) {
    problems.push("AdminQueueLayout module must not expose or render a rail prop");
  }

  for (const file of sourceFiles) {
    if (!file.path.startsWith("src/features/admin/")) {
      continue;
    }

    if (/rail=\{/.test(file.content)) {
      problems.push(`${file.path} still passes rail={...}`);
    }
  }

  if (problems.length > 0) {
    addFail("admin queue layout", problems.join("; "));
    return;
  }

  addPass("admin queue layout", "platform admin detail content is not passed as a right rail");
}

function checkOwnerTransferFlowBoundaries() {
  const page = readSourceFile("src/features/admin/admin-owner-transfer-page.tsx");
  const problems = [];

  for (const forbidden of [
    "canAttemptOwnerTransfer",
    "hasLegacyPlatformStaffOnly",
    "LegacyOwnerRoleNotice",
  ]) {
    if (page.includes(forbidden)) {
      problems.push(`owner transfer page must not contain ${forbidden}`);
    }
  }

  for (const required of [
    'platformRole === "owner"',
    "isOwner ? (",
    "ReadOnlyOwnerTransferNotice",
    "AdminUserPicker",
    "selectedUser.id",
    "currentUser?.id === transfer.target_user_id",
    "currentUser?.username === transfer.target_username",
    "当前账号不是目标账号",
  ]) {
    if (!page.includes(required)) {
      problems.push(`owner transfer page missing ${required}`);
    }
  }

  if (problems.length > 0) {
    addFail("owner transfer flow", problems.join("; "));
    return;
  }

  addPass("owner transfer flow", "owner transfer create/cancel/accept gates are explicit");
}

function checkOwnerTransferNotificationTarget() {
  const targets = readSourceFile("src/features/notification/targets.ts");
  const problems = [];

  for (const required of [
    "platform_owner_transfer",
    "admin_owner_transfer",
    "`/owner-transfer/${encodeURIComponent(sourceId)}`",
    "接受负责人交接",
  ]) {
    if (!targets.includes(required)) {
      problems.push(`notification target resolver missing ${required}`);
    }
  }

  if (problems.length > 0) {
    addFail("owner transfer notification target", problems.join("; "));
    return;
  }

  addPass("owner transfer notification target", "platform owner-transfer notifications resolve to the accept page");
}

function checkCommunityTakeoverUsesUserSearch() {
  const page = readSourceFile("src/features/admin/admin-communities-page.tsx");
  const problems = [];

  for (const required of [
    "AdminUserPicker",
    "selectedUser.id",
    "user_id: selectedUser.id",
    "请先搜索并选择新版主账号",
    "请填写接管原因",
    "请确认这是异常社区接管操作",
  ]) {
    if (!page.includes(required)) {
      problems.push(`community takeover flow missing ${required}`);
    }
  }

  if (/targetUserId/.test(page)) {
    problems.push("community takeover flow must not use raw targetUserId input state");
  }

  if (problems.length > 0) {
    addFail("community takeover flow", problems.join("; "));
    return;
  }

  addPass("community takeover flow", "community owner takeover requires user search, reason, and confirmation");
}

function checkFloatingAccountMenuDoesNotExposeCommunityGovernance() {
  const shell = readSourceFile("src/components/app-shell/app-shell.tsx");
  const problems = [];
  const menuStart = shell.indexOf("管理入口");
  const accountMenu = menuStart >= 0 ? shell.slice(menuStart, menuStart + 600) : "";

  if (!accountMenu.includes('href="/admin"')) {
    problems.push("account menu may keep the platform admin hub link for platform roles");
  }

  for (const forbidden of ["/admin/communities", "/communities/${", "社区管理", "平台社区治理"]) {
    if (accountMenu.includes(forbidden)) {
      problems.push(`account menu must not expose ${forbidden}`);
    }
  }

  if (problems.length > 0) {
    addFail("floating account menu", problems.join("; "));
    return;
  }

  addPass("floating account menu", "right account menu does not expose community management shortcuts");
}

function checkEffectiveAdminRoleProbe() {
  const hook = readSourceFile("src/features/admin/use-effective-platform-role.ts");
  const problems = [];

  for (const required of [
    "useAdminUsersQuery",
    "hasExplicitPlatformRole",
    "currentUser?.is_platform_staff === true",
    "user.username.toLowerCase() === currentUser.username.toLowerCase()",
    "fallbackRole",
  ]) {
    if (!hook.includes(required)) {
      problems.push(`effective admin role hook missing ${required}`);
    }
  }

  for (const path of [
    "src/features/admin/admin-shell.tsx",
    "src/features/admin/permission-gate.tsx",
    "src/features/admin/admin-dashboard.tsx",
    "src/features/admin/admin-users-page.tsx",
    "src/features/admin/admin-communities-page.tsx",
    "src/features/admin/admin-owner-transfer-page.tsx",
    "src/features/admin/admin-mod-queue-page.tsx",
  ]) {
    const file = readSourceFile(path);
    if (!file.includes("useEffectiveAdminPlatformRole")) {
      problems.push(`${path} must use effective admin platform role`);
    }
  }

  if (problems.length > 0) {
    addFail("effective admin role", problems.join("; "));
    return;
  }

  addPass("effective admin role", "admin pages compensate for missing /me.platform_role without broad legacy staff escalation");
}

function readSourceFile(relativePath) {
  return sourceFiles.find((candidate) => candidate.path === relativePath)?.content ?? "";
}

function listSourceFiles(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function normalizePath(value) {
  return value.split(sep).join("/");
}

function addPass(name, detail) {
  results.push({ detail, name, status: "pass" });
}

function addFail(name, detail) {
  results.push({ detail, name, status: "fail" });
}
