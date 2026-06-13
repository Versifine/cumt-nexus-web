import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { listUserComments } from "@/features/comment/api";
import type { ListCommentsResponse } from "@/features/comment/types";
import { getPublicUser } from "@/features/profile/api";
import { PublicUserComments } from "@/features/profile/public-user-comments";
import type { GetPublicUserResponse } from "@/features/profile/types";
import { SERVER_PREFETCH_API_TIMEOUT_MS } from "@/lib/api/client";

type UserCommentsPageProps = {
  params: Promise<{
    username: string;
  }>;
};

export async function generateMetadata({
  params,
}: UserCommentsPageProps): Promise<Metadata> {
  const { username } = await params;

  return {
    title: `@${username} 的评论 | CUMT Nexus`,
    description: `查看 @${username} 在公开帖子下留下的评论。`,
  };
}

export default async function UserCommentsPage({
  params,
}: UserCommentsPageProps) {
  const { username } = await params;
  const initialProfileData = await getInitialPublicUser(username);
  const initialCommentsData = initialProfileData
    ? await getInitialUserComments(username)
    : undefined;

  return (
    <AppShell
      backTarget={{ href: "/", label: "返回信息流" }}
      contextLabel={`@${username} 的评论`}
    >
      <PublicUserComments
        initialCommentsData={initialCommentsData}
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
      timeoutMs: SERVER_PREFETCH_API_TIMEOUT_MS,
      token: null,
    });
  } catch {
    return undefined;
  }
}

async function getInitialUserComments(
  username: string,
): Promise<ListCommentsResponse | undefined> {
  try {
    return await listUserComments({
      username,
      limit: 20,
      offset: 0,
      cache: "no-store",
      timeoutMs: SERVER_PREFETCH_API_TIMEOUT_MS,
      token: null,
    });
  } catch {
    return undefined;
  }
}
