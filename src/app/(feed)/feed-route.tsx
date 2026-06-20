import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  formatFeedSourceDescription,
  getFeedContextLabel,
} from "@/features/feed/source";
import { formatPostSortLabel, isPostSort } from "@/features/post/sort";
import type { FeedSource, PostSort } from "@/features/post/types";

import { HomeFeedPage } from "./home-feed-page";

export type FeedSortRouteProps = {
  params: Promise<{
    sort: string;
  }>;
};

export function createFeedMetadata(
  source: FeedSource,
  sort: PostSort,
): Metadata {
  const contextLabel = getFeedContextLabel(source, sort);

  return {
    title: `${contextLabel}信息流 | CUMT Nexus`,
    description: `${formatFeedSourceDescription(source)}当前按${formatPostSortLabel(sort)}排序。`,
  };
}

export async function resolveFeedSort(
  params: FeedSortRouteProps["params"],
): Promise<PostSort> {
  const { sort } = await params;

  if (!isPostSort(sort)) {
    notFound();
  }

  return sort;
}

export function FeedRoutePage({
  source,
  sort,
}: {
  source: FeedSource;
  sort: PostSort;
}) {
  return <HomeFeedPage source={source} sort={sort} />;
}
