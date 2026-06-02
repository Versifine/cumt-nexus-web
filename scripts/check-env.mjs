#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const production = args.includes("--production");
const requiredKeys = ["NEXT_PUBLIC_API_BASE_URL", "NEXT_PUBLIC_SITE_URL"];
const envFiles = [".env.example", ".env", ".env.local"];
const parsedFiles = Object.fromEntries(
  envFiles.map((fileName) => [fileName, readEnvFile(fileName)]),
);

const runtimeEnv = {
  ...parsedFiles[".env.example"].values,
  ...parsedFiles[".env"].values,
  ...parsedFiles[".env.local"].values,
  ...pickProcessEnv(requiredKeys),
};

const results = [];

console.log("CUMT Nexus Web environment check");
console.log(`mode: ${production ? "production" : "local"}`);
console.log("");

checkEnvExample();
checkRuntimeEnv();

for (const result of results) {
  console.log(`[${result.status.toUpperCase()}] ${result.name} - ${result.detail}`);
}

const failCount = results.filter((result) => result.status === "fail").length;
const warnCount = results.filter((result) => result.status === "warn").length;

console.log("");

if (failCount > 0) {
  console.error(`Environment check failed with ${failCount} blocker(s).`);
  process.exit(1);
}

if (warnCount > 0) {
  console.warn(`Environment check passed with ${warnCount} warning(s).`);
} else {
  console.log("Environment check passed.");
}

function checkEnvExample() {
  const example = parsedFiles[".env.example"];

  if (!example.exists) {
    addFail(".env.example", "file is missing");
    return;
  }

  for (const key of requiredKeys) {
    const value = example.values[key];
    if (!value) {
      addFail(".env.example", `${key} is missing`);
      continue;
    }

    validateUrl(`${key} example`, value, {
      allowLocalhost: true,
      requireHttps: false,
    });
  }

  addPass(".env.example", "required public environment keys are documented");
}

function checkRuntimeEnv() {
  for (const key of requiredKeys) {
    const value = runtimeEnv[key];
    if (!value) {
      addFail(key, "value is missing");
      continue;
    }

    validateUrl(key, value, {
      allowLocalhost: !production,
      requireHttps: production,
    });
  }

  const apiBaseUrl = runtimeEnv.NEXT_PUBLIC_API_BASE_URL;
  if (apiBaseUrl) {
    const parsed = parseUrl(apiBaseUrl);
    if (parsed && parsed.pathname !== "/") {
      addFail(
        "NEXT_PUBLIC_API_BASE_URL",
        "must be an origin only; do not include /api/v1 because client paths already include it",
      );
    }
  }

  const siteUrl = runtimeEnv.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    const parsed = parseUrl(siteUrl);
    if (parsed && parsed.pathname !== "/") {
      addFail("NEXT_PUBLIC_SITE_URL", "must be a site origin without a path");
    }
  }

  if (!production && !hasLocalRuntimeEnv()) {
    addWarn(
      "local env",
      "using .env.example defaults; copy .env.example to .env.local before real local integration",
    );
  }
}

function validateUrl(name, value, options) {
  const parsed = parseUrl(value);
  if (!parsed) {
    addFail(name, "must be a valid URL");
    return;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    addFail(name, "must use http or https");
    return;
  }

  if (options.requireHttps && parsed.protocol !== "https:") {
    addFail(name, "production URL must use https");
  }

  if (!options.allowLocalhost && isLocalhost(parsed.hostname)) {
    addFail(name, "production URL must not use localhost or loopback");
  }
}

function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isLocalhost(hostname) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  );
}

function hasLocalRuntimeEnv() {
  return (
    existsSync(resolve(process.cwd(), ".env")) ||
    existsSync(resolve(process.cwd(), ".env.local")) ||
    requiredKeys.some((key) => process.env[key])
  );
}

function pickProcessEnv(keys) {
  const values = {};

  for (const key of keys) {
    if (process.env[key]) {
      values[key] = process.env[key];
    }
  }

  return values;
}

function readEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) {
    return { exists: false, values: {} };
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

  return { exists: true, values };
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
