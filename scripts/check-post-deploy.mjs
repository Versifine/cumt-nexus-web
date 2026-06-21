#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import process from "node:process";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const skipPublicRoutes = args.includes("--skip-public-routes");
const timeoutMs = getArgValue("--timeout-ms") ?? "8000";
const siteUrl = validateProductionOrigin(
  "site URL",
  getArgValue("--site-url") ??
    getArgValue("--frontend-url") ??
    process.env.NEXT_PUBLIC_SITE_URL,
);
const apiBaseUrl = validateProductionOrigin(
  "API base URL",
  getArgValue("--api-base-url") ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    siteUrl,
);

console.log("CUMT Nexus Web post-deploy check");
console.log(`site:    ${siteUrl}`);
console.log(`api:     ${apiBaseUrl}`);
console.log(`timeout: ${timeoutMs}ms`);
console.log("");

runCheck("readiness", [
  "scripts/check-readiness.mjs",
  "--frontend-url",
  siteUrl,
  "--api-base-url",
  apiBaseUrl,
  "--timeout-ms",
  timeoutMs,
]);

if (!skipPublicRoutes) {
  runCheck("public routes", [
    "scripts/check-public-routes.mjs",
    "--frontend-url",
    siteUrl,
    "--timeout-ms",
    timeoutMs,
  ]);
}

console.log("");
console.log(dryRun ? "Post-deploy dry run passed." : "Post-deploy check passed.");

function runCheck(name, commandArgs) {
  console.log(`>>> ${name}`);
  console.log(`node ${commandArgs.join(" ")}`);

  if (dryRun) {
    console.log("");
    return;
  }

  const result = spawnSync(process.execPath, commandArgs, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  if (result.status === 0) {
    console.log("");
    return;
  }

  if (result.error) {
    console.error(`${name} failed: ${result.error.message}`);
    process.exit(1);
  }

  if (result.signal) {
    console.error(`${name} stopped by signal ${result.signal}`);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

function validateProductionOrigin(name, value) {
  if (!value) {
    fail(`${name} is required. Pass --site-url and, if different, --api-base-url.`);
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail(`${name} must be a valid URL`);
  }

  const problems = [];

  if (parsed.protocol !== "https:") {
    problems.push("must use https");
  }

  if (["localhost", "127.0.0.1", "::1"].includes(parsed.hostname) || parsed.hostname.endsWith(".localhost")) {
    problems.push("must not use localhost or loopback");
  }

  if (hasPlaceholderValue(parsed.hostname)) {
    problems.push("must not use placeholder or example hostnames");
  }

  if (value.trim() !== parsed.origin) {
    problems.push("must be an origin without path, query, hash or trailing slash");
  }

  if (problems.length > 0) {
    fail(`${name} ${problems.join("; ")}`);
  }

  return parsed.origin;
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

function hasPlaceholderValue(value) {
  return [
    /example\.com/i,
    /your[-_ ]/i,
    /changeme/i,
    /todo/i,
  ].some((pattern) => pattern.test(value));
}

function fail(message) {
  console.error(`Post-deploy check failed: ${message}`);
  process.exit(1);
}
