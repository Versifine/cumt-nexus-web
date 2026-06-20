import { apiRequest } from "@/lib/api/client";

import type {
  ContentReportResponse,
  ListModQueueInput,
  ListModQueueResponse,
  ListReportsInput,
  ListReportsResponse,
  ModQueueItemDetailResponse,
  ModQueueSummaryResponse,
  ModerationBulkActionInput,
  ModerationBulkActionResponse,
  RemoveContentResponse,
  ReportContentInput,
} from "./types";

export function reportPost(postId: string, input: ReportContentInput) {
  return apiRequest<ContentReportResponse>(
    `/api/v1/posts/${encodeURIComponent(postId)}/reports`,
    {
      method: "POST",
      body: input,
    },
  );
}

export function reportComment(commentId: string, input: ReportContentInput) {
  return apiRequest<ContentReportResponse>(
    `/api/v1/comments/${encodeURIComponent(commentId)}/reports`,
    {
      method: "POST",
      body: input,
    },
  );
}

export function removePostByModeration(postId: string, input: ReportContentInput) {
  return apiRequest<RemoveContentResponse>(
    `/api/v1/posts/${encodeURIComponent(postId)}/moderation/remove`,
    {
      method: "POST",
      body: input,
    },
  );
}

export function removeCommentByModeration(
  commentId: string,
  input: ReportContentInput,
) {
  return apiRequest<RemoveContentResponse>(
    `/api/v1/comments/${encodeURIComponent(commentId)}/moderation/remove`,
    {
      method: "POST",
      body: input,
    },
  );
}

export function removeCommunityPostByModeration(
  slug: string,
  postId: string,
  input: ReportContentInput,
) {
  return apiRequest<RemoveContentResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/moderation/posts/${encodeURIComponent(postId)}/remove`,
    {
      method: "POST",
      body: input,
    },
  );
}

export function removeCommunityCommentByModeration(
  slug: string,
  commentId: string,
  input: ReportContentInput,
) {
  return apiRequest<RemoveContentResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/moderation/comments/${encodeURIComponent(commentId)}/remove`,
    {
      method: "POST",
      body: input,
    },
  );
}

export function listAdminModQueue({
  limit = 20,
  offset = 0,
  queue,
}: ListModQueueInput) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    queue,
  });

  return apiRequest<ListModQueueResponse>(
    `/api/v1/admin/mod-queues?${params.toString()}`,
    { cache: "no-store" },
  );
}

export function getAdminModQueueItem(itemId: string) {
  return apiRequest<ModQueueItemDetailResponse>(
    `/api/v1/admin/mod-queues/${encodeURIComponent(itemId)}`,
    { cache: "no-store" },
  );
}

export function getAdminModQueueSummary() {
  return apiRequest<ModQueueSummaryResponse>(
    "/api/v1/admin/mod-queues/summary",
    { cache: "no-store" },
  );
}

export function listCommunityModQueue({
  limit = 20,
  offset = 0,
  queue,
  slug,
}: ListModQueueInput & { slug: string }) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    queue,
  });

  return apiRequest<ListModQueueResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/mod-queues?${params.toString()}`,
    { cache: "no-store" },
  );
}

export function applyAdminModQueueAction(input: ModerationBulkActionInput) {
  return apiRequest<ModerationBulkActionResponse>(
    "/api/v1/admin/mod-queues/actions",
    {
      method: "POST",
      body: input,
    },
  );
}

export function applyCommunityModQueueAction(
  slug: string,
  input: ModerationBulkActionInput,
) {
  return apiRequest<ModerationBulkActionResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/mod-queues/actions`,
    {
      method: "POST",
      body: input,
    },
  );
}

export function ignoreCommunityReport(slug: string, reportId: string) {
  return apiRequest<ContentReportResponse>(
    `/api/v1/communities/${encodeURIComponent(slug)}/moderation/reports/${encodeURIComponent(reportId)}/ignore`,
    {
      method: "POST",
    },
  );
}

export function listModerationReports({
  status = "pending",
  limit = 20,
  offset = 0,
}: ListReportsInput = {}) {
  const params = new URLSearchParams({
    status,
    limit: String(limit),
    offset: String(offset),
  });

  return apiRequest<ListReportsResponse>(
    `/api/v1/moderation/reports?${params.toString()}`,
    { cache: "no-store" },
  );
}

export function getModerationReport(id: string) {
  return apiRequest<ContentReportResponse>(
    `/api/v1/moderation/reports/${encodeURIComponent(id)}`,
  );
}

export function dismissModerationReport(id: string) {
  return apiRequest<ContentReportResponse>(
    `/api/v1/moderation/reports/${encodeURIComponent(id)}/dismiss`,
    {
      method: "POST",
    },
  );
}

export function removeModerationReportTarget(
  id: string,
  input: ReportContentInput,
) {
  return apiRequest<RemoveContentResponse>(
    `/api/v1/moderation/reports/${encodeURIComponent(id)}/remove-target`,
    {
      method: "POST",
      body: input,
    },
  );
}
