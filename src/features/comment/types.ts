export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  parent_id?: string | null;
  body: string;
  body_format?: "markdown" | string;
  status: "visible" | string;
  depth?: number;
  reply_count?: number;
  has_more_replies?: boolean;
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
  parent_id?: string | null;
};

export type PublishCommentResponse = {
  comment: Comment;
};

export type UpdateCommentInput = {
  body: string;
};

export type UpdateCommentResponse = {
  comment: Comment;
};
