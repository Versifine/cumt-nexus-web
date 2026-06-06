import { AppShell } from "@/components/app-shell/app-shell";
import { HomeShell } from "@/components/app-shell/home-shell";
import { listLatestPosts } from "@/features/post/api";
import type { ListPostsResponse, PostSort } from "@/features/post/types";

type HomeFeedPageProps = {
  contextLabel: string;
  sort: PostSort;
};

export async function HomeFeedPage({ contextLabel, sort }: HomeFeedPageProps) {
  const initialPostsData = await getInitialLatestPosts(sort);

  return (
    <AppShell contextLabel={contextLabel}>
      <HomeShell initialPostsData={initialPostsData} initialSort={sort} />
    </AppShell>
  );
}

async function getInitialLatestPosts(
  sort: PostSort,
): Promise<ListPostsResponse | undefined> {
  try {
    return await listLatestPosts(20, 0, sort, {
      cache: "no-store",
      token: null,
    });
  } catch {
    return undefined;
  }
}
