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
import { commentQueryKeys } from "../comment/queries";
import { postQueryKeys } from "../post/queries";

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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReportContentInput) => removePostByModeration(postId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: postQueryKeys.detail(postId),
      });
      void queryClient.invalidateQueries({
        queryKey: postQueryKeys.latestPrefix(),
      });
      void queryClient.invalidateQueries({
        queryKey: postQueryKeys.communityPostsAll(),
      });
      void queryClient.invalidateQueries({
        queryKey: postQueryKeys.userPostsAll(),
      });
      void queryClient.invalidateQueries({
        queryKey: postQueryKeys.savedPostsAll(),
      });
      void queryClient.invalidateQueries({
        queryKey: moderationQueryKeys.all,
      });
    },
  });
}

export function useRemoveCommentByModerationMutation(
  commentId: string,
  postId?: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReportContentInput) =>
      removeCommentByModeration(commentId, input),
    onSuccess: () => {
      if (postId) {
        void queryClient.invalidateQueries({
          queryKey: commentQueryKeys.postCommentsPrefix(postId),
        });
        void queryClient.invalidateQueries({
          queryKey: postQueryKeys.detail(postId),
        });
      }

      void queryClient.invalidateQueries({
        queryKey: commentQueryKeys.userCommentsAll(),
      });
      void queryClient.invalidateQueries({
        queryKey: moderationQueryKeys.all,
      });
    },
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

export function useRemoveModerationReportTargetMutation(
  id: string,
  target?: {
    postId?: string;
    targetType?: string;
  },
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReportContentInput) => removeModerationReportTarget(id, input),
    onSuccess: () => {
      if (target?.postId) {
        void queryClient.invalidateQueries({
          queryKey: postQueryKeys.detail(target.postId),
        });
      }

      if (target?.targetType === "post") {
        void queryClient.invalidateQueries({
          queryKey: postQueryKeys.latestPrefix(),
        });
        void queryClient.invalidateQueries({
          queryKey: postQueryKeys.communityPostsAll(),
        });
        void queryClient.invalidateQueries({
          queryKey: postQueryKeys.userPostsAll(),
        });
        void queryClient.invalidateQueries({
          queryKey: postQueryKeys.savedPostsAll(),
        });
      }

      if (target?.targetType === "comment") {
        if (target.postId) {
          void queryClient.invalidateQueries({
            queryKey: commentQueryKeys.postCommentsPrefix(target.postId),
          });
        }

        void queryClient.invalidateQueries({
          queryKey: commentQueryKeys.userCommentsAll(),
        });
      }

      void queryClient.invalidateQueries({
        queryKey: moderationQueryKeys.all,
      });
    },
  });
}
