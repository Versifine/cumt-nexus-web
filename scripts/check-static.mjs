#!/usr/bin/env node

import { spawn } from "node:child_process";
import process from "node:process";

const isWindows = process.platform === "win32";
const checks = [
  "lint",
  "typecheck",
  "build",
  "check:docs",
  "check:actions",
  "check:dependencies",
  "check:api-boundary",
  "check:content-boundary",
  "check:content-segments",
  "check:copy",
  "check:ui-primitives",
  "check:env",
];

console.log("CUMT Nexus Web static check");
console.log("");

for (const check of checks) {
  console.log(`>>> npm run ${check}`);
  const exitCode = await runNpmScript(check);

  if (exitCode !== 0) {
    console.error("");
    console.error(`Static check failed at npm run ${check}.`);
    process.exit(exitCode ?? 1);
  }

  console.log("");
}

console.log("Static check passed.");

function runNpmScript(scriptName) {
  return new Promise((resolve) => {
    const command = isWindows ? (process.env.ComSpec ?? "cmd.exe") : "npm";
    const args = isWindows
      ? ["/d", "/s", "/c", `npm run ${scriptName}`]
      : ["run", scriptName];
    const child = spawn(command, args, {
      shell: false,
      stdio: "inherit",
    });

    child.on("error", (error) => {
      console.error(error.message);
      resolve(1);
    });

    child.on("close", (code) => {
      resolve(code);
    });
  });
}
