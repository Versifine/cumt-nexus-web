import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteUserFollow,
  followUser,
  getPublicUser,
  listFollowedUsers,
  updateProfile,
} from "./api";
import type {
  GetPublicUserResponse,
  ListFollowedUsersInput,
  UpdateProfileInput,
  UpdateProfileResponse,
} from "./types";
import { postQueryKeys } from "@/features/post/queries";

export const profileQueryKeys = {
  all: ["profile"] as const,
  detail: (username: string) => [...profileQueryKeys.all, username] as const,
  followedUsers: (input: ListFollowedUsersInput) =>
    ["me", "followed-users", input.limit ?? 20, input.offset ?? 0] as const,
  followedUsersPrefix: () => ["me", "followed-users"] as const,
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

export function useFollowedUsersQuery(
  input: ListFollowedUsersInput = {},
  enabled = true,
) {
  return useQuery({
    queryKey: profileQueryKeys.followedUsers(input),
    queryFn: () => listFollowedUsers(input),
    enabled,
    staleTime: 30_000,
  });
}

export function useToggleUserFollowMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      isFollowing,
      username,
    }: {
      isFollowing: boolean;
      username: string;
    }) => {
      if (isFollowing) {
        await deleteUserFollow(username);
        return;
      }

      await followUser(username);
    },
    onSuccess: async (_result, { username }) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: profileQueryKeys.detail(username),
        }),
        queryClient.invalidateQueries({
          queryKey: profileQueryKeys.followedUsersPrefix(),
        }),
        queryClient.invalidateQueries({
          queryKey: postQueryKeys.latestPrefix(),
        }),
      ]);
    },
  });
}
