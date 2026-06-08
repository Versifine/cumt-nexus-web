import { AppShell } from "@/components/app-shell/app-shell";
import { HomeShell } from "@/components/app-shell/home-shell";
import { getFeedContextLabel } from "@/features/feed/source";
import { listLatestPosts } from "@/features/post/api";
import type {
  FeedSource,
  ListPostsResponse,
  PostSort,
} from "@/features/post/types";
import { SERVER_PREFETCH_API_TIMEOUT_MS } from "@/lib/api/client";

type HomeFeedPageProps = {
  contextLabel: string;
  source?: FeedSource;
  sort: PostSort;
};

export async function HomeFeedPage({
  contextLabel,
  source = "recommended",
  sort,
}: HomeFeedPageProps) {
  const initialPostsData = await getInitialLatestPosts(sort, source);

  return (
    <AppShell contextLabel={contextLabel || getFeedContextLabel(source, sort)}>
      <HomeShell
        initialPostsData={initialPostsData}
        initialSort={sort}
        source={source}
      />
    </AppShell>
  );
}

async function getInitialLatestPosts(
  sort: PostSort,
  source: FeedSource,
): Promise<ListPostsResponse | undefined> {
  if (source === "following") {
    return undefined;
  }

  try {
    return await listLatestPosts(20, 0, sort, {
      cache: "no-store",
      source,
      timeoutMs: SERVER_PREFETCH_API_TIMEOUT_MS,
      token: null,
    });
  } catch {
    return undefined;
  }
}
