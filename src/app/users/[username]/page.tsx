import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { getPublicUser } from "@/features/profile/api";
import { PublicUserProfile } from "@/features/profile/public-user-profile";
import type { GetPublicUserResponse } from "@/features/profile/types";
import { listUserPosts } from "@/features/post/api";
import type { ListPostsResponse } from "@/features/post/types";
import { SERVER_PREFETCH_API_TIMEOUT_MS } from "@/lib/api/client";

type UserProfilePageProps = {
  params: Promise<{
    username: string;
  }>;
};

export async function generateMetadata({
  params,
}: UserProfilePageProps): Promise<Metadata> {
  const { username } = await params;

  return {
    title: `@${username} | CUMT Nexus`,
    description: `查看 @${username} 的公开用户主页、资料和公开内容统计。`,
  };
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const { username } = await params;
  const initialData = await getInitialPublicUser(username);
  const initialPostsData = initialData
    ? await getInitialUserPosts(username)
    : undefined;

  return (
    <AppShell
      backTarget={{ href: "/", label: "返回信息流" }}
      contextLabel={`@${username} 的用户主页`}
    >
      <PublicUserProfile
        initialData={initialData}
        initialPostsData={initialPostsData}
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
      timeoutMs: SERVER_PREFETCH_API_TIMEOUT_MS,
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
      timeoutMs: SERVER_PREFETCH_API_TIMEOUT_MS,
      token: null,
    });
  } catch {
    return undefined;
  }
}
