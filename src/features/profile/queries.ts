import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getPublicUser, updateProfile } from "./api";
import type {
  GetPublicUserResponse,
  UpdateProfileInput,
  UpdateProfileResponse,
} from "./types";

export const profileQueryKeys = {
  all: ["profile"] as const,
  detail: (username: string) => [...profileQueryKeys.all, username] as const,
};

export function usePublicUserQuery(
  username: string,
  enabled = true,
  initialData?: GetPublicUserResponse,
) {
  return useQuery({
    queryKey: profileQueryKeys.detail(username),
    queryFn: () => getPublicUser(username),
    enabled: enabled && Boolean(username.trim()),
    initialData,
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateProfile(input),
    onSuccess: (result: UpdateProfileResponse) => {
      queryClient.setQueryData(profileQueryKeys.detail(result.user.username), result);
      void queryClient.invalidateQueries({
        queryKey: profileQueryKeys.all,
      });
    },
  });
}
