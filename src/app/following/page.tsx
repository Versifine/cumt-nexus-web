import { createFeedMetadata, FeedRoutePage } from "../feed-route";

export const metadata = createFeedMetadata("following", "best");

export default function FollowingFeed() {
  return <FeedRoutePage source="following" sort="best" />;
}
