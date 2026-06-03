#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import process from "node:process";

const root = process.cwd();
const sourceRoot = resolve(root, "src");
const results = [];

const blockedCopyPatterns = [
  /\bSign in\b/i,
  /\bSign up\b/i,
  /\bLog in\b/i,
  /\bCreate account\b/i,
  /\bGet started\b/i,
  /\bLearn more\b/i,
  /\bRead more\b/i,
  /\bTry again\b/i,
  /\bNo data\b/i,
  /\bNo results\b/i,
  /\bComing soon\b/i,
  /\bSomething went wrong\b/i,
  /\bThis page could not be found\b/i,
  /\bInternal Server Error\b/i,
  /\bApplication error\b/i,
  /\bLoading\.\.\.(?!\w)/i,
];

const blockedSingleWordCopy = new Set([
  "Cancel",
  "Continue",
  "Create",
  "Dashboard",
  "Empty",
  "Error",
  "Failed",
  "Loading",
  "Login",
  "Register",
  "Retry",
  "Search",
  "Settings",
  "Submit",
  "Success",
]);

const allowedExactCopy = new Set([
  "CUMT Nexus",
  "CUMT NEXUS",
  "ERROR",
  "TOP",
]);

console.log("CUMT Nexus Web copy boundary check");
console.log("");

const sourceFiles = existsSync(sourceRoot)
  ? listSourceFiles(sourceRoot).map((filePath) => ({
      content: readFileSync(filePath, "utf8"),
      path: normalizePath(relative(root, filePath)),
    }))
  : [];

checkSourceRoot();
checkBlockedEnglishCopy();

for (const result of results) {
  console.log(`[${result.status.toUpperCase()}] ${result.name} - ${result.detail}`);
}

const failCount = results.filter((result) => result.status === "fail").length;
console.log("");

if (failCount > 0) {
  console.error(`Copy boundary check failed with ${failCount} blocker(s).`);
  process.exit(1);
}

console.log("Copy boundary check passed.");

function checkSourceRoot() {
  if (!existsSync(sourceRoot)) {
    addFail("source root", "src directory is missing");
    return;
  }

  addPass("source root", `${sourceFiles.length} source file(s) scanned`);
}

function checkBlockedEnglishCopy() {
  const offenders = [];

  for (const file of sourceFiles) {
    for (const candidate of listCopyCandidates(file.content)) {
      const text = normalizeCandidate(candidate.text);

      if (!text || allowedExactCopy.has(text)) {
        continue;
      }

      if (isBlockedEnglishCopy(text)) {
        offenders.push(`${file.path}:${candidate.line} "${text}"`);
      }
    }
  }

  if (offenders.length > 0) {
    addFail(
      "blocked English UI copy",
      `replace template/default English copy with Simplified Chinese: ${offenders.join(", ")}`,
    );
    return;
  }

  addPass(
    "blocked English UI copy",
    "no common English template copy was found in UI-facing source",
  );
}

function listCopyCandidates(content) {
  return [
    ...listJsxTextCandidates(content),
    ...listCopyPropCandidates(content),
  ];
}

function listJsxTextCandidates(content) {
  const pattern = />\s*([^<>{}][^<>]*?)\s*</g;
  const candidates = [];
  let match;

  while ((match = pattern.exec(content)) !== null) {
    candidates.push({
      line: getLineNumber(content, match.index),
      text: match[1],
    });
  }

  return candidates;
}

function listCopyPropCandidates(content) {
  const propNames = [
    "aria-label",
    "backLabel",
    "description",
    "hint",
    "label",
    "message",
    "placeholder",
    "title",
  ];
  const pattern = new RegExp(
    `(?:${propNames.join("|")})\\s*[:=]\\s*["']([^"']+)["']`,
    "g",
  );
  const candidates = [];
  let match;

  while ((match = pattern.exec(content)) !== null) {
    candidates.push({
      line: getLineNumber(content, match.index),
      text: match[1],
    });
  }

  return candidates;
}

function isBlockedEnglishCopy(text) {
  if (!/[A-Za-z]/.test(text) || /[\u4e00-\u9fff]/.test(text)) {
    return false;
  }

  if (blockedSingleWordCopy.has(text)) {
    return true;
  }

  return blockedCopyPatterns.some((pattern) => pattern.test(text));
}

function normalizeCandidate(value) {
  return value.replace(/\s+/g, " ").trim();
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
