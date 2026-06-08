import { AppShell } from "@/components/app-shell/app-shell";
import { HomeShell } from "@/components/app-shell/home-shell";
import { listLatestPosts } from "@/features/post/api";
import type {
  FeedSource,
  ListPostsResponse,
  PostSort,
} from "@/features/post/types";

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
    <AppShell contextLabel={contextLabel}>
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
  try {
    return await listLatestPosts(20, 0, sort, {
      cache: "no-store",
      source,
      token: null,
    });
  } catch {
    return undefined;
  }
}
