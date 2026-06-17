"use client";

import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { InfoRow, StatusToken } from "@/components/ui/data-display";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { ApiError } from "@/lib/api/client";

import { useIncomingCommunityOwnerTransfersQuery } from "./queries";
import type { IncomingCommunityOwnerTransfer } from "./types";

const PAGE_SIZE = 20;
const OWNER_TRANSFER_INBOX_PATH = "/communities/owner-transfers";
const OWNER_TRANSFER_LOGIN_HREF = `/login?next=${encodeURIComponent(
  OWNER_TRANSFER_INBOX_PATH,
)}`;

export function CommunityOwnerTransferInboxPage() {
  const { isReady, token } = useAuthSession();
  const [offset, setOffset] = useState(0);
  const incomingTransfersQuery = useIncomingCommunityOwnerTransfersQuery(
    {
      status: "pending",
      limit: PAGE_SIZE,
      offset,
    },
    isReady && Boolean(token),
  );
  const transfers = incomingTransfersQuery.data?.transfers ?? [];
  const hasPrevious = offset > 0;
  const hasNext = Boolean(incomingTransfersQuery.data?.has_more);

  if (!isReady) {
    return (
      <section className="border-b border-border py-4">
        <LoadingState rows={4} />
      </section>
    );
  }

  if (!token) {
    return (
      <section className="border-b border-border py-4">
        <EmptyState
          title="登录后查看版主交接"
          description="如果某个社区把版主交接给你，这里会显示待接受请求。"
          action={
            <TextAction href={OWNER_TRANSFER_LOGIN_HREF} tone="primary">
              登录
            </TextAction>
          }
        />
      </section>
    );
  }

  return (
    <section className="min-w-0">
      <div className="border-b border-border py-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusToken tone="primary">待处理</StatusToken>
          <StatusToken>社区版主交接</StatusToken>
        </div>
        <div className="mt-3 flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold leading-7 tracking-normal sm:text-2xl">
              待接受版主交接
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              这里集中展示当前账号作为目标账号的社区版主交接请求。接受后，你会成为对应社区的版主。
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit"
            onClick={() => incomingTransfersQuery.refetch()}
          >
            <RefreshCw
              className={
                incomingTransfersQuery.isFetching ? "size-4 animate-spin" : "size-4"
              }
              aria-hidden="true"
            />
            刷新
          </Button>
        </div>
      </div>

      {incomingTransfersQuery.isLoading ? (
        <div className="border-b border-border py-5">
          <LoadingState rows={5} />
        </div>
      ) : null}

      {incomingTransfersQuery.isError ? (
        <ErrorState
          title="无法读取待接受交接"
          description={getErrorDescription(incomingTransfersQuery.error)}
          action={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => incomingTransfersQuery.refetch()}
            >
              重试
            </Button>
          }
        />
      ) : null}

      {!incomingTransfersQuery.isLoading &&
      !incomingTransfersQuery.isError &&
      transfers.length === 0 ? (
        <EmptyState
          title="暂无待接受版主交接"
          description="当社区版主把社区交接给你时，请求会出现在这里和左侧导航的待处理区。"
        />
      ) : null}

      {transfers.length > 0 ? (
        <div className="divide-y divide-border border-b border-border">
          {transfers.map((transfer, index) => (
            <IncomingTransferRow
              key={transfer.id}
              index={offset + index + 1}
              transfer={transfer}
            />
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4">
        <div className="text-sm text-muted-foreground">
          第 {offset + 1} - {offset + transfers.length} 项
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!hasPrevious || incomingTransfersQuery.isFetching}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            上一页
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!hasNext || incomingTransfersQuery.isFetching}
            onClick={() => setOffset(incomingTransfersQuery.data?.next_offset ?? offset + PAGE_SIZE)}
          >
            下一页
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
}

function IncomingTransferRow({
  index,
  transfer,
}: {
  index: number;
  transfer: IncomingCommunityOwnerTransfer;
}) {
  const community = transfer.community;
  const acceptHref = `/communities/${encodeURIComponent(
    community.slug,
  )}/owner-transfer/${encodeURIComponent(transfer.id)}/accept`;

  return (
    <Link
      href={acceptHref}
      className="group grid min-w-0 gap-3 py-4 text-sm transition-colors hover:bg-muted/30 sm:grid-cols-[48px_minmax(0,1fr)_auto]"
    >
      <div className="font-mono text-xs text-primary">
        {String(index).padStart(2, "0")}
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <h2 className="min-w-0 break-words text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
            {community.name}
          </h2>
          <StatusToken tone="warning">等待接受</StatusToken>
        </div>
        <p className="mt-2 break-words text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
          /{community.slug} 的当前版主发起了交接，请打开详情确认目标账号与交接状态。
        </p>
        <div className="mt-3 grid grid-cols-1 border-y border-border sm:grid-cols-3">
          <InfoRow label="发起人" value={formatUserLabel(transfer, "from")} wrap />
          <InfoRow label="目标账号" value={formatUserLabel(transfer, "to")} wrap />
          <InfoRow label="过期时间" value={formatDateTime(transfer.expires_at)} wrap />
        </div>
      </div>
      <div className="flex items-center justify-start text-primary sm:justify-end">
        <span className="inline-flex items-center gap-2 text-sm font-medium">
          打开
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}

function formatUserLabel(
  transfer: IncomingCommunityOwnerTransfer,
  side: "from" | "to",
) {
  const displayName =
    side === "from" ? transfer.from_display_name : transfer.to_display_name;
  const username = side === "from" ? transfer.from_username : transfer.to_username;
  const id = side === "from" ? transfer.from_user_id : transfer.to_user_id;

  if (displayName && username) {
    return `${displayName} @${username}`;
  }

  if (displayName) {
    return displayName;
  }

  if (username) {
    return `@${username}`;
  }

  return id;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "未返回";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}
