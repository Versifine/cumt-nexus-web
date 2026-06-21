#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const timeoutMs = Number(getArgValue("--timeout-ms") ?? 8000);
const env = {
  ...readEnvFile(".env"),
  ...readEnvFile(".env.local"),
  ...process.env,
};

const frontendUrl = normalizeUrl(
  getArgValue("--frontend-url") ??
    env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000",
);

const appShellHrefMarkers = [
  "/",
  "/all",
  "/following",
  "/communities",
  "/messages",
  "/style-guide",
];

const routes = [
  {
    absentMarkers: ["登录后查看最新讨论", "待登录", "需要登录"],
    hrefMarkers: [...appShellHrefMarkers],
    markers: ["CUMT Nexus", "推荐讨论", "按推荐源展示公开讨论", "浏览社区"],
    path: "/",
  },
  {
    absentMarkers: ["登录后查看最新讨论", "待登录", "需要登录"],
    hrefMarkers: [...appShellHrefMarkers],
    markers: ["CUMT Nexus", "按推荐源展示公开讨论", "最新"],
    path: "/new",
  },
  {
    absentMarkers: ["登录后查看最新讨论", "待登录", "需要登录"],
    hrefMarkers: [...appShellHrefMarkers],
    markers: ["CUMT Nexus", "按推荐源展示公开讨论", "热门"],
    path: "/hot",
  },
  {
    absentMarkers: ["登录后查看最新讨论", "待登录", "需要登录"],
    hrefMarkers: [...appShellHrefMarkers],
    markers: ["CUMT Nexus", "按全站源展示公开讨论", "推荐"],
    path: "/all",
  },
  {
    absentMarkers: ["登录后查看最新讨论", "待登录", "需要登录"],
    hrefMarkers: [...appShellHrefMarkers],
    markers: ["CUMT Nexus", "按全站源展示公开讨论", "热门"],
    path: "/all/hot",
  },
  {
    hrefMarkers: [...appShellHrefMarkers, "#button", "#toast"],
    markers: ["CUMT Nexus", "全量组件统一展示页", "所有 TSX 组件文件", "Button"],
    path: "/style-guide",
  },
  {
    hrefMarkers: [
      ...appShellHrefMarkers,
      "/login?next=%2Ffollowing",
      "/register?next=%2Ffollowing",
    ],
    markers: ["CUMT Nexus", "登录后查看关注信息流", "关注流只展示", "去登录"],
    path: "/following",
  },
  {
    markers: ["CUMT Nexus", "登录", "进入 CUMT Nexus", "没有账号，去注册"],
    path: "/login",
  },
  {
    hrefMarkers: ["/", "/register?next=%2Fcommunities%2Fpublic%2Fnew"],
    markers: ["CUMT Nexus", "登录", "进入 CUMT Nexus", "没有账号，去注册"],
    path: "/login?next=%2Fcommunities%2Fpublic%2Fnew",
  },
  {
    markers: ["CUMT Nexus", "创建账号", "先完善公开资料", "已有账号，去登录"],
    path: "/register",
  },
  {
    hrefMarkers: [
      ...appShellHrefMarkers,
      "/login?next=%2Fsaved",
      "/register?next=%2Fsaved",
    ],
    markers: ["CUMT Nexus", "我的收藏", "登录后查看收藏", "去登录"],
    path: "/saved",
  },
  {
    hrefMarkers: [
      ...appShellHrefMarkers,
      "/login?next=%2Fsettings%2Fprofile",
      "/register?next=%2Fsettings%2Fprofile",
    ],
    markers: ["CUMT Nexus", "编辑主页", "需要登录", "登录后编辑主页", "去登录"],
    path: "/settings/profile",
  },
  {
    hrefMarkers: [
      ...appShellHrefMarkers,
      "/login?next=%2Fsettings%2Fprogression",
      "/register?next=%2Fsettings%2Fprogression",
    ],
    markers: ["CUMT Nexus", "成长与积分", "登录后查看成长资料", "去登录"],
    path: "/settings/progression",
  },
  {
    hrefMarkers: [
      ...appShellHrefMarkers,
      "/login?next=%2Fsettings%2Fprivacy",
    ],
    markers: [
      "CUMT Nexus",
      "隐私与私信",
      "登录后管理私信设置",
      "去登录",
    ],
    path: "/settings/privacy",
  },
  {
    hrefMarkers: [
      ...appShellHrefMarkers,
      "/login?next=%2Fadmin%2Fgrowth",
    ],
    markers: ["CUMT Nexus", "成长系统管理", "登录后进入平台管理", "登录"],
    path: "/admin/growth",
  },
  {
    hrefMarkers: [
      ...appShellHrefMarkers,
      "/login?next=%2Fadmin",
    ],
    markers: ["CUMT Nexus", "平台管理", "登录后进入平台管理", "登录"],
    path: "/admin",
  },
  {
    hrefMarkers: [
      ...appShellHrefMarkers,
      "/login?next=%2Fadmin%2Fusers",
    ],
    markers: ["CUMT Nexus", "用户管理", "登录后进入平台管理", "登录"],
    path: "/admin/users",
  },
  {
    hrefMarkers: [
      ...appShellHrefMarkers,
      "/login?next=%2Fadmin%2Fcommunities",
    ],
    markers: ["CUMT Nexus", "平台社区治理", "登录后进入平台管理", "登录"],
    path: "/admin/communities",
  },
  {
    hrefMarkers: [
      ...appShellHrefMarkers,
      "/login?next=%2Fadmin%2Fcommunity-applications",
    ],
    markers: ["CUMT Nexus", "社区审批工作台", "登录后审核社区申请", "登录"],
    path: "/admin/community-applications",
  },
  {
    hrefMarkers: [
      ...appShellHrefMarkers,
      "/login?next=%2Fadmin%2Freports",
    ],
    markers: ["CUMT Nexus", "全站审核队列", "登录后进入全站队列", "登录"],
    path: "/admin/reports",
  },
  {
    hrefMarkers: [
      ...appShellHrefMarkers,
      "/login?next=%2Fadmin%2Freports%2Froute-smoke-report",
    ],
    markers: ["CUMT Nexus", "队列详情", "登录后查看队列详情", "登录"],
    path: "/admin/reports/route-smoke-report",
  },
  {
    hrefMarkers: [
      ...appShellHrefMarkers,
      "/login?next=%2Fadmin%2Fsettings",
    ],
    markers: ["CUMT Nexus", "运行开关", "登录后进入平台管理", "登录"],
    path: "/admin/settings",
  },
  {
    hrefMarkers: [
      ...appShellHrefMarkers,
      "/login?next=%2Fadmin%2Faudit-logs",
    ],
    markers: ["CUMT Nexus", "审计日志", "登录后进入平台管理", "登录"],
    path: "/admin/audit-logs",
  },
  {
    hrefMarkers: [
      ...appShellHrefMarkers,
      "/login?next=%2Fadmin%2Fowner-transfer",
    ],
    markers: ["CUMT Nexus", "负责人交接", "登录后进入平台管理", "登录"],
    path: "/admin/owner-transfer",
  },
  {
    markers: [
      "CUMT Nexus",
      "负责人交接",
      "缺少交接 ID",
      "请从站点负责人发出的交接链接进入接受页",
    ],
    path: "/owner-transfer/accept",
  },
  {
    hrefMarkers: ["/", "/login?next=%2Fcommunity-applications%2Fnew"],
    markers: ["CUMT Nexus", "创建账号", "先完善公开资料", "已有账号，去登录"],
    path: "/register?next=%2Fcommunity-applications%2Fnew",
  },
  {
    hrefMarkers: [...appShellHrefMarkers, "/login?next=%2Fcommunity-applications%2Fnew"],
    markers: ["社区索引", "校园社区", "登录后申请"],
    path: "/communities",
  },
  {
    absentMarkers: [
      "登录后使用搜索",
      "搜索需要身份上下文",
      "公开搜索暂不可用",
      "当前服务还没有开放未登录搜索",
      "需要登录",
    ],
    hrefMarkers: [...appShellHrefMarkers],
    markers: ["CUMT Nexus", "搜索：public", "当前搜索", "范围"],
    path: "/search?q=public&scope=all",
  },
  {
    absentMarkers: ["需要登录", "登录后查看"],
    hrefMarkers: [...appShellHrefMarkers],
    markers: ["CUMT Nexus", "用户主页", "正在加载", "浏览社区"],
    path: "/users/route-smoke",
  },
  {
    absentMarkers: ["需要登录", "登录后查看"],
    hrefMarkers: [...appShellHrefMarkers],
    markers: ["CUMT Nexus", "的帖子", "正在加载", "浏览社区"],
    path: "/users/route-smoke/posts",
  },
  {
    absentMarkers: ["需要登录", "登录后查看"],
    hrefMarkers: [...appShellHrefMarkers],
    markers: ["CUMT Nexus", "的评论", "正在加载", "浏览社区"],
    path: "/users/route-smoke/comments",
  },
  {
    absentMarkers: ["需要登录", "请先登录后查看社区详情和帖子"],
    hrefMarkers: [
      ...appShellHrefMarkers,
    ],
    markers: [
      "CUMT Nexus",
      "首页",
      "社区",
      "正在加载",
      "浏览社区",
    ],
    path: "/communities/public",
  },
  {
    absentMarkers: ["需要登录", "请先登录后查看帖子详情、评论和投票"],
    hrefMarkers: [
      ...appShellHrefMarkers,
    ],
    markers: [
      "CUMT Nexus",
      "帖子 route-sm",
      "正在加载",
      "浏览社区",
    ],
    path: "/posts/route-smoke",
  },
  {
    hrefMarkers: [
      ...appShellHrefMarkers,
      "/login?next=%2Fposts%2Fnew%3Fcommunity%3Dpublic",
      "/register?next=%2Fposts%2Fnew%3Fcommunity%3Dpublic",
    ],
    markers: ["CUMT Nexus", "发布帖子", "需要登录", "登录后发起讨论", "去登录"],
    path: "/posts/new?community=public",
  },
  {
    hrefMarkers: [
      ...appShellHrefMarkers,
      "/communities/public",
      "/login?next=%2Fcommunities%2Fpublic%2Fnew",
      "/register?next=%2Fcommunities%2Fpublic%2Fnew",
    ],
    markers: ["CUMT Nexus", "发布 /public", "需要登录", "登录后发起讨论", "去登录"],
    path: "/communities/public/new",
  },
  {
    hrefMarkers: [
      ...appShellHrefMarkers,
      "/communities/public",
      "/login?next=%2Fcommunities%2Fpublic%2Fmanage",
    ],
    markers: [
      "CUMT Nexus",
      "社区管理",
      "管理概览",
      "登录后管理社区",
      "社区管理需要版主或社区管理员权限",
    ],
    path: "/communities/public/manage",
  },
  {
    hrefMarkers: [
      ...appShellHrefMarkers,
      "/login?next=%2Fcommunities%2Fpublic%2Fowner-transfer%2Froute-smoke-transfer%2Faccept",
    ],
    markers: [
      "CUMT Nexus",
      "版主交接",
      "登录后接受社区版主交接",
      "只有交接目标账号可以接受这次版主转让",
      "登录",
    ],
    path: "/communities/public/owner-transfer/route-smoke-transfer/accept",
  },
  {
    hrefMarkers: [
      ...appShellHrefMarkers,
      "/login?next=%2Fcommunities%2Fowner-transfers",
    ],
    markers: [
      "CUMT Nexus",
      "版主交接",
      "登录后查看版主交接",
      "如果某个社区把版主交接给你",
      "登录",
    ],
    path: "/communities/owner-transfers",
  },
  {
    hrefMarkers: [
      ...appShellHrefMarkers,
      "/login?next=%2Fcommunity-applications%2Fnew",
      "/register?next=%2Fcommunity-applications%2Fnew",
    ],
    markers: ["CUMT Nexus", "申请新社区", "浏览社区", "需要登录", "登录后申请新社区", "去登录"],
    path: "/community-applications/new",
  },
  {
    hrefMarkers: [
      ...appShellHrefMarkers,
      "/login?next=%2Fnotifications",
    ],
    markers: ["CUMT Nexus", "消息", "互动消息", "系统通知", "登录后查看消息"],
    path: "/notifications",
  },
  {
    hrefMarkers: ["/login?next=%2Fmessages"],
    markers: [
      "私信",
      "登录后查看私信",
      "去登录",
    ],
    path: "/messages",
  },
  {
    hrefMarkers: ["/login?next=%2Fmessages%2Frequests"],
    markers: [
      "私信",
      "登录后查看私信",
      "去登录",
    ],
    path: "/messages/requests",
  },
  {
    hrefMarkers: ["/login?next=%2Fmessages%2Froute-smoke"],
    markers: [
      "私信",
      "登录后查看私信",
      "去登录",
    ],
    path: "/messages/route-smoke",
  },
  {
    hrefMarkers: [
      ...appShellHrefMarkers,
      "/login?next=%2Fnotifications%2Fsystem",
    ],
    markers: ["CUMT Nexus", "消息", "互动消息", "系统通知", "登录后查看消息"],
    path: "/notifications/system",
  },
  {
    expectedStatus: 404,
    hrefMarkers: ["/", "/communities"],
    markers: ["CUMT Nexus", "这个页面不存在或已经移动", "最新讨论", "浏览社区索引"],
    path: "/notifications/unknown",
  },
  {
    expectedStatus: 404,
    hrefMarkers: ["/", "/communities"],
    markers: ["CUMT Nexus", "这个页面不存在或已经移动", "最新讨论", "浏览社区索引"],
    path: "/route-smoke-not-found",
  },
];

const results = [];

console.log("CUMT Nexus Web public route smoke check");
console.log(`frontend: ${frontendUrl}`);
console.log("");

for (const route of routes) {
  await checkRoute(route);
}

for (const result of results) {
  console.log(`[${result.status.toUpperCase()}] ${result.path} - ${result.detail}`);
}

const failCount = results.filter((result) => result.status === "fail").length;
console.log("");

if (failCount > 0) {
  console.error(`Public route smoke check failed with ${failCount} blocker(s).`);
  process.exit(1);
}

console.log("Public route smoke check passed.");

async function checkRoute(route) {
  const response = await fetchText(`${frontendUrl}${route.path}`);
  if (!response.ok) {
    addFail(route.path, response.detail);
    return;
  }

  const expectedStatus = route.expectedStatus ?? 200;
  if (response.status !== expectedStatus) {
    addFail(
      route.path,
      `expected HTTP ${expectedStatus}, received HTTP ${response.status}`,
    );
    return;
  }

  const failures = [];
  if (!response.body.includes("zh-CN")) {
    failures.push("missing zh-CN language marker");
  }

  for (const marker of route.markers) {
    if (!response.body.includes(marker)) {
      failures.push(`missing text marker: ${marker}`);
    }
  }

  for (const marker of route.hrefMarkers ?? []) {
    if (!response.body.includes(`href="${marker}"`)) {
      failures.push(`missing href marker: ${marker}`);
    }
  }

  for (const marker of route.absentMarkers ?? []) {
    if (response.body.includes(marker)) {
      failures.push(`contains forbidden text marker: ${marker}`);
    }
  }

  const blockedMarkers = [
    "This page could not be found",
    "Internal Server Error",
    "Application error",
  ];

  for (const marker of blockedMarkers) {
    if (response.body.includes(marker)) {
      failures.push(`contains failure marker: ${marker}`);
    }
  }

  if (failures.length > 0) {
    addFail(route.path, failures.join("; "));
    return;
  }

  const absentCount = route.absentMarkers?.length ?? 0;
  const hrefCount = route.hrefMarkers?.length ?? 0;
  addPass(
    route.path,
    `HTTP ${expectedStatus} with ${route.markers.length} text marker(s), ${hrefCount} href marker(s) and ${absentCount} forbidden marker check(s)`,
  );
}

function getArgValue(name) {
  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) {
    return inline.slice(prefix.length);
  }

  const index = args.indexOf(name);
  if (index >= 0 && args[index + 1]) {
    return args[index + 1];
  }

  return undefined;
}

function readEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) {
    return {};
  }

  const values = {};
  const content = readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    const rawValue = line.slice(equalsIndex + 1).trim();
    values[key] = rawValue.replace(/^["']|["']$/g, "");
  }

  return values;
}

function normalizeUrl(value) {
  return value.replace(/\/+$/g, "");
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const body = await response.text();

    return {
      body,
      ok: true,
      status: response.status,
    };
  } catch (error) {
    const detail =
      error?.name === "AbortError"
        ? `request timed out after ${timeoutMs}ms: ${url}`
        : `${error?.message ?? error}: ${url}`;

    return {
      detail,
      ok: false,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function addPass(path, detail) {
  results.push({ detail, path, status: "pass" });
}

function addFail(path, detail) {
  results.push({ detail, path, status: "fail" });
}
