"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { KeyRound, ShieldAlert } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InfoRow, StatusToken } from "@/components/ui/data-display";
import { Input } from "@/components/ui/input";
import { TextAction } from "@/components/ui/text-action";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSession } from "@/features/auth/auth-session";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { ApiError } from "@/lib/api/client";

import { AdminUserPicker } from "./admin-user-picker";
import { formatDateTime, formatPlatformRole } from "./display";
import {
  useAcceptOwnerTransferMutation,
  useAdminOwnerTransferQuery,
  useCancelAdminOwnerTransferMutation,
  useCreateAdminOwnerTransferMutation,
  useOwnerTransferQuery,
} from "./queries";
import type { AdminOwnerTransfer, AdminUser } from "./types";
import { useEffectiveAdminPlatformRole } from "./use-effective-platform-role";

type OwnerTransferAcceptPageProps = {
  transferId?: string;
};

export function AdminOwnerTransferPage() {
  const { isReady, token } = useAuthSession();
  const currentUserQuery = useCurrentUserQuery();
  const effectivePlatformRole = useEffectiveAdminPlatformRole(currentUserQuery.data);
  const platformRole = effectivePlatformRole.role;
  const isRoleCheckPending =
    isReady &&
    Boolean(token) &&
    (currentUserQuery.isLoading || effectivePlatformRole.isResolving);
  const canLoadOwnerTransfer =
    isReady &&
    Boolean(token) &&
    !isRoleCheckPending &&
    !currentUserQuery.isError &&
    Boolean(platformRole);
  const ownerTransferQuery = useAdminOwnerTransferQuery(canLoadOwnerTransfer);
  const transfer = ownerTransferQuery.data?.transfer ?? null;
  const isOwner = !isRoleCheckPending && platformRole === "owner";

  return (
    <OwnerTransferLayout>
      <div className="rounded-lg bg-surface p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <KeyRound className="size-4 text-primary" aria-hidden="true" />
          <StatusToken tone="danger">独立交接合同</StatusToken>
          <StatusToken>
            {isRoleCheckPending ? "确认负责人权限中" : formatPlatformRole(platformRole)}
          </StatusToken>
        </div>
        <h2 className="mt-3 text-base font-semibold leading-6">
          站点负责人交接
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          当前 owner 发起，目标账号接受。首个 owner bootstrap 和被盗号 recovery
          仍只走部署侧 CLI，不提供网页接管。
        </p>
      </div>

      {!isReady ? <LoadingState rows={4} /> : null}

      {isReady && !token ? (
        <EmptyState
          title="登录后处理负责人交接"
          description="站点负责人交接需要登录后由后端重新校验平台角色。"
          action={
            <TextAction href="/login?next=/admin/owner-transfer" tone="primary">
              登录
            </TextAction>
          }
        />
      ) : null}

      {isReady && token && isRoleCheckPending ? (
        <div className="rounded-lg bg-surface p-4 shadow-sm">
          <LoadingState rows={4} />
        </div>
      ) : null}

      {isReady && token && !isRoleCheckPending && currentUserQuery.isError ? (
        <ErrorState
          title="无法确认负责人权限"
          description={getErrorDescription(currentUserQuery.error)}
          action={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => currentUserQuery.refetch()}
            >
              重试
            </Button>
          }
        />
      ) : null}

      {isReady && token && !isRoleCheckPending && ownerTransferQuery.isPending ? (
        <div className="rounded-lg bg-surface p-4 shadow-sm">
          <LoadingState rows={4} />
        </div>
      ) : null}

      {isReady && token && !isRoleCheckPending && ownerTransferQuery.isError ? (
        <ErrorState
          title="无法读取负责人交接"
          description={getErrorDescription(ownerTransferQuery.error)}
          action={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => ownerTransferQuery.refetch()}
            >
              重试
            </Button>
          }
        />
      ) : null}

      {ownerTransferQuery.isSuccess && !isRoleCheckPending ? (
        <div className="grid gap-4 rounded-lg bg-surface p-4 shadow-sm">
          {transfer ? <OwnerTransferSummary transfer={transfer} /> : null}
          {transfer?.status === "pending" ? (
            isOwner ? (
              <CancelOwnerTransferPanel transfer={transfer} />
            ) : (
              <ReadOnlyOwnerTransferNotice />
            )
          ) : isOwner ? (
            <CreateOwnerTransferForm currentUser={currentUserQuery.data} />
          ) : (
            <Alert>
              <ShieldAlert className="size-4" aria-hidden="true" />
              <AlertTitle>只能由当前 owner 发起</AlertTitle>
              <AlertDescription>
                平台 admin 可以查看交接上下文，但不能发起站点负责人交接。
              </AlertDescription>
            </Alert>
          )}
        </div>
      ) : null}
    </OwnerTransferLayout>
  );
}

export function OwnerTransferAcceptPage({
  transferId,
}: OwnerTransferAcceptPageProps) {
  const { isReady, token } = useAuthSession();
  const currentUserQuery = useCurrentUserQuery();
  const transferQuery = useOwnerTransferQuery(
    transferId ?? "",
    isReady && Boolean(token) && Boolean(transferId),
  );
  const transfer = transferQuery.data?.transfer ?? null;

  if (!transferId) {
    return (
      <OwnerTransferLayout>
        <EmptyState
          title="缺少交接 ID"
          description="请从 owner 发出的交接链接进入接受页。"
          action={<TextAction href="/" tone="primary">返回首页</TextAction>}
        />
      </OwnerTransferLayout>
    );
  }

  return (
    <OwnerTransferLayout>
      <div className="rounded-lg bg-surface p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <KeyRound className="size-4 text-primary" aria-hidden="true" />
          <StatusToken tone="danger">接受负责人交接</StatusToken>
        </div>
        <h2 className="mt-3 text-base font-semibold leading-6">
          接受站点负责人交接
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          目标账号需要登录并输入当前密码。接受成功后，后端会在事务内保证唯一
          active owner，并刷新原 owner 的高危会话版本。
        </p>
      </div>

      {!isReady ? <LoadingState rows={4} /> : null}

      {isReady && !token ? (
        <EmptyState
          title="登录后接受交接"
          description="请使用交接目标账号登录后继续。"
          action={
            <TextAction
              href={`/login?next=${encodeURIComponent(`/owner-transfer/${transferId}`)}`}
              tone="primary"
            >
              登录
            </TextAction>
          }
        />
      ) : null}

      {isReady &&
      token &&
      (transferQuery.isPending || currentUserQuery.isLoading) ? (
        <div className="rounded-lg bg-surface p-4 shadow-sm">
          <LoadingState rows={4} />
        </div>
      ) : null}

      {isReady && token && currentUserQuery.isError ? (
        <ErrorState
          title="无法确认当前账号"
          description={getErrorDescription(currentUserQuery.error)}
          action={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => currentUserQuery.refetch()}
            >
              重试
            </Button>
          }
        />
      ) : null}

      {isReady && token && transferQuery.isError ? (
        <ErrorState
          title="无法读取交接"
          description={getErrorDescription(transferQuery.error)}
          action={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => transferQuery.refetch()}
            >
              重试
            </Button>
          }
        />
      ) : null}

      {isReady &&
      token &&
      transferQuery.isSuccess &&
      !currentUserQuery.isError &&
      transfer ? (
        <OwnerTransferAcceptWorkArea
          currentUser={currentUserQuery.data}
          transfer={transfer}
        />
      ) : null}
    </OwnerTransferLayout>
  );
}

function ReadOnlyOwnerTransferNotice() {
  return (
    <Alert>
      <ShieldAlert className="size-4" aria-hidden="true" />
      <AlertTitle>只能由当前 owner 取消</AlertTitle>
      <AlertDescription>
        平台 admin 可以查看交接上下文，但不能取消 pending 站点负责人交接。
      </AlertDescription>
    </Alert>
  );
}

function CreateOwnerTransferForm({
  currentUser,
}: {
  currentUser?: { id?: string; username?: string } | null;
}) {
  const mutation = useCreateAdminOwnerTransferMutation();
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [previousOwnerRole, setPreviousOwnerRole] = useState<"admin" | "none">(
    "admin",
  );
  const [reason, setReason] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!selectedUser || !reason.trim() || !currentPassword) {
      setFormError("请选择目标账号，并填写交接原因和当前密码。");
      return;
    }

    if (!confirmed) {
      setFormError("请先确认这会创建站点负责人交接请求。");
      return;
    }

    if (
      currentUser?.id === selectedUser.id ||
      (currentUser?.username &&
        currentUser.username.toLowerCase() === selectedUser.username.toLowerCase())
    ) {
      setFormError("目标账号不能是当前站点负责人，请选择另一个账号。");
      return;
    }

    try {
      await mutation.mutateAsync({
        current_password: currentPassword,
        previous_owner_role: previousOwnerRole === "admin" ? "admin" : null,
        reason: reason.trim(),
        target_user_id: selectedUser.id,
      });
      setSelectedUser(null);
      setReason("");
      setCurrentPassword("");
      setConfirmed(false);
    } catch {
      // mutation.error drives the visible error state.
    }
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div>
        <h3 className="text-sm font-semibold">发起交接</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          目标用户必须是 active 账号且不能是当前 owner；同一时间只允许一个 pending
          交接。
        </p>
      </div>
      <div className="grid gap-2">
        <AdminUserPicker
          disabled={mutation.isPending}
          label="目标账号"
          onChange={setSelectedUser}
          placeholder="搜索目标账号的用户名或昵称"
          value={selectedUser}
        />
      </div>
      <select
        className="h-10 rounded-lg border border-input bg-background-soft px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50"
        value={previousOwnerRole}
        onChange={(event) =>
          setPreviousOwnerRole(event.target.value === "admin" ? "admin" : "none")
        }
        disabled={mutation.isPending}
        aria-label="原 owner 接受后角色"
      >
        <option value="admin">原 owner 降为平台管理员</option>
        <option value="none">原 owner 降为普通用户</option>
      </select>
      <Textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="交接原因，最多 500 字"
        maxLength={500}
        disabled={mutation.isPending}
        aria-label="交接原因"
      />
      <Input
        type="password"
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
        placeholder="当前 owner 密码"
        autoComplete="current-password"
        disabled={mutation.isPending}
        aria-label="当前 owner 密码"
      />
      <p className="text-xs leading-5 text-muted-foreground">
        这里校验的是当前登录的站点负责人密码，不是目标账号密码。
      </p>
      <label className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-primary"
          checked={confirmed}
          disabled={mutation.isPending}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        <span>
          我确认这是站点负责人交接请求，目标账号接受后会成为唯一 active owner。
        </span>
      </label>
      {formError || mutation.error ? (
        <Alert variant="destructive">
          <AlertTitle>发起失败</AlertTitle>
          <AlertDescription>
            {formError ?? getErrorDescription(mutation.error)}
          </AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={mutation.isPending || !selectedUser}>
        {mutation.isPending ? "提交中..." : "发起负责人交接"}
      </Button>
    </form>
  );
}

function CancelOwnerTransferPanel({
  transfer,
}: {
  transfer: AdminOwnerTransfer;
}) {
  const mutation = useCancelAdminOwnerTransferMutation();

  return (
    <div className="grid gap-3 rounded-md bg-surface-raised p-3">
      <div>
        <h3 className="text-sm font-semibold">取消 pending 交接</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          取消后不会改变当前 owner，后端会更新交接状态。
        </p>
      </div>
      {mutation.error ? (
        <Alert variant="destructive">
          <AlertTitle>取消失败</AlertTitle>
          <AlertDescription>{getErrorDescription(mutation.error)}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        type="button"
        variant="destructive"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate(transfer.id)}
      >
        {mutation.isPending ? "提交中..." : "取消交接"}
      </Button>
    </div>
  );
}

function AcceptOwnerTransferForm({
  canAccept,
  transfer,
}: {
  canAccept: boolean;
  transfer: AdminOwnerTransfer;
}) {
  const mutation = useAcceptOwnerTransferMutation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const isPendingTransfer = transfer.status === "pending";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!currentPassword) {
      setFormError("请输入当前密码。");
      return;
    }

    try {
      await mutation.mutateAsync({
        transferId: transfer.id,
        input: { current_password: currentPassword },
      });
      setCurrentPassword("");
    } catch {
      // mutation.error drives the visible error state.
    }
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div>
        <h3 className="text-sm font-semibold">确认接受</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          只有目标账号 @{transfer.target_username} 可以接受这次交接。
        </p>
      </div>
      <Input
        type="password"
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
        placeholder="当前密码"
        autoComplete="current-password"
        disabled={!canAccept || !isPendingTransfer || mutation.isPending}
        aria-label="当前密码"
      />
      {formError || mutation.error ? (
        <Alert variant="destructive">
          <AlertTitle>接受失败</AlertTitle>
          <AlertDescription>
            {formError ?? getErrorDescription(mutation.error)}
          </AlertDescription>
        </Alert>
      ) : null}
      {mutation.isSuccess ? (
        <Alert variant="success">
          <AlertTitle>交接已接受</AlertTitle>
          <AlertDescription>站点负责人权限已由后端完成切换。</AlertDescription>
        </Alert>
      ) : null}
      {mutation.isSuccess ? (
        <TextAction href="/admin" tone="primary">
          进入平台管理
        </TextAction>
      ) : null}
      <Button
        type="submit"
        disabled={!canAccept || !isPendingTransfer || mutation.isPending}
      >
        {mutation.isPending ? "提交中..." : "接受交接"}
      </Button>
    </form>
  );
}

function OwnerTransferAcceptWorkArea({
  currentUser,
  transfer,
}: {
  currentUser?: { id?: string; username?: string } | null;
  transfer: AdminOwnerTransfer;
}) {
  const isPendingTransfer = transfer.status === "pending";
  const isTargetUser =
    currentUser?.id === transfer.target_user_id ||
    currentUser?.username === transfer.target_username;
  const canAccept = isPendingTransfer && isTargetUser;
  const terminalNotice = getOwnerTransferTerminalNotice(transfer.status);

  return (
    <div className="grid gap-4 rounded-lg bg-surface p-4 shadow-sm">
      <OwnerTransferSummary transfer={transfer} />
      {!isPendingTransfer ? (
        <Alert>
          <AlertTitle>{terminalNotice.title}</AlertTitle>
          <AlertDescription>{terminalNotice.description}</AlertDescription>
        </Alert>
      ) : null}
      {isPendingTransfer && !isTargetUser ? (
        <Alert variant="destructive">
          <AlertTitle>当前账号不是目标账号</AlertTitle>
          <AlertDescription>
            这次交接目标是 @{transfer.target_username}。请切换到目标账号后再接受。
          </AlertDescription>
        </Alert>
      ) : null}
      {canAccept ? (
        <AcceptOwnerTransferForm canAccept={canAccept} transfer={transfer} />
      ) : null}
    </div>
  );
}

function OwnerTransferSummary({
  transfer,
}: {
  transfer: AdminOwnerTransfer;
}) {
  return (
    <section>
      <div className="flex flex-wrap items-center gap-2">
        <StatusToken tone={getOwnerTransferStatusTone(transfer.status)}>
          {formatOwnerTransferStatus(transfer.status)}
        </StatusToken>
        <span className="font-mono text-xs text-primary">{transfer.id}</span>
      </div>
      <dl className="mt-4 grid grid-cols-1 gap-x-4 rounded-md bg-surface-raised px-3 sm:grid-cols-2">
        <InfoRow
          className="px-3"
          label="发起人"
          value={`@${transfer.initiated_by_username}`}
        />
        <InfoRow
          className="px-3"
          label="目标账号"
          value={`@${transfer.target_username}`}
        />
        <InfoRow
          className="px-3"
          label="原 owner 后续角色"
          value={formatPlatformRole(transfer.previous_owner_role || null)}
        />
        <InfoRow
          className="px-3"
          label="过期"
          value={formatDateTime(transfer.expires_at)}
        />
      </dl>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {transfer.reason}
      </p>
      {transfer.status === "pending" ? (
        <div className="mt-3">
          <TextAction
            href={`/owner-transfer/${encodeURIComponent(transfer.id)}`}
            tone="primary"
          >
            打开接受链接
          </TextAction>
        </div>
      ) : null}
    </section>
  );
}

function OwnerTransferLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <section className="min-w-0 space-y-4">{children}</section>;
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return getOwnerTransferApiErrorDescription(error);
  }

  return "请求失败，请稍后重试。";
}

function getOwnerTransferApiErrorDescription(error: ApiError) {
  const serverMessage = error.serverMessage.toLowerCase();

  if (serverMessage.includes("current password is invalid")) {
    return "当前密码不正确。这里需要输入当前登录账号的密码，不是目标账号密码。";
  }

  if (serverMessage.includes("platform owner required")) {
    return "后端确认当前账号不是 active 站点负责人，不能发起或取消负责人交接。请重新登录后再试；如果页面仍显示站点负责人，需要检查后端当前会话和平台角色是否一致。";
  }

  if (serverMessage.includes("target user must be different from current owner")) {
    return "目标账号不能是当前站点负责人。请重新选择要交接给的账号。";
  }

  if (serverMessage.includes("target user must be active")) {
    return "目标账号不是正常状态，不能接受站点负责人交接。请换一个 active 账号。";
  }

  if (serverMessage.includes("target user is already platform owner")) {
    return "目标账号已经是站点负责人，不能重复发起交接。";
  }

  if (serverMessage.includes("owner transfer already pending")) {
    return "当前已经有一条待接受的负责人交接。请先取消或等待它完成后再发起新的交接。";
  }

  if (serverMessage.includes("only target user can accept owner transfer")) {
    return "当前账号不是这次负责人交接的目标账号，请切换到目标账号后接受。";
  }

  if (serverMessage.includes("owner transfer is not pending")) {
    return "这条负责人交接已经不在待接受状态，不能继续操作。";
  }

  return error.message;
}

function formatOwnerTransferStatus(status: string) {
  switch (status) {
    case "pending":
      return "待接受";
    case "accepted":
      return "已接受";
    case "cancelled":
      return "已取消";
    case "expired":
      return "已过期";
    default:
      return status || "未知";
  }
}

function getOwnerTransferTerminalNotice(status: string) {
  switch (status) {
    case "accepted":
      return {
        title: "交接已完成",
        description:
          "这次站点负责人交接已经被目标账号接受，负责人权限已完成切换；同一链接不能再次提交。",
      };
    case "cancelled":
      return {
        title: "交接已取消",
        description:
          "这次站点负责人交接已由发起人或当前站点负责人取消。如果仍需要交接，请由当前站点负责人重新发起。",
      };
    case "expired":
      return {
        title: "交接已过期",
        description:
          "这次站点负责人交接已经超过有效期，不能再接受。需要交接时请让当前站点负责人重新发起。",
      };
    default:
      return {
        title: "交接不能继续",
        description: `当前交接状态为${formatOwnerTransferStatus(status)}，不能再提交接受操作。`,
      };
  }
}

function getOwnerTransferStatusTone(status: string) {
  switch (status) {
    case "pending":
      return "warning";
    case "accepted":
      return "success";
    case "cancelled":
    case "expired":
      return "default";
    default:
      return "default";
  }
}
