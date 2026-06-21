import type { PointAccount } from "@/features/auth/types";

export type Effect = {
  id: string;
  name: string;
  description: string;
  cost_points: number;
  asset_url: string;
  animation_key: string;
  emoji?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ListEffectsCatalogResponse = {
  effects: Effect[];
};

export type ApplyContentEffectInput = {
  effect_id: string;
};

export type ApplyCommentEffectInput = ApplyContentEffectInput;
export type ApplyPostEffectInput = ApplyContentEffectInput;

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

export type AppliedPostEffect = {
  id: string;
  post_id: string;
  effect_id: string;
  user_id: string;
  points_spent: number;
  created_at: string;
};

export type ApplyPostEffectResponse = {
  post_effect: AppliedPostEffect;
  points: PointAccount;
};
