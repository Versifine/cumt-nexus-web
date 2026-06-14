export type PublicUserStats = {
  post_count: number;
  comment_count: number;
  follower_count?: number;
  following_count?: number;
};

export type UserTitleSummary = {
  grant_id: string;
  title_id: string;
  name: string;
  scope_type: string;
  scope_id: string;
};

export type UserLevelSummary = {
  level: number;
  level_name?: string;
  xp_total?: number;
  current_level_xp?: number;
  next_level_xp?: number | null;
  level_progress?: number;
  active_title?: UserTitleSummary | null;
  titles_count?: number;
};

export type PublicUser = {
  id: string;
  username: string;
  display_name: string;
  display_title?: string | null;
  avatar_url: string;
  banner_url: string;
  headline: string;
  bio: string;
  badges: string[];
  level?: UserLevelSummary | null;
  progression?: UserLevelSummary | null;
  roles: string[];
  status: "active" | string;
  stats: PublicUserStats;
  viewer_is_following?: boolean;
  created_at: string;
};

export type GetPublicUserResponse = {
  user: PublicUser;
};

export type ListFollowedUsersInput = {
  limit?: number;
  offset?: number;
};

export type ListFollowedUsersResponse = {
  users: PublicUser[];
  limit: number;
  offset: number;
  next_offset?: number;
  has_more?: boolean;
};

export type UpdateProfileInput = {
  avatar_url?: string;
  banner_url?: string;
  bio?: string;
  display_name?: string;
  headline?: string;
};

export type UpdateProfileResponse = {
  user: PublicUser;
};
