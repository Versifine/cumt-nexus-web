import {
  createFeedMetadata,
  FeedRoutePage,
  type FeedSortRouteProps,
  resolveFeedSort,
} from "../../feed-route";

export async function generateMetadata({ params }: FeedSortRouteProps) {
  const sort = await resolveFeedSort(params);

  return createFeedMetadata("all", sort);
}

export default async function AllSortedFeed({ params }: FeedSortRouteProps) {
  const sort = await resolveFeedSort(params);

  return <FeedRoutePage source="all" sort={sort} />;
}
