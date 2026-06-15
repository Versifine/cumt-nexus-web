"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { ShieldCheck, UserCog } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InfoRow, StatusToken } from "@/components/ui/data-display";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TextAction } from "@/components/ui/text-action";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { ApiError } from "@/lib/api/client";

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
import { AdminUserSanctionsAction } from "./admin-user-sanctions";
import {
  formatAdminUserStatus,
  formatDateTime,
  formatPlatformRole,
  formatShortId,
  getAdminUserStatusTone,
  getPlatformRoleTone,
  resolvePlatformRole,
} from "./display";
import {
  useAdminUsersQuery,
  useUpdateAdminUserPlatformRoleMutation,
  useUpdateAdminUserMutation,
} from "./queries";
import type { AdminUser, EditablePlatformRole, PlatformRole } from "./types";

const PAGE_SIZE = 20;

const statusTabs = [
  { label: "全部", value: "all" },
  { label: "正常", value: "active" },
  { label: "已禁用", value: "disabled" },
  { label: "已注销", value: "deleted" },
];

const editablePlatformRoles: Array<{
  description: string;
  label: string;
  value: EditablePlatformRole | null;
}> = [
  {
    description: "可以管理用户、社区、运行开关、成长和审计，但不能调整平台角色。",
    label: "平台管理员",
    value: "admin",
  },
  {
    description: "只能处理举报审核和社区申请审批。",
    label: "平台审核员",
    value: "staff",
  },
  {
    description: "移除平台后台访问权，保留普通账号状态。",
    label: "普通用户",
    value: null,
  },
];

export function AdminUsersPage() {
  const [status, setStatus] = useState("all");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const usersQuery = useAdminUsersQuery({
    limit: PAGE_SIZE,
    offset,
    q: query,
    status,
  });
  const currentUserQuery = useCurrentUserQuery();
  const users = usersQuery.data?.users ?? [];
  const selectedUser =
    users.find((user) => user.id === selectedUserId) ?? users[0] ?? null;
  const actorRole = resolvePlatformRole(currentUserQuery.data);
  const canManagePlatformRoles = actorRole === "owner";

  function changeStatus(nextStatus: string) {
    setStatus(nextStatus);
    setOffset(0);
    setSelectedUserId(null);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(queryInput.trim());
    setOffset(0);
    setSelectedUserId(null);
  }

  function clearSearch() {
    setQuery("");
    setQueryInput("");
    setOffset(0);
    setSelectedUserId(null);
  }

  return (
    <AdminQueueLayout
      rail={
        <UserDetailRail
          actorRole={actorRole}
          canManagePlatformRoles={canManagePlatformRoles}
          user={selectedUser}
        />
      }
    >
      <AdminQueueToolbar
        activeTab={status}
        description={`当前查看${formatAdminUserStatus(status)}用户，范围从 ${offset + 1} 开始。`}
        isRefreshing={usersQuery.isFetching}
        onRefresh={() => {
          void usersQuery.refetch();
        }}
        onSearchClear={clearSearch}
        onSearchSubmit={submitSearch}
        onSearchValueChange={setQueryInput}
        onTabChange={changeStatus}
        searchAriaLabel="搜索用户"
        searchDisabled={usersQuery.isPending}
        searchPlaceholder="搜索用户名或 ID"
        searchValue={queryInput}
        tabs={statusTabs}
        title="用户队列"
      />

      {usersQuery.isPending ? <AdminLoadingPanel rows={6} /> : null}

      {usersQuery.isError ? (
        <AdminErrorPanel
          title="无法加载用户"
          description={getErrorDescription(usersQuery.error)}
          action={
            <Button variant="ghost" size="sm" onClick={() => usersQuery.refetch()}>
              重试
            </Button>
          }
        />
      ) : null}

      {usersQuery.isSuccess && users.length === 0 ? (
        <AdminEmptyPanel
          title="没有匹配用户"
          description={
            query ? "换一个用户名、用户 ID 或切换状态后再试。" : "切换状态或稍后刷新。"
          }
        />
      ) : null}

      {users.length > 0 ? (
        <>
          <div className="border-b border-border">
            {users.map((user, index) => {
              const platformRole = resolvePlatformRole(user);

              return (
                <AdminResourceRow
                  key={user.id}
                  index={offset + index}
                  isSelected={selectedUser?.id === user.id}
                  onSelect={() => setSelectedUserId(user.id)}
                  icon={<UserCog className="size-4" aria-hidden="true" />}
                  title={`@${user.username}`}
                  tokens={
                    <>
                      <StatusToken tone={getAdminUserStatusTone(user.status)}>
                        {formatAdminUserStatus(user.status)}
                      </StatusToken>
                      <StatusToken tone={getPlatformRoleTone(platformRole)}>
                        {formatPlatformRole(platformRole)}
                      </StatusToken>
                      {!user.platform_role && user.is_platform_staff ? (
                        <StatusToken>兼容权限</StatusToken>
                      ) : null}
                    </>
                  }
                  meta={`创建 ${formatDateTime(user.created_at)} · 更新 ${formatDateTime(user.updated_at)} · ${formatShortId(user.id)}`}
                  actions={<StatusToken>详情</StatusToken>}
                />
              );
            })}
          </div>
          <AdminPagination
            hasMore={usersQuery.data?.has_more ?? false}
            isFetching={usersQuery.isFetching}
            offset={offset}
            pageSize={PAGE_SIZE}
            onJump={(nextOffset) => {
              setOffset(nextOffset);
              setSelectedUserId(null);
            }}
            onNext={() => {
              setOffset(usersQuery.data?.next_offset ?? offset + PAGE_SIZE);
              setSelectedUserId(null);
            }}
            onPrevious={() => {
              setOffset(Math.max(0, offset - PAGE_SIZE));
              setSelectedUserId(null);
            }}
          />
        </>
      ) : null}
    </AdminQueueLayout>
  );
}

function UserDetailRail({
  actorRole,
  canManagePlatformRoles,
  user,
}: {
  actorRole: PlatformRole | null;
  canManagePlatformRoles: boolean;
  user: AdminUser | null;
}) {
  const platformRole = resolvePlatformRole(user);

  return (
    <>
      <AdminDetailRail title="用户上下文" emptyTitle="选择用户">
        {user ? (
          <div className="space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusToken tone={getAdminUserStatusTone(user.status)}>
                  {formatAdminUserStatus(user.status)}
                </StatusToken>
                <StatusToken tone={getPlatformRoleTone(platformRole)}>
                  {formatPlatformRole(platformRole)}
                </StatusToken>
              </div>
              <h3 className="mt-3 break-words text-lg font-semibold">
                @{user.username}
              </h3>
              <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                {user.id}
              </p>
            </div>
            <dl className="divide-y divide-border border-y border-border">
              <InfoRow label="创建" value={formatDateTime(user.created_at)} />
              <InfoRow label="更新" value={formatDateTime(user.updated_at)} />
              <InfoRow
                label="兼容 staff"
                value={user.is_platform_staff ? "是" : "否"}
              />
            </dl>
            <div className="grid gap-2">
              <UserPlatformRoleAction
                canManage={canManagePlatformRoles}
                key={`${user.id}:${platformRole ?? "none"}`}
                user={user}
              />
              <AdminUserSanctionsAction actorRole={actorRole} user={user} />
              <UserStatusAction
                actorRole={actorRole}
                key={`${user.id}:${user.status}:${actorRole ?? "none"}`}
                user={user}
              />
            </div>
          </div>
        ) : null}
      </AdminDetailRail>

      <AdminRailSection title="权限边界">
        <p className="text-sm leading-6 text-muted-foreground">
          只有站点负责人可以调整平台管理员和平台审核员。站点负责人本身不在这里提权或解除，需要单独所有权转移、部署初始化或离线恢复。
        </p>
      </AdminRailSection>

      <AdminRailSection title="相关入口">
        <div className="flex flex-col border-t border-border">
          <TextAction href="/admin/growth" variant="bar">
            积分与头衔
          </TextAction>
          <TextAction href="/admin/owner-transfer" variant="bar">
            负责人交接
          </TextAction>
          <AdminAuditLink targetType="user" targetId={user?.id} />
        </div>
      </AdminRailSection>
    </>
  );
}

function UserPlatformRoleAction({
  canManage,
  user,
}: {
  canManage: boolean;
  user: AdminUser;
}) {
  const [open, setOpen] = useState(false);
  const [nextRole, setNextRole] = useState<EditablePlatformRole | null>(
    getEditablePlatformRole(user),
  );
  const [message, setMessage] = useState<string | null>(null);
  const mutation = useUpdateAdminUserPlatformRoleMutation();
  const currentRole = resolvePlatformRole(user);

  if (!canManage) {
    return (
      <p className="text-xs leading-5 text-muted-foreground">
        当前角色不能调整平台角色。
      </p>
    );
  }

  if (currentRole === "owner") {
    return (
      <p className="text-xs leading-5 text-muted-foreground">
        站点负责人不在用户队列中变更。
      </p>
    );
  }

  async function submit() {
    await mutation.mutateAsync({
      id: user.id,
      input: { role: nextRole },
    });
    setMessage(`已将 @${user.username} 设为${formatPlatformRole(nextRole)}。`);
    setOpen(false);
  }

  return (
    <>
      {message ? <Alert variant="success"><AlertTitle>角色已更新</AlertTitle><AlertDescription>{message}</AlertDescription></Alert> : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={mutation.isPending}
          onClick={() => {
            setMessage(null);
            setNextRole(getEditablePlatformRole(user));
            setOpen(true);
          }}
        >
          <ShieldCheck className="size-4" aria-hidden="true" />
          调整角色
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>调整平台角色</DialogTitle>
            <DialogDescription>
              目标账号 @{user.username} 当前为{formatPlatformRole(currentRole)}。这里只能设置平台管理员、平台审核员或移除平台权限；站点负责人变更不走普通提权按钮。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {editablePlatformRoles.map((role) => (
              <button
                key={role.value ?? "none"}
                type="button"
                aria-pressed={nextRole === role.value}
                className={`border px-3 py-2 text-left text-sm transition-colors hover:border-primary hover:text-foreground ${
                  nextRole === role.value
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground"
                }`}
                onClick={() => setNextRole(role.value)}
              >
                <span className="block font-semibold">{role.label}</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {role.description}
                </span>
              </button>
            ))}
          </div>
          {mutation.error ? (
            <Alert variant="destructive">
              <AlertTitle>操作失败</AlertTitle>
              <AlertDescription>{getErrorDescription(mutation.error)}</AlertDescription>
            </Alert>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={mutation.isPending}
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              variant={nextRole ? "default" : "destructive"}
              disabled={mutation.isPending || nextRole === currentRole}
              onClick={submit}
            >
              {mutation.isPending ? "提交中..." : "确认调整"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function UserStatusAction({
  actorRole,
  user,
}: {
  actorRole: PlatformRole | null;
  user: AdminUser;
}) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const mutation = useUpdateAdminUserMutation();
  const platformRole = resolvePlatformRole(user);
  const nextStatus = user.status === "disabled" ? "active" : "disabled";
  const canUpdateStatus = canUpdateUserStatus(actorRole, platformRole);

  if (platformRole === "owner") {
    return (
      <p className="text-xs leading-5 text-muted-foreground">
        站点负责人账号状态不在此处变更。
      </p>
    );
  }

  if (user.status === "deleted") {
    return (
      <p className="text-xs leading-5 text-muted-foreground">
        已注销账号不可恢复。
      </p>
    );
  }

  if (!canUpdateStatus) {
    return (
      <p className="text-xs leading-5 text-muted-foreground">
        平台角色账号状态需站点负责人处理。
      </p>
    );
  }

  async function submit() {
    await mutation.mutateAsync({
      id: user.id,
      input: { status: nextStatus },
    });
    setMessage(`已${nextStatus === "active" ? "恢复" : "禁用"} @${user.username}。`);
    setOpen(false);
  }

  return (
    <>
      {message ? <Alert variant="success"><AlertTitle>状态已更新</AlertTitle><AlertDescription>{message}</AlertDescription></Alert> : null}
      <AdminActionDialog
        open={open}
        onOpenChange={setOpen}
        title={nextStatus === "active" ? "恢复用户" : "禁用用户"}
        description={`将 @${user.username} 的状态改为${formatAdminUserStatus(nextStatus)}。平台角色变更走单独角色按钮，账号处罚走处罚记录入口。`}
        confirmLabel="确认"
        confirmVariant={nextStatus === "active" ? "default" : "destructive"}
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
              setOpen(true);
            }}
          >
            {nextStatus === "active" ? "恢复用户" : "禁用用户"}
          </Button>
        }
      />
    </>
  );
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}

function getEditablePlatformRole(user: AdminUser): EditablePlatformRole | null {
  const role = resolvePlatformRole(user);

  return role === "owner" ? null : role;
}

function canUpdateUserStatus(
  actorRole: PlatformRole | null,
  targetRole: PlatformRole | null,
) {
  if (actorRole === "owner") {
    return targetRole !== "owner";
  }

  if (actorRole === "admin") {
    return !targetRole;
  }

  return false;
}
