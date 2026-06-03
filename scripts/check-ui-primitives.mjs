#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import process from "node:process";

const root = process.cwd();
const sourceRoot = resolve(root, "src");
const allowedFile = "src/components/ui/data-display.tsx";
const primitiveNames = [
  "MetricBlock",
  "InfoRow",
  "IndexedInfoRow",
  "MetaCell",
  "StatusToken",
];
const results = [];

console.log("CUMT Nexus Web UI primitive reuse check");
console.log("");

const sourceFiles = existsSync(sourceRoot)
  ? listSourceFiles(sourceRoot).map((filePath) => ({
      content: readFileSync(filePath, "utf8"),
      path: normalizePath(relative(root, filePath)),
    }))
  : [];

checkSourceRoot();
checkDataDisplayPrimitiveDefinitions();

for (const result of results) {
  console.log(`[${result.status.toUpperCase()}] ${result.name} - ${result.detail}`);
}

const failCount = results.filter((result) => result.status === "fail").length;
console.log("");

if (failCount > 0) {
  console.error(`UI primitive reuse check failed with ${failCount} blocker(s).`);
  process.exit(1);
}

console.log("UI primitive reuse check passed.");

function checkSourceRoot() {
  if (!existsSync(sourceRoot)) {
    addFail("source root", "src directory is missing");
    return;
  }

  addPass("source root", `${sourceFiles.length} source file(s) scanned`);
}

function checkDataDisplayPrimitiveDefinitions() {
  const offenders = [];
  const definitionPattern = new RegExp(
    `(?:function|const)\\s+(${primitiveNames.join("|")})\\b`,
    "g",
  );

  for (const file of sourceFiles) {
    if (file.path === allowedFile) {
      continue;
    }

    let match;
    while ((match = definitionPattern.exec(file.content)) !== null) {
      offenders.push(`${file.path}: ${match[1]}`);
    }
  }

  if (offenders.length > 0) {
    addFail(
      "data display primitives",
      `reuse ${allowedFile} instead of local duplicate definitions: ${offenders.join(", ")}`,
    );
    return;
  }

  addPass("data display primitives", "shared MetricBlock, InfoRow and StatusToken primitives are reused");
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

function addPass(name, detail) {
  results.push({ detail, name, status: "pass" });
}

function addFail(name, detail) {
  results.push({ detail, name, status: "fail" });
}
