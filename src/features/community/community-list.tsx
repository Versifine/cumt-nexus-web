"use client";

import Link from "next/link";
import { ArrowRight, Hash } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { PageNav } from "@/components/app-shell/page-nav";
import { Button } from "@/components/ui/button";
import { MetaCell, MetricBlock, StatusToken } from "@/components/ui/data-display";
import { TextAction } from "@/components/ui/text-action";
import { ApiError } from "@/lib/api/client";

import { useCommunitiesQuery } from "./queries";
import type { Community } from "./types";

export function CommunityList() {
  const communitiesQuery = useCommunitiesQuery();
  const communities = communitiesQuery.data?.communities ?? [];
  const activeCount = communities.filter((community) => community.status === "active").length;
  const publicCount = communities.filter((community) => community.visibility === "public").length;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1180px] px-4 py-6 md:px-6">
        <PageNav />

        <header className="border-b border-border pb-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="font-mono text-xs uppercase text-primary">
                CUMT NEXUS / 社区目录
              </div>
              <h1 className="mt-4 text-5xl font-black leading-[0.95] tracking-normal text-foreground md:text-6xl">
                <span className="block">校园社区</span>
                <span className="block">索引</span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
                按社区进入讨论场域。公开社区直接浏览，受限社区保留边界感，申请入口保持清晰但不抢占内容焦点。
              </p>
            </div>

            <div className="grid grid-cols-3 border border-border text-center sm:min-w-96">
              <MetricBlock label="全部" value={formatMetric(communities.length, communitiesQuery.isLoading)} />
              <MetricBlock label="启用" value={formatMetric(activeCount, communitiesQuery.isLoading)} />
              <MetricBlock label="公开" value={formatMetric(publicCount, communitiesQuery.isLoading)} />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-y border-border py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              列表优先呈现名称、slug、可见性和状态；进入社区后再承载帖子流和发布动作。
            </p>
            <TextAction href="/community-applications/new" tone="primary">
              申请社区
            </TextAction>
          </div>
        </header>

        <section className="py-5">
          {communitiesQuery.isLoading ? (
            <div className="border-b border-border pb-5">
              <LoadingState rows={5} />
            </div>
          ) : null}

          {communitiesQuery.isError ? (
            <ErrorState
              title={getErrorTitle(communitiesQuery.error)}
              description={getErrorDescription(communitiesQuery.error)}
              action={
                isUnauthenticated(communitiesQuery.error) ? (
                  <TextAction href="/login" tone="primary">
                    登录
                  </TextAction>
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

          {communitiesQuery.isSuccess && communities.length === 0 ? (
            <EmptyState
              title="还没有社区"
              description="公开社区创建并启用后，会出现在这里。"
              action={
                <TextAction href="/community-applications/new" tone="primary">
                  申请第一个社区
                </TextAction>
              }
            />
          ) : null}

          {communitiesQuery.isSuccess && communities.length > 0 ? (
            <div className="divide-y divide-border border-b border-border">
              {communities.map((community, index) => (
                <CommunityRow
                  key={community.id}
                  community={community}
                  index={index}
                />
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function CommunityRow({
  community,
  index,
}: {
  community: Community;
  index: number;
}) {
  return (
    <Link
      href={`/communities/${community.slug}`}
      className="group grid gap-4 py-5 transition-colors hover:bg-background-soft/70 md:grid-cols-[72px_minmax(0,1fr)_220px]"
    >
      <div className="flex items-center gap-3 md:block">
        <div className="font-mono text-xs text-muted-foreground">
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="mt-0 flex size-8 items-center justify-center border border-border text-primary md:mt-4">
          <Hash className="size-4" aria-hidden="true" />
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusToken tone="primary">/{community.slug}</StatusToken>
          <StatusToken>{formatCommunityKind(community.kind)}</StatusToken>
          <StatusToken>{formatCommunityVisibility(community.visibility)}</StatusToken>
          <StatusToken tone={getStatusTone(community.status)}>
            {formatCommunityStatus(community.status)}
          </StatusToken>
        </div>

        <h2 className="mt-3 text-2xl font-black leading-8 tracking-normal text-foreground transition-colors group-hover:text-primary">
          {community.name}
        </h2>
        <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          {community.description || "暂无描述。"}
        </p>
      </div>

      <div className="border border-border bg-background text-sm md:self-stretch">
        <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
          <MetaCell label="创建" value={formatDate(community.created_at)} />
          <MetaCell label="更新" value={formatDate(community.updated_at)} />
        </div>
        <div className="flex min-h-12 items-center justify-between px-3 font-semibold text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <span>打开社区</span>
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </div>
      </div>
    </Link>
  );
}

function formatMetric(value: number, isLoading: boolean) {
  return isLoading ? "--" : String(value);
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
    case "user_created":
      return "用户社区";
    default:
      return kind;
  }
}

function formatCommunityVisibility(visibility: string) {
  switch (visibility) {
    case "public":
      return "公开";
    case "restricted":
      return "受限";
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
    case "suspended":
      return "已暂停";
    case "pending":
      return "待审核";
    default:
      return status;
  }
}

function getStatusTone(
  status: string,
): "default" | "primary" | "success" | "warning" | "danger" {
  switch (status) {
    case "active":
      return "success";
    case "archived":
      return "warning";
    case "suspended":
      return "danger";
    default:
      return "default";
  }
}
