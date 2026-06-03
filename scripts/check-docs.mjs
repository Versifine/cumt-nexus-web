#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import process from "node:process";

const root = process.cwd();
const results = [];

const requiredRootDocs = [
  "AGENTS.md",
  "README.md",
  "tasks.md",
  "docs/design/DESIGN.md",
  "docs/design/page-patterns.md",
  "docs/design/component-rules.md",
  "docs/prompts/frontend-task-template.md",
  "docs/prompts/frontend-review-template.md",
  "docs/prompts/backend-content-media-target-template.md",
  "docs/internal/README.md",
  "docs/internal/architecture/frontend-v1.md",
  "docs/internal/architecture/content-system.md",
  "docs/internal/architecture/content-media-api-gaps.md",
  "docs/internal/architecture/markdown-rendering.md",
  "docs/internal/design/product-visual-direction.md",
  "docs/internal/engineering/workflow.md",
  "docs/internal/engineering/launch-readiness.md",
  "docs/internal/engineering/deployment.md",
  "docs/internal/engineering/browser-qa.md",
];

const readmeIndexedDocs = [
  "AGENTS.md",
  "docs/design/DESIGN.md",
  "docs/design/page-patterns.md",
  "docs/design/component-rules.md",
  "docs/prompts/frontend-task-template.md",
  "docs/prompts/frontend-review-template.md",
  "docs/prompts/backend-content-media-target-template.md",
  "docs/internal/architecture/frontend-v1.md",
  "docs/internal/architecture/content-system.md",
  "docs/internal/architecture/content-media-api-gaps.md",
  "docs/internal/architecture/markdown-rendering.md",
  "docs/internal/engineering/workflow.md",
  "docs/internal/engineering/launch-readiness.md",
  "docs/internal/engineering/deployment.md",
  "docs/internal/engineering/browser-qa.md",
];

const internalIndexedDocs = [
  "architecture/frontend-v1.md",
  "architecture/content-system.md",
  "architecture/content-media-api-gaps.md",
  "architecture/markdown-rendering.md",
  "design/product-visual-direction.md",
  "engineering/workflow.md",
  "engineering/launch-readiness.md",
  "engineering/deployment.md",
  "engineering/browser-qa.md",
];

const promptDocs = [
  "docs/prompts/frontend-task-template.md",
  "docs/prompts/frontend-review-template.md",
  "docs/prompts/backend-content-media-target-template.md",
];

console.log("CUMT Nexus Web documentation check");
console.log("");

checkRequiredDocs();
checkReadmeIndex();
checkInternalIndex();
checkPromptDocs();
checkValidationCommandDocumented();

for (const result of results) {
  console.log(`[${result.status.toUpperCase()}] ${result.name} - ${result.detail}`);
}

const failCount = results.filter((result) => result.status === "fail").length;
console.log("");

if (failCount > 0) {
  console.error(`Documentation check failed with ${failCount} blocker(s).`);
  process.exit(1);
}

console.log("Documentation check passed.");

function checkRequiredDocs() {
  const missing = requiredRootDocs.filter((path) => !existsSync(resolve(root, path)));

  if (missing.length > 0) {
    addFail("required docs", `missing ${missing.join(", ")}`);
    return;
  }

  addPass("required docs", `${requiredRootDocs.length} required documentation file(s) exist`);
}

function checkReadmeIndex() {
  const readme = readTextFile("README.md");

  if (!readme) {
    return;
  }

  const missing = readmeIndexedDocs.filter((path) => !readme.includes(path));

  if (missing.length > 0) {
    addFail("README document index", `missing index entry for ${missing.join(", ")}`);
    return;
  }

  addPass("README document index", `${readmeIndexedDocs.length} project document(s) indexed`);
}

function checkInternalIndex() {
  const internalReadme = readTextFile("docs/internal/README.md");

  if (!internalReadme) {
    return;
  }

  const missing = internalIndexedDocs.filter((path) => !internalReadme.includes(path));

  if (missing.length > 0) {
    addFail("internal document index", `missing index entry for ${missing.join(", ")}`);
    return;
  }

  const broken = internalIndexedDocs
    .map((path) => `docs/internal/${path}`)
    .filter((path) => !existsSync(resolve(root, path)));

  if (broken.length > 0) {
    addFail("internal indexed files", `indexed file(s) missing: ${broken.join(", ")}`);
    return;
  }

  addPass("internal document index", `${internalIndexedDocs.length} internal document(s) indexed`);
}

function checkPromptDocs() {
  const missing = promptDocs.filter((path) => !existsSync(resolve(root, path)));

  if (missing.length > 0) {
    addFail("prompt docs", `missing ${missing.join(", ")}`);
    return;
  }

  const incomplete = [];

  for (const path of promptDocs) {
    const content = readTextFile(path);

    if (!content) {
      continue;
    }

    if (!content.includes("```text")) {
      incomplete.push(`${path} lacks a copyable text template block`);
    }
  }

  if (incomplete.length > 0) {
    addFail("prompt docs", incomplete.join("; "));
    return;
  }

  addPass("prompt docs", `${promptDocs.length} reusable prompt template(s) are present`);
}

function checkValidationCommandDocumented() {
  const readme = readTextFile("README.md");
  const workflow = readTextFile("docs/internal/engineering/workflow.md");
  const packageJson = readJsonFile("package.json");

  if (!readme || !workflow || !packageJson) {
    return;
  }

  const requiredScripts = ["check:docs", "check:copy", "check:static"];
  const missingScripts = requiredScripts.filter((script) => !packageJson.scripts?.[script]);

  if (missingScripts.length > 0) {
    addFail("documented check scripts", `package.json is missing ${missingScripts.join(", ")}`);
    return;
  }

  const missing = [];

  if (!readme.includes("npm run check:docs")) {
    missing.push("README.md: npm run check:docs");
  }

  if (!workflow.includes("npm run check:docs")) {
    missing.push("docs/internal/engineering/workflow.md: npm run check:docs");
  }

  if (!readme.includes("npm run check:copy")) {
    missing.push("README.md: npm run check:copy");
  }

  if (!workflow.includes("npm run check:copy")) {
    missing.push("docs/internal/engineering/workflow.md: npm run check:copy");
  }

  if (!readme.includes("npm run check:static")) {
    missing.push("README.md: npm run check:static");
  }

  if (!workflow.includes("npm run check:static")) {
    missing.push("docs/internal/engineering/workflow.md: npm run check:static");
  }

  if (missing.length > 0) {
    addFail("check command documentation", `missing command mention in ${missing.join(", ")}`);
    return;
  }

  addPass("check command documentation", "documentation, copy and static sync checks are documented");
}

function readTextFile(path) {
  const absolutePath = resolve(root, path);

  if (!existsSync(absolutePath)) {
    addFail(normalizePath(path), "file is missing");
    return "";
  }

  return readFileSync(absolutePath, "utf8");
}

function readJsonFile(path) {
  const content = readTextFile(path);

  if (!content) {
    return null;
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    addFail(normalizePath(path), `invalid JSON: ${error.message}`);
    return null;
  }
}

function normalizePath(path) {
  return relative(root, resolve(root, path)).split(sep).join("/");
}

function addPass(name, detail) {
  results.push({ detail, name, status: "pass" });
}

function addFail(name, detail) {
  results.push({ detail, name, status: "fail" });
}
