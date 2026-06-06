import { useQuery } from "@tanstack/react-query";

import { getPublicUser } from "./api";

export const profileQueryKeys = {
  all: ["profiles"] as const,
  detail: (username: string) => ["profile", username] as const,
};

export function usePublicUserQuery(username: string, enabled = true) {
  return useQuery({
    queryKey: profileQueryKeys.detail(username),
    queryFn: () => getPublicUser(username),
    enabled: enabled && Boolean(username.trim()),
  });
}
