"use client";

import { useState } from "react";
import { Ban, FileClock, RotateCcw } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  InfoRow,
  StatusToken,
  type StatusTokenTone,
} from "@/components/ui/data-display";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";

import {
  formatDateTime,
  formatPlatformRole,
  getPlatformRoleTone,
  resolvePlatformRole,
} from "./display";
import {
  useAdminUserSanctionsQuery,
  useCreateAdminUserSanctionMutation,
  useRevokeAdminUserSanctionMutation,
} from "./queries";
import type {
  AdminUser,
  AdminUserSanction,
  CreateAdminUserSanctionInput,
  PlatformRole,
} from "./types";

type SanctionDuration = CreateAdminUserSanctionInput["duration"];

const sanctionDurations: Array<{ label: string; value: SanctionDuration }> = [
  { label: "1 天", value: "1d" },
  { label: "3 天", value: "3d" },
  { label: "7 天", value: "7d" },
  { label: "30 天", value: "30d" },
  { label: "永久", value: "permanent" },
];

export function AdminUserSanctionsAction({
  actorRole,
  user,
}: {
  actorRole: PlatformRole | null;
  user: AdminUser;
}) {
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState<SanctionDuration>("7d");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [revokeCandidate, setRevokeCandidate] = useState<string | null>(null);
  const sanctionsQuery = useAdminUserSanctionsQuery(
    user.id,
    { limit: 20, offset: 0 },
    open,
  );
  const createMutation = useCreateAdminUserSanctionMutation();
  const revokeMutation = useRevokeAdminUserSanctionMutation();
  const targetRole = resolvePlatformRole(user);
  const canCreate = canCreateSanction(actorRole, targetRole);

  async function createSanction() {
    setFormError(null);

    if (!reason.trim()) {
      setFormError("请输入封禁原因。");
      return;
    }

    if (!confirmed) {
      setFormError("请先确认本次封禁会限制目标账号登录和受保护操作。");
      return;
    }

    await createMutation.mutateAsync({
      input: {
        duration,
        reason: reason.trim(),
        type: "account_ban",
      },
      userId: user.id,
    });
    setReason("");
    setConfirmed(false);
  }

  async function revokeSanction(sanctionId: string) {
    await revokeMutation.mutateAsync({
      sanctionId,
      userId: user.id,
    });
    setRevokeCandidate(null);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setFormError(null);
          setOpen(true);
        }}
      >
        <FileClock className="size-4" aria-hidden="true" />
        处罚记录
      </Button>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>用户处罚记录</DialogTitle>
          <DialogDescription>
            查看 @{user.username} 的账号处罚；封禁和解除封禁都会写入平台审计。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-1 border-y border-border sm:grid-cols-3">
            <InfoRow label="目标账号" value={`@${user.username}`} />
            <InfoRow label="当前角色" value={formatPlatformRole(targetRole)} />
            <InfoRow label="账号状态" value={user.status} />
          </div>

          {canCreate ? (
            <section className="grid gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <Ban className="size-4 text-primary" aria-hidden="true" />
                <h3 className="text-sm font-semibold">创建账号封禁</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {sanctionDurations.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={duration === option.value}
                    className={`min-h-9 border px-3 text-sm transition-colors hover:border-primary hover:text-foreground ${
                      duration === option.value
                        ? "border-primary text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                    disabled={createMutation.isPending}
                    onClick={() => setDuration(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <Textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="写清封禁原因，便于后续审计和复核。"
                disabled={createMutation.isPending}
              />
              <label className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-primary"
                  checked={confirmed}
                  disabled={createMutation.isPending}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                <span>
                  我确认本次账号封禁会限制目标账号登录和受保护接口；临时封禁到期由后端按读取语义显示为过期。
                </span>
              </label>
              {formError || createMutation.error ? (
                <Alert variant="destructive">
                  <AlertTitle>无法创建封禁</AlertTitle>
                  <AlertDescription>
                    {formError ?? getErrorDescription(createMutation.error)}
                  </AlertDescription>
                </Alert>
              ) : null}
              {createMutation.isSuccess ? (
                <Alert variant="success">
                  <AlertTitle>封禁已创建</AlertTitle>
                  <AlertDescription>
                    处罚记录已刷新；如果目标账号仍在会话中，后端会在后续受保护请求中拦截。
                  </AlertDescription>
                </Alert>
              ) : null}
              <div>
                <Button
                  type="button"
                  size="sm"
                  disabled={createMutation.isPending}
                  onClick={createSanction}
                >
                  {createMutation.isPending ? "提交中..." : "确认封禁"}
                </Button>
              </div>
            </section>
          ) : (
            <Alert>
              <AlertTitle>当前角色不能创建封禁</AlertTitle>
              <AlertDescription>
                {formatPlatformRole(actorRole)}不能封禁
                <span className="mx-1">
                  <StatusToken tone={getPlatformRoleTone(targetRole)}>
                    {formatPlatformRole(targetRole)}
                  </StatusToken>
                </span>
                账号；仍可查看既有处罚记录。
              </AlertDescription>
            </Alert>
          )}

          <section>
            <h3 className="text-sm font-semibold">历史处罚</h3>
            <div className="mt-3">
              {sanctionsQuery.isPending ? <LoadingState rows={4} /> : null}
              {sanctionsQuery.isError ? (
                <ErrorState
                  title="无法加载处罚记录"
                  description={getErrorDescription(sanctionsQuery.error)}
                  action={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => sanctionsQuery.refetch()}
                    >
                      重试
                    </Button>
                  }
                />
              ) : null}
              {sanctionsQuery.isSuccess &&
              sanctionsQuery.data.sanctions.length === 0 ? (
                <EmptyState
                  title="暂无处罚记录"
                  description="当前用户没有可展示的账号处罚。"
                />
              ) : null}
              {sanctionsQuery.isSuccess &&
              sanctionsQuery.data.sanctions.length > 0 ? (
                <div className="divide-y divide-border border-t border-border">
                  {sanctionsQuery.data.sanctions.map((sanction) => (
                    <SanctionRow
                      canRevoke={canCreate && sanction.status === "active"}
                      isRevoking={
                        revokeMutation.isPending &&
                        revokeCandidate === sanction.id
                      }
                      onCancelRevoke={() => setRevokeCandidate(null)}
                      key={sanction.id}
                      onRevoke={() => revokeSanction(sanction.id)}
                      onSelectRevoke={() => setRevokeCandidate(sanction.id)}
                      revokeSelected={revokeCandidate === sanction.id}
                      sanction={sanction}
                    />
                  ))}
                </div>
              ) : null}
              {revokeMutation.error ? (
                <div className="mt-3">
                  <Alert variant="destructive">
                    <AlertTitle>解除封禁失败</AlertTitle>
                    <AlertDescription>
                      {getErrorDescription(revokeMutation.error)}
                    </AlertDescription>
                  </Alert>
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SanctionRow({
  canRevoke,
  isRevoking,
  onCancelRevoke,
  onRevoke,
  onSelectRevoke,
  revokeSelected,
  sanction,
}: {
  canRevoke: boolean;
  isRevoking: boolean;
  onCancelRevoke: () => void;
  onRevoke: () => void;
  onSelectRevoke: () => void;
  revokeSelected: boolean;
  sanction: AdminUserSanction;
}) {
  return (
    <div className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusToken tone={getSanctionStatusTone(sanction.status)}>
            {formatSanctionStatus(sanction.status)}
          </StatusToken>
          <span className="font-mono text-xs text-muted-foreground">
            {sanction.id.slice(0, 8)}
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-foreground">
          {sanction.reason}
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {formatDateTime(sanction.starts_at)} 开始，
          {sanction.expires_at
            ? `${formatDateTime(sanction.expires_at)} 到期`
            : "永久有效"}
          {sanction.revoked_at
            ? `；已于 ${formatDateTime(sanction.revoked_at)} 解除`
            : null}
        </p>
      </div>
      {canRevoke ? (
        <div className="flex flex-col items-start gap-2 sm:items-end">
          {revokeSelected ? (
            <>
              <p className="max-w-44 text-xs leading-5 text-muted-foreground">
                确认提前解除这条 active 封禁。
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isRevoking}
                  onClick={onCancelRevoke}
                >
                  取消
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={isRevoking}
                  onClick={onRevoke}
                >
                  {isRevoking ? "提交中..." : "确认解除"}
                </Button>
              </div>
            </>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onSelectRevoke}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              解除
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function canCreateSanction(
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

function formatSanctionStatus(status: string) {
  switch (status) {
    case "active":
      return "生效中";
    case "revoked":
      return "已解除";
    case "expired":
      return "已过期";
    default:
      return status;
  }
}

function getSanctionStatusTone(status: string): StatusTokenTone {
  switch (status) {
    case "active":
      return "danger";
    case "revoked":
      return "default";
    case "expired":
      return "warning";
    default:
      return "default";
  }
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}
