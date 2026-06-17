import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authQueryKeys } from "@/features/auth/query-keys";
import type { GetMyPointsResponse } from "@/features/auth/types";
import { commentQueryKeys } from "@/features/comment/queries";
import { postQueryKeys } from "@/features/post/queries";

import { applyCommentEffect, listEffectsCatalog } from "./api";

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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      commentId,
      effectId,
    }: {
      commentId: string;
      effectId: string;
    }) => applyCommentEffect(commentId, { effect_id: effectId }),
    onSuccess: (result) => {
      queryClient.setQueryData<GetMyPointsResponse>(authQueryKeys.points(), {
        points: result.points,
      });
      void queryClient.invalidateQueries({
        queryKey: commentQueryKeys.postCommentsPrefix(postId),
      });
      void queryClient.invalidateQueries({
        queryKey: postQueryKeys.detail(postId),
      });
      if (userCommentsUsername) {
        void queryClient.invalidateQueries({
          queryKey: commentQueryKeys.userCommentsPrefix(userCommentsUsername),
        });
      }
    },
  });
}
