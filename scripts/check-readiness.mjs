#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const allowDegraded = args.includes("--allow-degraded");
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
const apiBaseUrl = normalizeUrl(
  getArgValue("--api-base-url") ??
    env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:8080",
);

const results = [];

console.log("CUMT Nexus Web readiness check");
console.log(`frontend: ${frontendUrl}`);
console.log(`backend:  ${apiBaseUrl}`);
console.log(`mode:     ${allowDegraded ? "local degraded allowed" : "strict"}`);
console.log("");

await checkFrontendHealth();
await checkBackendHealth();
await checkBackendCors();
await checkReadyz();
await checkPublicEntrypoints();
await checkSecurityHeaders();

for (const result of results) {
  console.log(`[${result.status.toUpperCase()}] ${result.name} - ${result.detail}`);
}

const failCount = results.filter((result) => result.status === "fail").length;
const warnCount = results.filter((result) => result.status === "warn").length;

console.log("");

if (failCount > 0) {
  console.error(`Readiness failed with ${failCount} blocker(s).`);
  process.exit(1);
}

if (warnCount > 0) {
  console.warn(`Readiness passed with ${warnCount} warning(s).`);
} else {
  console.log("Readiness passed.");
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

async function checkFrontendHealth() {
  const response = await fetchText(`${frontendUrl}/healthz`);
  if (!response.ok) {
    addFail("frontend health", response.detail);
    return;
  }

  const json = parseJson(response.body);
  if (response.status === 200 && json?.service === "cumt-nexus-web" && json?.status === "ok") {
    addPass("frontend health", "/healthz returns ok");
    return;
  }

  addFail("frontend health", `/healthz returned unexpected payload: ${response.preview}`);
}

async function checkBackendHealth() {
  const response = await fetchText(`${apiBaseUrl}/healthz`);
  if (!response.ok) {
    addBackendUnavailable("backend health", response.detail);
    return;
  }

  if (response.status >= 200 && response.status < 300) {
    addPass("backend health", "/healthz is reachable");
    return;
  }

  addBackendUnavailable("backend health", `/healthz returned HTTP ${response.status}`);
}

async function checkBackendCors() {
  const response = await fetchText(`${apiBaseUrl}/api/v1/posts`, {
    headers: {
      "Access-Control-Request-Headers": "Authorization, Content-Type",
      "Access-Control-Request-Method": "GET",
      Origin: frontendUrl,
    },
    method: "OPTIONS",
  });

  if (!response.ok) {
    addBackendUnavailable("backend CORS", response.detail);
    return;
  }

  const allowedOrigin = response.headers.get("access-control-allow-origin");
  const allowedMethods = response.headers.get("access-control-allow-methods") ?? "";
  const allowedHeaders = response.headers.get("access-control-allow-headers") ?? "";
  const normalizedMethods = allowedMethods.toLowerCase();
  const normalizedHeaders = allowedHeaders.toLowerCase();

  if (response.status !== 204) {
    addBackendUnavailable("backend CORS", `preflight returned HTTP ${response.status}`);
    return;
  }

  if (allowedOrigin !== frontendUrl && allowedOrigin !== "*") {
    addBackendUnavailable(
      "backend CORS",
      `Access-Control-Allow-Origin must allow ${frontendUrl}; received ${allowedOrigin ?? "<missing>"}`,
    );
    return;
  }

  if (!normalizedMethods.includes("get") || !normalizedHeaders.includes("authorization")) {
    addBackendUnavailable(
      "backend CORS",
      `preflight missing required method/header support: methods=${allowedMethods || "<missing>"}, headers=${allowedHeaders || "<missing>"}`,
    );
    return;
  }

  addPass("backend CORS", `preflight allows browser requests from ${frontendUrl}`);
}

async function checkReadyz() {
  const response = await fetchText(`${frontendUrl}/readyz`);
  if (!response.ok) {
    addFail("frontend readiness", response.detail);
    return;
  }

  const json = parseJson(response.body);
  if (response.status === 200 && json?.service === "cumt-nexus-web" && json?.status === "ready") {
    addPass("frontend readiness", "/readyz returns ready");
    return;
  }

  if (response.status === 503 && json?.status === "degraded" && allowDegraded) {
    addWarn("frontend readiness", "/readyz is degraded because backend is unavailable");
    return;
  }

  addFail("frontend readiness", `/readyz returned HTTP ${response.status}: ${response.preview}`);
}

async function checkPublicEntrypoints() {
  const checks = [
    {
      name: "robots.txt",
      path: "/robots.txt",
      accepts: (body) => body.includes("Sitemap:"),
      detail: "contains sitemap declaration",
    },
    {
      name: "sitemap.xml",
      path: "/sitemap.xml",
      accepts: (body) => body.includes("<urlset") && body.includes(frontendUrl),
      detail: "contains urlset and site url",
    },
    {
      name: "manifest",
      path: "/manifest.webmanifest",
      accepts: (body) => {
        const json = parseJson(body);
        return Boolean(json?.name && json?.start_url && Array.isArray(json?.icons));
      },
      detail: "contains name, start_url and icons",
    },
    {
      name: "site icon",
      path: "/icon.svg",
      accepts: (body) => body.includes("<svg"),
      detail: "returns svg icon",
    },
  ];

  for (const check of checks) {
    const response = await fetchText(`${frontendUrl}${check.path}`);
    if (!response.ok) {
      addFail(check.name, response.detail);
      continue;
    }

    if (response.status === 200 && check.accepts(response.body)) {
      addPass(check.name, check.detail);
      continue;
    }

    addFail(check.name, `${check.path} returned unexpected content: ${response.preview}`);
  }
}

async function checkSecurityHeaders() {
  const response = await fetchText(`${frontendUrl}/healthz`);
  if (!response.ok) {
    addFail("security headers", response.detail);
    return;
  }

  const requiredHeaders = [
    ["x-content-type-options", "nosniff"],
    ["x-frame-options", "DENY"],
    ["referrer-policy", "strict-origin-when-cross-origin"],
    ["permissions-policy", "camera=(), microphone=(), geolocation=(), payment=()"],
  ];

  const missing = [];
  for (const [name, expectedValue] of requiredHeaders) {
    const value = response.headers.get(name);
    if (value !== expectedValue) {
      missing.push(`${name}=${value ?? "<missing>"}`);
    }
  }

  if (missing.length === 0) {
    addPass("security headers", "basic response headers are present");
    return;
  }

  addFail("security headers", `missing or unexpected headers: ${missing.join(", ")}`);
}

async function fetchText(url, init = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const body = await response.text();

    return {
      body,
      headers: response.headers,
      ok: true,
      preview: preview(body),
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

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function preview(value) {
  return value.replace(/\s+/g, " ").trim().slice(0, 120);
}

function addBackendUnavailable(name, detail) {
  if (allowDegraded) {
    addWarn(name, detail);
    return;
  }

  addFail(name, detail);
}

function addPass(name, detail) {
  results.push({ detail, name, status: "pass" });
}

function addWarn(name, detail) {
  results.push({ detail, name, status: "warn" });
}

function addFail(name, detail) {
  results.push({ detail, name, status: "fail" });
}
