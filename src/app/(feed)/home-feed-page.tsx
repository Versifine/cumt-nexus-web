import { HomeShell } from "@/components/app-shell/home-shell";
import { listLatestPosts } from "@/features/post/api";
import type {
  FeedSource,
  ListPostsResponse,
  PostSort,
} from "@/features/post/types";

type HomeFeedPageProps = {
  source?: FeedSource;
  sort: PostSort;
};

const FEED_PREFETCH_TIMEOUT_MS = 1_200;
const PAGE_SIZE = 20;

export async function HomeFeedPage({
  source = "recommended",
  sort,
}: HomeFeedPageProps) {
  const initialPostsData = await getInitialLatestPosts(sort, source);

  return (
    <HomeShell
      initialPostsData={initialPostsData}
      initialSort={sort}
      source={source}
    />
  );
}

async function getInitialLatestPosts(
  sort: PostSort,
  source: FeedSource,
): Promise<ListPostsResponse> {
  try {
    return await listLatestPosts(PAGE_SIZE, 0, sort, {
      cache: "no-store",
      source,
      timeoutMs: FEED_PREFETCH_TIMEOUT_MS,
      token: source === "following" ? undefined : null,
    });
  } catch {
    return {
      effective_sort: sort,
      is_sort_fallback: false,
      limit: PAGE_SIZE,
      offset: 0,
      posts: [],
      requested_sort: sort,
      source,
    };
  }
}
