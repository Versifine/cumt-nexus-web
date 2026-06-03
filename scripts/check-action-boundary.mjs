#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import process from "node:process";

const root = process.cwd();
const sourceRoot = resolve(root, "src");
const results = [];

console.log("CUMT Nexus Web action boundary check");
console.log("");

const sourceFiles = existsSync(sourceRoot)
  ? listSourceFiles(sourceRoot).map((filePath) => ({
      content: readFileSync(filePath, "utf8"),
      path: normalizePath(relative(root, filePath)),
    }))
  : [];

checkSourceRoot();
checkButtonAsChildLinks();

for (const result of results) {
  console.log(`[${result.status.toUpperCase()}] ${result.name} - ${result.detail}`);
}

const failCount = results.filter((result) => result.status === "fail").length;
console.log("");

if (failCount > 0) {
  console.error(`Action boundary check failed with ${failCount} blocker(s).`);
  process.exit(1);
}

console.log("Action boundary check passed.");

function checkSourceRoot() {
  if (!existsSync(sourceRoot)) {
    addFail("source root", "src directory is missing");
    return;
  }

  addPass("source root", `${sourceFiles.length} source file(s) scanned`);
}

function checkButtonAsChildLinks() {
  const offenders = [];
  const buttonAsChildPattern = /<Button\b[^>]*\basChild\b/g;

  for (const file of sourceFiles) {
    let match;
    while ((match = buttonAsChildPattern.exec(file.content)) !== null) {
      offenders.push(`${file.path}:${getLineNumber(file.content, match.index)}`);
    }
  }

  if (offenders.length > 0) {
    addFail(
      "Button as link",
      `navigation and link actions should use TextAction instead of Button asChild: ${offenders.join(", ")}`,
    );
    return;
  }

  addPass("Button as link", "link-style actions do not use Button asChild");
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

function getLineNumber(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
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
