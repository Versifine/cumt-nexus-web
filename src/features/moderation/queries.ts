import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  applyAdminModQueueAction,
  applyCommunityModQueueAction,
  dismissModerationReport,
  getModerationReport,
  ignoreCommunityReport,
  listAdminModQueue,
  listCommunityModQueue,
  listModerationReports,
  removeCommentByModeration,
  removeCommunityCommentByModeration,
  removeCommunityPostByModeration,
  removeModerationReportTarget,
  removePostByModeration,
  reportComment,
  reportPost,
} from "./api";
import type {
  ListModQueueInput,
  ListReportsInput,
  ModerationBulkActionInput,
  ReportContentInput,
} from "./types";
import { commentQueryKeys } from "../comment/queries";
import { postQueryKeys } from "../post/queries";

export const moderationQueryKeys = {
  all: ["moderation"] as const,
  adminModQueue: (queue: string, limit: number, offset: number) =>
    ["moderation", "admin-mod-queue", { limit, offset, queue }] as const,
  communityModQueue: (
    slug: string,
    queue: string,
    limit: number,
    offset: number,
  ) =>
    [
      "moderation",
      "community-mod-queue",
      slug,
      { limit, offset, queue },
    ] as const,
  communityModQueues: (slug: string) =>
    ["moderation", "community-mod-queue", slug] as const,
  reports: (status: string, limit: number, offset: number) =>
    ["moderation", "reports", { limit, offset, status }] as const,
  reportDetail: (id: string) => ["moderation", "reports", id] as const,
};

export function useAdminModQueueQuery({
  limit = 20,
  offset = 0,
  queue,
}: ListModQueueInput, enabled = true) {
  return useQuery({
    queryKey: moderationQueryKeys.adminModQueue(queue, limit, offset),
    queryFn: () => listAdminModQueue({ limit, offset, queue }),
    enabled,
  });
}

export function useCommunityModQueueQuery({
  limit = 20,
  offset = 0,
  queue,
  slug,
}: ListModQueueInput & { slug: string }, enabled = true) {
  return useQuery({
    queryKey: moderationQueryKeys.communityModQueue(slug, queue, limit, offset),
    queryFn: () => listCommunityModQueue({ limit, offset, queue, slug }),
    enabled: enabled && Boolean(slug.trim()),
  });
}

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

export function useRemoveCommunityPostByModerationMutation(
  slug: string,
  postId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReportContentInput) =>
      removeCommunityPostByModeration(slug, postId, input),
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: postQueryKeys.detail(postId),
        }),
        queryClient.invalidateQueries({
          queryKey: postQueryKeys.latestPrefix(),
        }),
        queryClient.invalidateQueries({
          queryKey: postQueryKeys.communityPostsPrefix(slug),
        }),
        queryClient.invalidateQueries({
          queryKey: postQueryKeys.userPostsAll(),
        }),
        queryClient.invalidateQueries({
          queryKey: postQueryKeys.savedPostsAll(),
        }),
        queryClient.invalidateQueries({
          queryKey: ["community", slug, "manage", "posts"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["community", slug, "manage", "reports"],
        }),
        queryClient.invalidateQueries({
          queryKey: moderationQueryKeys.all,
        }),
      ]);
    },
  });
}

export function useRemoveCommunityCommentByModerationMutation({
  commentId,
  postId,
  slug,
}: {
  commentId: string;
  postId?: string;
  slug: string;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReportContentInput) =>
      removeCommunityCommentByModeration(slug, commentId, input),
    onSuccess: () => {
      void Promise.all([
        postId
          ? queryClient.invalidateQueries({
              queryKey: commentQueryKeys.postCommentsPrefix(postId),
            })
          : Promise.resolve(),
        postId
          ? queryClient.invalidateQueries({
              queryKey: postQueryKeys.detail(postId),
            })
          : Promise.resolve(),
        queryClient.invalidateQueries({
          queryKey: commentQueryKeys.userCommentsAll(),
        }),
        queryClient.invalidateQueries({
          queryKey: ["community", slug, "manage", "comments"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["community", slug, "manage", "reports"],
        }),
        queryClient.invalidateQueries({
          queryKey: moderationQueryKeys.all,
        }),
      ]);
    },
  });
}

export function useApplyAdminModQueueActionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ModerationBulkActionInput) =>
      applyAdminModQueueAction(input),
    onSuccess: () => {
      void invalidateModerationActionCaches(queryClient);
    },
  });
}

export function useApplyCommunityModQueueActionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      input,
      slug,
    }: {
      input: ModerationBulkActionInput;
      slug: string;
    }) => applyCommunityModQueueAction(slug, input),
    onSuccess: (_result, { slug }) => {
      void invalidateModerationActionCaches(queryClient, slug);
    },
  });
}

export function useIgnoreCommunityReportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reportId, slug }: { reportId: string; slug: string }) =>
      ignoreCommunityReport(slug, reportId),
    onSuccess: (_result, { slug }) => {
      void invalidateModerationActionCaches(queryClient, slug);
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

function invalidateModerationActionCaches(queryClient: ReturnType<typeof useQueryClient>, slug?: string) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: postQueryKeys.latestPrefix(),
    }),
    queryClient.invalidateQueries({
      queryKey: postQueryKeys.communityPostsAll(),
    }),
    queryClient.invalidateQueries({
      queryKey: postQueryKeys.userPostsAll(),
    }),
    queryClient.invalidateQueries({
      queryKey: postQueryKeys.savedPostsAll(),
    }),
    queryClient.invalidateQueries({
      queryKey: commentQueryKeys.userCommentsAll(),
    }),
    queryClient.invalidateQueries({
      queryKey: moderationQueryKeys.all,
    }),
    slug
      ? queryClient.invalidateQueries({
          queryKey: moderationQueryKeys.communityModQueues(slug),
        })
      : Promise.resolve(),
    slug
      ? queryClient.invalidateQueries({
          queryKey: ["community", slug, "manage"],
        })
      : Promise.resolve(),
  ]);
}
