import type {
  AdjustUserPointsResponse,
  PointTransaction,
  Title,
  TitleGrant,
} from "@/features/progression/types";
import type { Effect } from "@/features/effect/types";

export type AdminUser = {
  id: string;
  username: string;
  status: string;
  is_platform_staff: boolean;
  created_at: string;
  updated_at: string;
};

export type ListAdminUsersResponse = {
  users: AdminUser[];
  status: string;
  limit: number;
  offset: number;
  next_offset: number;
  has_more: boolean;
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
