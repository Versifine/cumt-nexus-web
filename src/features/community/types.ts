export type Community = {
  id: string;
  slug: string;
  name: string;
  description: string;
  avatar_url?: string;
  banner_url?: string;
  kind: "system" | "user_created" | string;
  status: "active" | "suspended" | "archived" | string;
  visibility: "public" | "restricted" | string;
  member_count?: number;
  post_count?: number;
  viewer_is_following?: boolean;
  viewer_role?: string;
  viewer_permissions?: CommunityViewerPermissions;
  created_at: string;
  updated_at: string;
};

export type CommunityViewerPermissions = {
  can_post?: boolean;
  can_manage?: boolean;
  can_moderate?: boolean;
};

export type ListCommunitiesResponse = {
  communities: Community[];
};

export type GetCommunityResponse = {
  community: Community;
};

export type GetCommunityManageContextResponse = {
  community: Community;
};

export type CommunityManageListInput = {
  limit?: number;
  offset?: number;
  slug: string;
  status?: string;
};

export type ListCommunityMembersInput = {
  limit?: number;
  offset?: number;
  slug: string;
};

export type ListCommunityMembersResponse = {
  community: Community;
  members: CommunityMember[];
  limit: number;
  offset: number;
};

export type CommunityMember = {
  user: CommunityMemberUser;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type CommunityMemberUser = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  headline: string;
  badges: string[];
};

export type CommunityManageSettings = {
  name: string;
  description: string;
  avatar_url: string;
  banner_url: string;
  updated_at: string;
};

export type GetCommunityManageSettingsResponse = {
  community: Community;
  settings: CommunityManageSettings;
};

export type UpdateCommunityManageSettingsInput = {
  description: string;
  name: string;
  slug: string;
};

export type UpdateCommunityManageSettingsResponse = {
  community: Community;
  settings: CommunityManageSettings;
};

export type CommunityRule = {
  id: string;
  community_id: string;
  title: string;
  body: string;
  position: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

export type ListCommunityRulesResponse = {
  community: Community;
  rules: CommunityRule[];
};

export type WriteCommunityRuleInput = {
  body: string;
  position: number;
  title: string;
};

export type CreateCommunityRuleInput = WriteCommunityRuleInput & {
  slug: string;
};

export type CreateCommunityRuleResponse = {
  community: Community;
  rule: CommunityRule;
};

export type UpdateCommunityRuleInput = WriteCommunityRuleInput & {
  rule_id: string;
  slug: string;
};

export type UpdateCommunityRuleResponse = {
  community: Community;
  rule: CommunityRule;
};

export type DeleteCommunityRuleInput = {
  rule_id: string;
  slug: string;
};

export type ListCommunityManagePostsInput = CommunityManageListInput;

export type ListCommunityManagePostsResponse = {
  community: Community;
  posts: CommunityManagePost[];
  status: string;
  limit: number;
  offset: number;
};

export type CommunityManagePost = {
  id: string;
  community_id: string;
  author_id: string;
  title: string;
  body_excerpt: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ListCommunityManageCommentsInput = CommunityManageListInput;

export type ListCommunityManageCommentsResponse = {
  comments: CommunityManageComment[];
  community: Community;
  status: string;
  limit: number;
  offset: number;
};

export type CommunityManageComment = {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string;
  body_excerpt: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ListCommunityManageReportsInput = CommunityManageListInput;

export type ListCommunityManageReportsResponse = {
  community: Community;
  reports: CommunityManageReport[];
  status: string;
  limit: number;
  offset: number;
};

export type CommunityManageReport = {
  id: string;
  target_type: string;
  post_id: string;
  comment_id: string;
  reporter_id: string;
  reason: string;
  status: string;
  reviewed_by: string;
  reviewed_at?: string | null;
  target_preview?: CommunityManageReportTargetPreview | null;
  created_at: string;
  updated_at: string;
};

export type CommunityManageReportTargetPreview = {
  target_type: string;
  post_id: string;
  comment_id: string;
  author_id: string;
  status: string;
  title: string;
  body_excerpt: string;
  created_at: string;
  updated_at: string;
};

export type CommunityApplication = {
  id: string;
  applicant_id: string;
  requested_slug: string;
  requested_name: string;
  reason: string;
  status: "pending" | "approved" | "rejected" | "canceled" | string;
  reviewed_by?: string;
  reviewed_at?: string | null;
  reject_reason?: string;
  created_at: string;
  updated_at: string;
};

export type CommunityApplicationStatus =
  | "pending"
  | "approved"
  | "rejected";

export type ListCommunityApplicationsInput = {
  limit?: number;
  offset?: number;
  status: CommunityApplicationStatus;
};

export type ListCommunityApplicationsResponse = {
  applications: CommunityApplication[];
  limit: number;
  offset: number;
};

export type GetCommunityApplicationResponse = {
  application: CommunityApplication;
};

export type SubmitCommunityApplicationInput = {
  requested_slug: string;
  requested_name: string;
  reason: string;
};

export type SubmitCommunityApplicationResponse = {
  application: CommunityApplication;
};

export type ApproveCommunityApplicationResponse = {
  application: CommunityApplication;
  community: Community;
};

export type RejectCommunityApplicationInput = {
  reject_reason: string;
};

export type RejectCommunityApplicationResponse = {
  application: CommunityApplication;
};
