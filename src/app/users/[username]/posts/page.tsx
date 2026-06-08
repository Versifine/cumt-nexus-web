import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { getPublicUser } from "@/features/profile/api";
import { PublicUserPosts } from "@/features/profile/public-user-posts";
import type { GetPublicUserResponse } from "@/features/profile/types";
import { listUserPosts } from "@/features/post/api";
import type { ListPostsResponse } from "@/features/post/types";

type UserPostsPageProps = {
  params: Promise<{
    username: string;
  }>;
};

export async function generateMetadata({
  params,
}: UserPostsPageProps): Promise<Metadata> {
  const { username } = await params;

  return {
    title: `@${username} 的帖子 | CUMT Nexus`,
    description: `查看 @${username} 在公开社区发布过的帖子。`,
  };
}

export default async function UserPostsPage({ params }: UserPostsPageProps) {
  const { username } = await params;
  const initialProfileData = await getInitialPublicUser(username);
  const initialPostsData = initialProfileData
    ? await getInitialUserPosts(username)
    : undefined;

  return (
    <AppShell contextLabel={`@${username} 的帖子`}>
      <PublicUserPosts
        initialPostsData={initialPostsData}
        initialProfileData={initialProfileData}
        username={username}
      />
    </AppShell>
  );
}

async function getInitialPublicUser(
  username: string,
): Promise<GetPublicUserResponse | undefined> {
  try {
    return await getPublicUser(username, {
      cache: "no-store",
      token: null,
    });
  } catch {
    return undefined;
  }
}

async function getInitialUserPosts(
  username: string,
): Promise<ListPostsResponse | undefined> {
  try {
    return await listUserPosts({
      username,
      limit: 20,
      offset: 0,
      sort: "new",
      cache: "no-store",
      token: null,
    });
  } catch {
    return undefined;
  }
}
