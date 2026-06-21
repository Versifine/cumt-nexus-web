"use client";

import { useState } from "react";
import { Coins } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMyPointsQuery } from "@/features/auth/queries";
import {
  useApplyContentEffectMutation,
  useEffectsCatalogQuery,
} from "@/features/effect/queries";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import { getContentEffectEmoji } from "./content-effect-emoji";

type ContentEffectMenuProps = {
  className?: string;
  isAuthenticated: boolean;
  postId: string;
  targetId: string;
  targetType: "comment" | "post";
  userCommentsUsername?: string;
};

export function ContentEffectMenu({
  className,
  isAuthenticated,
  postId,
  targetId,
  targetType,
  userCommentsUsername,
}: ContentEffectMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const catalogQuery = useEffectsCatalogQuery(isOpen);
  const pointsQuery = useMyPointsQuery(isOpen);
  const applyEffectMutation = useApplyContentEffectMutation({
    postId,
    targetType,
    userCommentsUsername,
  });
  const activeEffects =
    catalogQuery.data?.effects.filter((effect) => effect.is_active) ?? [];
  const balance = pointsQuery.data?.points.balance;

  if (!isAuthenticated) {
    return null;
  }

  return (
    <DropdownMenu
      open={isOpen}
      onOpenChange={(nextOpen) => {
        setIsOpen(nextOpen);
        if (nextOpen) {
          applyEffectMutation.reset();
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-8 items-center gap-1.5 px-1 font-semibold text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            className,
          )}
          disabled={applyEffectMutation.isPending}
        >
          <span aria-hidden="true">✨</span>
          互动
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <div className="flex items-center justify-between gap-3 px-2 py-1.5">
          <DropdownMenuLabel className="px-0 py-0">积分互动</DropdownMenuLabel>
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            余额 {pointsQuery.isPending ? "同步中" : formatPointAmount(balance)}
          </span>
        </div>
        {catalogQuery.isPending ? (
          <div className="px-2 py-2 text-xs text-muted-foreground">
            正在同步互动目录。
          </div>
        ) : null}
        {pointsQuery.isError ? (
          <div className="px-2 py-2 text-xs text-muted-foreground">
            积分余额暂时无法同步，发送时仍以后端校验为准。
          </div>
        ) : null}
        {catalogQuery.isError ? (
          <div className="px-2 py-2 text-xs text-muted-foreground">
            互动目录暂时无法加载。
          </div>
        ) : null}
        {catalogQuery.isSuccess && activeEffects.length === 0 ? (
          <div className="px-2 py-2 text-xs text-muted-foreground">
            暂时没有可用互动。
          </div>
        ) : null}
        {activeEffects.map((effect) => {
          const isInsufficient =
            typeof balance === "number" && balance < effect.cost_points;

          return (
            <DropdownMenuItem
              key={effect.id}
              disabled={applyEffectMutation.isPending || isInsufficient}
              onSelect={(event) => {
                event.preventDefault();

                if (isInsufficient) {
                  return;
                }

                applyEffectMutation.mutate(
                  {
                    effectId: effect.id,
                    targetId,
                  },
                  {
                    onSuccess: () => setIsOpen(false),
                  },
                );
              }}
            >
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-base"
                aria-hidden="true"
              >
                {getContentEffectEmoji(effect) || "·"}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {effect.name}
              </span>
              <span className="ml-auto inline-flex shrink-0 items-center gap-1 font-mono text-xs text-muted-foreground">
                <Coins className="size-3.5" aria-hidden="true" />
                {effect.cost_points}
              </span>
            </DropdownMenuItem>
          );
        })}
        {applyEffectMutation.isError ? (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2 text-xs leading-5 text-destructive">
              {getApplyEffectErrorMessage(applyEffectMutation.error)}
            </div>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatPointAmount(value?: number) {
  if (typeof value !== "number") {
    return "暂无";
  }

  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 1,
    notation: value >= 10000 ? "compact" : "standard",
  }).format(value);
}

function getApplyEffectErrorMessage(error: Error) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "互动发送失败，请稍后重试。";
}
