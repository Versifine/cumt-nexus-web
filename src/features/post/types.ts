import type { MediaAttachment } from "@/features/media/types";

export type PostSort = "new" | "hot";

export type Post = {
  id: string;
  community_id: string;
  community_name?: string;
  community_slug?: string;
  author_id: string;
  title: string;
  body: string;
  body_format?: "markdown" | string;
  status: "visible" | string;
  upvote_count: number;
  downvote_count: number;
  score: number;
  my_vote: -1 | 0 | 1 | number;
  created_at: string;
  updated_at: string;
  attachments?: MediaAttachment[];
};

export type ListPostsResponse = {
  posts: Post[];
  limit: number;
  offset: number;
};

export type GetPostResponse = {
  post: Post;
};

export type PublishPostInput = {
  title: string;
  body: string;
  attachment_ids?: string[];
};

export type PublishPostResponse = {
  post: Post;
};

export type UpdatePostInput = {
  title: string;
  body: string;
};

export type UpdatePostResponse = {
  post: Post;
};
