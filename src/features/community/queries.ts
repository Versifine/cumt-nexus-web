import { useQuery } from "@tanstack/react-query";

import { listCommunities } from "./api";

export const communityQueryKeys = {
  all: ["communities"] as const,
};

export function useCommunitiesQuery() {
  return useQuery({
    queryKey: communityQueryKeys.all,
    queryFn: listCommunities,
  });
}
