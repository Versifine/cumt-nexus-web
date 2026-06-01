export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  parent_id?: string;
  body: string;
  status: "visible" | string;
  created_at: string;
  updated_at: string;
};

export type ListCommentsResponse = {
  comments: Comment[];
  limit: number;
  offset: number;
};

export type PublishCommentInput = {
  body: string;
  parent_id?: string;
};

export type PublishCommentResponse = {
  comment: Comment;
};
