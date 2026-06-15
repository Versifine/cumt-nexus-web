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
  platform_owner_override?: boolean;
};

export type ListCommunitiesResponse = {
  communities: Community[];
};

export type ListFollowedCommunitiesInput = {
  limit?: number;
  offset?: number;
};

export type ListFollowedCommunitiesResponse = {
  communities: Community[];
  limit: number;
  offset: number;
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
  next_offset: number;
  has_more: boolean;
};

export type CommunityMember = {
  user: CommunityMemberUser;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type AppointCommunityModeratorInput = {
  slug: string;
  username: string;
};

export type AppointCommunityModeratorResponse = {
  community: Community;
  member: CommunityMember;
};

export type RemoveCommunityModeratorInput = {
  slug: string;
  user_id: string;
};

export type RemoveCommunityModeratorResponse = {
  community: Community;
  member?: CommunityMember;
};

export type CommunityOwnerTransfer = {
  id: string;
  community_id: string;
  from_user_id: string;
  from_username?: string;
  from_display_name?: string;
  to_user_id: string;
  to_username?: string;
  to_display_name?: string;
  status: "pending" | "accepted" | "cancelled" | "expired" | string;
  created_at: string;
  updated_at: string;
  expires_at?: string | null;
  accepted_at?: string | null;
  cancelled_at?: string | null;
};

export type CreateCommunityOwnerTransferInput = {
  slug: string;
  username: string;
};

export type CreateCommunityOwnerTransferResponse = {
  community: Community;
  transfer: CommunityOwnerTransfer;
};

export type GetCommunityOwnerTransferInput = {
  slug: string;
};

export type GetCommunityOwnerTransferResponse = {
  community: Community;
  transfer: CommunityOwnerTransfer | null;
};

export type GetCommunityOwnerTransferByIdInput = {
  slug: string;
  transfer_id: string;
};

export type GetCommunityOwnerTransferByIdResponse = {
  community: Community;
  transfer: CommunityOwnerTransfer;
};

export type AcceptCommunityOwnerTransferInput = {
  slug: string;
  transfer_id: string;
};

export type AcceptCommunityOwnerTransferResponse = {
  community: Community;
  transfer: CommunityOwnerTransfer;
};

export type CancelCommunityOwnerTransferInput = {
  slug: string;
  transfer_id: string;
};

export type CancelCommunityOwnerTransferResponse = {
  community: Community;
  transfer: CommunityOwnerTransfer;
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
  avatar_url?: string;
  banner_url?: string;
  description?: string;
  name?: string;
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

export type CommunityModerationTemplateKind =
  | "removal-reasons"
  | "saved-responses";

export type CommunityModerationTemplate = {
  id: string;
  community_id: string;
  title: string;
  body: string;
  rule_id?: string;
  is_active: boolean;
  position: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

export type ListCommunityModerationTemplatesInput = {
  kind: CommunityModerationTemplateKind;
  slug: string;
};

export type ListCommunityModerationTemplatesResponse = {
  items: CommunityModerationTemplate[];
};

export type WriteCommunityModerationTemplateInput = {
  body: string;
  kind: CommunityModerationTemplateKind;
  position: number;
  rule_id?: string;
  slug: string;
  title: string;
};

export type CreateCommunityModerationTemplateInput =
  WriteCommunityModerationTemplateInput;

export type UpdateCommunityModerationTemplateInput =
  WriteCommunityModerationTemplateInput & {
    template_id: string;
  };

export type CommunityModerationTemplateResponse = {
  item: CommunityModerationTemplate;
};

export type DeleteCommunityModerationTemplateInput = {
  kind: CommunityModerationTemplateKind;
  slug: string;
  template_id: string;
};

export type CommunityUserStateKind = "approved" | "banned" | "muted";

export type CommunityUserState = {
  id: string;
  community_id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  kind: CommunityUserStateKind | string;
  reason: string;
  expires_at?: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

export type ListCommunityUserStatesInput = {
  kind: CommunityUserStateKind;
  limit?: number;
  offset?: number;
  slug: string;
};

export type ListCommunityUserStatesResponse = {
  users: CommunityUserState[];
  kind: CommunityUserStateKind | string;
  limit: number;
  offset: number;
  next_offset: number;
  has_more: boolean;
};

export type UpsertCommunityUserStateInput = {
  expires_at?: string | null;
  kind: CommunityUserStateKind;
  reason?: string;
  slug: string;
  user_id: string;
};

export type UpsertCommunityUserStateResponse = {
  user: CommunityUserState;
};

export type DeleteCommunityUserStateInput = {
  kind: CommunityUserStateKind;
  slug: string;
  user_id: string;
};

export type CommunityModLog = {
  id: string;
  community_id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  batch_id?: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ListCommunityModLogsInput = {
  action?: string;
  actor_id?: string;
  limit?: number;
  offset?: number;
  slug: string;
  target_id?: string;
  target_type?: string;
};

export type ListCommunityModLogsResponse = {
  logs: CommunityModLog[];
  limit: number;
  offset: number;
  next_offset: number;
  has_more: boolean;
};

export type ModeratorNote = {
  id: string;
  community_id: string;
  user_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

export type ModerationUserProfile = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  headline: string;
  status: string;
  post_count: number;
  comment_count: number;
  report_count: number;
  removed_count: number;
  is_banned: boolean;
  is_muted: boolean;
  is_approved: boolean;
  recent_notes: ModeratorNote[];
};

export type GetCommunityModerationUserProfileInput = {
  slug: string;
  user_id: string;
};

export type GetCommunityModerationUserProfileResponse = ModerationUserProfile;

export type ListCommunityModeratorNotesInput =
  GetCommunityModerationUserProfileInput & {
    limit?: number;
    offset?: number;
  };

export type ListCommunityModeratorNotesResponse = {
  notes: ModeratorNote[];
  limit: number;
  offset: number;
  next_offset: number;
  has_more: boolean;
};

export type CreateCommunityModeratorNoteInput =
  GetCommunityModerationUserProfileInput & {
    body: string;
  };

export type CreateCommunityModeratorNoteResponse = {
  note: ModeratorNote;
};

export type DeleteCommunityModeratorNoteInput =
  GetCommunityModerationUserProfileInput & {
    note_id: string;
  };

export type ListCommunityManagePostsInput = CommunityManageListInput;

export type ListCommunityManagePostsResponse = {
  community: Community;
  posts: CommunityManagePost[];
  status: string;
  limit: number;
  offset: number;
  next_offset: number;
  has_more: boolean;
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
  next_offset: number;
  has_more: boolean;
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
  next_offset: number;
  has_more: boolean;
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
