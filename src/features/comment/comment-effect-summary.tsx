import { ContentEffectSummary } from "@/features/effect/content-effect-summary";

import type { CommentEffectSummary as CommentEffectSummaryType } from "./types";

type CommentEffectSummaryProps = {
  effects?: CommentEffectSummaryType[];
};

export function CommentEffectSummary({ effects }: CommentEffectSummaryProps) {
  return <ContentEffectSummary effects={effects} />;
}
