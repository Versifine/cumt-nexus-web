"use client";

import { useMemo, useState } from "react";

import { AuthRequired } from "@/features/auth/auth-required";
import { useAuthSession } from "@/features/auth/auth-session";
import {
  useCommunityQuery,
  useFollowedCommunitiesQuery,
} from "@/features/community/queries";
import type { Community } from "@/features/community/types";
import { TextAction } from "@/components/ui/text-action";

import { PostForm } from "./post-form";

type PostCreatePageProps = {
  defaultCommunitySlug?: string;
};

export function PostCreatePage({ defaultCommunitySlug = "" }: PostCreatePageProps) {
  const { isReady, token } = useAuthSession();
  const [communitySlug, setCommunitySlug] = useState(
    normalizeCommunitySlug(defaultCommunitySlug),
  );
  const canLoadViewerData = isReady && Boolean(token);
  const selectedCommunityQuery = useCommunityQuery(
    communitySlug,
    canLoadViewerData && Boolean(communitySlug),
  );
  const followedCommunitiesQuery = useFollowedCommunitiesQuery(
    { limit: 5, offset: 0 },
    canLoadViewerData,
  );
  const selectedCommunity = selectedCommunityQuery.data?.community ?? null;
  const suggestedCommunities = useMemo(
    () =>
      mergeSuggestedCommunities(
        selectedCommunity,
        followedCommunitiesQuery.data?.communities ?? [],
      ),
    [followedCommunitiesQuery.data?.communities, selectedCommunity],
  );

  return (
    <div className="grid grid-cols-1 gap-0 py-2 xl:grid-cols-[minmax(0,1fr)_280px]">
      <section className="min-w-0 bg-background">
        <PostCreateHeader
          isLoading={selectedCommunityQuery.isLoading}
          selectedCommunitySlug={communitySlug}
          selectedCommunity={selectedCommunity}
        />

        <div className="py-5">
          <AuthRequired
            title="登录后发起讨论"
            description="登录后会回到本页继续编辑。"
          >
            <PostForm
              communitySlug={communitySlug}
              isSelectedCommunityLoading={selectedCommunityQuery.isLoading}
              onCommunitySlugChange={setCommunitySlug}
              selectedCommunity={selectedCommunity}
              selectedCommunityError={selectedCommunityQuery.error}
              suggestedCommunities={suggestedCommunities}
            />
          </AuthRequired>
        </div>
      </section>

      <PostCreateRail
        isLoading={selectedCommunityQuery.isLoading}
        selectedCommunitySlug={communitySlug}
        selectedCommunity={selectedCommunity}
      />
    </div>
  );
}

function PostCreateHeader({
  isLoading,
  selectedCommunitySlug,
  selectedCommunity,
}: {
  isLoading: boolean;
  selectedCommunitySlug: string;
  selectedCommunity: Community | null;
}) {
  const targetLabel = getCreateTargetLabel(
    isLoading,
    selectedCommunitySlug,
    selectedCommunity,
  );

  return (
    <div className="flex flex-col gap-2 border-b border-border py-4">
      <div className="min-w-0">
        <h1 className="break-words text-xl font-semibold leading-7 tracking-normal text-foreground">
          发布帖子
        </h1>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {targetLabel}
        </p>
      </div>
    </div>
  );
}

function PostCreateRail({
  isLoading,
  selectedCommunitySlug,
  selectedCommunity,
}: {
  isLoading: boolean;
  selectedCommunitySlug: string;
  selectedCommunity: Community | null;
}) {
  const communityLabel = selectedCommunity
    ? `/${selectedCommunity.slug}`
    : isLoading
      ? "加载中"
      : selectedCommunitySlug
        ? `/${selectedCommunitySlug}`
        : "待选择";
  const permissionLabel = selectedCommunity
    ? canPublishToCommunity(selectedCommunity)
      ? "可发布"
      : "不可发布"
    : isLoading
      ? "确认中"
      : "待确认";

  return (
    <aside className="border-t border-border py-5 xl:border-l xl:border-t-0 xl:pl-5">
      <div className="sticky top-20 space-y-6">
        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">发布位置</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            当前目标是{" "}
            <span className="font-mono text-foreground">{communityLabel}</span>
            ，发布前会确认社区权限。
          </p>
          <p className="mt-2 text-xs font-mono text-muted-foreground">
            权限：{permissionLabel}
          </p>
        </section>

        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">发帖提示</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            标题直接写讨论主题；正文支持 Markdown、图片和基础排版。发布成功后会进入帖子详情页。
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold">其他入口</h2>
          <div className="mt-3 flex flex-col border-t border-border">
            {selectedCommunity ? (
              <TextAction
                href={`/communities/${encodeURIComponent(selectedCommunity.slug)}`}
                variant="bar"
              >
                社区主页
              </TextAction>
            ) : null}
            <TextAction href="/communities" variant="bar">
              浏览社区
            </TextAction>
          </div>
        </section>
      </div>
    </aside>
  );
}

function getCreateTargetLabel(
  isLoading: boolean,
  selectedCommunitySlug: string,
  selectedCommunity: Community | null,
) {
  if (isLoading) {
    return "正在确认社区。";
  }

  if (selectedCommunity) {
    return `发布到 /${selectedCommunity.slug}`;
  }

  if (selectedCommunitySlug) {
    return `正在确认 /${selectedCommunitySlug}`;
  }

  return "先选择社区，再写标题和正文。";
}

function canPublishToCommunity(community: Community) {
  if (community.status !== "active") {
    return false;
  }

  if (community.viewer_permissions) {
    return community.viewer_permissions.can_post !== false;
  }

  return true;
}

function normalizeCommunitySlug(value: string) {
  return value.trim().replace(/^\/+/, "").replace(/^r\//i, "").toLowerCase();
}

function mergeSuggestedCommunities(
  selectedCommunity: Community | null,
  followedCommunities: Community[],
) {
  const seenSlugs = new Set<string>();
  const communities: Community[] = [];

  [selectedCommunity, ...followedCommunities].forEach((community) => {
    if (!community || seenSlugs.has(community.slug)) {
      return;
    }

    seenSlugs.add(community.slug);
    communities.push(community);
  });

  return communities;
}
