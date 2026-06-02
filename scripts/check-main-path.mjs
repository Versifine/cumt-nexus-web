#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const allowUnavailable = args.includes("--allow-unavailable");
const timeoutMs = Number(getArgValue("--timeout-ms") ?? 10_000);
const communitySlug = getArgValue("--community-slug") ?? "public";
const env = {
  ...readEnvFile(".env"),
  ...readEnvFile(".env.local"),
  ...process.env,
};

const apiBaseUrl = normalizeUrl(
  getArgValue("--api-base-url") ??
    env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:8080",
);

const runId = createRunId();
const slugRunId = runId.replaceAll("_", "-");
const username = `smoke_${runId}`;
const password = `smokePassword${runId}`;
const marker = `CUMT Nexus smoke ${runId}`;
const results = [];

let accessToken = "";
let postId = "";
let commentId = "";

console.log("CUMT Nexus Web backend main path check");
console.log(`backend:   ${apiBaseUrl}`);
console.log(`community: ${communitySlug}`);
console.log(`mode:      ${allowUnavailable ? "local unavailable allowed" : "strict"}`);
console.log(`run id:    ${runId}`);
console.log("");

const backendReachable = await checkBackendHealth();

if (backendReachable) {
  await checkRegister();
  await checkLogin();
  await checkCurrentUser();
  await checkCommunities();
  await checkCommunityDetail();
  await checkCommunityApplication();
  await checkCommunityPosts();
  await checkPublishPost();
  await checkLatestPosts();
  await checkPostDetail();
  await checkListComments("initial comments");
  await checkPublishComment();
  await checkListComments("created comment");
  await checkSetVote("upvote", 1);
  await checkSetVote("downvote", -1);
  await checkDeleteVote();
  await checkPostAfterVoteCancel();
}

for (const result of results) {
  console.log(`[${result.status.toUpperCase()}] ${result.name} - ${result.detail}`);
}

const failCount = results.filter((result) => result.status === "fail").length;
const warnCount = results.filter((result) => result.status === "warn").length;

console.log("");

if (failCount > 0) {
  console.error(`Backend main path check failed with ${failCount} blocker(s).`);
  process.exit(1);
}

if (warnCount > 0) {
  console.warn(`Backend main path check passed with ${warnCount} warning(s).`);
} else {
  console.log("Backend main path check passed.");
}

async function checkBackendHealth() {
  const response = await request("/healthz", {
    allowEmptyBody: true,
    token: null,
  });

  if (!response.ok) {
    if (allowUnavailable) {
      addWarn("backend health", response.detail);
      return false;
    }

    addFail("backend health", response.detail);
    return false;
  }

  if (response.status < 200 || response.status >= 300) {
    const detail = `/healthz returned HTTP ${response.status}: ${preview(response.bodyText)}`;

    if (allowUnavailable) {
      addWarn("backend health", detail);
      return false;
    }

    addFail("backend health", detail);
    return false;
  }

  addPass("backend health", "/healthz is reachable");
  return true;
}

async function checkRegister() {
  const response = await request("/api/v1/auth/register", {
    body: { password, username },
    method: "POST",
    token: null,
  });

  if (!expectOk(response, "register")) {
    return;
  }

  if (!isAuthResult(response.json) || response.json.user.username !== username) {
    addFail("register", `unexpected response payload: ${preview(response.bodyText)}`);
    return;
  }

  accessToken = response.json.access_token;
  addPass("register", `created smoke user ${username}`);
}

async function checkLogin() {
  const response = await request("/api/v1/auth/login", {
    body: { password, username },
    method: "POST",
    token: null,
  });

  if (!expectOk(response, "login")) {
    return;
  }

  if (!isAuthResult(response.json) || response.json.user.username !== username) {
    addFail("login", `unexpected response payload: ${preview(response.bodyText)}`);
    return;
  }

  accessToken = response.json.access_token;
  addPass("login", "smoke user can sign in");
}

async function checkCurrentUser() {
  const response = await request("/api/v1/me");

  if (!expectOk(response, "current user")) {
    return;
  }

  if (!response.json?.id || response.json.username !== username) {
    addFail("current user", `unexpected response payload: ${preview(response.bodyText)}`);
    return;
  }

  addPass("current user", "/me returns the signed-in smoke user");
}

async function checkCommunities() {
  const response = await request("/api/v1/communities");

  if (!expectOk(response, "communities list")) {
    return;
  }

  const communities = response.json?.communities;
  if (!Array.isArray(communities)) {
    addFail("communities list", `unexpected response payload: ${preview(response.bodyText)}`);
    return;
  }

  if (!communities.some((community) => community?.slug === communitySlug)) {
    addFail(
      "communities list",
      `community ${communitySlug} is missing from ${communities.length} returned item(s)`,
    );
    return;
  }

  addPass("communities list", `${communities.length} community item(s) returned`);
}

async function checkCommunityDetail() {
  const response = await request(`/api/v1/communities/${encodeURIComponent(communitySlug)}`);

  if (!expectOk(response, "community detail")) {
    return;
  }

  if (response.json?.community?.slug !== communitySlug) {
    addFail("community detail", `unexpected response payload: ${preview(response.bodyText)}`);
    return;
  }

  addPass("community detail", `${communitySlug} detail is readable`);
}

async function checkCommunityApplication() {
  const requestedSlug = `smoke-${slugRunId}`;
  const response = await request("/api/v1/community-applications", {
    body: {
      reason: `${marker} community application`,
      requested_name: `Smoke ${runId}`,
      requested_slug: requestedSlug,
    },
    method: "POST",
  });

  if (!expectOk(response, "community application")) {
    return;
  }

  const application = response.json?.application;
  if (!application?.id || application.requested_slug !== requestedSlug) {
    addFail("community application", `unexpected response payload: ${preview(response.bodyText)}`);
    return;
  }

  addPass("community application", `created application ${application.id}`);
}

async function checkCommunityPosts() {
  const response = await request(
    `/api/v1/communities/${encodeURIComponent(communitySlug)}/posts?limit=5&offset=0`,
  );

  if (!expectOk(response, "community posts")) {
    return;
  }

  if (!Array.isArray(response.json?.posts)) {
    addFail("community posts", `unexpected response payload: ${preview(response.bodyText)}`);
    return;
  }

  addPass("community posts", `${response.json.posts.length} post item(s) returned`);
}

async function checkPublishPost() {
  const response = await request(
    `/api/v1/communities/${encodeURIComponent(communitySlug)}/posts`,
    {
      body: {
        body: `${marker} body. This post verifies the frontend launch smoke path.`,
        title: `${marker} post`,
      },
      method: "POST",
    },
  );

  if (!expectOk(response, "publish post")) {
    return;
  }

  const post = response.json?.post;
  if (!post?.id || post.title !== `${marker} post`) {
    addFail("publish post", `unexpected response payload: ${preview(response.bodyText)}`);
    return;
  }

  postId = post.id;
  addPass("publish post", `created post ${postId}`);
}

async function checkLatestPosts() {
  const response = await request("/api/v1/posts?sort=new&limit=20&offset=0");

  if (!expectOk(response, "latest posts")) {
    return;
  }

  const posts = response.json?.posts;
  if (!Array.isArray(posts)) {
    addFail("latest posts", `unexpected response payload: ${preview(response.bodyText)}`);
    return;
  }

  if (!posts.some((post) => post?.id === postId)) {
    addFail("latest posts", `created post ${postId} is missing from latest feed`);
    return;
  }

  addPass("latest posts", "created post appears in latest feed");
}

async function checkPostDetail() {
  const response = await request(`/api/v1/posts/${encodeURIComponent(postId)}`);

  if (!expectOk(response, "post detail")) {
    return;
  }

  if (response.json?.post?.id !== postId) {
    addFail("post detail", `unexpected response payload: ${preview(response.bodyText)}`);
    return;
  }

  addPass("post detail", "created post detail is readable");
}

async function checkListComments(name) {
  const response = await request(
    `/api/v1/posts/${encodeURIComponent(postId)}/comments?limit=20&offset=0`,
  );

  if (!expectOk(response, name)) {
    return;
  }

  const comments = response.json?.comments;
  if (!Array.isArray(comments)) {
    addFail(name, `unexpected response payload: ${preview(response.bodyText)}`);
    return;
  }

  if (commentId && !comments.some((comment) => comment?.id === commentId)) {
    addFail(name, `created comment ${commentId} is missing from comment list`);
    return;
  }

  addPass(name, `${comments.length} comment item(s) returned`);
}

async function checkPublishComment() {
  const response = await request(`/api/v1/posts/${encodeURIComponent(postId)}/comments`, {
    body: { body: `${marker} comment` },
    method: "POST",
  });

  if (!expectOk(response, "publish comment")) {
    return;
  }

  const comment = response.json?.comment;
  if (!comment?.id || comment.post_id !== postId) {
    addFail("publish comment", `unexpected response payload: ${preview(response.bodyText)}`);
    return;
  }

  commentId = comment.id;
  addPass("publish comment", `created comment ${commentId}`);
}

async function checkSetVote(name, value) {
  const response = await request(`/api/v1/posts/${encodeURIComponent(postId)}/vote`, {
    body: { value },
    method: "PUT",
  });

  if (!expectOk(response, name)) {
    return;
  }

  const vote = response.json?.vote;
  if (vote?.post_id !== postId || vote.value !== value) {
    addFail(name, `unexpected response payload: ${preview(response.bodyText)}`);
    return;
  }

  addPass(name, `post vote is ${value}`);
}

async function checkDeleteVote() {
  const response = await request(`/api/v1/posts/${encodeURIComponent(postId)}/vote`, {
    allowEmptyBody: true,
    method: "DELETE",
  });

  if (!expectOk(response, "cancel vote")) {
    return;
  }

  addPass("cancel vote", "post vote can be deleted");
}

async function checkPostAfterVoteCancel() {
  const response = await request(`/api/v1/posts/${encodeURIComponent(postId)}`);

  if (!expectOk(response, "post after vote cancel")) {
    return;
  }

  if (response.json?.post?.id !== postId) {
    addFail("post after vote cancel", `unexpected response payload: ${preview(response.bodyText)}`);
    return;
  }

  if (response.json.post.my_vote !== 0) {
    addFail("post after vote cancel", `expected my_vote 0, received ${response.json.post.my_vote}`);
    return;
  }

  addPass("post after vote cancel", "post detail reflects canceled vote");
}

async function request(path, options = {}) {
  const {
    allowEmptyBody = false,
    body,
    method = "GET",
    token = accessToken,
  } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const headers = new Headers();
  const url = `${apiBaseUrl}${path}`;

  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    const response = await fetch(url, {
      body: body === undefined ? undefined : JSON.stringify(body),
      headers,
      method,
      signal: controller.signal,
    });
    const bodyText = await response.text();

    return {
      bodyText,
      json: bodyText ? parseJson(bodyText) : undefined,
      ok: true,
      status: response.status,
      validEmptyBody: allowEmptyBody && bodyText.length === 0,
    };
  } catch (error) {
    const detail =
      error?.name === "AbortError"
        ? `request timed out after ${timeoutMs}ms: ${url}`
        : `${error?.message ?? error}: ${url}`;

    return {
      detail,
      ok: false,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function expectOk(response, name) {
  if (!response.ok) {
    addFail(name, response.detail);
    return false;
  }

  if (response.status >= 200 && response.status < 300) {
    if (response.status === 204 || response.validEmptyBody || response.bodyText) {
      return true;
    }

    addFail(name, `empty response body from HTTP ${response.status}`);
    return false;
  }

  addFail(name, `HTTP ${response.status}: ${preview(response.bodyText)}`);
  return false;
}

function isAuthResult(value) {
  return Boolean(
    value?.access_token &&
      typeof value.access_token === "string" &&
      value?.token_type &&
      value?.user?.id &&
      value?.user?.username,
  );
}

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

function readEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) {
    return {};
  }

  const values = {};
  const content = readFileSync(filePath, "utf8");

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
    const rawValue = line.slice(equalsIndex + 1).trim();
    values[key] = rawValue.replace(/^["']|["']$/g, "");
  }

  return values;
}

function normalizeUrl(value) {
  return value.replace(/\/+$/g, "");
}

function createRunId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 7);
  return `${timestamp}_${random}`;
}

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function preview(value = "") {
  return value.replace(/\s+/g, " ").trim().slice(0, 160);
}

function addPass(name, detail) {
  results.push({ detail, name, status: "pass" });
}

function addWarn(name, detail) {
  results.push({ detail, name, status: "warn" });
}

function addFail(name, detail) {
  results.push({ detail, name, status: "fail" });
}
