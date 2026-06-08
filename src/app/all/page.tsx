import { createFeedMetadata, FeedRoutePage } from "../feed-route";

export const metadata = createFeedMetadata("all", "best");

export default function AllFeed() {
  return <FeedRoutePage source="all" sort="best" />;
}
