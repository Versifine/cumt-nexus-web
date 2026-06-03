import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  dismissModerationReport,
  getModerationReport,
  listModerationReports,
  removeCommentByModeration,
  removeModerationReportTarget,
  removePostByModeration,
  reportComment,
  reportPost,
} from "./api";
import type { ListReportsInput, ReportContentInput } from "./types";

export const moderationQueryKeys = {
  all: ["moderation"] as const,
  reports: (status: string, limit: number, offset: number) =>
    ["moderation", "reports", { limit, offset, status }] as const,
  reportDetail: (id: string) => ["moderation", "reports", id] as const,
};

export function useModerationReportsQuery({
  status = "pending",
  limit = 20,
  offset = 0,
}: ListReportsInput = {}, enabled = true) {
  return useQuery({
    queryKey: moderationQueryKeys.reports(status, limit, offset),
    queryFn: () => listModerationReports({ status, limit, offset }),
    enabled,
  });
}

export function useModerationReportQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: moderationQueryKeys.reportDetail(id),
    queryFn: () => getModerationReport(id),
    enabled,
  });
}

export function useReportPostMutation(postId: string) {
  return useMutation({
    mutationFn: (input: ReportContentInput) => reportPost(postId, input),
  });
}

export function useReportCommentMutation(commentId: string) {
  return useMutation({
    mutationFn: (input: ReportContentInput) => reportComment(commentId, input),
  });
}

export function useRemovePostByModerationMutation(postId: string) {
  return useMutation({
    mutationFn: (input: ReportContentInput) => removePostByModeration(postId, input),
  });
}

export function useRemoveCommentByModerationMutation(commentId: string) {
  return useMutation({
    mutationFn: (input: ReportContentInput) =>
      removeCommentByModeration(commentId, input),
  });
}

export function useDismissModerationReportMutation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => dismissModerationReport(id),
    onSuccess: (result) => {
      queryClient.setQueryData(moderationQueryKeys.reportDetail(id), result);
      void queryClient.invalidateQueries({
        queryKey: moderationQueryKeys.all,
      });
    },
  });
}

export function useRemoveModerationReportTargetMutation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReportContentInput) => removeModerationReportTarget(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: moderationQueryKeys.all,
      });
    },
  });
}
