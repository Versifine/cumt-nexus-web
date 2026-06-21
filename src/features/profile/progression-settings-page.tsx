"use client";

import { useState } from "react";
import { Check, Coins, Trophy } from "lucide-react";

import {
  RightRail,
  RightRailAction,
  RightRailActionList,
  RightRailInfoList,
  RightRailInfoRow,
  RightRailSection,
} from "@/components/app-shell/right-rail";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { MetricBlock, StatusToken } from "@/components/ui/data-display";
import { TextAction } from "@/components/ui/text-action";
import { AuthRequired } from "@/features/auth/auth-required";
import { useCurrentUserQuery, useMyPointsQuery } from "@/features/auth/queries";
import type { PointAccount } from "@/features/auth/types";
import { getContentEffectEmoji } from "@/features/effect/content-effect-emoji";
import { useEffectsCatalogQuery } from "@/features/effect/queries";
import type { Effect } from "@/features/effect/types";
import {
  useMyPointTransactionsQuery,
  useMyProgressionQuery,
  useMyTitlesQuery,
  useMyXPEventsQuery,
  useSetActiveTitleMutation,
} from "@/features/progression/queries";
import type {
  PointTransaction,
  ProgressionSummary,
  TitleGrant,
  XPEvent,
} from "@/features/progression/types";
import { ApiError } from "@/lib/api/client";

import { getUserDisplayTitle, hasUserIdentityMarks } from "./identity";
import { usePublicUserQuery } from "./queries";
import { formatDate, getDisplayName } from "./public-user-layout";
import type { PublicUser } from "./types";
import { UserIdentityMarks } from "./user-identity-marks";

export function ProgressionSettingsPage() {
  return (
    <AuthRequired
      title="登录后查看成长资料"
      description="成长资料、积分余额和已获得身份属于当前账号。登录后可以查看。"
    >
      <ProgressionSettingsContent />
    </AuthRequired>
  );
}

function ProgressionSettingsContent() {
  const currentUserQuery = useCurrentUserQuery();
  const username = currentUserQuery.data?.username ?? "";
  const profileQuery = usePublicUserQuery(
    username,
    currentUserQuery.isSuccess && Boolean(username),
  );
  const pointsQuery = useMyPointsQuery(currentUserQuery.isSuccess);
  const progressionQuery = useMyProgressionQuery(currentUserQuery.isSuccess);
  const titlesQuery = useMyTitlesQuery(
    { limit: 20, offset: 0 },
    currentUserQuery.isSuccess,
  );
  const pointTransactionsQuery = useMyPointTransactionsQuery(
    { limit: 8, offset: 0 },
    currentUserQuery.isSuccess,
  );
  const xpEventsQuery = useMyXPEventsQuery(
    { limit: 8, offset: 0 },
    currentUserQuery.isSuccess,
  );
  const user = profileQuery.data?.user;
  const progression = progressionQuery.data?.progression;

  if (
    currentUserQuery.isLoading ||
    profileQuery.isPending ||
    pointsQuery.isPending ||
    progressionQuery.isPending
  ) {
    return (
      <section className="bg-background py-5">
        <LoadingState rows={5} />
      </section>
    );
  }

  if (
    profileQuery.isError ||
    pointsQuery.isError ||
    progressionQuery.isError ||
    !user ||
    !progression
  ) {
    return (
      <section className="bg-background py-5">
        <ErrorState
          title="无法加载成长资料"
          description={getErrorDescription(
            profileQuery.error ?? pointsQuery.error ?? progressionQuery.error,
          )}
          action={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="px-1 hover:bg-transparent hover:text-primary"
              onClick={() => {
                void profileQuery.refetch();
                void pointsQuery.refetch();
                void progressionQuery.refetch();
              }}
            >
              重试
            </Button>
          }
        />
      </section>
    );
  }

  return (
    <ProgressionOverview
      pointTransactions={pointTransactionsQuery.data?.transactions ?? []}
      pointTransactionsError={pointTransactionsQuery.error}
      pointTransactionsLoading={pointTransactionsQuery.isPending}
      points={pointsQuery.data.points}
      progression={progression}
      titles={titlesQuery.data?.titles ?? []}
      titlesError={titlesQuery.error}
      titlesLoading={titlesQuery.isPending}
      user={user}
      xpEvents={xpEventsQuery.data?.events ?? []}
      xpEventsError={xpEventsQuery.error}
      xpEventsLoading={xpEventsQuery.isPending}
      onRefetchPointTransactions={() => pointTransactionsQuery.refetch()}
      onRefetchTitles={() => titlesQuery.refetch()}
      onRefetchXPEvents={() => xpEventsQuery.refetch()}
    />
  );
}

function ProgressionOverview({
  onRefetchPointTransactions,
  onRefetchTitles,
  onRefetchXPEvents,
  pointTransactions,
  pointTransactionsError,
  pointTransactionsLoading,
  points,
  progression,
  titles,
  titlesError,
  titlesLoading,
  user,
  xpEvents,
  xpEventsError,
  xpEventsLoading,
}: {
  onRefetchPointTransactions: () => void;
  onRefetchTitles: () => void;
  onRefetchXPEvents: () => void;
  pointTransactions: PointTransaction[];
  pointTransactionsError: Error | null;
  pointTransactionsLoading: boolean;
  points: PointAccount;
  progression: ProgressionSummary;
  titles: TitleGrant[];
  titlesError: Error | null;
  titlesLoading: boolean;
  user: PublicUser;
  xpEvents: XPEvent[];
  xpEventsError: Error | null;
  xpEventsLoading: boolean;
}) {
  const effectsCatalogQuery = useEffectsCatalogQuery();
  const activeEffects =
    effectsCatalogQuery.data?.effects.filter((effect) => effect.is_active) ?? [];

  return (
    <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-4 py-2 xl:grid-cols-[minmax(0,1fr)_280px]">
      <section className="min-w-0 space-y-4 rounded-lg bg-surface px-4 py-5 sm:px-5">
        <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <StatusToken tone="primary">账号成长</StatusToken>
              <h1 className="mt-3 text-2xl font-semibold leading-8 tracking-normal">
                成长与积分
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                等级由经验累计决定，积分独立入账并只用于装饰和互动。
              </p>
            </div>
            <TextAction href={`/users/${encodeURIComponent(user.username)}`}>
              查看主页
            </TextAction>
          </div>
        </div>

        <AccountGrowthMasthead
          points={points}
          progression={progression}
          user={user}
        />

        <section className="rounded-lg bg-surface-raised px-4 py-4">
          <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
            <SectionIntro
              eyebrow="头衔和身份"
              title="公开展示"
              description="选择一个已获得头衔，并预览它在主页上的身份标记。"
            />
            <div className="min-w-0">
              <PublicIdentityPreview progression={progression} user={user} />
              <TitleSelector
                activeGrantId={progression.active_title?.grant_id ?? null}
                isError={Boolean(titlesError)}
                isLoading={titlesLoading}
                onRetry={onRefetchTitles}
                titles={titles}
                username={user.username}
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg bg-surface-raised px-4 py-4">
          <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
            <SectionIntro
              eyebrow="互动目录"
              title="积分消费项"
            />
            <EffectsCatalogPanel
              effects={activeEffects}
              isError={effectsCatalogQuery.isError}
              isLoading={effectsCatalogQuery.isPending}
              onRetry={() => effectsCatalogQuery.refetch()}
              points={points}
            />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <LedgerPanel
            emptyText="还没有积分流水。"
            error={pointTransactionsError}
            isLoading={pointTransactionsLoading}
            items={pointTransactions}
            onRetry={onRefetchPointTransactions}
            title="积分流水"
            type="points"
          />
          <LedgerPanel
            emptyText="还没有经验事件。"
            error={xpEventsError}
            isLoading={xpEventsLoading}
            items={xpEvents}
            onRetry={onRefetchXPEvents}
            title="经验事件"
            type="xp"
          />
        </section>
      </section>

      <ProgressionRail points={points} progression={progression} user={user} />
    </div>
  );
}

function SectionIntro({
  description,
  eyebrow,
  title,
}: {
  description?: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="min-w-0">
      <StatusToken>{eyebrow}</StatusToken>
      <h2 className="mt-3 text-base font-semibold">{title}</h2>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function AccountGrowthMasthead({
  points,
  progression,
  user,
}: {
  points: PointAccount;
  progression: ProgressionSummary;
  user: PublicUser;
}) {
  const progress = clampPercent(progression.level_progress ?? 0);
  const levelXp = getLevelXpProgress(progression);

  return (
    <section>
      <div className="grid gap-0 overflow-hidden rounded-lg bg-surface-raised lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 px-4 py-5 sm:px-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusToken tone="primary">Lv.{progression.level}</StatusToken>
                <StatusToken>{progression.level_name || "全站等级"}</StatusToken>
                {progression.active_title ? (
                  <StatusToken tone="success">{progression.active_title.name}</StatusToken>
                ) : null}
              </div>
              <h2 className="mt-4 break-words text-xl font-semibold leading-8 text-foreground sm:text-2xl">
                {getDisplayName(user)} 的成长账户
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                等级按全站经验累计，积分独立入账并用于内容互动和身份表达。
              </p>
            </div>
            <div className="text-left sm:text-right">
              <div className="font-mono text-3xl font-semibold leading-none text-foreground">
                {formatCount(progression.xp_total)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">累计 XP</div>
            </div>
          </div>

          <div className="mt-5">
            <div className="h-2 bg-background-soft">
              <div
                className="h-full bg-primary"
                style={{ width: `${progress}%` }}
                aria-hidden="true"
              />
            </div>
            <div className="mt-2 flex justify-between gap-4 text-xs text-muted-foreground">
              <span>{formatCount(levelXp.earned)} XP</span>
              <span>
                {levelXp.isMaxLevel
                  ? "已满级"
                  : `${formatCount(levelXp.required)} XP`}
              </span>
            </div>
          </div>
        </div>

        <div className="grid border-t border-border bg-background/60 sm:grid-cols-3 lg:border-l lg:border-t-0 lg:grid-cols-1">
          <MetricBlock
            className="border-b border-r-0 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 lg:border-b lg:border-r-0 lg:last:border-b-0"
            label={
              <span className="inline-flex items-center gap-2">
                <Coins className="size-4 text-primary" aria-hidden="true" />
                积分余额
              </span>
            }
            value={formatCount(points.balance)}
          />
          <MetricBlock
            className="border-b border-r-0 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 lg:border-b lg:border-r-0 lg:last:border-b-0"
            label="累计获得"
            value={formatCount(points.lifetime_earned)}
          />
          <MetricBlock
            className="border-b border-r-0 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 lg:border-b lg:border-r-0 lg:last:border-b-0"
            label="累计使用"
            value={formatCount(points.lifetime_spent)}
          />
        </div>
      </div>
    </section>
  );
}

function PublicIdentityPreview({
  progression,
  user,
}: {
  progression: ProgressionSummary;
  user: PublicUser;
}) {
  return (
    <div className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">
          {getDisplayName(user)}
        </div>
        <div className="mt-1 font-mono text-xs text-primary">@{user.username}</div>
        <UserIdentityMarks
          badges={user.badges}
          className="mt-3 gap-2"
          displayTitle={progression.active_title?.name ?? getUserDisplayTitle(user)}
          level={progression}
          roles={user.roles}
        />
        {hasUserIdentityMarks(user) || progression.active_title ? null : (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            当前还没有公开头衔或徽章。
          </p>
        )}
      </div>
      <div className="self-start font-mono text-xs text-muted-foreground">
        {progression.titles_count} 个头衔
      </div>
    </div>
  );
}

function TitleSelector({
  activeGrantId,
  isError,
  isLoading,
  onRetry,
  titles,
  username,
}: {
  activeGrantId: string | null;
  isError: boolean;
  isLoading: boolean;
  onRetry: () => void;
  titles: TitleGrant[];
  username: string;
}) {
  const mutation = useSetActiveTitleMutation(username);
  const [localError, setLocalError] = useState<string | null>(null);

  async function selectTitle(titleGrantId: string | null) {
    setLocalError(null);
    try {
      await mutation.mutateAsync({ title_grant_id: titleGrantId });
    } catch (caught) {
      setLocalError(caught instanceof Error ? caught.message : "头衔切换失败。");
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-md bg-background px-3 py-4">
        <LoadingState rows={3} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-md bg-background px-3 py-4">
        <ErrorState
          title="无法加载头衔"
          description="已获得头衔暂时无法同步。"
          action={
            <Button variant="ghost" size="sm" onClick={onRetry}>
              重试
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {localError ? (
        <Alert variant="destructive" className="my-4">
          <AlertTitle>头衔切换失败</AlertTitle>
          <AlertDescription>{localError}</AlertDescription>
        </Alert>
      ) : null}
      <TitleOption
        active={activeGrantId === null}
        description="不在公开身份里展示头衔。"
        disabled={mutation.isPending}
        label="不展示头衔"
        onClick={() => selectTitle(null)}
      />
      {titles.map((grant) => (
        <TitleOption
          key={grant.id}
          active={activeGrantId === grant.id}
          description={
            grant.reason ||
            `${formatScopeType(grant.title.scope_type)}头衔，授予于 ${formatDate(grant.created_at)}。`
          }
          disabled={mutation.isPending}
          label={grant.title.name}
          meta={formatScopeType(grant.title.scope_type)}
          onClick={() => selectTitle(grant.id)}
        />
      ))}
      {titles.length === 0 ? (
        <p className="rounded-md bg-background px-3 py-4 text-sm leading-6 text-muted-foreground">
          当前还没有可选择的头衔。
        </p>
      ) : null}
    </div>
  );
}

function TitleOption({
  active,
  description,
  disabled,
  label,
  meta,
  onClick,
}: {
  active: boolean;
  description: string;
  disabled: boolean;
  label: string;
  meta?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-4 rounded-md bg-background px-3 py-4 text-left transition-colors hover:bg-surface-hover hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
      disabled={disabled}
      onClick={onClick}
    >
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">
            {label}
          </span>
          {meta ? <StatusToken>{meta}</StatusToken> : null}
        </span>
        <span className="mt-1 block line-clamp-2 text-sm leading-6 text-muted-foreground">
          {description}
        </span>
      </span>
      <span className="self-center text-primary">
        {active ? <Check className="size-4" aria-hidden="true" /> : null}
      </span>
    </button>
  );
}

function EffectsCatalogPanel({
  effects,
  isError,
  isLoading,
  onRetry,
  points,
}: {
  effects: Effect[];
  isError: boolean;
  isLoading: boolean;
  onRetry: () => void;
  points: PointAccount;
}) {
  if (isLoading) {
    return (
      <div className="rounded-md bg-background px-3 py-4">
        <LoadingState rows={3} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-md bg-background px-3 py-4">
        <ErrorState
          title="互动目录暂时无法同步"
          description="积分余额仍可查看，互动目录稍后可以重试。"
          action={
            <Button variant="ghost" size="sm" onClick={onRetry}>
              重试
            </Button>
          }
        />
      </div>
    );
  }

  if (effects.length === 0) {
    return (
      <div className="rounded-md bg-background px-3 py-4">
        <div className="text-sm font-semibold">暂无可用互动</div>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {effects
        .slice()
        .sort((left, right) => left.cost_points - right.cost_points)
        .map((effect) => (
          <div
            key={effect.id}
            className="grid gap-3 rounded-md bg-background px-3 py-4 transition-colors hover:bg-surface-hover sm:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-base"
                  aria-hidden="true"
                >
                  {getContentEffectEmoji(effect) || "·"}
                </span>
                <div className="truncate text-sm font-semibold text-foreground">
                  {effect.name}
                </div>
              </div>
            </div>
            <div className="self-center font-mono text-sm font-semibold text-primary">
              {formatCount(effect.cost_points)} 积分
              {points.balance < effect.cost_points ? (
                <span className="ml-2 text-xs font-medium text-muted-foreground">
                  差 {formatCount(effect.cost_points - points.balance)}
                </span>
              ) : null}
            </div>
          </div>
        ))}
    </div>
  );
}

function LedgerPanel({
  emptyText,
  error,
  isLoading,
  items,
  onRetry,
  title,
  type,
}: {
  emptyText: string;
  error: Error | null;
  isLoading: boolean;
  items: Array<PointTransaction | XPEvent>;
  onRetry: () => void;
  title: string;
  type: "points" | "xp";
}) {
  return (
    <section className="rounded-lg bg-surface-raised px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <StatusToken>{type === "points" ? "积分" : "经验"}</StatusToken>
      </div>

      {isLoading ? (
        <div className="mt-4">
          <LoadingState rows={4} />
        </div>
      ) : null}

      {error ? (
        <div className="mt-4">
          <ErrorState
            title={`无法加载${title}`}
            description={getErrorDescription(error)}
            action={
              <Button variant="ghost" size="sm" onClick={onRetry}>
                重试
              </Button>
            }
          />
        </div>
      ) : null}

      {!isLoading && !error && items.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{emptyText}</p>
      ) : null}

      {!isLoading && !error && items.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {items.map((item) => (
            <LedgerRow key={item.id} item={item} type={type} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function LedgerRow({
  item,
  type,
}: {
  item: PointTransaction | XPEvent;
  type: "points" | "xp";
}) {
  const delta = item.delta > 0 ? `+${item.delta}` : String(item.delta);
  const after =
    type === "points"
      ? (item as PointTransaction).balance_after
      : (item as XPEvent).xp_total_after;

  return (
    <div className="grid gap-3 rounded-md bg-background px-3 py-3 transition-colors hover:bg-surface-hover sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-foreground">
          {formatLedgerReason(item.reason, item.source_type)}
        </div>
        <div className="mt-1 truncate font-mono text-xs text-muted-foreground">
          {item.source_type || "system"} · {formatDate(item.created_at)}
        </div>
      </div>
      <div className="self-center text-right font-mono text-sm">
        <div className={item.delta >= 0 ? "text-emerald-300" : "text-amber-300"}>
          {delta}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          结余 {formatCount(after)}
        </div>
      </div>
    </div>
  );
}

function ProgressionRail({
  points,
  progression,
  user,
}: {
  points: PointAccount;
  progression: ProgressionSummary;
  user: PublicUser;
}) {
  return (
    <RightRail className="hidden min-w-0 xl:block">
      <RightRailSection title="账户概览">
        <RightRailInfoList>
          <RightRailInfoRow label="等级" value={`Lv.${progression.level}`} />
          <RightRailInfoRow label="积分余额" value={formatCount(points.balance)} />
          <RightRailInfoRow
            label="展示头衔"
            value={progression.active_title?.name ?? "未展示"}
          />
          <RightRailInfoRow label="加入时间" value={formatDate(user.created_at)} />
        </RightRailInfoList>
      </RightRailSection>

      <RightRailSection title="可用操作">
        <RightRailActionList>
          <RightRailAction href="/settings/profile">编辑主页</RightRailAction>
          <RightRailAction href="/settings/security">账号安全</RightRailAction>
          <RightRailAction href="/saved">我的收藏</RightRailAction>
        </RightRailActionList>
      </RightRailSection>

      <RightRailSection title="积分用途">
        <RightRailInfoList>
          <RightRailInfoRow label="用途" value="内容互动" />
        </RightRailInfoList>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Trophy className="size-4 text-primary" aria-hidden="true" />
          <span>等级只看经验，不购买权重。</span>
        </div>
      </RightRailSection>
    </RightRail>
  );
}

function formatCount(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 1,
    notation: value >= 10000 ? "compact" : "standard",
  }).format(value);
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value * 100));
}

function getLevelXpProgress(progression: ProgressionSummary) {
  if (progression.next_level_xp === null) {
    return {
      earned: Math.max(0, progression.xp_total - progression.current_level_xp),
      isMaxLevel: true,
      required: 0,
    };
  }

  const currentLevelXp = Math.max(0, progression.current_level_xp);
  const nextLevelXp = Math.max(currentLevelXp, progression.next_level_xp);
  const required = Math.max(0, nextLevelXp - currentLevelXp);
  const earned = Math.max(
    0,
    Math.min(progression.xp_total - currentLevelXp, required),
  );

  return {
    earned,
    isMaxLevel: false,
    required,
  };
}

function formatScopeType(value: string) {
  switch (value) {
    case "platform":
      return "平台";
    case "system":
      return "系统";
    case "community":
      return "社区";
    default:
      return value || "头衔";
  }
}

function formatLedgerReason(reason: string, sourceType: string) {
  return reason.trim() || sourceType || "系统记录";
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "请重试当前请求，或重新登录后再打开成长与积分。";
}
