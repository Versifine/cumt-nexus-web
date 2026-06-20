"use client";

import { useState } from "react";
import { CheckCircle2, RefreshCw, ShieldAlert } from "lucide-react";

import {
  RightRail,
  RightRailAction,
  RightRailActionList,
  RightRailSection,
} from "@/components/app-shell/right-rail";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InfoRow, StatusToken } from "@/components/ui/data-display";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { ApiError } from "@/lib/api/client";

import {
  useAcceptCommunityOwnerTransferMutation,
  useCommunityOwnerTransferByIdQuery,
} from "./queries";

export function CommunityOwnerTransferAcceptPage({
  slug,
  transferId,
}: {
  slug: string;
  transferId: string;
}) {
  const { isReady, token } = useAuthSession();
  const currentUserQuery = useCurrentUserQuery();
  const [confirmed, setConfirmed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const mutation = useAcceptCommunityOwnerTransferMutation();
  const transferQuery = useCommunityOwnerTransferByIdQuery(
    {
      slug,
      transfer_id: transferId,
    },
    Boolean(token),
  );
  const transfer = transferQuery.data?.transfer ?? mutation.data?.transfer ?? null;
  const currentUser = currentUserQuery.data;
  const isPendingTransfer = transfer?.status === "pending";
  const isTargetUser = transfer
    ? currentUser?.id === transfer.to_user_id || currentUser?.username === transfer.to_username
    : true;
  const canShowSubmit =
    Boolean(transfer) &&
    isPendingTransfer &&
    isTargetUser &&
    !mutation.isSuccess;
  const loginHref = `/login?next=${encodeURIComponent(
    `/communities/${slug}/owner-transfer/${transferId}/accept`,
  )}`;

  async function acceptTransfer() {
    setFormError(null);

    if (!transfer) {
      setFormError("无法确认这次版主交接，请刷新后重试。");
      return;
    }

    if (!isPendingTransfer) {
      setFormError(`这次版主交接${formatTransferStatus(transfer.status)}，不能再接受。`);
      return;
    }

    if (!isTargetUser) {
      setFormError("当前账号不是这次交接的目标账号。");
      return;
    }

    if (!confirmed) {
      setFormError("请先确认接受后会成为该社区唯一版主。");
      return;
    }

    await mutation.mutateAsync({
      slug,
      transfer_id: transferId,
    });
  }

  if (!isReady || (token && (currentUserQuery.isLoading || transferQuery.isLoading))) {
    return (
      <section className="border-b border-border py-4">
        <LoadingState rows={5} />
      </section>
    );
  }

  if (!token) {
    return (
      <section className="border-b border-border py-4">
        <EmptyState
          title="登录后接受社区版主交接"
          description="只有交接目标账号可以接受这次版主转让。登录后会回到当前页面。"
          action={
            <TextAction href={loginHref} tone="primary">
              登录
            </TextAction>
          }
        />
      </section>
    );
  }

  if (currentUserQuery.isError) {
    return (
      <section className="border-b border-border py-4">
        <ErrorState
          title="无法确认用户身份"
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
      </section>
    );
  }

  if (transferQuery.isError) {
    return (
      <section className="border-b border-border py-4">
        <ErrorState
          title="无法读取版主交接"
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
      </section>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-0 xl:grid-cols-[minmax(0,1fr)_280px]">
      <section className="min-w-0">
        <div className="border-b border-border py-4">
          <StatusToken tone="primary">社区版主交接</StatusToken>
          <h1 className="mt-3 text-xl font-semibold leading-7 tracking-normal sm:text-2xl">
            接受 /{slug} 版主交接
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            这里只处理已经创建的社区版主交接。接受前会检查当前账号是否为目标账号。
          </p>
        </div>

        <section className="border-b border-border py-4">
          <div className="grid grid-cols-1 border-y border-border sm:grid-cols-2">
            <InfoRow label="社区" value={`/${slug}`} />
            <InfoRow label="交接编号" value={transferId} wrap />
            <InfoRow
              label="状态"
              value={transfer ? formatTransferStatus(transfer.status) : "无法读取"}
            />
            <InfoRow
              label="目标账号"
              value={transfer ? `@${getTransferTargetLabel(transfer)}` : "无法读取"}
              wrap
            />
          </div>

          <div className="mt-4 grid gap-3 px-3">
            {transfer && !isPendingTransfer ? (
              <Alert>
                <AlertTitle>交接不可接受</AlertTitle>
                <AlertDescription>
                  当前交接状态为{formatTransferStatus(transfer.status)}，页面不再显示提交入口。
                </AlertDescription>
              </Alert>
            ) : null}

            {transfer && isPendingTransfer && !isTargetUser ? (
              <Alert variant="destructive">
                <AlertTitle>当前账号不是目标账号</AlertTitle>
                <AlertDescription>
                  这次交接目标是 @{getTransferTargetLabel(transfer)}。请切换到目标账号后再接受。
                </AlertDescription>
              </Alert>
            ) : null}

            <label className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-primary"
                checked={confirmed}
                disabled={!canShowSubmit || mutation.isPending || mutation.isSuccess}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              <span>
                我确认正在使用目标账号接受交接；如果当前账号不是目标账号，后端会拒绝这次操作。
              </span>
            </label>

            {formError || mutation.error ? (
              <Alert variant="destructive">
                <AlertTitle>无法接受交接</AlertTitle>
                <AlertDescription>
                  {formError ?? getErrorDescription(mutation.error)}
                </AlertDescription>
              </Alert>
            ) : null}

            {mutation.isSuccess ? (
              <Alert variant="success">
                <AlertTitle>交接已完成</AlertTitle>
                <AlertDescription>
                  当前账号已成为 /{mutation.data.community.slug} 的社区版主。
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              {canShowSubmit ? (
                <Button
                  type="button"
                  disabled={!confirmed || mutation.isPending}
                  onClick={acceptTransfer}
                >
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  {mutation.isPending ? "提交中" : "接受交接"}
                </Button>
              ) : null}
              {mutation.isSuccess ? (
                <TextAction
                  href={`/communities/${encodeURIComponent(mutation.data.community.slug)}/manage`}
                  tone="primary"
                >
                  进入社区管理
                </TextAction>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => transferQuery.refetch()}
              >
                <RefreshCw
                  className={
                    transferQuery.isFetching ? "size-4 animate-spin" : "size-4"
                  }
                  aria-hidden="true"
                />
                刷新交接
              </Button>
            </div>
          </div>
        </section>
      </section>

      <RightRail>
        <RightRailSection
          title={
            <span className="inline-flex items-center gap-2">
              <ShieldAlert className="size-4 text-primary" aria-hidden="true" />
              权限边界
            </span>
          }
          description="社区版主转让必须由原版主创建，并由目标账号接受。平台接管异常社区走平台社区管理页。"
        />
        <RightRailSection title="相关入口">
          <RightRailActionList>
            <RightRailAction href={`/communities/${encodeURIComponent(slug)}`}>
              社区主页
            </RightRailAction>
            <RightRailAction href="/communities">浏览社区</RightRailAction>
            <RightRailAction href="/communities/owner-transfers">
              待接受交接
            </RightRailAction>
            <button
              type="button"
              className="nexus-micro-lift group my-0.5 flex min-h-11 items-center gap-2 rounded-md bg-surface-raised px-3 py-3 text-left text-sm font-semibold text-foreground transition-colors first:mt-0 last:mb-0 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              onClick={() => currentUserQuery.refetch()}
            >
              <RefreshCw
                className={
                  currentUserQuery.isFetching ? "size-4 animate-spin" : "size-4"
                }
                aria-hidden="true"
              />
              刷新身份
            </button>
          </RightRailActionList>
        </RightRailSection>
      </RightRail>
    </div>
  );
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}

function getTransferTargetLabel(transfer: {
  to_display_name?: string;
  to_username?: string;
  to_user_id: string;
}) {
  return transfer.to_display_name || transfer.to_username || transfer.to_user_id;
}

function formatTransferStatus(status: string) {
  switch (status) {
    case "pending":
      return "等待接受";
    case "accepted":
      return "已接受";
    case "cancelled":
      return "已取消";
    case "expired":
      return "已过期";
    default:
      return status;
  }
}
