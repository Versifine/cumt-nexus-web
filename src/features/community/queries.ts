import { useQuery } from "@tanstack/react-query";

import { getCommunity, listCommunities } from "./api";

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

export function useCommunityQuery(slug: string) {
  return useQuery({
    queryKey: communityQueryKeys.detail(slug),
    queryFn: () => getCommunity(slug),
  });
}
