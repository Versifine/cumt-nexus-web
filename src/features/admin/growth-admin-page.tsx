"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { Coins, ShieldCheck, Sparkles, Tags } from "lucide-react";

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
import { getContentEffectEmoji } from "@/features/effect/content-effect-emoji";
import { useEffectsCatalogQuery } from "@/features/effect/queries";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import {
  AdminQueueLayout,
  AdminQueueToolbar,
  AdminRailSection,
} from "./admin-queue";
import { AdminUserIdentity, AdminUserSearchPanel } from "./admin-user-picker";
import {
  useAdjustAdminUserPointsMutation,
  useAdminEffectsQuery,
  useAdminPointTransactionsQuery,
  useAdminTitlesQuery,
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
  {
    icon: <Sparkles className="size-4" aria-hidden="true" />,
    label: "效果",
    value: "effects",
  },
  {
    icon: <Tags className="size-4" aria-hidden="true" />,
    label: "头衔",
    value: "titles",
  },
  {
    icon: <ShieldCheck className="size-4" aria-hidden="true" />,
    label: "授予",
    value: "grants",
  },
  {
    icon: <Coins className="size-4" aria-hidden="true" />,
    label: "积分",
    value: "points",
  },
];

export function GrowthAdminPage() {
  const [tab, setTab] = useState<AdminGrowthTab>("effects");
  const canLoad = true;

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
    <AdminQueueLayout
      detail={
        <>
          <AdminRailSection title="管理边界">
            <dl className="grid gap-1 rounded-md bg-surface px-3">
              <InfoRow label="头衔授予" value="平台权限" />
              <InfoRow label="内容互动" value="启用 / 停用" />
              <InfoRow label="积分调整" value="写入流水" />
            </dl>
          </AdminRailSection>
          <AdminRailSection title="相关入口">
            <div className="grid gap-1 rounded-md bg-surface p-2">
              <TextAction href="/settings/progression" variant="bar">
                我的成长
              </TextAction>
              <TextAction href="/admin/community-applications" variant="bar">
                社区审批
              </TextAction>
              <TextAction href="/admin/audit-logs" variant="bar">
                审计日志
              </TextAction>
            </div>
          </AdminRailSection>
        </>
      }
    >
      <AdminQueueToolbar
        description="管理内容互动、平台头衔、用户头衔授予和积分流水。"
        actions={<TextAction href="/admin/reports">举报审核</TextAction>}
        title="成长工具"
      />
        <Tabs
          value={activeTab}
          onValueChange={(value) => onTabChange(value as AdminGrowthTab)}
          className="rounded-lg bg-surface px-3 py-3"
        >
          <TabsList className="h-auto flex-wrap justify-start rounded-md bg-surface-raised p-1">
            {tabs.map((item) => (
              <TabsTrigger
                key={item.value}
                value={item.value}
                className="h-8 gap-2 rounded px-3 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                {item.icon}
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {body}
    </AdminQueueLayout>
  );
}

function AdminPanelHeader({
  description,
  eyebrow,
  title,
}: {
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="rounded-lg bg-surface px-4 py-4 sm:px-5">
      <StatusToken>{eyebrow}</StatusToken>
      <h2 className="mt-3 text-base font-semibold leading-6 text-foreground">
        {title}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function InlineActionButton({
  children,
  className,
  tone = "primary",
  ...props
}: ComponentProps<"button"> & {
  tone?: "danger" | "primary";
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-9 items-center gap-2 px-1 text-sm font-semibold underline-offset-4 transition-colors hover:underline disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        tone === "primary" && "text-primary hover:text-foreground",
        tone === "danger" && "text-destructive hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function FieldLabel({
  children,
  htmlFor,
}: {
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      className="font-mono text-[11px] uppercase text-muted-foreground"
      htmlFor={htmlFor}
    >
      {children}
    </label>
  );
}

function NativeSelect({
  className,
  ...props
}: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-10 rounded-lg border border-input bg-background-soft px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function EffectsAdminPanel({ enabled }: { enabled: boolean }) {
  const effectsQuery = useAdminEffectsQuery({ active: "all", limit: 50 }, enabled);
  const catalogQuery = useEffectsCatalogQuery(enabled);
  const mutation = useUpdateAdminEffectMutation();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const emojiByEffectId = new Map(
    catalogQuery.data?.effects.map((effect) => [effect.id, effect.emoji]) ?? [],
  );

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
          title="无法加载内容互动"
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
    <section>
      <AdminPanelHeader
        eyebrow="内容互动"
        title="启用状态"
        description="这里只管理互动是否可购买。"
      />
      <MutationAlerts message={message} error={error} />
      <div className="space-y-2">
        {effectsQuery.data.effects.map((effect) => (
          <div
            key={effect.id}
            className="grid gap-3 rounded-md bg-surface-raised px-3 py-4 transition-colors hover:bg-surface-hover sm:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-base"
                  aria-hidden="true"
                >
                  {getContentEffectEmoji({
                    emoji: effect.emoji || emojiByEffectId.get(effect.id),
                    id: effect.id,
                  }) || "·"}
                </span>
                <span className="truncate text-sm font-semibold">{effect.name}</span>
                <StatusToken tone={effect.is_active ? "success" : "warning"}>
                  {effect.is_active ? "启用" : "停用"}
                </StatusToken>
              </div>
              <div className="mt-2 font-mono text-xs text-muted-foreground">
                {effect.cost_points} 积分 · {effect.animation_key || "无动画键"}
              </div>
            </div>
            <InlineActionButton
              disabled={mutation.isPending}
              onClick={() => toggleEffect(effect.id, effect.is_active, effect.name)}
            >
              {effect.is_active ? "停用" : "启用"}
            </InlineActionButton>
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
    <section>
      <AdminPanelHeader
        eyebrow="头衔目录"
        title="平台可授予头衔"
        description="创建和启停头衔目录。保留词、冒充权威和权限边界由后端校验。"
      />
      <MutationAlerts message={message} error={error} />
      <div className="grid gap-4 rounded-lg bg-surface px-4 py-4 sm:px-5 lg:grid-cols-[180px_minmax(0,1fr)]">
        <div>
          <StatusToken>创建头衔</StatusToken>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            平台首版以 platform 头衔为主，社区授予不在当前前端展示。
          </p>
        </div>
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <FieldLabel htmlFor="admin-title-name">头衔名称</FieldLabel>
              <Input
                id="admin-title-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="例如：资料贡献者"
              />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="admin-title-scope">作用范围</FieldLabel>
              <NativeSelect
                id="admin-title-scope"
                value={scopeType}
                onChange={(event) => setScopeType(event.target.value)}
              >
                <option value="platform">平台</option>
                <option value="system">系统</option>
                <option value="community">社区</option>
              </NativeSelect>
            </div>
          </div>
          <div className="grid gap-2">
            <FieldLabel htmlFor="admin-title-description">说明</FieldLabel>
            <Textarea
              id="admin-title-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="说明这个头衔为什么会被授予"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="grid gap-2">
              <FieldLabel htmlFor="admin-title-scope-id">范围 ID</FieldLabel>
              <Input
                id="admin-title-scope-id"
                value={scopeId}
                onChange={(event) => setScopeId(event.target.value)}
                placeholder="可留空"
              />
            </div>
            <Button
              type="button"
              className="self-end"
              disabled={createMutation.isPending}
              onClick={createTitle}
            >
              创建
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {titlesQuery.data.titles.map((title) => (
          <div
            key={title.id}
            className="grid gap-3 rounded-md bg-surface-raised px-3 py-4 transition-colors hover:bg-surface-hover sm:grid-cols-[minmax(0,1fr)_auto]"
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
            <InlineActionButton
              disabled={updateMutation.isPending}
              onClick={() => toggleTitle(title.id, title.is_active, title.name)}
            >
              {title.is_active ? "停用" : "启用"}
            </InlineActionButton>
          </div>
        ))}
      </div>
    </section>
  );
}

function TitleGrantsAdminPanel({ enabled }: { enabled: boolean }) {
  const titlesQuery = useAdminTitlesQuery(
    { active: "true", limit: 50, scope_type: "all" },
    enabled,
  );
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
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
  const titles = titlesQuery.data?.titles ?? [];

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

  if (titlesQuery.isPending) {
    return <LoadingPanel />;
  }

  if (titlesQuery.isError) {
    return (
      <StatePanel>
        <ErrorState
          title="无法加载授予数据"
          description={getErrorDescription(titlesQuery.error)}
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
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
    <section>
      <AdminPanelHeader
        eyebrow="头衔授予"
        title="给用户授予或撤销头衔"
        description="通过用户搜索或用户 ID 操作真实授予记录；撤销后用户不能再选择该头衔展示。"
      />
      <MutationAlerts message={message} error={error} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="rounded-lg bg-surface px-4 py-4 sm:px-5">
          <h2 className="text-sm font-semibold">选择用户</h2>
          <AdminUserSearchPanel
            className="mt-3"
            title="搜索用户"
            description="搜索后选择用户，会自动填入授予和撤销使用的用户 ID。"
            onSelect={(user) => {
              setSelectedUser(user);
              setSelectedUserId(user.id);
            }}
          />
          <div className="mt-3 grid gap-2">
            <FieldLabel htmlFor="admin-grant-user-id">用户 ID</FieldLabel>
            <Input
              id="admin-grant-user-id"
              value={selectedUserId}
              onChange={(event) => {
                setSelectedUserId(event.target.value);
                setSelectedUser(null);
              }}
              placeholder="也可以直接粘贴用户 ID"
            />
          </div>
          {selectedUser ? (
            <div className="mt-3 rounded-md bg-primary/5 p-3 ring-1 ring-primary/25">
              <AdminUserIdentity user={selectedUser} />
            </div>
          ) : null}
        </div>

        <div className="min-w-0 rounded-lg bg-surface px-4 py-4 sm:px-5">
          <h2 className="text-sm font-semibold">授予头衔</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="grid gap-2">
              <FieldLabel htmlFor="admin-grant-title">头衔</FieldLabel>
              <NativeSelect
                id="admin-grant-title"
                value={selectedTitleId}
                onChange={(event) => setSelectedTitleId(event.target.value)}
              >
                <option value="">选择头衔</option>
                {titles.map((title) => (
                  <option key={title.id} value={title.id}>
                    {title.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <Button
              type="button"
              className="self-end"
              disabled={grantMutation.isPending}
              onClick={grantTitle}
            >
              授予
            </Button>
          </div>
          <div className="mt-3 grid gap-2">
            <FieldLabel htmlFor="admin-grant-reason">授予原因</FieldLabel>
            <Textarea
              id="admin-grant-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="例如：长期维护资料索引"
            />
          </div>

          <div className="mt-5">
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
              <div className="space-y-2">
                {grantsQuery.data.titles.map((grant) => (
                  <div
                    key={grant.id}
                    className="grid gap-3 rounded-md bg-surface-raised px-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{grant.title.name}</div>
                      <div className="mt-1 text-sm leading-6 text-muted-foreground">
                        {grant.reason || "暂无授予原因。"}
                      </div>
                    </div>
                    <InlineActionButton
                      tone="danger"
                      disabled={revokeMutation.isPending}
                      onClick={() => revokeGrant(grant.id)}
                    >
                      撤销
                    </InlineActionButton>
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
    <section>
      <AdminPanelHeader
        eyebrow="积分账户"
        title="手工调整和流水"
        description="通过用户搜索或用户 ID 查看积分流水；手工调分必须写明原因并由后端写入审计。"
      />
      <MutationAlerts message={message} error={error} />
      <div className="grid gap-4 rounded-lg bg-surface px-4 py-4 sm:px-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div>
          <StatusToken>手工调分</StatusToken>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            调整会写入积分流水和平台审计日志。
          </p>
          <AdminUserSearchPanel
            className="mt-4"
            title="搜索用户"
            description="选择用户后自动填入调分和流水筛选使用的用户 ID。"
            onSelect={(user) => setUserId(user.id)}
          />
        </div>
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
            <div className="grid gap-2">
              <FieldLabel htmlFor="admin-points-user-id">用户 ID</FieldLabel>
              <Input
                id="admin-points-user-id"
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                placeholder="用于过滤流水和调分"
              />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor="admin-points-delta">变化值</FieldLabel>
              <Input
                id="admin-points-delta"
                value={delta}
                onChange={(event) => setDelta(event.target.value)}
                placeholder="+10 或 -10"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <FieldLabel htmlFor="admin-points-reason">调整原因</FieldLabel>
            <Textarea
              id="admin-points-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="例如：活动奖励补发"
            />
          </div>
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
        <div className="space-y-2">
          {transactionsQuery.data.transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="grid gap-3 rounded-md bg-surface-raised px-3 py-4 transition-colors hover:bg-surface-hover sm:grid-cols-[minmax(0,1fr)_auto]"
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

function MutationAlerts({
  error,
  message,
}: {
  error: string | null;
  message: string | null;
}) {
  if (!error && !message) {
    return null;
  }

  return (
    <div className="rounded-lg bg-surface px-4 py-4 sm:px-5">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>操作失败</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {message ? (
        <Alert variant="success" className={error ? "mt-3" : undefined}>
          <AlertTitle>操作已提交</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

function StatePanel({ children }: { children: ReactNode }) {
  return <div className="rounded-lg bg-surface px-4 py-4 sm:px-5">{children}</div>;
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
