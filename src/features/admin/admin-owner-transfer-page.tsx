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
import { resolvePlatformRole } from "@/features/auth/platform-role";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { ApiError } from "@/lib/api/client";

import { formatDateTime, formatPlatformRole } from "./display";
import {
  useAcceptOwnerTransferMutation,
  useAdminOwnerTransferQuery,
  useCancelAdminOwnerTransferMutation,
  useCreateAdminOwnerTransferMutation,
  useOwnerTransferQuery,
} from "./queries";
import type { AdminOwnerTransfer } from "./types";

type OwnerTransferAcceptPageProps = {
  transferId?: string;
};

export function AdminOwnerTransferPage() {
  const { isReady, token } = useAuthSession();
  const currentUserQuery = useCurrentUserQuery();
  const ownerTransferQuery = useAdminOwnerTransferQuery(isReady && Boolean(token));
  const platformRole = resolvePlatformRole(currentUserQuery.data);
  const transfer = ownerTransferQuery.data?.transfer ?? null;
  const isOwner = platformRole === "owner";

  return (
    <OwnerTransferLayout>
      <div className="border-b border-border py-4">
        <div className="flex flex-wrap items-center gap-2">
          <KeyRound className="size-4 text-primary" aria-hidden="true" />
          <StatusToken tone="danger">独立交接合同</StatusToken>
          <StatusToken>{formatPlatformRole(platformRole)}</StatusToken>
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

      {isReady && token && ownerTransferQuery.isPending ? (
        <div className="border-b border-border py-4">
          <LoadingState rows={4} />
        </div>
      ) : null}

      {isReady && token && ownerTransferQuery.isError ? (
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

      {ownerTransferQuery.isSuccess ? (
        <div className="grid gap-4 border-b border-border py-4">
          {transfer ? <OwnerTransferSummary transfer={transfer} /> : null}
          {transfer?.status === "pending" ? (
            <CancelOwnerTransferPanel transfer={transfer} />
          ) : isOwner ? (
            <CreateOwnerTransferForm />
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
      <div className="border-b border-border py-4">
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

      {isReady && token && transferQuery.isPending ? (
        <div className="border-b border-border py-4">
          <LoadingState rows={4} />
        </div>
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

      {isReady && token && transferQuery.isSuccess && transfer ? (
        <div className="grid gap-4 border-b border-border py-4">
          <OwnerTransferSummary transfer={transfer} />
          <AcceptOwnerTransferForm transfer={transfer} />
        </div>
      ) : null}
    </OwnerTransferLayout>
  );
}

function CreateOwnerTransferForm() {
  const mutation = useCreateAdminOwnerTransferMutation();
  const [targetUserId, setTargetUserId] = useState("");
  const [previousOwnerRole, setPreviousOwnerRole] = useState<"admin" | "none">(
    "admin",
  );
  const [reason, setReason] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!targetUserId.trim() || !reason.trim() || !currentPassword) {
      setFormError("请填写目标用户 ID、交接原因和当前密码。");
      return;
    }

    await mutation.mutateAsync({
      current_password: currentPassword,
      previous_owner_role: previousOwnerRole === "admin" ? "admin" : null,
      reason: reason.trim(),
      target_user_id: targetUserId.trim(),
    });
    setTargetUserId("");
    setReason("");
    setCurrentPassword("");
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
      <Input
        value={targetUserId}
        onChange={(event) => setTargetUserId(event.target.value)}
        placeholder="目标用户 ID"
        disabled={mutation.isPending}
        aria-label="目标用户 ID"
      />
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
      {formError || mutation.error ? (
        <Alert variant="destructive">
          <AlertTitle>发起失败</AlertTitle>
          <AlertDescription>
            {formError ?? getErrorDescription(mutation.error)}
          </AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" disabled={mutation.isPending}>
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
    <div className="grid gap-3 border-t border-border pt-4">
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
  transfer,
}: {
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

    await mutation.mutateAsync({
      transferId: transfer.id,
      input: { current_password: currentPassword },
    });
    setCurrentPassword("");
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
        disabled={!isPendingTransfer || mutation.isPending}
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
      <Button type="submit" disabled={!isPendingTransfer || mutation.isPending}>
        {mutation.isPending ? "提交中..." : "接受交接"}
      </Button>
    </form>
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
      <dl className="mt-4 grid grid-cols-1 border-y border-border sm:grid-cols-2">
        <InfoRow
          className="px-3 sm:border-r sm:border-border"
          label="发起人"
          value={`@${transfer.initiated_by_username}`}
        />
        <InfoRow
          className="px-3"
          label="目标账号"
          value={`@${transfer.target_username}`}
        />
        <InfoRow
          className="px-3 sm:border-r sm:border-border"
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
        <div className="mt-3 border-t border-border pt-3">
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
  return <section className="min-w-0">{children}</section>;
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
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
