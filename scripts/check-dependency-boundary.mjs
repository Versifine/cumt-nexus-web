#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import process from "node:process";

const root = process.cwd();
const sourceRoot = resolve(root, "src");
const results = [];

const approvedDependencies = {
  "@hookform/resolvers": "^5.4.0",
  "@radix-ui/react-dialog": "^1.1.15",
  "@radix-ui/react-dropdown-menu": "^2.1.16",
  "@radix-ui/react-slot": "^1.2.4",
  "@radix-ui/react-tabs": "^1.1.13",
  "@tanstack/react-query": "^5.100.14",
  "@tiptap/extension-image": "^3.26.0",
  "@tiptap/extension-link": "^3.26.0",
  "@tiptap/extension-placeholder": "^3.26.0",
  "@tiptap/extension-table": "^3.26.0",
  "@tiptap/extension-table-cell": "^3.26.0",
  "@tiptap/extension-table-header": "^3.26.0",
  "@tiptap/extension-table-row": "^3.26.0",
  "@tiptap/markdown": "^3.26.0",
  "@tiptap/react": "^3.26.0",
  "@tiptap/starter-kit": "^3.26.0",
  "class-variance-authority": "^0.7.1",
  clsx: "^2.1.1",
  "embla-carousel-react": "^8.6.0",
  katex: "^0.17.0",
  "lucide-react": "^1.17.0",
  motion: "^12.23.26",
  next: "16.2.7",
  react: "19.2.4",
  "react-dom": "19.2.4",
  "react-easy-crop": "^6.0.2",
  "react-hook-form": "^7.77.0",
  "react-markdown": "^10.1.0",
  "rehype-katex": "^7.0.1",
  "remark-gfm": "^4.0.1",
  "remark-math": "^6.0.0",
  sonner: "^2.0.7",
  "tailwind-merge": "^3.6.0",
  "tw-animate-css": "^1.4.0",
  "yet-another-react-lightbox": "^3.32.0",
  zod: "^4.4.3",
};

const approvedDevDependencies = {
  "@tailwindcss/postcss": "^4",
  "@types/node": "^20",
  "@types/react": "^19",
  "@types/react-dom": "^19",
  eslint: "^9",
  "eslint-config-next": "16.2.7",
  playwright: "^1.61.0",
  tailwindcss: "^4",
  typescript: "^5",
};

const blockedExactPackages = new Set([
  "antd",
  "bootstrap",
  "daisyui",
  "flowbite",
  "flowbite-react",
  "grommet",
  "primereact",
  "react-bootstrap",
  "semantic-ui-react",
]);

const blockedPackagePrefixes = [
  "@ant-design/",
  "@blueprintjs/",
  "@chakra-ui/",
  "@headlessui/",
  "@heroicons/",
  "@heroui/",
  "@mantine/",
  "@mui/",
  "@nextui-org/",
];

console.log("CUMT Nexus Web dependency boundary check");
console.log("");

const packageJson = readJsonFile("package.json");
const packageLock = readJsonFile("package-lock.json");
const sourceFiles = existsSync(sourceRoot)
  ? listSourceFiles(sourceRoot).map((filePath) => ({
      absolutePath: filePath,
      content: readFileSync(filePath, "utf8"),
      path: normalizePath(relative(root, filePath)),
    }))
  : [];

checkPackageJson(packageJson);
checkPackageLock(packageLock);
checkApprovedDirectDependencies(packageJson);
checkPackageLockRoot(packageJson, packageLock);
checkBlockedPackages(packageJson, packageLock);
checkBlockedImports(sourceFiles);

for (const result of results) {
  console.log(`[${result.status.toUpperCase()}] ${result.name} - ${result.detail}`);
}

const failCount = results.filter((result) => result.status === "fail").length;
console.log("");

if (failCount > 0) {
  console.error(`Dependency boundary check failed with ${failCount} blocker(s).`);
  process.exit(1);
}

console.log("Dependency boundary check passed.");

function checkPackageJson(value) {
  if (!value) {
    return;
  }

  addPass("package.json", "file exists and is valid JSON");
}

function checkPackageLock(value) {
  if (!value) {
    return;
  }

  if (!value.packages?.[""]) {
    addFail("package-lock.json", "root package metadata is missing");
    return;
  }

  addPass("package-lock.json", "file exists and contains root package metadata");
}

function checkApprovedDirectDependencies(value) {
  if (!value) {
    return;
  }

  checkApprovedSection("dependencies", value.dependencies, approvedDependencies);
  checkApprovedSection("devDependencies", value.devDependencies, approvedDevDependencies);
}

function checkApprovedSection(sectionName, declared = {}, approved) {
  const declaredNames = Object.keys(declared);
  const approvedNames = Object.keys(approved);
  const missing = approvedNames.filter((name) => !(name in declared));
  const extra = declaredNames.filter((name) => !(name in approved));
  const versionMismatches = declaredNames
    .filter((name) => name in approved && declared[name] !== approved[name])
    .map((name) => `${name} expected ${approved[name]} but found ${declared[name]}`);

  if (missing.length > 0 || extra.length > 0 || versionMismatches.length > 0) {
    const details = [
      missing.length > 0 ? `missing approved package(s): ${missing.join(", ")}` : null,
      extra.length > 0 ? `unapproved package(s): ${extra.join(", ")}` : null,
      versionMismatches.length > 0 ? `version mismatch: ${versionMismatches.join("; ")}` : null,
    ].filter(Boolean);

    addFail(sectionName, details.join(" | "));
    return;
  }

  addPass(sectionName, `${declaredNames.length} approved direct package(s)`);
}

function checkPackageLockRoot(manifest, lockfile) {
  if (!manifest || !lockfile?.packages?.[""]) {
    return;
  }

  const rootPackage = lockfile.packages[""];
  compareLockSection("dependencies", manifest.dependencies, rootPackage.dependencies);
  compareLockSection("devDependencies", manifest.devDependencies, rootPackage.devDependencies);
}

function compareLockSection(sectionName, manifestSection = {}, lockSection = {}) {
  const manifestKeys = Object.keys(manifestSection);
  const lockKeys = Object.keys(lockSection);
  const missingInLock = manifestKeys.filter((name) => !(name in lockSection));
  const extraInLock = lockKeys.filter((name) => !(name in manifestSection));
  const versionMismatches = manifestKeys
    .filter((name) => name in lockSection && manifestSection[name] !== lockSection[name])
    .map((name) => `${name} package.json ${manifestSection[name]} but lock root ${lockSection[name]}`);

  if (missingInLock.length > 0 || extraInLock.length > 0 || versionMismatches.length > 0) {
    const details = [
      missingInLock.length > 0 ? `missing in lock root: ${missingInLock.join(", ")}` : null,
      extraInLock.length > 0 ? `extra in lock root: ${extraInLock.join(", ")}` : null,
      versionMismatches.length > 0 ? `version mismatch: ${versionMismatches.join("; ")}` : null,
    ].filter(Boolean);

    addFail(`package-lock ${sectionName}`, details.join(" | "));
    return;
  }

  addPass(`package-lock ${sectionName}`, "root dependency declarations match package.json");
}

function checkBlockedPackages(manifest, lockfile) {
  const directNames = manifest
    ? [...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.devDependencies ?? {})]
    : [];
  const lockNames = listLockPackageNames(lockfile);
  const directBlocked = directNames.filter(isBlockedPackage);
  const lockBlocked = lockNames.filter(isBlockedPackage);

  if (directBlocked.length > 0) {
    addFail("blocked direct UI packages", `found ${directBlocked.join(", ")}`);
  } else {
    addPass("blocked direct UI packages", "no second UI library is declared directly");
  }

  if (lockBlocked.length > 0) {
    addFail("blocked installed UI packages", `found ${unique(lockBlocked).join(", ")}`);
  } else {
    addPass("blocked installed UI packages", "package-lock does not contain blocked UI libraries");
  }
}

function checkBlockedImports(files) {
  if (!existsSync(sourceRoot)) {
    addFail("source imports", "src directory is missing");
    return;
  }

  const offenders = [];

  for (const file of files) {
    for (const source of listImportSources(file.content)) {
      if (isBlockedPackage(source)) {
        offenders.push(`${file.path}: ${source}`);
      }
    }
  }

  if (offenders.length > 0) {
    addFail("blocked UI imports", `found ${offenders.join(", ")}`);
    return;
  }

  addPass("blocked UI imports", `${files.length} source file(s) scanned`);
}

function readJsonFile(fileName) {
  const filePath = resolve(root, fileName);

  if (!existsSync(filePath)) {
    addFail(fileName, "file is missing");
    return null;
  }

  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    addFail(fileName, `invalid JSON: ${error.message}`);
    return null;
  }
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

function listLockPackageNames(lockfile) {
  if (!lockfile?.packages) {
    return [];
  }

  return Object.keys(lockfile.packages)
    .filter((key) => key.startsWith("node_modules/"))
    .map((key) => key.replace(/^node_modules\//, ""))
    .filter(Boolean);
}

function listImportSources(content) {
  const importPattern =
    /(?:from\s+["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|require\s*\(\s*["']([^"']+)["']\s*\))/g;
  const sources = [];
  let match;

  while ((match = importPattern.exec(content)) !== null) {
    sources.push(match[1] ?? match[2] ?? match[3]);
  }

  return sources;
}

function isBlockedPackage(packageName) {
  const normalized = packageName.trim();
  return (
    blockedExactPackages.has(normalized) ||
    blockedPackagePrefixes.some((prefix) => normalized.startsWith(prefix))
  );
}

function normalizePath(path) {
  return path.split(sep).join("/");
}

function unique(values) {
  return [...new Set(values)];
}

function addPass(name, detail) {
  results.push({ detail, name, status: "pass" });
}

function addFail(name, detail) {
  results.push({ detail, name, status: "fail" });
}
