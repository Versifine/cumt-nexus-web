"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Hash, ImagePlus, ShieldCheck } from "lucide-react";

import {
  ReviewDesk,
  ReviewDeskBoard,
  ReviewDeskInspector,
  ReviewDeskPanel,
} from "@/components/app-shell/review-desk";
import { AuthRequired } from "@/features/auth/auth-required";
import { useAuthSession } from "@/features/auth/auth-session";
import {
  useCommunityQuery,
  useFollowedCommunitiesQuery,
} from "@/features/community/queries";
import type { Community } from "@/features/community/types";
import { cn } from "@/lib/utils";

import { PostForm } from "./post-form";

type PostCreatePageProps = {
  authNextPath?: string;
  defaultCommunitySlug?: string;
};

export function PostCreatePage({
  authNextPath,
  defaultCommunitySlug = "",
}: PostCreatePageProps) {
  const { isReady, token } = useAuthSession();
  const [communitySlug, setCommunitySlug] = useState(
    normalizeCommunitySlug(defaultCommunitySlug),
  );
  const resolvedAuthNextPath = authNextPath ?? (communitySlug
    ? `/posts/new?community=${encodeURIComponent(communitySlug)}`
    : "/posts/new");
  const canLoadViewerData = isReady && Boolean(token);
  const selectedCommunityQuery = useCommunityQuery(
    communitySlug,
    canLoadViewerData && Boolean(communitySlug),
    undefined,
    "public",
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
  const createContext = getCreateContext({
    isLoading: selectedCommunityQuery.isLoading,
    selectedCommunity,
    selectedCommunitySlug: communitySlug,
  });

  return (
    <ReviewDesk className="max-w-[1120px]">
      <ReviewDeskBoard
        className="xl:grid-cols-[minmax(0,1fr)_320px]"
        inspector={
          <PostCreateRail
            context={createContext}
            selectedCommunity={selectedCommunity}
            selectedCommunitySlug={communitySlug}
          />
        }
      >
        <ReviewDeskPanel
          title="内容编辑"
          description="选择社区后填写标题和正文；正文支持 Markdown、图片和基础排版。"
        >
          <AuthRequired
            title="登录后发起讨论"
            description="登录后会回到本页继续编辑。"
            nextPath={resolvedAuthNextPath}
          >
            <PostForm
              communitySlug={communitySlug}
              isSelectedCommunityLoading={selectedCommunityQuery.isLoading}
              isAuthenticated={Boolean(token)}
              onCommunitySlugChange={setCommunitySlug}
              selectedCommunity={selectedCommunity}
              selectedCommunityError={selectedCommunityQuery.error}
              suggestedCommunities={suggestedCommunities}
            />
          </AuthRequired>
        </ReviewDeskPanel>
      </ReviewDeskBoard>
    </ReviewDesk>
  );
}

type PostCreateContext = {
  communityLabel: string;
  permissionLabel: string;
};

function PostCreateRail({
  context,
  selectedCommunity,
  selectedCommunitySlug,
}: {
  context: PostCreateContext;
  selectedCommunity: Community | null;
  selectedCommunitySlug: string;
}) {
  return (
    <div className="space-y-4">
      <ReviewDeskInspector
        title="发布上下文"
        description="发布前会按当前账号和社区状态确认权限。"
      >
        <div className="grid overflow-hidden rounded-md bg-surface-raised">
          <RailStat
            icon={<Hash className="size-4" aria-hidden="true" />}
            label="社区"
            value={context.communityLabel}
          />
          <RailStat
            icon={<ShieldCheck className="size-4" aria-hidden="true" />}
            label="权限"
            value={context.permissionLabel}
          />
          <RailStat
            icon={<ImagePlus className="size-4" aria-hidden="true" />}
            label="图片"
            value="正文内插入"
          />
        </div>
      </ReviewDeskInspector>

      <ReviewDeskInspector
        title="发帖提示"
        description="标题直接写讨论主题；正文里先给结论、背景和你希望别人回应的点。"
      >
        <div className="space-y-3 text-sm leading-6 text-muted-foreground">
          <p>
            发布成功后会进入帖子详情页，并刷新对应社区和信息流缓存。
          </p>
          <p>
            图片必须保留在正文里，未引用的上传图片不会随帖子绑定。
          </p>
        </div>
      </ReviewDeskInspector>

      <ReviewDeskInspector title="其他入口">
        <div className="space-y-1">
          {selectedCommunity ? (
            <RailActionLink
              href={`/communities/${encodeURIComponent(selectedCommunity.slug)}`}
            >
              社区主页
            </RailActionLink>
          ) : selectedCommunitySlug ? (
            <RailActionLink
              href={`/communities/${encodeURIComponent(selectedCommunitySlug)}`}
            >
              返回 /{selectedCommunitySlug}
            </RailActionLink>
          ) : null}
          <RailActionLink href="/communities">浏览社区</RailActionLink>
        </div>
      </ReviewDeskInspector>
    </div>
  );
}

function RailStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-3 py-3">
      <span className="text-primary">{icon}</span>
      <div className="min-w-0">
        <div className="font-mono text-[11px] text-muted-foreground">{label}</div>
        <div className="mt-1 truncate text-sm font-semibold text-foreground">
          {value}
        </div>
      </div>
    </div>
  );
}

function RailActionLink({
  children,
  className,
  href,
}: {
  children: ReactNode;
  className?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-h-10 items-center justify-between gap-3 rounded-md px-1.5 py-2 text-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <span>{children}</span>
      <ArrowRight
        className="size-4 text-muted-foreground transition duration-150 group-hover:translate-x-1 group-hover:text-primary motion-reduce:transform-none"
        aria-hidden="true"
      />
    </Link>
  );
}

function getCreateContext({
  isLoading,
  selectedCommunitySlug,
  selectedCommunity,
}: {
  isLoading: boolean;
  selectedCommunitySlug: string;
  selectedCommunity: Community | null;
}): PostCreateContext {
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

  if (isLoading) {
    return {
      communityLabel,
      permissionLabel,
    };
  }

  if (selectedCommunity) {
    return {
      communityLabel,
      permissionLabel,
    };
  }

  if (selectedCommunitySlug) {
    return {
      communityLabel,
      permissionLabel,
    };
  }

  return {
    communityLabel,
    permissionLabel,
  };
}

function canPublishToCommunity(community: Community) {
  return community.status === "active" && community.visibility === "public";
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
