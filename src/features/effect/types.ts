import type { PointAccount } from "@/features/auth/types";

export type Effect = {
  id: string;
  name: string;
  description: string;
  cost_points: number;
  asset_url: string;
  animation_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ListEffectsCatalogResponse = {
  effects: Effect[];
};

export type ApplyCommentEffectInput = {
  effect_id: string;
};

export type AppliedCommentEffect = {
  id: string;
  comment_id: string;
  effect_id: string;
  user_id: string;
  points_spent: number;
  created_at: string;
};

export type ApplyCommentEffectResponse = {
  comment_effect: AppliedCommentEffect;
  points: PointAccount;
};
