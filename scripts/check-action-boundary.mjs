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
checkPostNavigationSourceBoundary();
checkRedditVoteControlFeedback();

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

function checkPostNavigationSourceBoundary() {
  const sourceFile = findSourceFile("src/components/app-shell/post-navigation-source.ts");
  const detailFile = findSourceFile("src/features/post/post-detail.tsx");
  const requiredEntrypoints = [
    {
      path: "src/components/app-shell/home-shell.tsx",
      tokens: [
        "rememberPostNavigationSource",
        "getHomePostSource(pathname, source, sort)",
        "getFeedReturnLabel(source, sort)",
      ],
    },
    {
      path: "src/features/community/community-detail.tsx",
      tokens: ["rememberPostNavigationSource", "返回 /${community.slug}"],
    },
    {
      path: "src/features/search/search-page.tsx",
      tokens: [
        "rememberPostNavigationSource",
        "getSearchSourceHref(query, scope)",
        'label: "返回搜索结果"',
        "encodeURIComponent(query)",
      ],
    },
    {
      path: "src/features/post/saved-posts-page.tsx",
      tokens: ['href: "/saved"', 'label: "返回收藏"'],
    },
    {
      path: "src/features/profile/public-user-posts.tsx",
      tokens: ["rememberPostNavigationSource", "返回 @${user.username} 的帖子"],
    },
    {
      path: "src/features/profile/public-user-comments.tsx",
      tokens: ["rememberPostNavigationSource", "返回 @${user.username} 的评论"],
    },
  ];
  const problems = [];

  if (!sourceFile) {
    problems.push("src/components/app-shell/post-navigation-source.ts is missing");
  } else {
    for (const token of [
      "sessionStorage.getItem(getPostSourceKey(postId))",
      "sessionStorage.setItem(",
      "normalizeSourceHref(source.href)",
      "!trimmedHref.startsWith(\"/\")",
      "trimmedHref.startsWith(\"//\")",
      "isCurrentPostHref(source.href, postId)",
      "getPostBackFallback(communitySlug)",
      "`/communities/${encodeURIComponent(slug)}`",
      "label: `返回 /${slug}`",
    ]) {
      if (!sourceFile.content.includes(token)) {
        problems.push(`post navigation source missing ${token}`);
      }
    }
  }

  if (!detailFile) {
    problems.push("src/features/post/post-detail.tsx is missing");
  } else {
    for (const token of [
      "resolvePostBackSource",
      "usePostNavigationSource",
      "const navigationSource = usePostNavigationSource(id)",
      "source={navigationSource}",
    ]) {
      if (!detailFile.content.includes(token)) {
        problems.push(`post detail return source missing ${token}`);
      }
    }
  }

  for (const entrypoint of requiredEntrypoints) {
    const file = findSourceFile(entrypoint.path);

    if (!file) {
      problems.push(`${entrypoint.path} is missing`);
      continue;
    }

    for (const token of entrypoint.tokens) {
      if (!file.content.includes(token)) {
        problems.push(`${entrypoint.path} source boundary missing ${token}`);
      }
    }
  }

  for (const file of sourceFiles) {
    if (file.content.includes("return_to") || file.content.includes("returnTo")) {
      problems.push(`${file.path} must not expose post return source in public URL`);
    }
  }

  if (problems.length > 0) {
    addFail("post navigation source", problems.join("; "));
    return;
  }

  addPass(
    "post navigation source",
    "post detail return links use sessionStorage-backed internal sources and community fallback",
  );
}

function checkRedditVoteControlFeedback() {
  const voteFile = findSourceFile("src/features/vote/reddit-vote-control.tsx");
  const problems = [];

  if (!voteFile) {
    addFail("reddit vote control feedback", "src/features/vote/reddit-vote-control.tsx is missing");
    return;
  }

  for (const token of [
    'import { toast } from "sonner"',
    "onError: (error) =>",
    "toast.error(getVoteError(error))",
    "aria-pressed={active}",
    'aria-label={`${label}，当前 ${count}`}',
    "disabled={!canVote || isPending}",
  ]) {
    if (!voteFile.content.includes(token)) {
      problems.push(`RedditVoteControl missing ${token}`);
    }
  }

  if (problems.length > 0) {
    addFail("reddit vote control feedback", problems.join("; "));
    return;
  }

  addPass(
    "reddit vote control feedback",
    "shared vote controls keep visible error feedback, pressed state and disabled state",
  );
}

function findSourceFile(path) {
  return sourceFiles.find((file) => file.path === path);
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
