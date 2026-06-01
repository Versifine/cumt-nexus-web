"use client";

import Link from "next/link";
import { ArrowRight, Hash, Lock, Plus } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";

import { useCommunitiesQuery } from "./queries";
import type { Community } from "./types";

export function CommunityList() {
  const communitiesQuery = useCommunitiesQuery();

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground md:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-medium text-muted-foreground">社区</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">
              浏览校园社区
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              这里展示 CUMT Nexus 中已启用的公开社区。
            </p>
          </div>
          <Button asChild>
            <Link href="/community-applications/new">
              <Plus className="size-4" aria-hidden="true" />
              申请社区
            </Link>
          </Button>
        </header>

        {communitiesQuery.isLoading ? <LoadingState rows={4} /> : null}

        {communitiesQuery.isError ? (
          <ErrorState
            title={getErrorTitle(communitiesQuery.error)}
            description={getErrorDescription(communitiesQuery.error)}
            action={
              isUnauthenticated(communitiesQuery.error) ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/login">登录</Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => communitiesQuery.refetch()}
                >
                  重试
                </Button>
              )
            }
          />
        ) : null}

        {communitiesQuery.isSuccess &&
        communitiesQuery.data.communities.length === 0 ? (
          <EmptyState
            title="还没有社区"
            description="公开社区创建并启用后，会出现在这里。"
          />
        ) : null}

        {communitiesQuery.isSuccess &&
        communitiesQuery.data.communities.length > 0 ? (
          <div className="grid gap-3">
            {communitiesQuery.data.communities.map((community) => (
              <CommunityCard key={community.id} community={community} />
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}

function CommunityCard({ community }: { community: Community }) {
  return (
    <Card className="transition-colors hover:border-border/80 hover:bg-card/90">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            <Hash className="size-4 text-primary" aria-hidden="true" />
            <span className="truncate">{community.name}</span>
          </CardTitle>
          <CardDescription className="mt-2 flex flex-wrap items-center gap-2">
            <span>/{community.slug}</span>
            <Badge variant={community.kind === "system" ? "default" : "secondary"}>
              {formatCommunityKind(community.kind)}
            </Badge>
            <Badge variant="outline">{formatCommunityVisibility(community.visibility)}</Badge>
          </CardDescription>
        </div>
        {community.status === "active" ? (
          <Badge variant="success">已启用</Badge>
        ) : (
          <Badge variant="warning">{formatCommunityStatus(community.status)}</Badge>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {community.description || "暂无描述。"}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <Lock className="size-4" aria-hidden="true" />
            创建于 {formatDate(community.created_at)}
          </span>
          <Link
            href={`/communities/${community.slug}`}
            className="inline-flex items-center gap-1 text-primary transition-colors hover:text-primary/80"
          >
            打开
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function isUnauthenticated(error: Error | null) {
  return error instanceof ApiError && error.code === "unauthenticated";
}

function getErrorTitle(error: Error | null) {
  if (isUnauthenticated(error)) {
    return "需要登录";
  }

  return "无法加载社区列表";
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}

function formatCommunityKind(kind: string) {
  switch (kind) {
    case "system":
      return "系统社区";
    case "user":
      return "用户社区";
    default:
      return kind;
  }
}

function formatCommunityVisibility(visibility: string) {
  switch (visibility) {
    case "public":
      return "公开";
    case "private":
      return "私密";
    default:
      return visibility;
  }
}

function formatCommunityStatus(status: string) {
  switch (status) {
    case "active":
      return "已启用";
    case "archived":
      return "已归档";
    case "pending":
      return "待审核";
    default:
      return status;
  }
}
