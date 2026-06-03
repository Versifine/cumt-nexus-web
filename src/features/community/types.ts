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
