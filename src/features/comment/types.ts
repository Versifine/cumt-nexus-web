import type { MediaAttachment } from "@/features/media/types";
import type { UserLevelSummary } from "@/features/profile/types";

export type CommentSort = "best" | "top" | "new" | "old" | "controversial";

export type Comment = {
  id: string;
  post_id: string;
  post_title?: string | null;
  post?: CommentPostSummary | null;
  community?: CommentCommunitySummary | null;
  permalink?: string | null;
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
  effects?: CommentEffectSummary[];
};

export type CommentPostSummary = {
  id?: string;
  title?: string | null;
  url?: string | null;
  community_slug?: string | null;
  community_name?: string | null;
};

export type CommentCommunitySummary = {
  id?: string;
  slug?: string | null;
  name?: string | null;
};

export type CommentAuthorSummary = {
  id: string;
  username: string;
  display_name: string;
  display_title?: string | null;
  avatar_url: string;
  headline: string;
  badges: string[];
  community_role?: string | null;
  is_platform_staff?: boolean;
  level?: UserLevelSummary | null;
  platform_role?: string | null;
  progression?: UserLevelSummary | null;
};

export type CommentEffectSummary = {
  id: string;
  effect_id: string;
  name: string;
  emoji?: string;
  asset_url: string;
  animation_key: string;
  applied_by_user: CommentAuthorSummary;
  points_spent: number;
  created_at: string;
};

export type CommentViewerPermissions = {
  can_comment?: boolean;
  can_vote?: boolean;
  can_report?: boolean;
  can_delete?: boolean;
  can_moderate?: boolean;
};

export type ListCommentsResponse = {
  comments: Comment[];
  effective_sort?: CommentSort;
  is_sort_fallback?: boolean;
  view?: "flat" | "tree" | string;
  requested_sort?: CommentSort;
  sort?: CommentSort | string;
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
