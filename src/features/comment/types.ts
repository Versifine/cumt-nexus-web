import type { MediaAttachment } from "@/features/media/types";

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
  attachments?: MediaAttachment[];
};

export type ListCommentsResponse = {
  comments: Comment[];
  view?: "flat" | "tree" | string;
  sort?: "new" | string;
  limit: number;
  offset: number;
  max_depth?: number;
};

export type PublishCommentInput = {
  body: string;
  parent_id?: string | null;
  attachment_ids?: string[];
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
