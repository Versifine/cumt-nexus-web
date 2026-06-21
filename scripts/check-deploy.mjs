#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const root = process.cwd();
const results = [];

console.log("CUMT Nexus Web deployment check");
console.log("");

checkNextStandalone();
checkDockerfile();
checkDockerignore();
checkCompose();
checkProductionEnvExample();
checkPublishWorkflow();
checkPostDeployWorkflow();
checkDeploymentDocs();
checkCaddyExample();
checkDeployBundleScript();

for (const result of results) {
  console.log(`[${result.status.toUpperCase()}] ${result.name} - ${result.detail}`);
}

const failCount = results.filter((result) => result.status === "fail").length;
console.log("");

if (failCount > 0) {
  console.error(`Deployment check failed with ${failCount} blocker(s).`);
  process.exit(1);
}

console.log("Deployment check passed.");

function checkNextStandalone() {
  const config = readText("next.config.ts");

  if (!config) {
    return;
  }

  if (!/\boutput\s*:\s*["']standalone["']/.test(config)) {
    addFail("Next standalone output", "next.config.ts must set output: \"standalone\" for container runtime");
    return;
  }

  addPass("Next standalone output", "next.config.ts emits standalone server output");
}

function checkDockerfile() {
  const dockerfile = readText("Dockerfile");

  if (!dockerfile) {
    return;
  }

  const requiredTokens = [
    "FROM node:22-alpine AS deps",
    "RUN npm ci",
    "FROM node:22-alpine AS builder",
    "ARG NEXT_PUBLIC_API_BASE_URL",
    "ARG NEXT_PUBLIC_SITE_URL",
    "RUN npm run build",
    "FROM node:22-alpine AS runner",
    "ENV NODE_ENV=production",
    "/app/.next/standalone",
    "/app/.next/static",
    "USER nextjs",
    'CMD ["node", "server.js"]',
  ];
  const missing = requiredTokens.filter((token) => !dockerfile.includes(token));

  if (missing.length > 0) {
    addFail("Dockerfile", `missing required production image token(s): ${missing.join(", ")}`);
    return;
  }

  addPass("Dockerfile", "multi-stage standalone Next.js production image is present");
}

function checkDockerignore() {
  const dockerignore = readText(".dockerignore");

  if (!dockerignore) {
    return;
  }

  const requiredTokens = ["node_modules", ".next", ".env", ".env.*", "!.env.example", "!.env.production.example"];
  const missing = requiredTokens.filter((token) => !dockerignore.includes(token));

  if (missing.length > 0) {
    addFail(".dockerignore", `missing required ignore rule(s): ${missing.join(", ")}`);
    return;
  }

  addPass(".dockerignore", "local build output, dependencies and real env files are excluded");
}

function checkCompose() {
  const compose = readText("docker-compose.prod.yml");

  if (!compose) {
    return;
  }

  const requiredTokens = [
    "name: cumt-nexus-web-prod",
    "image: ${WEB_IMAGE:-cumt-nexus-web:local}",
    "NEXT_PUBLIC_API_BASE_URL: ${NEXT_PUBLIC_API_BASE_URL}",
    "NEXT_PUBLIC_SITE_URL: ${NEXT_PUBLIC_SITE_URL}",
    "NODE_ENV: production",
    "${WEB_BIND_HOST:-127.0.0.1}:${WEB_PORT:-3000}:3000",
    "restart: unless-stopped",
    "healthcheck:",
    "http://127.0.0.1:3000/healthz",
  ];
  const missing = requiredTokens.filter((token) => !compose.includes(token));

  if (missing.length > 0) {
    addFail("production compose", `missing required compose token(s): ${missing.join(", ")}`);
    return;
  }

  addPass("production compose", "compose can run or pull the frontend production image");
}

function checkProductionEnvExample() {
  const env = readEnv(".env.production.example");

  if (!env) {
    return;
  }

  const problems = [];

  if (!env.WEB_IMAGE?.startsWith("ghcr.io/") || !env.WEB_IMAGE.includes("cumt-nexus-web:")) {
    problems.push("WEB_IMAGE must point to a tagged GHCR cumt-nexus-web image");
  }

  if (env.WEB_BIND_HOST !== "127.0.0.1") {
    problems.push("WEB_BIND_HOST must be 127.0.0.1");
  }

  if (!/^\d+$/.test(env.WEB_PORT ?? "")) {
    problems.push("WEB_PORT must be numeric");
  }

  validatePublicOrigin("NEXT_PUBLIC_SITE_URL", env.NEXT_PUBLIC_SITE_URL, problems);
  validatePublicOrigin("NEXT_PUBLIC_API_BASE_URL", env.NEXT_PUBLIC_API_BASE_URL, problems);

  if (problems.length > 0) {
    addFail(".env.production.example", problems.join("; "));
    return;
  }

  addPass(".env.production.example", "production image and public HTTPS origins are documented");
}

function checkPublishWorkflow() {
  const workflow = readText(".github/workflows/publish-docker.yml");

  if (!workflow) {
    return;
  }

  const requiredTokens = [
    "name: Publish Docker image",
    "workflow_dispatch:",
    "image_tag:",
    "site_url:",
    "api_base_url:",
    "packages: write",
    "actions/setup-node@v4",
    "node-version: 22",
    "ghcr.io/${GITHUB_REPOSITORY,,}",
    "npm run check:env:production",
    "Refusing to publish mutable image tag: latest",
    "Image tag may only contain letters, numbers, dots, underscores and hyphens.",
    "docker login ghcr.io",
    "--build-arg NEXT_PUBLIC_SITE_URL",
    "--build-arg NEXT_PUBLIC_API_BASE_URL",
    "docker push",
  ];
  const missing = requiredTokens.filter((token) => !workflow.includes(token));

  if (missing.length > 0) {
    addFail("GHCR publish workflow", `missing required workflow token(s): ${missing.join(", ")}`);
    return;
  }

  addPass("GHCR publish workflow", "workflow can build and push a tagged frontend image");
}

function checkPostDeployWorkflow() {
  const workflow = readText(".github/workflows/post-deploy-check.yml");

  if (!workflow) {
    return;
  }

  const requiredTokens = [
    "name: Post-deploy check",
    "workflow_dispatch:",
    "site_url:",
    "api_base_url:",
    "timeout_ms:",
    "actions/setup-node@v4",
    "node-version: 22",
    "npm run check:post-deploy",
    "--site-url=${SITE_URL}",
    "--api-base-url=${API_BASE_URL}",
    "Post-deploy check passed.",
  ];
  const missing = requiredTokens.filter((token) => !workflow.includes(token));

  if (missing.length > 0) {
    addFail("post-deploy workflow", `missing required workflow token(s): ${missing.join(", ")}`);
    return;
  }

  addPass("post-deploy workflow", "manual CI check can verify the deployed public site");
}

function checkDeploymentDocs() {
  const deployment = readText("docs/internal/engineering/deployment.md");
  const runbook = readText("docs/internal/engineering/server-docker-runbook.md");

  if (!deployment || !runbook) {
    return;
  }

  const requiredDeploymentTokens = [
    "Docker 镜像部署",
    ".github/workflows/publish-docker.yml",
    ".github/workflows/post-deploy-check.yml",
    "WEB_IMAGE=ghcr.io/<owner>/cumt-nexus-web:v0.1.0",
    "WEB_BIND_HOST=127.0.0.1",
    "up -d --no-build",
    "npm run check:post-deploy",
    "NEXT_PUBLIC_SITE_URL=https://nexus.example.com",
    "NEXT_PUBLIC_API_BASE_URL=https://nexus.example.com",
    "HTTP_CORS_ALLOWED_ORIGINS=https://nexus.example.com",
    "前后端同域名时，两个值可以相同",
    "/api/v1/posts?source=all&sort=new&limit=1&offset=0",
    "reverse_proxy 127.0.0.1:8080",
    "reverse_proxy 127.0.0.1:3000",
  ];
  const requiredRunbookTokens = [
    "单服务器 Docker 部署 Runbook",
    "docker login ghcr.io",
    ".github/workflows/post-deploy-check.yml",
    "npm run check:post-deploy",
    "WEB_BIND_HOST=127.0.0.1",
    "API_PORT=127.0.0.1:8080",
    "APP_ENV=prod",
    "POSTGRES_USER=cumt_nexus",
    "HTTP_CORS_ALLOWED_ORIGINS=https://nexus.example.com",
    "OBJECT_STORAGE_ENDPOINT=",
    "OBJECT_STORAGE_PUBLIC_BASE_URL=https://nexus.example.com/uploads",
    "后端 `APP_ENV` 只接受 `local/dev/test/prod`",
    "/api/v1/posts?source=all&sort=new&limit=1&offset=0",
    "docker compose --env-file .env.production -f docker-compose.prod.yml pull",
    "docker compose --env-file .env.production -f docker-compose.prod.yml up -d --no-build",
    "node scripts/check-readiness.mjs --frontend-url=https://nexus.example.com --api-base-url=https://nexus.example.com",
    "回滚",
  ];
  const missing = [
    ...requiredDeploymentTokens
      .filter((token) => !deployment.includes(token))
      .map((token) => `deployment.md:${token}`),
    ...requiredRunbookTokens
      .filter((token) => !runbook.includes(token))
      .map((token) => `server-docker-runbook.md:${token}`),
  ];

  if (missing.length > 0) {
    addFail("deployment docs", `missing required deployment doc token(s): ${missing.join(", ")}`);
    return;
  }

  if (runbook.includes("APP_ENV=production")) {
    addFail("deployment docs", "server-docker-runbook.md must not document invalid backend APP_ENV=production");
    return;
  }

  addPass("deployment docs", "Docker image deployment, Caddy routing, validation and rollback are documented");
}

function checkCaddyExample() {
  const caddyfile = readText("deploy/Caddyfile.example");

  if (!caddyfile) {
    return;
  }

  const requiredTokens = [
    "nexus.example.com",
    "encode zstd gzip",
    "handle /api/*",
    "reverse_proxy 127.0.0.1:8080",
    "handle /uploads/*",
    "handle {",
    "reverse_proxy 127.0.0.1:3000",
  ];
  const missing = requiredTokens.filter((token) => !caddyfile.includes(token));

  if (missing.length > 0) {
    addFail("Caddy example", `missing required Caddy token(s): ${missing.join(", ")}`);
    return;
  }

  addPass("Caddy example", "single-domain frontend, API and uploads routing example is present");
}

function checkDeployBundleScript() {
  const packageJson = readJson("package.json");
  const script = readText("scripts/create-deploy-bundle.mjs");
  const deployment = readText("docs/internal/engineering/deployment.md");
  const runbook = readText("docs/internal/engineering/server-docker-runbook.md");

  if (!packageJson || !script || !deployment || !runbook) {
    return;
  }

  const problems = [];

  if (packageJson.scripts?.["deploy:bundle"] !== "node scripts/create-deploy-bundle.mjs") {
    problems.push("package.json must expose deploy:bundle");
  }

  if (packageJson.scripts?.["check:deploy-env"] !== "node scripts/check-deploy-env.mjs") {
    problems.push("package.json must expose check:deploy-env");
  }

  for (const token of [
    "docker-compose.prod.yml",
    ".env.production.example",
    "deploy/Caddyfile.example",
    "server-docker-runbook.md",
    "dist/deploy/cumt-nexus-web",
    "up -d --no-build",
    "npm run check:post-deploy",
  ]) {
    if (!script.includes(token)) {
      problems.push(`create-deploy-bundle.mjs missing ${token}`);
    }
  }

  if (!deployment.includes("npm run deploy:bundle")) {
    problems.push("deployment.md must document npm run deploy:bundle");
  }

  if (!deployment.includes("npm run check:deploy-env")) {
    problems.push("deployment.md must document npm run check:deploy-env");
  }

  if (!runbook.includes("npm run deploy:bundle")) {
    problems.push("server-docker-runbook.md must document npm run deploy:bundle");
  }

  if (!runbook.includes("npm run check:deploy-env")) {
    problems.push("server-docker-runbook.md must document npm run check:deploy-env");
  }

  if (problems.length > 0) {
    addFail("deploy bundle script", problems.join("; "));
    return;
  }

  addPass("deploy bundle script", "server upload bundle generation is available and documented");
}

function validatePublicOrigin(name, value, problems) {
  if (!value) {
    problems.push(`${name} is missing`);
    return;
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    problems.push(`${name} must be a valid URL`);
    return;
  }

  if (parsed.protocol !== "https:") {
    problems.push(`${name} must use https`);
  }

  if (["localhost", "127.0.0.1", "::1"].includes(parsed.hostname) || parsed.hostname.endsWith(".localhost")) {
    problems.push(`${name} must not use localhost or loopback`);
  }

  if (value.trim() !== parsed.origin) {
    problems.push(`${name} must be an origin without path, query, hash or trailing slash`);
  }
}

function readText(path) {
  const absolutePath = resolve(root, path);

  if (!existsSync(absolutePath)) {
    addFail(path, "file is missing");
    return "";
  }

  return readFileSync(absolutePath, "utf8");
}

function readEnv(path) {
  const content = readText(path);

  if (!content) {
    return null;
  }

  const values = {};

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
    const value = line.slice(equalsIndex + 1).trim();
    values[key] = value.replace(/^["']|["']$/g, "");
  }

  return values;
}

function readJson(path) {
  const content = readText(path);

  if (!content) {
    return null;
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    addFail(path, `invalid JSON: ${error.message}`);
    return null;
  }
}

function addPass(name, detail) {
  results.push({ detail, name, status: "pass" });
}

function addFail(name, detail) {
  results.push({ detail, name, status: "fail" });
}
