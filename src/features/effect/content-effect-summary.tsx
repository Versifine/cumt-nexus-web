import type { CSSProperties } from "react";

import { getContentEffectEmoji } from "./content-effect-emoji";

type ContentEffectSummaryItem = {
  effect_id: string;
  emoji?: string | null;
  id?: string | null;
  name?: string | null;
};

type ContentEffectSummaryProps = {
  effects?: ContentEffectSummaryItem[];
};

export function ContentEffectSummary({ effects = [] }: ContentEffectSummaryProps) {
  const groupedEffects = groupContentEffects(effects);

  if (groupedEffects.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {groupedEffects.map((effect, index) => (
        <span
          key={effect.effectId}
          className="nexus-content-effect-token relative inline-flex h-9 max-w-full items-center gap-1.5 overflow-hidden rounded-sm border border-border-strong bg-surface-raised px-2.5 pr-2 text-xs font-semibold text-foreground shadow-[inset_0_1px_0_rgb(255_255_255_/_0.08),0_5px_14px_rgb(0_0_0_/_0.14)]"
          aria-label={getContentEffectLabel(effect)}
          style={{ "--effect-delay": `${index * 65}ms` } as CSSProperties}
          title={getContentEffectLabel(effect)}
        >
          {effect.emoji ? (
            <span
              className="nexus-content-effect-emoji relative z-10 flex size-6 shrink-0 items-center justify-center rounded-[3px] bg-primary/10 text-lg leading-none ring-1 ring-primary/15"
              aria-hidden="true"
            >
              {effect.emoji}
            </span>
          ) : null}
          <span className="relative z-10 max-w-24 truncate">{effect.name}</span>
          <span className="relative z-10 rounded-[3px] bg-primary/15 px-1.5 font-mono text-[11px] font-bold leading-5 text-primary">
            ×{effect.count}
          </span>
        </span>
      ))}
    </div>
  );
}

function groupContentEffects(effects: ContentEffectSummaryItem[]) {
  const effectById = new Map<
    string,
    {
      count: number;
      effectId: string;
      emoji: string;
      name: string;
    }
  >();

  for (const effect of effects) {
    const effectKey = getContentEffectGroupKey(effect);
    const current = effectById.get(effectKey);

    effectById.set(effectKey, {
      count: (current?.count ?? 0) + 1,
      effectId: effectKey,
      emoji: getContentEffectEmoji(effect) || current?.emoji || "",
      name: effect.name?.trim() || current?.name || "互动",
    });
  }

  return [...effectById.values()];
}

function getContentEffectGroupKey(effect: ContentEffectSummaryItem) {
  const effectId = effect.effect_id?.trim().toLowerCase();

  if (effectId) {
    return effectId;
  }

  return (
    effect.name?.trim().toLowerCase() ||
    getContentEffectEmoji(effect) ||
    "unknown"
  );
}

function getContentEffectLabel(effect: { count: number; name: string }) {
  return `${effect.name} ×${effect.count}`;
}
