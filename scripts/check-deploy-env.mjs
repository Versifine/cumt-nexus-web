#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const envFile = getArgValue("--env-file") ?? ".env.production";
const root = process.cwd();
const envPath = resolve(root, envFile);
const results = [];

console.log("CUMT Nexus Web production deploy env check");
console.log(`env file: ${envFile}`);
console.log("");

if (!existsSync(envPath)) {
  addFail("env file", `${envFile} does not exist`);
} else {
  const env = readEnv(envPath);
  checkImage(env);
  checkBindHost(env);
  checkPort(env);
  checkPublicOrigin("NEXT_PUBLIC_SITE_URL", env.NEXT_PUBLIC_SITE_URL);
  checkPublicOrigin("NEXT_PUBLIC_API_BASE_URL", env.NEXT_PUBLIC_API_BASE_URL);
  checkNoPlaceholders(env);
}

for (const result of results) {
  console.log(`[${result.status.toUpperCase()}] ${result.name} - ${result.detail}`);
}

const failCount = results.filter((result) => result.status === "fail").length;
console.log("");

if (failCount > 0) {
  console.error(`Production deploy env check failed with ${failCount} blocker(s).`);
  process.exit(1);
}

console.log("Production deploy env check passed.");

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

function readEnv(path) {
  const values = {};
  const content = readFileSync(path, "utf8");

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
    const value = line.slice(equalsIndex + 1).trim().replace(/^["']|["']$/g, "");
    values[key] = value;
  }

  return values;
}

function checkImage(env) {
  const image = env.WEB_IMAGE;

  if (!image) {
    addFail("WEB_IMAGE", "value is missing");
    return;
  }

  if (!/^ghcr\.io\/[^/]+\/cumt-nexus-web:[A-Za-z0-9._-]+$/.test(image)) {
    addFail("WEB_IMAGE", "must look like ghcr.io/<owner>/cumt-nexus-web:<tag>");
    return;
  }

  if (image.endsWith(":latest")) {
    addFail("WEB_IMAGE", "must use an explicit release tag instead of latest");
    return;
  }

  addPass("WEB_IMAGE", "uses a tagged GHCR frontend image");
}

function checkPort(env) {
  const port = env.WEB_PORT;

  if (!/^\d+$/.test(port ?? "")) {
    addFail("WEB_PORT", "must be numeric");
    return;
  }

  const value = Number(port);
  if (!Number.isInteger(value) || value <= 0 || value > 65535) {
    addFail("WEB_PORT", "must be a valid TCP port");
    return;
  }

  addPass("WEB_PORT", `uses port ${value}`);
}

function checkBindHost(env) {
  const host = env.WEB_BIND_HOST;

  if (!host) {
    addFail("WEB_BIND_HOST", "value is missing");
    return;
  }

  if (host !== "127.0.0.1") {
    addFail("WEB_BIND_HOST", "must be 127.0.0.1 so only the reverse proxy exposes the frontend");
    return;
  }

  addPass("WEB_BIND_HOST", "binds the frontend port to localhost only");
}

function checkPublicOrigin(name, value) {
  if (!value) {
    addFail(name, "value is missing");
    return;
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    addFail(name, "must be a valid URL");
    return;
  }

  const problems = [];

  if (parsed.protocol !== "https:") {
    problems.push("must use https");
  }

  if (["localhost", "127.0.0.1", "::1"].includes(parsed.hostname) || parsed.hostname.endsWith(".localhost")) {
    problems.push("must not use localhost or loopback");
  }

  if (value.trim() !== parsed.origin) {
    problems.push("must be an origin without path, query, hash or trailing slash");
  }

  if (problems.length > 0) {
    addFail(name, problems.join("; "));
    return;
  }

  addPass(name, `${value} is a production-shaped origin`);
}

function checkNoPlaceholders(env) {
  const placeholderPatterns = [
    /<[^>]+>/,
    /example\.com/i,
    /your[-_ ]/i,
    /changeme/i,
    /todo/i,
  ];
  const offenders = Object.entries(env)
    .filter(([, value]) => placeholderPatterns.some((pattern) => pattern.test(value)))
    .map(([key]) => key);

  if (offenders.length > 0) {
    addFail("placeholder values", `replace placeholder value(s) for ${offenders.join(", ")}`);
    return;
  }

  addPass("placeholder values", "no obvious example or placeholder values remain");
}

function addPass(name, detail) {
  results.push({ detail, name, status: "pass" });
}

function addFail(name, detail) {
  results.push({ detail, name, status: "fail" });
}
