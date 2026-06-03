import { apiRequest } from "@/lib/api/client";

import type {
  ContentReportResponse,
  ListReportsInput,
  ListReportsResponse,
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
