export type Community = {
  id: string;
  slug: string;
  name: string;
  description: string;
  kind: "system" | "user_created" | string;
  status: "active" | "suspended" | "archived" | string;
  visibility: "public" | "restricted" | string;
  created_at: string;
  updated_at: string;
};

export type ListCommunitiesResponse = {
  communities: Community[];
};
