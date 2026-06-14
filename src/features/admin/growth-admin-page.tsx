"use client";

import { useState, type ReactNode } from "react";
import { Check, Coins, ShieldCheck, Sparkles, Tags } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InfoRow, StatusToken } from "@/components/ui/data-display";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextAction } from "@/components/ui/text-action";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSession } from "@/features/auth/auth-session";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import {
  useAdjustAdminUserPointsMutation,
  useAdminEffectsQuery,
  useAdminPointTransactionsQuery,
  useAdminTitlesQuery,
  useAdminUsersQuery,
  useAdminUserTitleGrantsQuery,
  useCreateAdminTitleMutation,
  useGrantAdminUserTitleMutation,
  useRevokeAdminUserTitleMutation,
  useUpdateAdminEffectMutation,
  useUpdateAdminTitleMutation,
} from "./queries";
import type { AdminUser } from "./types";

type AdminGrowthTab = "effects" | "titles" | "grants" | "points";

const tabs: Array<{
  icon: ReactNode;
  label: string;
  value: AdminGrowthTab;
}> = [
  { icon: <Sparkles className="size-4" aria-hidden="true" />, label: "效果", value: "effects" },
  { icon: <Tags className="size-4" aria-hidden="true" />, label: "头衔", value: "titles" },
  { icon: <ShieldCheck className="size-4" aria-hidden="true" />, label: "授予", value: "grants" },
  { icon: <Coins className="size-4" aria-hidden="true" />, label: "积分", value: "points" },
];

export function GrowthAdminPage() {
  const { isReady, token } = useAuthSession();
  const currentUserQuery = useCurrentUserQuery();
  const [tab, setTab] = useState<AdminGrowthTab>("effects");
  const canLoad =
    isReady && Boolean(token) && currentUserQuery.data?.is_platform_staff === true;
  const loginHref = `/login?next=${encodeURIComponent("/admin/growth")}`;

  if (!isReady || (token && currentUserQuery.isLoading)) {
    return <GrowthAdminLayout activeTab={tab} body={<LoadingPanel />} onTabChange={setTab} />;
  }

  if (!token) {
    return (
      <GrowthAdminLayout
        activeTab={tab}
        body={
          <StatePanel>
            <EmptyState
              title="登录后进入成长管理"
              description="成长和积分管理需要平台 staff 身份。登录后会自动确认权限。"
              action={
                <TextAction href={loginHref} tone="primary">
                  登录
                </TextAction>
              }
            />
          </StatePanel>
        }
        onTabChange={setTab}
      />
    );
  }

  if (currentUserQuery.isError) {
    return (
      <GrowthAdminLayout
        activeTab={tab}
        body={
          <StatePanel>
            <ErrorState
              title="无法确认用户身份"
              description={getErrorDescription(currentUserQuery.error)}
              action={
                <Button variant="ghost" size="sm" onClick={() => currentUserQuery.refetch()}>
                  重试
                </Button>
              }
            />
          </StatePanel>
        }
        onTabChange={setTab}
      />
    );
  }

  if (!currentUserQuery.data?.is_platform_staff) {
    return (
      <GrowthAdminLayout
        activeTab={tab}
        body={
          <StatePanel>
            <EmptyState
              title="需要平台权限"
              description="当前账号不是平台 staff，不能查看或修改成长系统配置。"
              action={<TextAction href="/">信息流首页</TextAction>}
            />
          </StatePanel>
        }
        onTabChange={setTab}
      />
    );
  }

  return (
    <GrowthAdminLayout
      activeTab={tab}
      body={
        <>
          {tab === "effects" ? <EffectsAdminPanel enabled={canLoad} /> : null}
          {tab === "titles" ? <TitlesAdminPanel enabled={canLoad} /> : null}
          {tab === "grants" ? <TitleGrantsAdminPanel enabled={canLoad} /> : null}
          {tab === "points" ? <PointsAdminPanel enabled={canLoad} /> : null}
        </>
      }
      onTabChange={setTab}
    />
  );
}

function GrowthAdminLayout({
  activeTab,
  body,
  onTabChange,
}: {
  activeTab: AdminGrowthTab;
  body: ReactNode;
  onTabChange: (tab: AdminGrowthTab) => void;
}) {
  return (
    <div className="grid w-full min-w-0 gap-0 py-2 xl:grid-cols-[minmax(0,1fr)_280px]">
      <section className="min-w-0">
        <div className="border-b border-border pb-4">
          <StatusToken tone="primary">平台工作台</StatusToken>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold leading-8 tracking-normal">
                成长系统管理
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                管理评论效果、平台头衔、用户头衔授予和积分流水。
              </p>
            </div>
            <TextAction href="/moderation">举报审核</TextAction>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => onTabChange(value as AdminGrowthTab)}
          className="border-b border-border pt-3"
        >
          <TabsList>
            {tabs.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.icon}
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {body}
      </section>

      <aside className="hidden min-w-0 border-l border-border pl-5 xl:block">
        <div className="sticky top-20 right-rail-scroll space-y-6">
          <section className="border-b border-border pb-5">
            <h2 className="text-sm font-semibold">管理边界</h2>
            <dl className="mt-3 divide-y divide-border border-t border-border">
              <InfoRow label="头衔授予" value="平台 staff" />
              <InfoRow label="评论效果" value="启用 / 停用" />
              <InfoRow label="积分调整" value="写入流水" />
            </dl>
          </section>
          <section>
            <h2 className="text-sm font-semibold">相关入口</h2>
            <div className="mt-3 flex flex-col border-t border-border">
              <TextAction href="/settings/progression" variant="bar">
                我的成长
              </TextAction>
              <TextAction href="/community-applications/review" variant="bar">
                社区审批
              </TextAction>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

function EffectsAdminPanel({ enabled }: { enabled: boolean }) {
  const effectsQuery = useAdminEffectsQuery({ active: "all", limit: 50 }, enabled);
  const mutation = useUpdateAdminEffectMutation();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleEffect(id: string, isActive: boolean, name: string) {
    setMessage(null);
    setError(null);
    try {
      await mutation.mutateAsync({ id, isActive: !isActive });
      setMessage(`${name} 已${isActive ? "停用" : "启用"}。`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "效果更新失败。");
    }
  }

  if (effectsQuery.isPending) {
    return <LoadingPanel />;
  }

  if (effectsQuery.isError) {
    return (
      <StatePanel>
        <ErrorState
          title="无法加载评论效果"
          description={getErrorDescription(effectsQuery.error)}
          action={
            <Button variant="ghost" size="sm" onClick={() => effectsQuery.refetch()}>
              重试
            </Button>
          }
        />
      </StatePanel>
    );
  }

  return (
    <section className="py-5">
      <MutationAlerts message={message} error={error} />
      <div className="divide-y divide-border border-t border-border">
        {effectsQuery.data.effects.map((effect) => (
          <div
            key={effect.id}
            className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <Sparkles className="size-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="truncate text-sm font-semibold">{effect.name}</span>
                <StatusToken tone={effect.is_active ? "success" : "warning"}>
                  {effect.is_active ? "启用" : "停用"}
                </StatusToken>
              </div>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                {effect.description || "评论特殊互动。"}
              </p>
              <div className="mt-2 font-mono text-xs text-muted-foreground">
                {effect.cost_points} 积分 · {effect.animation_key || "无动画键"}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={mutation.isPending}
              onClick={() => toggleEffect(effect.id, effect.is_active, effect.name)}
            >
              {effect.is_active ? "停用" : "启用"}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function TitlesAdminPanel({ enabled }: { enabled: boolean }) {
  const titlesQuery = useAdminTitlesQuery(
    { active: "all", limit: 50, scope_type: "all" },
    enabled,
  );
  const createMutation = useCreateAdminTitleMutation();
  const updateMutation = useUpdateAdminTitleMutation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scopeType, setScopeType] = useState("platform");
  const [scopeId, setScopeId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createTitle() {
    setMessage(null);
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("请输入头衔名称。");
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        description: description.trim(),
        name: trimmedName,
        scope_id: scopeId.trim(),
        scope_type: scopeType,
      });
      setMessage(`已创建头衔：${result.title.name}。`);
      setName("");
      setDescription("");
      setScopeId("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "头衔创建失败。");
    }
  }

  async function toggleTitle(id: string, isActive: boolean, titleName: string) {
    setMessage(null);
    setError(null);
    try {
      await updateMutation.mutateAsync({
        id,
        input: { is_active: !isActive },
      });
      setMessage(`${titleName} 已${isActive ? "停用" : "启用"}。`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "头衔更新失败。");
    }
  }

  if (titlesQuery.isPending) {
    return <LoadingPanel />;
  }

  if (titlesQuery.isError) {
    return (
      <StatePanel>
        <ErrorState
          title="无法加载头衔目录"
          description={getErrorDescription(titlesQuery.error)}
          action={
            <Button variant="ghost" size="sm" onClick={() => titlesQuery.refetch()}>
              重试
            </Button>
          }
        />
      </StatePanel>
    );
  }

  return (
    <section className="py-5">
      <MutationAlerts message={message} error={error} />
      <div className="grid gap-4 border-b border-border pb-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div>
          <StatusToken>创建头衔</StatusToken>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            保留词和权限边界由后端校验。
          </p>
        </div>
        <div className="grid gap-3">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="头衔名称"
          />
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="头衔说明"
          />
          <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)_auto]">
            <Input
              value={scopeType}
              onChange={(event) => setScopeType(event.target.value)}
              placeholder="platform"
            />
            <Input
              value={scopeId}
              onChange={(event) => setScopeId(event.target.value)}
              placeholder="scope_id，可留空"
            />
            <Button
              type="button"
              disabled={createMutation.isPending}
              onClick={createTitle}
            >
              创建
            </Button>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border border-t border-border">
        {titlesQuery.data.titles.map((title) => (
          <div
            key={title.id}
            className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-semibold">{title.name}</span>
                <StatusToken tone={title.is_active ? "success" : "warning"}>
                  {title.is_active ? "启用" : "停用"}
                </StatusToken>
                <StatusToken>{formatScopeType(title.scope_type)}</StatusToken>
              </div>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                {title.description || "暂无说明。"}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={updateMutation.isPending}
              onClick={() => toggleTitle(title.id, title.is_active, title.name)}
            >
              {title.is_active ? "停用" : "启用"}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function TitleGrantsAdminPanel({ enabled }: { enabled: boolean }) {
  const usersQuery = useAdminUsersQuery({ limit: 20, offset: 0 }, enabled);
  const titlesQuery = useAdminTitlesQuery(
    { active: "true", limit: 50, scope_type: "all" },
    enabled,
  );
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedTitleId, setSelectedTitleId] = useState("");
  const [reason, setReason] = useState("");
  const grantsQuery = useAdminUserTitleGrantsQuery(
    selectedUserId,
    { limit: 20, offset: 0 },
    enabled && Boolean(selectedUserId),
  );
  const grantMutation = useGrantAdminUserTitleMutation();
  const revokeMutation = useRevokeAdminUserTitleMutation();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const users = usersQuery.data?.users ?? [];
  const titles = titlesQuery.data?.titles ?? [];

  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;

  async function grantTitle() {
    setMessage(null);
    setError(null);
    if (!selectedUserId || !selectedTitleId) {
      setError("请选择用户和头衔。");
      return;
    }

    try {
      const result = await grantMutation.mutateAsync({
        userId: selectedUserId,
        input: {
          reason: reason.trim(),
          title_id: selectedTitleId,
        },
      });
      setMessage(`已授予头衔：${result.grant.title.name}。`);
      setReason("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "授予头衔失败。");
    }
  }

  async function revokeGrant(grantId: string) {
    setMessage(null);
    setError(null);
    try {
      await revokeMutation.mutateAsync({ grantId, userId: selectedUserId });
      setMessage("头衔授予已撤销。");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "撤销头衔失败。");
    }
  }

  if (usersQuery.isPending || titlesQuery.isPending) {
    return <LoadingPanel />;
  }

  if (usersQuery.isError || titlesQuery.isError) {
    return (
      <StatePanel>
        <ErrorState
          title="无法加载授予数据"
          description={getErrorDescription(usersQuery.error ?? titlesQuery.error)}
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void usersQuery.refetch();
                void titlesQuery.refetch();
              }}
            >
              重试
            </Button>
          }
        />
      </StatePanel>
    );
  }

  return (
    <section className="py-5">
      <MutationAlerts message={message} error={error} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
        <div className="border-b border-border pb-5 xl:border-b-0 xl:border-r xl:pr-5">
          <h2 className="text-sm font-semibold">选择用户</h2>
          <Input
            className="mt-3"
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
            placeholder="用户 ID"
          />
          <div className="mt-3 divide-y divide-border border-t border-border">
            {users.map((user) => (
              <UserPickRow
                key={user.id}
                active={selectedUserId === user.id}
                onClick={() => setSelectedUserId(user.id)}
                user={user}
              />
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <h2 className="text-sm font-semibold">授予头衔</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <select
              className="h-10 rounded-lg border border-input bg-background-soft px-3 text-sm text-foreground outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
              value={selectedTitleId}
              onChange={(event) => setSelectedTitleId(event.target.value)}
            >
              <option value="">选择头衔</option>
              {titles.map((title) => (
                <option key={title.id} value={title.id}>
                  {title.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              disabled={grantMutation.isPending}
              onClick={grantTitle}
            >
              授予
            </Button>
          </div>
          <Textarea
            className="mt-3"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="授予原因"
          />

          <div className="mt-5 border-t border-border">
            {!selectedUserId ? (
              <p className="py-4 text-sm leading-6 text-muted-foreground">
                选择用户后查看当前有效头衔。
              </p>
            ) : grantsQuery.isPending ? (
              <div className="py-4">
                <LoadingState rows={3} />
              </div>
            ) : grantsQuery.isError ? (
              <div className="py-4">
                <ErrorState
                  title="无法加载用户头衔"
                  description={getErrorDescription(grantsQuery.error)}
                  action={
                    <Button variant="ghost" size="sm" onClick={() => grantsQuery.refetch()}>
                      重试
                    </Button>
                  }
                />
              </div>
            ) : grantsQuery.data.titles.length === 0 ? (
              <p className="py-4 text-sm leading-6 text-muted-foreground">
                {selectedUser?.username ?? "该用户"} 暂无有效头衔。
              </p>
            ) : (
              <div className="divide-y divide-border">
                {grantsQuery.data.titles.map((grant) => (
                  <div
                    key={grant.id}
                    className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{grant.title.name}</div>
                      <div className="mt-1 text-sm leading-6 text-muted-foreground">
                        {grant.reason || "暂无授予原因。"}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={revokeMutation.isPending}
                      onClick={() => revokeGrant(grant.id)}
                    >
                      撤销
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function PointsAdminPanel({ enabled }: { enabled: boolean }) {
  const [userId, setUserId] = useState("");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const transactionsQuery = useAdminPointTransactionsQuery(
    { limit: 20, offset: 0, user_id: userId.trim() || undefined },
    enabled,
  );
  const adjustMutation = useAdjustAdminUserPointsMutation();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function adjustPoints() {
    setMessage(null);
    setError(null);
    const parsedDelta = Number(delta);
    if (!userId.trim() || !Number.isInteger(parsedDelta) || parsedDelta === 0) {
      setError("请输入用户 ID 和非 0 整数积分变化。");
      return;
    }
    if (!reason.trim()) {
      setError("请输入调整原因。");
      return;
    }

    try {
      const result = await adjustMutation.mutateAsync({
        userId: userId.trim(),
        input: {
          delta: parsedDelta,
          reason: reason.trim(),
        },
      });
      setMessage(`积分已调整，当前余额 ${formatCount(result.account.balance)}。`);
      setDelta("");
      setReason("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "积分调整失败。");
    }
  }

  return (
    <section className="py-5">
      <MutationAlerts message={message} error={error} />
      <div className="grid gap-4 border-b border-border pb-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div>
          <StatusToken>手工调分</StatusToken>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            调整会写入积分流水和平台审计日志。
          </p>
        </div>
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
            <Input
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              placeholder="用户 ID"
            />
            <Input
              value={delta}
              onChange={(event) => setDelta(event.target.value)}
              placeholder="+10 或 -10"
            />
          </div>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="调整原因"
          />
          <div>
            <Button
              type="button"
              disabled={adjustMutation.isPending}
              onClick={adjustPoints}
            >
              提交调整
            </Button>
          </div>
        </div>
      </div>

      {transactionsQuery.isPending ? (
        <LoadingPanel />
      ) : transactionsQuery.isError ? (
        <StatePanel>
          <ErrorState
            title="无法加载积分流水"
            description={getErrorDescription(transactionsQuery.error)}
            action={
              <Button variant="ghost" size="sm" onClick={() => transactionsQuery.refetch()}>
                重试
              </Button>
            }
          />
        </StatePanel>
      ) : transactionsQuery.data.transactions.length === 0 ? (
        <StatePanel>
          <EmptyState
            title="暂无积分流水"
            description="有积分获得、消费或手工调整后会显示在这里。"
          />
        </StatePanel>
      ) : (
        <div className="divide-y divide-border border-t border-border">
          {transactionsQuery.data.transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  {transaction.reason || transaction.source_type}
                </div>
                <div className="mt-1 truncate font-mono text-xs text-muted-foreground">
                  {transaction.user_id} · {transaction.source_type} ·{" "}
                  {formatDate(transaction.created_at)}
                </div>
              </div>
              <div className="text-right font-mono text-sm">
                <div
                  className={cn(
                    transaction.delta >= 0 ? "text-emerald-300" : "text-amber-300",
                  )}
                >
                  {transaction.delta > 0 ? `+${transaction.delta}` : transaction.delta}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  余额 {formatCount(transaction.balance_after)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function UserPickRow({
  active,
  onClick,
  user,
}: {
  active: boolean;
  onClick: () => void;
  user: AdminUser;
}) {
  return (
    <button
      type="button"
      className={cn(
        "grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 py-3 text-left text-sm transition-colors hover:text-primary",
        active ? "text-primary" : "text-muted-foreground",
      )}
      onClick={onClick}
    >
      <span className="min-w-0">
        <span className="block truncate font-semibold text-foreground">
          @{user.username}
        </span>
        <span className="mt-1 block truncate font-mono text-xs">{user.id}</span>
      </span>
      {active ? <Check className="size-4 self-center" aria-hidden="true" /> : null}
    </button>
  );
}

function MutationAlerts({
  error,
  message,
}: {
  error: string | null;
  message: string | null;
}) {
  return (
    <>
      {error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>操作失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {message ? (
        <Alert variant="success" className="mb-4">
          <AlertTitle>操作已提交</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}

function StatePanel({ children }: { children: ReactNode }) {
  return <div className="border-b border-border py-5">{children}</div>;
}

function LoadingPanel() {
  return (
    <StatePanel>
      <LoadingState rows={5} />
    </StatePanel>
  );
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

function formatCount(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: 1,
    notation: value >= 10000 ? "compact" : "standard",
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}
