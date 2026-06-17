"use client";

import type { ListPostsResponse } from "@/features/post/types";

import { PublicUserPosts } from "./public-user-posts";
import type { GetPublicUserResponse } from "./types";

type PublicUserProfileProps = {
  initialData?: GetPublicUserResponse;
  initialPostsData?: ListPostsResponse;
  username: string;
};

export function PublicUserProfile({
  initialData,
  initialPostsData,
  username,
}: PublicUserProfileProps) {
  const profileHref = `/users/${encodeURIComponent(username)}`;

  return (
    <PublicUserPosts
      initialPostsData={initialPostsData}
      initialProfileData={initialData}
      sourceHref={profileHref}
      sourceLabel={`返回 @${username} 的主页`}
      username={username}
    />
  );
}
