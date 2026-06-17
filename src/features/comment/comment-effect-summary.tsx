import { StatusToken } from "@/components/ui/data-display";

import type { CommentEffectSummary as CommentEffectSummaryType } from "./types";

type CommentEffectSummaryProps = {
  effects?: CommentEffectSummaryType[];
};

export function CommentEffectSummary({ effects = [] }: CommentEffectSummaryProps) {
  const groupedEffects = groupCommentEffects(effects);

  if (groupedEffects.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {groupedEffects.map((effect) => (
        <StatusToken
          key={effect.effectId}
          className="px-1.5 py-0 text-[11px]"
          tone="primary"
        >
          {effect.name}
          {effect.count > 1 ? ` ×${effect.count}` : ""}
        </StatusToken>
      ))}
    </div>
  );
}

function groupCommentEffects(effects: CommentEffectSummaryType[]) {
  const effectById = new Map<
    string,
    {
      count: number;
      effectId: string;
      name: string;
    }
  >();

  for (const effect of effects) {
    const current = effectById.get(effect.effect_id);

    effectById.set(effect.effect_id, {
      count: (current?.count ?? 0) + 1,
      effectId: effect.effect_id,
      name: effect.name || "特殊互动",
    });
  }

  return [...effectById.values()];
}
