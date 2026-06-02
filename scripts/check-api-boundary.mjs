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
