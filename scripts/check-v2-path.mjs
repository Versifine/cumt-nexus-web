#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const args = process.argv.slice(2);
const timeoutMs = Number(getArgValue("--timeout-ms") ?? 10_000);
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
const frontendOrigin = normalizeUrl(
  getArgValue("--frontend-origin") ??
    env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000",
);

const runId = createRunId();
const slugRunId = runId.replaceAll("_", "-");
const marker = `CUMT Nexus V2 smoke ${runId}`;
const results = [];

let reporter = null;
let staff = null;
let postId = "";
let rootCommentId = "";
let childCommentId = "";
let postReportId = "";
let commentReportId = "";

console.log("CUMT Nexus Web V2 backend path check");
console.log(`backend: ${apiBaseUrl}`);
console.log(`frontend origin: ${frontendOrigin}`);
console.log(`run id:  ${runId}`);
console.log("");

await checkBackendHealth();
await createUsers();
await promoteStaffUser();
await checkCurrentUserStaffFlag();
await checkUploadPostAndComments();
await checkBrowserEditCors();
await checkFeedSort();
await checkSearch();
await checkNotifications();
await checkReportsAndModeration();
await checkCommunityApplicationReview();

for (const result of results) {
  console.log(`[${result.status.toUpperCase()}] ${result.name} - ${result.detail}`);
}

const failCount = results.filter((result) => result.status === "fail").length;
const warnCount = results.filter((result) => result.status === "warn").length;

console.log("");

if (failCount > 0) {
  console.error(`V2 backend path check failed with ${failCount} blocker(s).`);
  process.exit(1);
}

if (warnCount > 0) {
  console.warn(`V2 backend path check passed with ${warnCount} warning(s).`);
} else {
  console.log("V2 backend path check passed.");
}

async function checkBackendHealth() {
  const response = await request("/healthz", { token: null });

  if (!response.ok) {
    addFail("backend health", response.detail);
    return;
  }

  if (response.status < 200 || response.status >= 300) {
    addFail("backend health", `/healthz returned HTTP ${response.status}`);
    return;
  }

  addPass("backend health", "/healthz is reachable");
}

async function createUsers() {
  reporter = await registerUser(`v2_reporter_${runId}`);
  staff = await registerUser(`v2_staff_${runId}`);

  addPass("register users", `created reporter ${reporter.username} and staff candidate ${staff.username}`);
}

async function promoteStaffUser() {
  const sql = `UPDATE users SET is_platform_staff = true WHERE id = '${escapeSql(staff.user.id)}'::uuid;`;
  const result = runDockerPsql(sql);

  if (!result.ok) {
    addFail("promote staff", result.detail);
    return;
  }

  addPass("promote staff", "staff smoke user marked as platform staff in local PostgreSQL");
}

async function checkCurrentUserStaffFlag() {
  const reporterMe = await request("/api/v1/me", { token: reporter.token });
  const staffMe = await request("/api/v1/me", { token: staff.token });

  if (!expectOk(reporterMe, "current user reporter") || !expectOk(staffMe, "current user staff")) {
    return;
  }

  if (reporterMe.json?.is_platform_staff !== false) {
    addFail("current user reporter", `expected is_platform_staff=false: ${preview(reporterMe.bodyText)}`);
    return;
  }

  if (staffMe.json?.is_platform_staff !== true) {
    addFail("current user staff", `expected is_platform_staff=true: ${preview(staffMe.bodyText)}`);
    return;
  }

  addPass("current user staff flag", "/me exposes is_platform_staff for normal and staff users");
}

async function checkUploadPostAndComments() {
  const postAttachment = await uploadImage(reporter.token, "v2 post image");
  const rootAttachment = await uploadImage(reporter.token, "v2 root comment image");
  const childAttachment = await uploadImage(reporter.token, "v2 child comment image");
  const postEditAttachment = await uploadImage(reporter.token, "v2 edited post image");
  const rootEditAttachment = await uploadImage(reporter.token, "v2 edited root comment image");
  if (
    !postAttachment.id ||
    !rootAttachment.id ||
    !childAttachment.id ||
    !postEditAttachment.id ||
    !rootEditAttachment.id
  ) {
    return;
  }

  const postAttachmentMarkdown = createSmokeAttachmentMarkdown(
    postAttachment.id,
    "v2 post image",
  );
  const rootAttachmentMarkdown = createSmokeAttachmentMarkdown(
    rootAttachment.id,
    "v2 root comment image",
  );
  const childAttachmentMarkdown = createSmokeAttachmentMarkdown(
    childAttachment.id,
    "v2 child comment image",
  );
  const postEditAttachmentMarkdown = createSmokeAttachmentMarkdown(
    postEditAttachment.id,
    "v2 edited post image",
  );
  const rootEditAttachmentMarkdown = createSmokeAttachmentMarkdown(
    rootEditAttachment.id,
    "v2 edited root comment image",
  );

  const postResponse = await request("/api/v1/communities/public/posts", {
    body: {
      attachment_ids: [postAttachment.id],
      body: [
        `# ${marker}`,
        "",
        "**加粗** *斜体* ~~删除线~~",
        "",
        "> 引用",
        "",
        ">! 隐藏内容 !<",
        "",
        postAttachmentMarkdown,
        "",
        "| 项 | 值 |",
        "| --- | --- |",
        "| A | B |",
      ].join("\n"),
      title: `${marker} post`,
    },
    method: "POST",
    token: reporter.token,
  });

  if (!expectOk(postResponse, "publish post with image")) {
    return;
  }

  const post = postResponse.json?.post;
  if (
    !post?.id ||
    !post.body?.includes(postAttachmentMarkdown) ||
    !Array.isArray(post.attachments) ||
    post.attachments[0]?.id !== postAttachment.id
  ) {
    addFail("publish post with image", `unexpected response payload: ${preview(postResponse.bodyText)}`);
    return;
  }

  postId = post.id;

  const postDetailResponse = await request(`/api/v1/posts/${encodeURIComponent(postId)}`, {
    token: reporter.token,
  });
  if (!expectOk(postDetailResponse, "post detail preserves inline image marker")) {
    return;
  }
  if (
    !postDetailResponse.json?.post?.body?.includes(postAttachmentMarkdown) ||
    !postDetailResponse.json?.post?.attachments?.some(
      (attachment) => attachment?.id === postAttachment.id,
    )
  ) {
    addFail("post detail preserves inline image marker", `unexpected response payload: ${preview(postDetailResponse.bodyText)}`);
    return;
  }

  const postEditResponse = await request(`/api/v1/posts/${encodeURIComponent(postId)}`, {
    body: {
      attachment_ids: [postEditAttachment.id],
      body: [
        `# ${marker} edited`,
        "",
        "帖子编辑态图片替换。",
        "",
        postEditAttachmentMarkdown,
      ].join("\n"),
      title: `${marker} post edited`,
    },
    method: "PATCH",
    token: reporter.token,
  });

  if (!expectOk(postEditResponse, "edit post replaces image attachments")) {
    return;
  }

  const editedPost = postEditResponse.json?.post;
  if (
    !editedPost?.body?.includes(postEditAttachmentMarkdown) ||
    editedPost.body.includes(postAttachmentMarkdown) ||
    !editedPost.attachments?.some((attachment) => attachment?.id === postEditAttachment.id) ||
    editedPost.attachments?.some((attachment) => attachment?.id === postAttachment.id)
  ) {
    addFail("edit post replaces image attachments", `unexpected response payload: ${preview(postEditResponse.bodyText)}`);
    return;
  }

  const editedPostDetailResponse = await request(`/api/v1/posts/${encodeURIComponent(postId)}`, {
    token: reporter.token,
  });
  if (!expectOk(editedPostDetailResponse, "post detail preserves edited inline image marker")) {
    return;
  }
  if (
    !editedPostDetailResponse.json?.post?.body?.includes(postEditAttachmentMarkdown) ||
    editedPostDetailResponse.json?.post?.body?.includes(postAttachmentMarkdown) ||
    !editedPostDetailResponse.json?.post?.attachments?.some(
      (attachment) => attachment?.id === postEditAttachment.id,
    ) ||
    editedPostDetailResponse.json?.post?.attachments?.some(
      (attachment) => attachment?.id === postAttachment.id,
    )
  ) {
    addFail("post detail preserves edited inline image marker", `unexpected response payload: ${preview(editedPostDetailResponse.bodyText)}`);
    return;
  }

  const postRemoveImageResponse = await request(`/api/v1/posts/${encodeURIComponent(postId)}`, {
    body: {
      attachment_ids: [],
      body: [
        `# ${marker} image removed`,
        "",
        "帖子编辑态删除正文图片后保存。",
      ].join("\n"),
      title: `${marker} post image removed`,
    },
    method: "PATCH",
    token: reporter.token,
  });

  if (!expectOk(postRemoveImageResponse, "edit post removes image attachments")) {
    return;
  }

  const postWithoutImage = postRemoveImageResponse.json?.post;
  if (
    !postWithoutImage?.body?.includes("帖子编辑态删除正文图片后保存。") ||
    postWithoutImage.body.includes(postAttachmentMarkdown) ||
    postWithoutImage.body.includes(postEditAttachmentMarkdown) ||
    postWithoutImage.attachments?.length
  ) {
    addFail("edit post removes image attachments", `unexpected response payload: ${preview(postRemoveImageResponse.bodyText)}`);
    return;
  }

  const postWithoutImageDetailResponse = await request(`/api/v1/posts/${encodeURIComponent(postId)}`, {
    token: reporter.token,
  });
  if (!expectOk(postWithoutImageDetailResponse, "post detail preserves removed image state")) {
    return;
  }
  if (
    postWithoutImageDetailResponse.json?.post?.body?.includes(postAttachmentMarkdown) ||
    postWithoutImageDetailResponse.json?.post?.body?.includes(postEditAttachmentMarkdown) ||
    postWithoutImageDetailResponse.json?.post?.attachments?.length
  ) {
    addFail("post detail preserves removed image state", `unexpected response payload: ${preview(postWithoutImageDetailResponse.bodyText)}`);
    return;
  }

  const rootResponse = await request(`/api/v1/posts/${encodeURIComponent(postId)}/comments`, {
    body: {
      attachment_ids: [rootAttachment.id],
      body: `${marker} root comment **markdown** >!hidden!<\n\n${rootAttachmentMarkdown}`,
    },
    method: "POST",
    token: reporter.token,
  });

  if (!expectOk(rootResponse, "publish root comment with image")) {
    return;
  }

  const rootComment = rootResponse.json?.comment;
  if (
    !rootComment?.id ||
    !rootComment.body?.includes(rootAttachmentMarkdown) ||
    !Array.isArray(rootComment.attachments) ||
    rootComment.attachments[0]?.id !== rootAttachment.id
  ) {
    addFail("publish root comment with image", `unexpected response payload: ${preview(rootResponse.bodyText)}`);
    return;
  }

  rootCommentId = rootComment.id;

  const rootEditResponse = await request(`/api/v1/comments/${encodeURIComponent(rootCommentId)}`, {
    body: {
      attachment_ids: [rootEditAttachment.id],
      body: `${marker} root comment edited\n\n${rootEditAttachmentMarkdown}`,
    },
    method: "PATCH",
    token: reporter.token,
  });

  if (!expectOk(rootEditResponse, "edit root comment replaces image attachments")) {
    return;
  }

  const editedRootComment = rootEditResponse.json?.comment;
  if (
    !editedRootComment?.body?.includes(rootEditAttachmentMarkdown) ||
    editedRootComment.body.includes(rootAttachmentMarkdown) ||
    !editedRootComment.attachments?.some((attachment) => attachment?.id === rootEditAttachment.id) ||
    editedRootComment.attachments?.some((attachment) => attachment?.id === rootAttachment.id)
  ) {
    addFail("edit root comment replaces image attachments", `unexpected response payload: ${preview(rootEditResponse.bodyText)}`);
    return;
  }

  const rootRemoveImageResponse = await request(`/api/v1/comments/${encodeURIComponent(rootCommentId)}`, {
    body: {
      attachment_ids: [],
      body: `${marker} root comment image removed`,
    },
    method: "PATCH",
    token: reporter.token,
  });

  if (!expectOk(rootRemoveImageResponse, "edit root comment removes image attachments")) {
    return;
  }

  const rootCommentWithoutImage = rootRemoveImageResponse.json?.comment;
  if (
    !rootCommentWithoutImage?.body?.includes("root comment image removed") ||
    rootCommentWithoutImage.body.includes(rootAttachmentMarkdown) ||
    rootCommentWithoutImage.body.includes(rootEditAttachmentMarkdown) ||
    rootCommentWithoutImage.attachments?.length
  ) {
    addFail("edit root comment removes image attachments", `unexpected response payload: ${preview(rootRemoveImageResponse.bodyText)}`);
    return;
  }

  const childResponse = await request(`/api/v1/posts/${encodeURIComponent(postId)}/comments`, {
    body: {
      attachment_ids: [childAttachment.id],
      body: `${marker} child comment\n\n${childAttachmentMarkdown}`,
      parent_id: rootCommentId,
    },
    method: "POST",
    token: reporter.token,
  });

  if (!expectOk(childResponse, "publish child comment with image")) {
    return;
  }

  const childComment = childResponse.json?.comment;
  if (
    !childComment?.id ||
    !childComment.body?.includes(childAttachmentMarkdown) ||
    childComment.parent_id !== rootCommentId ||
    childComment.attachments?.[0]?.id !== childAttachment.id
  ) {
    addFail("publish child comment with image", `unexpected response payload: ${preview(childResponse.bodyText)}`);
    return;
  }

  childCommentId = childComment.id;

  const treeResponse = await request(
    `/api/v1/posts/${encodeURIComponent(postId)}/comments?view=tree&sort=new&limit=20&offset=0&max_depth=6`,
    { token: reporter.token },
  );

  if (!expectOk(treeResponse, "comment tree with attachments")) {
    return;
  }

  const comments = treeResponse.json?.comments;
  const rootFromTree = Array.isArray(comments)
    ? comments.find((comment) => comment?.id === rootCommentId)
    : null;
  const childFromTree = Array.isArray(comments)
    ? comments.find((comment) => comment?.id === childCommentId)
    : null;

  if (
    !rootFromTree?.body?.includes("root comment image removed") ||
    rootFromTree?.body?.includes(rootAttachmentMarkdown) ||
    rootFromTree?.body?.includes(rootEditAttachmentMarkdown) ||
    !childFromTree?.body?.includes(childAttachmentMarkdown) ||
    !childFromTree?.attachments?.length ||
    rootFromTree?.attachments?.length
  ) {
    addFail("comment tree with attachments", `attachments missing from tree: ${preview(treeResponse.bodyText)}`);
    return;
  }

  addPass("content media path", `created, edited and removed inline images for post ${postId}, root comment ${rootCommentId} and child comment ${childCommentId}`);
}

async function checkBrowserEditCors() {
  if (!postId || !rootCommentId) {
    addFail("browser edit CORS", "post/comment smoke content was not created");
    return;
  }

  const postPreflight = await corsPreflight(
    `/api/v1/posts/${encodeURIComponent(postId)}`,
    "PATCH",
  );
  const commentPreflight = await corsPreflight(
    `/api/v1/comments/${encodeURIComponent(rootCommentId)}`,
    "PATCH",
  );

  const postOk = expectCorsPreflight(
    postPreflight,
    "browser edit CORS post PATCH",
    "PATCH",
  );
  const commentOk = expectCorsPreflight(
    commentPreflight,
    "browser edit CORS comment PATCH",
    "PATCH",
  );

  if (!postOk || !commentOk) {
    return;
  }

  addPass(
    "browser edit CORS",
    `PATCH preflight allows ${frontendOrigin} for post and comment edit endpoints`,
  );
}

async function checkFeedSort() {
  const latest = await request("/api/v1/posts?sort=new&limit=20&offset=0", { token: reporter.token });
  const hot = await request("/api/v1/posts?sort=hot&limit=20&offset=0", { token: reporter.token });
  const communityLatest = await request("/api/v1/communities/public/posts?sort=new&limit=20&offset=0", { token: reporter.token });
  const communityHot = await request("/api/v1/communities/public/posts?sort=hot&limit=20&offset=0", { token: reporter.token });

  if (
    !expectOk(latest, "feed sort new") ||
    !expectOk(hot, "feed sort hot") ||
    !expectOk(communityLatest, "community feed sort new") ||
    !expectOk(communityHot, "community feed sort hot")
  ) {
    return;
  }

  if (!Array.isArray(latest.json?.posts) || !Array.isArray(hot.json?.posts) || !Array.isArray(communityLatest.json?.posts) || !Array.isArray(communityHot.json?.posts)) {
    addFail("feed sort", "one or more feed responses did not return posts arrays");
    return;
  }

  addPass("feed sort", "global and community feeds accept new/hot sort");
}

async function checkSearch() {
  const postSearch = await request(
    `/api/v1/search?q=${encodeURIComponent(runId)}&scope=posts&limit=20&offset=0`,
    { token: reporter.token },
  );
  const communitySearch = await request(
    "/api/v1/search?q=public&scope=communities&limit=20&offset=0",
    { token: reporter.token },
  );
  const allSearch = await request(
    `/api/v1/search?q=${encodeURIComponent(runId)}&scope=all&limit=20&offset=0`,
    { token: reporter.token },
  );

  if (!expectOk(postSearch, "search posts") || !expectOk(communitySearch, "search communities") || !expectOk(allSearch, "search all")) {
    return;
  }

  if (!postSearch.json?.posts?.some((post) => post?.id === postId)) {
    addFail("search posts", `created post ${postId} missing from search`);
    return;
  }

  if (!Array.isArray(communitySearch.json?.communities) || !Array.isArray(allSearch.json?.posts)) {
    addFail("search response shape", "search response arrays are missing");
    return;
  }

  addPass("search", "all, communities and posts scopes return expected shapes");
}

async function checkNotifications() {
  const notificationId = randomUUID();
  const mentionNotificationId = randomUUID();
  const likeNotificationId = randomUUID();
  const readAllNotificationId = randomUUID();
  const insert = runDockerPsql(`
    INSERT INTO notifications (
      id,
      recipient_id,
      type,
      title,
      body,
      source_type,
      source_id,
      created_at,
      updated_at
    ) VALUES (
      '${notificationId}'::uuid,
      '${escapeSql(reporter.user.id)}'::uuid,
      'post_reply',
      'V2 smoke reply notification',
      'V2 smoke reply notification body',
      'post',
      '${escapeSql(postId)}',
      now(),
      now()
    ), (
      '${mentionNotificationId}'::uuid,
      '${escapeSql(reporter.user.id)}'::uuid,
      'mention',
      'V2 smoke mention notification',
      'V2 smoke mention notification body',
      'post',
      '${escapeSql(postId)}',
      now(),
      now()
    ), (
      '${likeNotificationId}'::uuid,
      '${escapeSql(reporter.user.id)}'::uuid,
      'post_like',
      'V2 smoke like notification',
      'V2 smoke like notification body',
      'post',
      '${escapeSql(postId)}',
      now(),
      now()
    ), (
      '${readAllNotificationId}'::uuid,
      '${escapeSql(reporter.user.id)}'::uuid,
      'system',
      'V2 smoke system notification',
      'V2 smoke system notification body',
      'post',
      '${escapeSql(postId)}',
      now(),
      now()
    );
  `);

  if (!insert.ok) {
    addFail("seed notification", insert.detail);
    return;
  }

  const unread = await request("/api/v1/notifications?status=unread&limit=20&offset=0", { token: reporter.token });
  if (!expectOk(unread, "list unread notifications")) {
    return;
  }

  if (!unread.json?.notifications?.some((notification) => notification?.id === notificationId)) {
    addFail("list unread notifications", `seeded notification ${notificationId} missing`);
    return;
  }

  const replies = await request("/api/v1/notifications?category=replies&status=unread&limit=20&offset=0", { token: reporter.token });
  const mentions = await request("/api/v1/notifications?category=mentions&status=unread&limit=20&offset=0", { token: reporter.token });
  const likes = await request("/api/v1/notifications?category=likes&status=unread&limit=20&offset=0", { token: reporter.token });
  const system = await request("/api/v1/notifications?category=system&status=unread&limit=20&offset=0", { token: reporter.token });
  if (
    !expectOk(replies, "list replies notifications") ||
    !expectOk(mentions, "list mentions notifications") ||
    !expectOk(likes, "list likes notifications") ||
    !expectOk(system, "list system notifications")
  ) {
    return;
  }

  if (replies.json?.category !== "replies" || !replies.json?.notifications?.some((notification) => notification?.id === notificationId)) {
    addFail("list replies notifications", `reply notification ${notificationId} missing: ${preview(replies.bodyText)}`);
    return;
  }
  if (mentions.json?.category !== "mentions" || !mentions.json?.notifications?.some((notification) => notification?.id === mentionNotificationId)) {
    addFail("list mentions notifications", `mention notification ${mentionNotificationId} missing: ${preview(mentions.bodyText)}`);
    return;
  }
  if (likes.json?.category !== "likes" || !likes.json?.notifications?.some((notification) => notification?.id === likeNotificationId)) {
    addFail("list likes notifications", `like notification ${likeNotificationId} missing: ${preview(likes.bodyText)}`);
    return;
  }
  if (system.json?.category !== "system" || !system.json?.notifications?.some((notification) => notification?.id === readAllNotificationId)) {
    addFail("list system notifications", `system notification ${readAllNotificationId} missing: ${preview(system.bodyText)}`);
    return;
  }

  const summary = await request("/api/v1/notifications/unread-summary", { token: reporter.token });
  if (!expectOk(summary, "notification unread summary")) {
    return;
  }
  if (
    summary.json?.total < 4 ||
    summary.json?.replies < 1 ||
    summary.json?.mentions < 1 ||
    summary.json?.likes < 1 ||
    summary.json?.system < 1
  ) {
    addFail("notification unread summary", `unexpected summary: ${preview(summary.bodyText)}`);
    return;
  }

  const readResponse = await request(`/api/v1/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: "POST",
    token: reporter.token,
  });
  if (!expectOk(readResponse, "mark notification read")) {
    return;
  }

  if (!readResponse.json?.notification?.read_at) {
    addFail("mark notification read", `read_at missing: ${preview(readResponse.bodyText)}`);
    return;
  }

  const read = await request("/api/v1/notifications?status=read&limit=20&offset=0", { token: reporter.token });
  if (!expectOk(read, "list read notifications")) {
    return;
  }

  if (!read.json?.notifications?.some((notification) => notification?.id === notificationId)) {
    addFail("list read notifications", `read notification ${notificationId} missing`);
    return;
  }

  const readAllResponse = await request("/api/v1/notifications/read-all", {
    method: "POST",
    token: reporter.token,
  });
  if (!expectOk(readAllResponse, "mark all notifications read")) {
    return;
  }

  if (!readAllResponse.json?.read_at || readAllResponse.json?.updated_count < 3) {
    addFail("mark all notifications read", `unexpected payload: ${preview(readAllResponse.bodyText)}`);
    return;
  }

  const afterReadAllSummary = await request("/api/v1/notifications/unread-summary", { token: reporter.token });
  if (!expectOk(afterReadAllSummary, "notification unread summary after read all")) {
    return;
  }
  if (afterReadAllSummary.json?.total !== 0) {
    addFail("notification unread summary after read all", `expected total=0: ${preview(afterReadAllSummary.bodyText)}`);
    return;
  }

  addPass("notifications", "category list, unread summary, mark read and mark all read all work");
}

async function checkReportsAndModeration() {
  const postReport = await request(`/api/v1/posts/${encodeURIComponent(postId)}/reports`, {
    body: { reason: `${marker} post report` },
    method: "POST",
    token: reporter.token,
  });
  const commentReport = await request(`/api/v1/comments/${encodeURIComponent(childCommentId)}/reports`, {
    body: { reason: `${marker} comment report` },
    method: "POST",
    token: reporter.token,
  });

  if (!expectOk(postReport, "report post") || !expectOk(commentReport, "report comment")) {
    return;
  }

  postReportId = postReport.json?.report?.id;
  commentReportId = commentReport.json?.report?.id;

  if (!postReportId || !commentReportId) {
    addFail("reports", `report id missing: ${preview(postReport.bodyText)} / ${preview(commentReport.bodyText)}`);
    return;
  }

  const nonStaffList = await request("/api/v1/moderation/reports?status=pending&limit=20&offset=0", {
    token: reporter.token,
  });
  if (!expectErrorCode(nonStaffList, "moderation non-staff forbidden", 403, "forbidden")) {
    return;
  }

  const list = await request("/api/v1/moderation/reports?status=pending&limit=50&offset=0", { token: staff.token });
  if (!expectOk(list, "moderation list")) {
    return;
  }

  const reports = list.json?.reports;
  const listedPostReport = Array.isArray(reports)
    ? reports.find((report) => report?.id === postReportId)
    : null;
  if (!listedPostReport?.target_preview) {
    addFail("moderation list", `target_preview missing for report ${postReportId}`);
    return;
  }

  const detail = await request(`/api/v1/moderation/reports/${encodeURIComponent(postReportId)}`, { token: staff.token });
  if (!expectOk(detail, "moderation detail")) {
    return;
  }
  if (!detail.json?.report?.target_preview) {
    addFail("moderation detail", `target_preview missing: ${preview(detail.bodyText)}`);
    return;
  }

  const dismiss = await request(`/api/v1/moderation/reports/${encodeURIComponent(postReportId)}/dismiss`, {
    method: "POST",
    token: staff.token,
  });
  if (!expectOk(dismiss, "dismiss report")) {
    return;
  }
  if (dismiss.json?.report?.status !== "dismissed") {
    addFail("dismiss report", `expected dismissed, got ${dismiss.json?.report?.status}`);
    return;
  }

  const removeTarget = await request(`/api/v1/moderation/reports/${encodeURIComponent(commentReportId)}/remove-target`, {
    body: { reason: `${marker} remove reported comment` },
    method: "POST",
    token: staff.token,
  });
  if (!expectOk(removeTarget, "remove reported target")) {
    return;
  }

  const directPost = await request("/api/v1/communities/public/posts", {
    body: {
      body: `${marker} direct moderation post`,
      title: `${marker} direct moderation post`,
    },
    method: "POST",
    token: reporter.token,
  });
  if (!expectOk(directPost, "create direct moderation post")) {
    return;
  }

  const directPostId = directPost.json?.post?.id;
  const directComment = await request(`/api/v1/posts/${encodeURIComponent(directPostId)}/comments`, {
    body: { body: `${marker} direct moderation comment` },
    method: "POST",
    token: reporter.token,
  });
  if (!expectOk(directComment, "create direct moderation comment")) {
    return;
  }

  const directCommentId = directComment.json?.comment?.id;
  const removeComment = await request(`/api/v1/comments/${encodeURIComponent(directCommentId)}/moderation/remove`, {
    body: { reason: `${marker} direct remove comment` },
    method: "POST",
    token: staff.token,
  });
  const removePost = await request(`/api/v1/posts/${encodeURIComponent(directPostId)}/moderation/remove`, {
    body: { reason: `${marker} direct remove post` },
    method: "POST",
    token: staff.token,
  });

  if (!expectOk(removeComment, "direct remove comment") || !expectOk(removePost, "direct remove post")) {
    return;
  }

  addPass("moderation", "report, list, detail, dismiss, remove-target and direct remove all work");
}

async function checkCommunityApplicationReview() {
  const approveSlug = `v2-approve-${slugRunId}`;
  const rejectSlug = `v2-reject-${slugRunId}`;
  const approveApplication = await submitCommunityApplication(approveSlug, "V2 approve smoke");
  const rejectApplication = await submitCommunityApplication(rejectSlug, "V2 reject smoke");

  const nonStaffList = await request("/api/v1/community-applications?status=pending&limit=20&offset=0", {
    token: reporter.token,
  });
  if (!expectErrorCode(nonStaffList, "community application list non-staff forbidden", 403, "forbidden")) {
    return;
  }

  const pendingList = await request("/api/v1/community-applications?status=pending&limit=20&offset=0", {
    token: staff.token,
  });
  if (!expectOk(pendingList, "list pending community applications")) {
    return;
  }
  if (
    !Array.isArray(pendingList.json?.applications) ||
    pendingList.json.limit !== 20 ||
    pendingList.json.offset !== 0 ||
    !pendingList.json.applications.some((application) => application?.id === approveApplication.id) ||
    !pendingList.json.applications.some((application) => application?.id === rejectApplication.id)
  ) {
    addFail("list pending community applications", `unexpected payload: ${preview(pendingList.bodyText)}`);
    return;
  }

  const nonStaffDetail = await request(`/api/v1/community-applications/${encodeURIComponent(approveApplication.id)}`, {
    token: reporter.token,
  });
  if (!expectErrorCode(nonStaffDetail, "community application detail non-staff forbidden", 403, "forbidden")) {
    return;
  }

  const pendingDetail = await request(`/api/v1/community-applications/${encodeURIComponent(approveApplication.id)}`, {
    token: staff.token,
  });
  if (!expectOk(pendingDetail, "get community application detail")) {
    return;
  }
  if (
    pendingDetail.json?.application?.id !== approveApplication.id ||
    pendingDetail.json?.application?.status !== "pending" ||
    pendingDetail.json?.application?.requested_slug !== approveSlug
  ) {
    addFail("get community application detail", `unexpected payload: ${preview(pendingDetail.bodyText)}`);
    return;
  }

  const nonStaffApprove = await request(`/api/v1/community-applications/${encodeURIComponent(approveApplication.id)}/approve`, {
    method: "POST",
    token: reporter.token,
  });
  if (!expectErrorCode(nonStaffApprove, "community application non-staff forbidden", 403, "forbidden")) {
    return;
  }

  const approve = await request(`/api/v1/community-applications/${encodeURIComponent(approveApplication.id)}/approve`, {
    method: "POST",
    token: staff.token,
  });
  if (!expectOk(approve, "approve community application")) {
    return;
  }
  if (approve.json?.application?.status !== "approved" || approve.json?.community?.slug !== approveSlug) {
    addFail("approve community application", `unexpected payload: ${preview(approve.bodyText)}`);
    return;
  }

  const reject = await request(`/api/v1/community-applications/${encodeURIComponent(rejectApplication.id)}/reject`, {
    body: { reject_reason: `${marker} reject reason` },
    method: "POST",
    token: staff.token,
  });
  if (!expectOk(reject, "reject community application")) {
    return;
  }
  if (reject.json?.application?.status !== "rejected") {
    addFail("reject community application", `unexpected payload: ${preview(reject.bodyText)}`);
    return;
  }

  const approvedList = await request("/api/v1/community-applications?status=approved&limit=20&offset=0", {
    token: staff.token,
  });
  const rejectedList = await request("/api/v1/community-applications?status=rejected&limit=20&offset=0", {
    token: staff.token,
  });
  if (!expectOk(approvedList, "list approved community applications") || !expectOk(rejectedList, "list rejected community applications")) {
    return;
  }
  if (
    !approvedList.json?.applications?.some((application) => application?.id === approveApplication.id) ||
    !rejectedList.json?.applications?.some((application) => application?.id === rejectApplication.id)
  ) {
    addFail("community application status lists", `approved/rejected application missing from lists`);
    return;
  }

  addPass("community application review", "list, detail, non-staff forbidden, staff approve and staff reject all work");
}

async function submitCommunityApplication(slug, name) {
  const response = await request("/api/v1/community-applications", {
    body: {
      reason: `${marker} ${slug}`,
      requested_name: name,
      requested_slug: slug,
    },
    method: "POST",
    token: reporter.token,
  });

  if (!expectOk(response, `submit application ${slug}`)) {
    return {};
  }

  const application = response.json?.application;
  if (!application?.id || application.requested_slug !== slug) {
    addFail(`submit application ${slug}`, `unexpected payload: ${preview(response.bodyText)}`);
    return {};
  }

  return application;
}

async function registerUser(username) {
  const password = `Password${runId}`;
  const response = await request("/api/v1/auth/register", {
    body: { password, username },
    method: "POST",
    token: null,
  });

  if (!expectOk(response, `register ${username}`)) {
    return { password, token: "", user: {}, username };
  }

  if (!response.json?.access_token || !response.json?.user?.id) {
    addFail(`register ${username}`, `unexpected payload: ${preview(response.bodyText)}`);
    return { password, token: "", user: {}, username };
  }

  return {
    password,
    token: response.json.access_token,
    user: response.json.user,
    username,
  };
}

async function uploadImage(token, altText) {
  const formData = new FormData();
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64",
  );
  const blob = new Blob([png], { type: "image/png" });

  formData.set("file", blob, "v2-smoke.png");
  formData.set("alt_text", altText);

  const response = await request("/api/v1/uploads/images", {
    body: formData,
    method: "POST",
    token,
  });

  if (!expectOk(response, `upload image ${altText}`)) {
    return {};
  }

  const attachment = response.json?.attachment;
  if (!attachment?.id || attachment.mime_type !== "image/png" || attachment.status !== "ready") {
    addFail(`upload image ${altText}`, `unexpected payload: ${preview(response.bodyText)}`);
    return {};
  }

  const publicCheck = await checkPublicImageUrl(attachment.url);
  if (!publicCheck.ok) {
    addFail(`upload image ${altText} public URL`, publicCheck.detail);
    return {};
  }

  addPass(
    `upload image ${altText} public URL`,
    `${publicCheck.method} ${attachment.url} returned HTTP ${publicCheck.status} ${publicCheck.contentType}`,
  );

  return attachment;
}

async function checkPublicImageUrl(url) {
  if (!url || !/^https?:\/\//u.test(url)) {
    return {
      detail: `attachment url is not an absolute HTTP URL: ${String(url)}`,
      ok: false,
    };
  }

  let lastDetail = "";
  for (const method of ["HEAD", "GET"]) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        signal: controller.signal,
      });
      const contentType = response.headers.get("content-type") ?? "";

      if (!response.ok) {
        lastDetail = `${method} ${url} returned HTTP ${response.status}`;
        continue;
      }

      if (!contentType.toLowerCase().startsWith("image/")) {
        lastDetail = `${method} ${url} returned non-image Content-Type ${contentType || "(empty)"}`;
        continue;
      }

      if (method === "GET") {
        await response.arrayBuffer();
      }

      return {
        contentType,
        method,
        ok: true,
        status: response.status,
      };
    } catch (error) {
      lastDetail = `${method} ${url} failed: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return {
    detail: lastDetail || `attachment url is not readable: ${url}`,
    ok: false,
  };
}

async function request(path, options = {}) {
  const { body, method = "GET", token = reporter?.token ?? null } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const headers = new Headers();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let requestBody;
  if (body instanceof FormData) {
    requestBody = body;
  } else if (body !== undefined) {
    headers.set("Content-Type", "application/json");
    requestBody = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      body: requestBody,
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
    };
  } catch (error) {
    return {
      detail:
        error?.name === "AbortError"
          ? `request timed out after ${timeoutMs}ms: ${path}`
          : `${error?.message ?? error}: ${path}`,
      ok: false,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function corsPreflight(path, method) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      headers: {
        "Access-Control-Request-Headers": "authorization,content-type",
        "Access-Control-Request-Method": method,
        Origin: frontendOrigin,
      },
      method: "OPTIONS",
      signal: controller.signal,
    });

    return {
      allowHeaders: response.headers.get("access-control-allow-headers") ?? "",
      allowMethods: response.headers.get("access-control-allow-methods") ?? "",
      allowOrigin: response.headers.get("access-control-allow-origin") ?? "",
      ok: true,
      status: response.status,
    };
  } catch (error) {
    return {
      detail:
        error?.name === "AbortError"
          ? `preflight timed out after ${timeoutMs}ms: ${path}`
          : `${error?.message ?? error}: ${path}`,
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
    return true;
  }

  addFail(name, `HTTP ${response.status}: ${preview(response.bodyText)}`);
  return false;
}

function expectErrorCode(response, name, status, code) {
  if (!response.ok) {
    addFail(name, response.detail);
    return false;
  }

  const actualCode = response.json?.error?.code;
  if (response.status === status && actualCode === code) {
    addPass(name, `HTTP ${status} ${code}`);
    return true;
  }

  addFail(name, `expected HTTP ${status} ${code}, got HTTP ${response.status}: ${preview(response.bodyText)}`);
  return false;
}

function expectCorsPreflight(response, name, method) {
  if (!response.ok) {
    addFail(name, response.detail);
    return false;
  }

  if (response.status < 200 || response.status >= 300) {
    addFail(name, `OPTIONS returned HTTP ${response.status}`);
    return false;
  }

  if (response.allowOrigin !== frontendOrigin && response.allowOrigin !== "*") {
    addFail(
      name,
      `expected Access-Control-Allow-Origin ${frontendOrigin} or *, got ${response.allowOrigin || "(empty)"}`,
    );
    return false;
  }

  const methods = splitHeaderList(response.allowMethods);
  if (!methods.has(method.toLowerCase())) {
    addFail(
      name,
      `expected Access-Control-Allow-Methods to include ${method}, got ${response.allowMethods || "(empty)"}`,
    );
    return false;
  }

  const headers = splitHeaderList(response.allowHeaders);
  for (const requiredHeader of ["authorization", "content-type"]) {
    if (!headers.has(requiredHeader)) {
      addFail(
        name,
        `expected Access-Control-Allow-Headers to include ${requiredHeader}, got ${response.allowHeaders || "(empty)"}`,
      );
      return false;
    }
  }

  addPass(name, `OPTIONS allows ${method} from ${frontendOrigin}`);
  return true;
}

function runDockerPsql(sql) {
  const container = findRunningPostgresContainer();

  if (!container) {
    return {
      detail: "no running postgres Docker container was found",
      ok: false,
    };
  }

  const result = spawnSync(
    "docker",
    [
      "exec",
      "-e",
      `SQL=${sql}`,
      container,
      "sh",
      "-lc",
      'psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-cumt_nexus}" -v ON_ERROR_STOP=1 -tAc "$SQL"',
    ],
    {
      encoding: "utf8",
      timeout: timeoutMs,
      windowsHide: true,
    },
  );

  if (result.status === 0) {
    return { ok: true, stdout: result.stdout.trim() };
  }

  const detail = [result.stderr, result.stdout, result.error?.message]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    detail: detail || `docker psql exited with ${result.status}`,
    ok: false,
  };
}

function findRunningPostgresContainer() {
  const configured = getArgValue("--postgres-container") ?? env.CUMT_NEXUS_POSTGRES_CONTAINER;
  if (configured) {
    return configured;
  }

  const result = spawnSync(
    "docker",
    ["ps", "--format", "{{.Names}} {{.Image}}"],
    {
      encoding: "utf8",
      timeout: timeoutMs,
      windowsHide: true,
    },
  );

  if (result.status !== 0) {
    return "";
  }

  const candidates = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, image] = line.split(/\s+/, 2);
      return { image, name };
    })
    .filter((entry) => entry.image?.startsWith("postgres"));

  const preferred = candidates.find((entry) => entry.name.includes("cumt-nexus"));
  return preferred?.name ?? candidates[0]?.name ?? "";
}

function createSmokeAttachmentMarkdown(id, altText) {
  return `![${escapeMarkdownAltText(altText)}](nexus-attachment:${encodeAttachmentIdForMarkdown(id)})`;
}

function escapeMarkdownAltText(value) {
  return value.replace(/\\/g, "\\\\").replace(/\]/g, "\\]").replace(/\r?\n/g, " ");
}

function encodeAttachmentIdForMarkdown(value) {
  return encodeURIComponent(value).replace(/[()]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
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
  return value.replace(/\s+/g, " ").trim().slice(0, 180);
}

function splitHeaderList(value = "") {
  return new Set(
    value
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

function escapeSql(value) {
  return String(value).replaceAll("'", "''");
}

function addPass(name, detail) {
  results.push({ detail, name, status: "pass" });
}

function addFail(name, detail) {
  results.push({ detail, name, status: "fail" });
}
