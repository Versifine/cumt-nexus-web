import type { MediaAttachment } from "@/features/media/types";
import type { UserLevelSummary } from "@/features/profile/types";

export type PostSort = "best" | "hot" | "new" | "top" | "rising";

export type FeedSource = "recommended" | "all" | "following";
export type ReadableFeedSource = FeedSource;

export type PostViewerPermissions = {
  can_comment?: boolean;
  can_vote?: boolean;
  can_report?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
  can_manage?: boolean;
  can_moderate?: boolean;
  platform_owner_override?: boolean;
};

export type PostAuthorSummary = {
  id: string;
  username: string;
  display_name: string;
  display_title?: string | null;
  avatar_url: string;
  banner_url?: string;
  headline: string;
  badges: string[];
  community_role?: string | null;
  is_platform_staff?: boolean;
  level?: UserLevelSummary | null;
  platform_role?: string | null;
  progression?: UserLevelSummary | null;
};

export type PostCommunitySummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  avatar_url: string;
  banner_url: string;
  member_count: number;
  post_count: number;
  viewer_is_following: boolean;
  viewer_role: string;
  viewer_permissions: PostViewerPermissions;
};

export type PostPreviewImage = {
  url: string;
  width?: number | null;
  height?: number | null;
  mime_type: string;
  alt_text: string;
  size_bytes: number;
};

export type PostPreviewLink = {
  description?: string | null;
  image_url?: string | null;
  site_name?: string | null;
  thumbnail_url?: string | null;
  title?: string | null;
  url?: string | null;
};

export type PostPreview = {
  kind: string;
  image?: PostPreviewImage | null;
  link?: PostPreviewLink | null;
  description?: string | null;
  image_url?: string | null;
  site_name?: string | null;
  thumbnail_url?: string | null;
  title?: string | null;
  url?: string | null;
};

export type Post = {
  id: string;
  community_id: string;
  community_name?: string;
  community_slug?: string;
  community?: PostCommunitySummary;
  author_id: string;
  author?: PostAuthorSummary;
  title: string;
  body: string;
  body_excerpt?: string;
  body_format?: "markdown" | string;
  format?: string;
  flair_text?: string;
  is_locked?: boolean;
  is_nsfw?: boolean;
  is_pinned?: boolean;
  is_spoiler?: boolean;
  status: "visible" | string;
  upvote_count: number;
  downvote_count: number;
  comment_count?: number;
  save_count?: number;
  score: number;
  my_vote: -1 | 0 | 1 | number;
  is_saved?: boolean;
  preview?: PostPreview;
  viewer_permissions?: PostViewerPermissions;
  created_at: string;
  updated_at: string;
  attachments?: MediaAttachment[];
  effects?: PostEffectSummary[];
};

export type PostEffectSummary = {
  id: string;
  effect_id: string;
  name: string;
  emoji?: string;
  asset_url: string;
  animation_key: string;
  applied_by_user: PostAuthorSummary;
  points_spent: number;
  created_at: string;
};

export type ListPostsResponse = {
  effective_sort?: PostSort;
  is_sort_fallback?: boolean;
  posts: Post[];
  requested_sort?: PostSort;
  source?: FeedSource;
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
  attachment_ids?: string[];
};

export type UpdatePostResponse = {
  post: Post;
};
