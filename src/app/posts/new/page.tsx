import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell/app-shell";
import { PostCreatePage } from "@/features/post/post-create-page";

type NewPostRouteProps = {
  searchParams: Promise<{
    community?: string | string[];
  }>;
};

export const metadata: Metadata = {
  title: "发布帖子 | CUMT Nexus",
  description: "选择社区并发布新的讨论。",
};

export default async function NewPostRoute({
  searchParams,
}: NewPostRouteProps) {
  const params = await searchParams;
  const defaultCommunitySlug = normalizeCommunityParam(params.community);

  return (
    <AppShell
      backTarget={{
        href: "/communities",
        label: "浏览社区",
      }}
      contextLabel="发布帖子"
    >
      <PostCreatePage
        key={defaultCommunitySlug || "no-community"}
        defaultCommunitySlug={defaultCommunitySlug}
      />
    </AppShell>
  );
}

function normalizeCommunityParam(value?: string | string[]) {
  const rawValue = Array.isArray(value) ? value[0] : value;

  return rawValue?.trim() ?? "";
}
