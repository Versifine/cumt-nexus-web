export type PublicUserStats = {
  post_count: number;
  comment_count: number;
};

export type PublicUser = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
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
