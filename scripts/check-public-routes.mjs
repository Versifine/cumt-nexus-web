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

const routes = [
  {
    markers: ["CUMT Nexus", "最新讨论", "浏览社区"],
    path: "/",
  },
  {
    markers: ["CUMT Nexus", "登录", "账号验证", "创建账号"],
    path: "/login",
  },
  {
    markers: ["CUMT Nexus", "注册账号", "账号创建", "去登录"],
    path: "/register",
  },
  {
    markers: ["社区目录", "校园社区", "申请社区"],
    path: "/communities",
  },
  {
    markers: ["CUMT Nexus", "申请新社区", "返回社区索引"],
    path: "/community-applications/new",
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

  if (response.status !== 200) {
    addFail(route.path, `expected HTTP 200, received HTTP ${response.status}`);
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

  addPass(route.path, `HTTP 200 with ${route.markers.length} expected marker(s)`);
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
