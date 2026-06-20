"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Hash, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InfoRow, StatusToken } from "@/components/ui/data-display";
import { Input } from "@/components/ui/input";
import { TextAction } from "@/components/ui/text-action";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { ApiError } from "@/lib/api/client";

import { AdminUserPicker } from "./admin-user-picker";
import {
  AdminActionDialog,
  AdminAuditLink,
  AdminDetailRail,
  AdminEmptyPanel,
  AdminErrorPanel,
  AdminLoadingPanel,
  AdminPagination,
  AdminQueueLayout,
  AdminQueueToolbar,
  AdminRailSection,
  AdminResourceRow,
} from "./admin-queue";
import {
  formatAdminCommunityStatus,
  formatDateTime,
  getAdminCommunityStatusTone,
} from "./display";
import {
  useAdminCommunitiesQuery,
  useUpdateAdminCommunityOwnerMutation,
  useUpdateAdminCommunityStatusMutation,
} from "./queries";
import type { AdminCommunity, AdminUser } from "./types";
import { useEffectiveAdminPlatformRole } from "./use-effective-platform-role";

const PAGE_SIZE = 20;

const statusTabs = [
  { label: "全部", value: "all" },
  { label: "正常", value: "active" },
  { label: "已暂停", value: "suspended" },
  { label: "已归档", value: "archived" },
];

const statusActions = [
  { label: "恢复", value: "active" },
  { label: "暂停", value: "suspended" },
  { label: "归档", value: "archived" },
];

export function AdminCommunitiesPage() {
  const [status, setStatus] = useState("all");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(
    null,
  );
  const communitiesQuery = useAdminCommunitiesQuery({
    limit: PAGE_SIZE,
    offset,
    q: query,
    status,
  });
  const currentUserQuery = useCurrentUserQuery();
  const { role: platformRole } = useEffectiveAdminPlatformRole(
    currentUserQuery.data,
  );
  const canOpenCommunityManagement = platformRole === "owner";
  const communities = communitiesQuery.data?.communities ?? [];
  const selectedCommunity =
    communities.find((community) => community.id === selectedCommunityId) ??
    communities[0] ??
    null;

  function changeStatus(nextStatus: string) {
    setStatus(nextStatus);
    setOffset(0);
    setSelectedCommunityId(null);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(queryInput.trim());
    setOffset(0);
    setSelectedCommunityId(null);
  }

  function clearSearch() {
    setQuery("");
    setQueryInput("");
    setOffset(0);
    setSelectedCommunityId(null);
  }

  return (
    <AdminQueueLayout
      detail={
        <CommunityDetailRail
          canOpenCommunityManagement={canOpenCommunityManagement}
          community={selectedCommunity}
        />
      }
    >
      <AdminQueueToolbar
        activeTab={status}
        description={`当前查看${formatAdminCommunityStatus(status)}社区。`}
        isRefreshing={communitiesQuery.isFetching}
        onRefresh={() => {
          void communitiesQuery.refetch();
        }}
        onSearchClear={clearSearch}
        onSearchSubmit={submitSearch}
        onSearchValueChange={setQueryInput}
        onTabChange={changeStatus}
        searchAriaLabel="搜索社区"
        searchDisabled={communitiesQuery.isPending}
        searchPlaceholder="搜索社区名、slug 或 ID"
        searchValue={queryInput}
        tabs={statusTabs}
        title="社区队列"
      />

      {communitiesQuery.isPending ? <AdminLoadingPanel rows={6} /> : null}

      {communitiesQuery.isError ? (
        <AdminErrorPanel
          title="无法加载社区"
          description={getErrorDescription(communitiesQuery.error)}
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => communitiesQuery.refetch()}
            >
              重试
            </Button>
          }
        />
      ) : null}

      {communitiesQuery.isSuccess && communities.length === 0 ? (
        <AdminEmptyPanel
          title="没有匹配社区"
          description={
            query ? "换一个社区名、slug、简介关键词或切换状态后再试。" : "切换状态或稍后刷新。"
          }
        />
      ) : null}

      {communities.length > 0 ? (
        <>
          <div className="space-y-2">
            {communities.map((community, index) => (
              <AdminResourceRow
                key={community.id}
                index={offset + index}
                isSelected={selectedCommunity?.id === community.id}
                onSelect={() => setSelectedCommunityId(community.id)}
                icon={<Hash className="size-4" aria-hidden="true" />}
                title={community.name}
                tokens={
                  <>
                    <span className="font-mono text-xs text-primary">
                      /{community.slug}
                    </span>
                    <StatusToken tone={getAdminCommunityStatusTone(community.status)}>
                      {formatAdminCommunityStatus(community.status)}
                    </StatusToken>
                    <StatusToken>{community.visibility}</StatusToken>
                  </>
                }
                description={community.description || "暂无简介。"}
                meta={`${community.kind} · 创建 ${formatDateTime(community.created_at)} · 更新 ${formatDateTime(community.updated_at)}`}
                actions={
                  canOpenCommunityManagement ? (
                    <TextAction
                      href={`/communities/${encodeURIComponent(community.slug)}/manage`}
                      tone="primary"
                    >
                      社区内管理
                    </TextAction>
                  ) : null
                }
              />
            ))}
          </div>
          <AdminPagination
            hasMore={communitiesQuery.data?.has_more ?? false}
            isFetching={communitiesQuery.isFetching}
            offset={offset}
            pageSize={PAGE_SIZE}
            onJump={(nextOffset) => {
              setOffset(nextOffset);
              setSelectedCommunityId(null);
            }}
            onNext={() => {
              setOffset(communitiesQuery.data?.next_offset ?? offset + PAGE_SIZE);
              setSelectedCommunityId(null);
            }}
            onPrevious={() => {
              setOffset(Math.max(0, offset - PAGE_SIZE));
              setSelectedCommunityId(null);
            }}
          />
        </>
      ) : null}
    </AdminQueueLayout>
  );
}

function CommunityDetailRail({
  canOpenCommunityManagement,
  community,
}: {
  canOpenCommunityManagement: boolean;
  community: AdminCommunity | null;
}) {
  return (
    <>
      <AdminDetailRail title="社区上下文" emptyTitle="选择社区">
        {community ? (
          <div className="space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusToken tone={getAdminCommunityStatusTone(community.status)}>
                  {formatAdminCommunityStatus(community.status)}
                </StatusToken>
                <StatusToken>{community.visibility}</StatusToken>
              </div>
              <h3 className="mt-3 break-words text-lg font-semibold">
                {community.name}
              </h3>
              <p className="mt-1 break-all font-mono text-xs text-primary">
                /{community.slug}
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {community.description || "暂无简介。"}
              </p>
            </div>
            <dl className="grid gap-1 rounded-md bg-surface px-3">
              <InfoRow label="类型" value={community.kind} />
              <InfoRow label="创建" value={formatDateTime(community.created_at)} />
              <InfoRow label="更新" value={formatDateTime(community.updated_at)} />
            </dl>
            <div className="grid gap-2">
              <CommunityOwnerTakeoverAction
                key={`${community.id}:owner`}
                community={community}
              />
              <CommunityStatusAction
                key={`${community.id}:${community.status}`}
                community={community}
              />
            </div>
          </div>
        ) : null}
      </AdminDetailRail>

      <AdminRailSection title="治理边界">
        <p className="text-sm leading-6 text-muted-foreground">
          平台侧只做暂停、恢复、归档和异常版主接管，不使用删除社区。日常社区管理员管理在社区内管理完成。
        </p>
      </AdminRailSection>

      <AdminRailSection title="相关入口">
        <div className="grid gap-1 rounded-md bg-surface p-2">
          {community ? (
            <>
              <TextAction
                href={`/communities/${encodeURIComponent(community.slug)}`}
                variant="bar"
              >
                打开社区
              </TextAction>
              {canOpenCommunityManagement ? (
                <TextAction
                  href={`/communities/${encodeURIComponent(community.slug)}/manage`}
                  variant="bar"
                >
                  社区内管理
                </TextAction>
              ) : null}
            </>
          ) : null}
          <TextAction href="/admin/community-applications" variant="bar">
            社区审批
          </TextAction>
          <AdminAuditLink targetType="community" targetId={community?.id} />
        </div>
      </AdminRailSection>
    </>
  );
}

function CommunityOwnerTakeoverAction({
  community,
}: {
  community: AdminCommunity;
}) {
  const [open, setOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const mutation = useUpdateAdminCommunityOwnerMutation();

  async function submit() {
    setFormError(null);

    if (!selectedUser) {
      setFormError("请先搜索并选择新版主账号。");
      return;
    }

    if (!reason.trim()) {
      setFormError("请填写接管原因。");
      return;
    }

    if (!confirmed) {
      setFormError("请确认这是异常社区接管操作。");
      return;
    }

    const result = await mutation.mutateAsync({
      id: community.id,
      input: {
        reason: reason.trim(),
        user_id: selectedUser.id,
      },
    });
    setMessage(`/${community.slug} 的版主已更新为 @${result.owner.username}。`);
    setSelectedUser(null);
    setReason("");
    setConfirmed(false);
    setOpen(false);
  }

  return (
    <>
      {message ? (
        <Alert variant="success">
          <AlertTitle>版主已更新</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      <AdminActionDialog
        open={open}
        onOpenChange={setOpen}
        title="接管社区版主"
        description={`将 /${community.slug} 的社区版主替换为指定用户。该操作用于异常社区治理，后端会写入平台管理审计。`}
        confirmLabel="确认接管"
        confirmVariant="destructive"
        isSubmitting={mutation.isPending}
        error={formError ?? (mutation.error ? getErrorDescription(mutation.error) : null)}
        onConfirm={submit}
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={mutation.isPending}
            onClick={() => {
              setFormError(null);
              setMessage(null);
              setSelectedUser(null);
              setReason("");
              setConfirmed(false);
              setOpen(true);
            }}
          >
            <ShieldCheck className="size-4" aria-hidden="true" />
            接管版主
          </Button>
        }
      >
        <div className="grid gap-3">
          <AdminUserPicker
            disabled={mutation.isPending}
            label="新版主账号"
            onChange={setSelectedUser}
            placeholder="搜索新版主的用户名或昵称"
            value={selectedUser}
          />
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="接管原因"
            disabled={mutation.isPending}
          />
          <label className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <input
              type="checkbox"
              className="mt-1 size-4 accent-primary"
              checked={confirmed}
              disabled={mutation.isPending}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>
              我确认这是平台侧异常接管，不是普通社区版主转让；普通转让应由社区版主发起并由目标账号接受。
            </span>
          </label>
        </div>
      </AdminActionDialog>
    </>
  );
}

function CommunityStatusAction({ community }: { community: AdminCommunity }) {
  const [open, setOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState(getDefaultNextStatus(community.status));
  const [message, setMessage] = useState<string | null>(null);
  const mutation = useUpdateAdminCommunityStatusMutation();
  const availableStatusActions = statusActions.filter(
    (action) => action.value !== community.status,
  );

  async function submit() {
    await mutation.mutateAsync({
      id: community.id,
      input: { status: nextStatus },
    });
    setMessage(`已将 /${community.slug} 改为${formatAdminCommunityStatus(nextStatus)}。`);
    setOpen(false);
  }

  return (
    <>
      {message ? (
        <Alert variant="success">
          <AlertTitle>状态已更新</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      <AdminActionDialog
        open={open}
        onOpenChange={setOpen}
        title="调整社区状态"
        description={`当前状态为${formatAdminCommunityStatus(community.status)}。这里只在正常、暂停和归档之间切换，后端会记录平台管理审计。`}
        confirmLabel="确认调整"
        confirmVariant={nextStatus === "active" ? "default" : "destructive"}
        confirmDisabled={mutation.isPending || nextStatus === community.status}
        isSubmitting={mutation.isPending}
        error={mutation.error ? getErrorDescription(mutation.error) : null}
        onConfirm={submit}
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={mutation.isPending}
            onClick={() => {
              setMessage(null);
              setNextStatus(getDefaultNextStatus(community.status));
              setOpen(true);
            }}
          >
            调整状态
          </Button>
        }
      >
        <div className="grid gap-2">
          {availableStatusActions.map((action) => (
            <button
              key={action.value}
              type="button"
              aria-pressed={nextStatus === action.value}
              className={`border px-3 py-2 text-left text-sm transition-colors hover:border-primary hover:text-foreground ${
                nextStatus === action.value
                  ? "border-primary text-primary"
                  : "border-border text-muted-foreground"
              }`}
              onClick={() => setNextStatus(action.value)}
            >
              <span className="block font-semibold">
                {formatCommunityStatusActionLabel(action.value)}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                切换为{formatAdminCommunityStatus(action.value)}
              </span>
            </button>
          ))}
        </div>
      </AdminActionDialog>
    </>
  );
}

function getDefaultNextStatus(currentStatus: string) {
  return statusActions.find((action) => action.value !== currentStatus)?.value ?? "active";
}

function formatCommunityStatusActionLabel(status: string) {
  switch (status) {
    case "active":
      return "恢复社区";
    case "suspended":
      return "暂停社区";
    case "archived":
      return "归档社区";
    default:
      return `切换为${formatAdminCommunityStatus(status)}`;
  }
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}
