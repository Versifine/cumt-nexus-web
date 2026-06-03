import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  approveCommunityApplication,
  getCommunity,
  listCommunities,
  rejectCommunityApplication,
} from "./api";
import type { RejectCommunityApplicationInput } from "./types";

export const communityQueryKeys = {
  all: ["communities"] as const,
  detail: (slug: string) => ["community", slug] as const,
};

export function useCommunitiesQuery() {
  return useQuery({
    queryKey: communityQueryKeys.all,
    queryFn: listCommunities,
  });
}

export function useCommunityQuery(slug: string, enabled = true) {
  return useQuery({
    queryKey: communityQueryKeys.detail(slug),
    queryFn: () => getCommunity(slug),
    enabled,
  });
}

export function useApproveCommunityApplicationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => approveCommunityApplication(id),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.all,
      });
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.detail(result.community.slug),
      });
    },
  });
}

export function useRejectCommunityApplicationMutation() {
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: RejectCommunityApplicationInput;
    }) => rejectCommunityApplication(id, input),
  });
}
