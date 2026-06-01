export type Post = {
  id: string;
  community_id: string;
  author_id: string;
  title: string;
  body: string;
  status: "visible" | string;
  upvote_count: number;
  downvote_count: number;
  score: number;
  my_vote: -1 | 0 | 1 | number;
  created_at: string;
  updated_at: string;
};

export type ListPostsResponse = {
  posts: Post[];
  limit: number;
  offset: number;
};
