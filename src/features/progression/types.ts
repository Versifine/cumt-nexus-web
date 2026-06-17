import type { PointAccount } from "@/features/auth/types";
import type { UserLevelSummary, UserTitleSummary } from "@/features/profile/types";

export type ProgressionSummary = UserLevelSummary & {
  user_id: string;
  xp_total: number;
  current_level_xp: number;
  next_level_xp: number | null;
  level_progress: number;
  active_title: UserTitleSummary | null;
  titles_count: number;
  updated_at: string;
};

export type GetMyProgressionResponse = {
  progression: ProgressionSummary;
};

export type XPEvent = {
  id: string;
  user_id: string;
  delta: number;
  xp_total_after: number;
  reason: string;
  source_type: string;
  source_id: string;
  actor_id?: string;
  created_at: string;
};

export type ListMyXPEventsResponse = {
  events: XPEvent[];
  limit: number;
  offset: number;
  next_offset: number;
  has_more: boolean;
};

export type Title = {
  id: string;
  name: string;
  description: string;
  scope_type: string;
  scope_id: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

export type TitleGrant = {
  id: string;
  user_id: string;
  title: Title;
  granted_by?: string;
  reason: string;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type ListMyTitlesResponse = {
  titles: TitleGrant[];
  limit: number;
  offset: number;
  next_offset: number;
  has_more: boolean;
};

export type SetActiveTitleInput = {
  title_grant_id: string | null;
};

export type SetActiveTitleResponse = {
  progression: ProgressionSummary;
};

export type PointTransaction = {
  id: string;
  user_id: string;
  delta: number;
  balance_after: number;
  reason: string;
  source_type: string;
  source_id: string;
  created_at: string;
};

export type ListPointTransactionsResponse = {
  transactions: PointTransaction[];
  limit: number;
  offset: number;
  next_offset: number;
  has_more: boolean;
};

export type AdjustUserPointsResponse = {
  account: PointAccount;
  transaction: PointTransaction;
};
