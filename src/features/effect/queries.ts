import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authQueryKeys } from "@/features/auth/query-keys";
import type { GetMyPointsResponse } from "@/features/auth/types";
import { commentQueryKeys } from "@/features/comment/queries";
import { postQueryKeys } from "@/features/post/queries";
import { refreshCurrentUserGrowthLedgers } from "@/features/progression/queries";

import { applyCommentEffect, applyPostEffect, listEffectsCatalog } from "./api";
import type {
  ApplyCommentEffectResponse,
  ApplyPostEffectResponse,
} from "./types";

type ApplyContentEffectResponse =
  | ApplyCommentEffectResponse
  | ApplyPostEffectResponse;

type ApplyContentEffectVariables = {
  effectId: string;
  targetId: string;
};

export const effectQueryKeys = {
  all: ["effects"] as const,
  catalog: () => [...effectQueryKeys.all, "catalog"] as const,
};

export function useEffectsCatalogQuery(enabled = true) {
  return useQuery({
    queryKey: effectQueryKeys.catalog(),
    queryFn: listEffectsCatalog,
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useApplyCommentEffectMutation({
  postId,
  userCommentsUsername,
}: {
  postId: string;
  userCommentsUsername?: string;
}) {
  return useApplyContentEffectMutation({
    postId,
    targetType: "comment",
    userCommentsUsername,
  });
}

export function useApplyPostEffectMutation({ postId }: { postId: string }) {
  return useApplyContentEffectMutation({
    postId,
    targetType: "post",
  });
}

export function useApplyContentEffectMutation({
  postId,
  targetType,
  userCommentsUsername,
}: {
  postId: string;
  targetType: "comment" | "post";
  userCommentsUsername?: string;
}) {
  const queryClient = useQueryClient();

  return useMutation<ApplyContentEffectResponse, Error, ApplyContentEffectVariables>({
    mutationFn: async ({
      targetId,
      effectId,
    }: ApplyContentEffectVariables): Promise<ApplyContentEffectResponse> => {
      if (targetType === "comment") {
        return applyCommentEffect(targetId, { effect_id: effectId });
      }

      return applyPostEffect(targetId, { effect_id: effectId });
    },
    onSuccess: (result) => {
      queryClient.setQueryData<GetMyPointsResponse>(authQueryKeys.points(), {
        points: result.points,
      });
      void refreshCurrentUserGrowthLedgers(queryClient);
      void queryClient.invalidateQueries({
        queryKey: postQueryKeys.detail(postId),
      });

      if (targetType === "comment") {
        void queryClient.invalidateQueries({
          queryKey: commentQueryKeys.postCommentsPrefix(postId),
        });
        if (userCommentsUsername) {
          void queryClient.invalidateQueries({
            queryKey: commentQueryKeys.userCommentsPrefix(userCommentsUsername),
          });
        }
        return;
      }

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
    },
  });
}
