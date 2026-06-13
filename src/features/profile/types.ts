export type PublicUserStats = {
  post_count: number;
  comment_count: number;
};

export type PublicUser = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  banner_url: string;
  headline: string;
  bio: string;
  badges: string[];
  roles: string[];
  status: "active" | string;
  stats: PublicUserStats;
  created_at: string;
};

export type GetPublicUserResponse = {
  user: PublicUser;
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
