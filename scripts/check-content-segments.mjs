#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import ts from "typescript";

const root = process.cwd();
const sourcePath = resolve(root, "src/features/content/spoiler-segments.ts");
const source = readFileSync(sourcePath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2020,
  },
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(
  transpiled.outputText,
).toString("base64")}`;
const { parseSpoilerSegments } = await import(moduleUrl);

const cases = [
  {
    expected: [{ text: "", type: "text" }],
    name: "empty input stays plain text",
    value: "",
  },
  {
    expected: [{ text: "普通正文", type: "text" }],
    name: "plain text stays plain text",
    value: "普通正文",
  },
  {
    expected: [
      { text: "前文 ", type: "text" },
      { text: "隐藏内容", type: "spoiler" },
      { text: " 后文", type: "text" },
    ],
    name: "single spoiler is split and trimmed",
    value: "前文 >! 隐藏内容 !< 后文",
  },
  {
    expected: [
      { text: "A ", type: "text" },
      { text: "x", type: "spoiler" },
      { text: " B ", type: "text" },
      { text: "y", type: "spoiler" },
      { text: " C", type: "text" },
    ],
    name: "multiple spoilers are preserved in order",
    value: "A >! x !< B >! y !< C",
  },
  {
    expected: [{ text: "前文 >! 没有闭合", type: "text" }],
    name: "unclosed spoiler remains plain text",
    value: "前文 >! 没有闭合",
  },
  {
    expected: [
      { text: "前文 ", type: "text" },
      { text: "已闭合", type: "spoiler" },
      { text: " 后文 >! 未闭合", type: "text" },
    ],
    name: "later unclosed spoiler does not discard previous segments",
    value: "前文 >! 已闭合 !< 后文 >! 未闭合",
  },
  {
    expected: [{ text: "隐藏内容", type: "spoiler" }],
    name: "empty spoiler uses fallback text",
    value: ">!   !<",
  },
  {
    expected: [{ text: "第一行\n第二行", type: "spoiler" }],
    name: "multiline spoiler keeps internal line breaks",
    value: ">! 第一行\n第二行 !<",
  },
];

console.log("CUMT Nexus Web content segment check");
console.log("");

const failures = [];

for (const testCase of cases) {
  const actual = parseSpoilerSegments(testCase.value);

  if (!deepEqual(actual, testCase.expected)) {
    failures.push({ actual, expected: testCase.expected, name: testCase.name });
    console.log(`[FAIL] ${testCase.name}`);
    continue;
  }

  console.log(`[PASS] ${testCase.name}`);
}

console.log("");

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure.name);
    console.error(`expected: ${JSON.stringify(failure.expected)}`);
    console.error(`actual:   ${JSON.stringify(failure.actual)}`);
  }

  console.error(`Content segment check failed with ${failures.length} blocker(s).`);
  process.exit(1);
}

console.log("Content segment check passed.");

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}
