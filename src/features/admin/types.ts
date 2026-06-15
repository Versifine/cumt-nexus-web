import type {
  AdjustUserPointsResponse,
  PointTransaction,
  Title,
  TitleGrant,
} from "@/features/progression/types";
import type {
  EditablePlatformRole,
  PlatformRole,
} from "@/features/auth/platform-role";
import type { Effect } from "@/features/effect/types";

export type AdminUser = {
  id: string;
  username: string;
  status: string;
  platform_role?: PlatformRole | null;
  is_platform_staff: boolean;
  created_at: string;
  updated_at: string;
};

export type { EditablePlatformRole, PlatformRole };

export type ListAdminUsersResponse = {
  users: AdminUser[];
  status: string;
  q?: string;
  limit: number;
  offset: number;
  next_offset: number;
  has_more: boolean;
};

export type UpdateAdminUserInput = {
  status?: string;
};

export type UpdateAdminUserResponse = {
  user: AdminUser;
};

export type UpdateAdminUserPlatformRoleInput = {
  role: EditablePlatformRole | null;
};

export type UpdateAdminUserPlatformRoleResponse = {
  user: AdminUser;
};

export type AdminOwnerTransfer = {
  id: string;
  status: "pending" | "accepted" | "cancelled" | "expired" | string;
  initiated_by_id: string;
  initiated_by_username: string;
  target_user_id: string;
  target_username: string;
  previous_owner_role: "admin" | "" | string;
  reason: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
  accepted_at?: string | null;
  cancelled_at?: string | null;
};

export type AdminOwnerTransferResponse = {
  transfer: AdminOwnerTransfer | null;
};

export type CreateAdminOwnerTransferInput = {
  current_password: string;
  previous_owner_role?: "admin" | null;
  reason: string;
  target_user_id: string;
};

export type AcceptAdminOwnerTransferInput = {
  current_password: string;
};

export type AdminCommunity = {
  id: string;
  slug: string;
  name: string;
  description: string;
  kind: string;
  status: string;
  visibility: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

export type ListAdminCommunitiesResponse = {
  communities: AdminCommunity[];
  status: string;
  q?: string;
  limit: number;
  offset: number;
  next_offset: number;
  has_more: boolean;
};

export type UpdateAdminCommunityStatusInput = {
  status: string;
};

export type UpdateAdminCommunityStatusResponse = {
  community: AdminCommunity;
};

export type AdminCommunityOwner = {
  user_id: string;
  username: string;
  role: string;
  status: string;
  updated_at: string;
};

export type UpdateAdminCommunityOwnerInput = {
  reason?: string;
  user_id: string;
};

export type UpdateAdminCommunityOwnerResponse = {
  community: AdminCommunity;
  owner: AdminCommunityOwner;
};

export type ListAdminEffectsResponse = {
  effects: Effect[];
  active: string;
  limit: number;
  offset: number;
  next_offset: number;
  has_more: boolean;
};

export type UpdateAdminEffectInput = {
  is_active: boolean;
};

export type UpdateAdminEffectResponse = {
  effect: Effect;
};

export type AdminSetting = {
  key: string;
  enabled: boolean;
  updated_by?: string;
  updated_at: string;
};

export type ListAdminSettingsResponse = {
  settings: AdminSetting[];
};

export type UpdateAdminSettingInput = {
  enabled: boolean;
};

export type UpdateAdminSettingResponse = {
  setting: AdminSetting;
};

export type AdminAuditLog = {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  created_at: string;
};

export type ListAdminAuditLogsResponse = {
  audit_logs: AdminAuditLog[];
  q?: string;
  limit: number;
  offset: number;
  next_offset: number;
  has_more: boolean;
};

export type ListAdminPointTransactionsResponse = {
  transactions: PointTransaction[];
  limit: number;
  offset: number;
  next_offset: number;
  has_more: boolean;
};

export type AdjustAdminUserPointsInput = {
  delta: number;
  reason: string;
};

export type AdminUserSanction = {
  id: string;
  user_id: string;
  type: string;
  status: string;
  reason: string;
  created_by: string;
  starts_at: string;
  expires_at?: string | null;
  revoked_by?: string;
  revoked_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateAdminUserSanctionInput = {
  duration: "1d" | "3d" | "7d" | "30d" | "permanent";
  reason: string;
  type: "account_ban";
};

export type CreateAdminUserSanctionResponse = {
  sanction: AdminUserSanction;
};

export type ListAdminUserSanctionsResponse = {
  sanctions: AdminUserSanction[];
  limit: number;
  offset: number;
  next_offset: number;
  has_more: boolean;
};

export type RevokeAdminUserSanctionResponse = {
  sanction: AdminUserSanction;
};

export type ListAdminTitlesResponse = {
  titles: Title[];
  limit: number;
  offset: number;
  next_offset: number;
  has_more: boolean;
};

export type CreateAdminTitleInput = {
  name: string;
  description: string;
  scope_type: string;
  scope_id: string;
};

export type CreateAdminTitleResponse = {
  title: Title;
};

export type UpdateAdminTitleInput = {
  name?: string;
  description?: string;
  is_active?: boolean;
};

export type UpdateAdminTitleResponse = {
  title: Title;
};

export type ListAdminUserTitleGrantsResponse = {
  titles: TitleGrant[];
  limit: number;
  offset: number;
  next_offset: number;
  has_more: boolean;
};

export type GrantAdminUserTitleInput = {
  title_id: string;
  reason: string;
  expires_at?: string | null;
};

export type GrantAdminUserTitleResponse = {
  grant: TitleGrant;
};

export type RevokeAdminUserTitleResponse = {
  grant: TitleGrant;
};

export type { AdjustUserPointsResponse };
