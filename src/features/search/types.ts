export type SearchScope = "all" | "communities" | "posts";

export type SearchCommunityResult = {
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

export type SearchPostResult = {
  id: string;
  community_id: string;
  community_slug: string;
  author_id: string;
  title: string;
  body_excerpt: string;
  status: "visible" | string;
  created_at: string;
  updated_at: string;
};

export type SearchInput = {
  q: string;
  scope?: SearchScope;
  limit?: number;
  offset?: number;
};

export type SearchResponse = {
  query: string;
  scope: SearchScope | string;
  limit: number;
  offset: number;
  communities: SearchCommunityResult[];
  posts: SearchPostResult[];
};
