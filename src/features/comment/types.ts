import type { MediaAttachment } from "@/features/media/types";

export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  parent_id?: string | null;
  body: string;
  format?: string;
  body_format?: "markdown" | string;
  author?: CommentAuthorSummary;
  status: "visible" | string;
  depth?: number;
  reply_count?: number;
  has_more_replies?: boolean;
  upvote_count?: number;
  downvote_count?: number;
  score?: number;
  my_vote?: -1 | 0 | 1 | number;
  viewer_permissions?: CommentViewerPermissions;
  children?: Comment[];
  created_at: string;
  updated_at: string;
  attachments?: MediaAttachment[];
};

export type CommentAuthorSummary = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  headline: string;
  badges: string[];
};

export type CommentViewerPermissions = {
  can_comment?: boolean;
  can_vote?: boolean;
  can_report?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
  can_moderate?: boolean;
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
