import {
  createFeedMetadata,
  FeedRoutePage,
  type FeedSortRouteProps,
  resolveFeedSort,
} from "../../feed-route";

export async function generateMetadata({ params }: FeedSortRouteProps) {
  const sort = await resolveFeedSort(params);

  return createFeedMetadata("following", sort);
}

export default async function FollowingSortedFeed({
  params,
}: FeedSortRouteProps) {
  const sort = await resolveFeedSort(params);

  return <FeedRoutePage source="following" sort={sort} />;
}
