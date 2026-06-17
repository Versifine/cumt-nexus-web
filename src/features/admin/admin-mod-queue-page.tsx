"use client";

import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  FileClock,
  Flag,
  MessageSquareWarning,
  ShieldAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  InfoRow,
  StatusToken,
  type StatusTokenTone,
} from "@/components/ui/data-display";
import { TextAction } from "@/components/ui/text-action";
import { useCurrentUserQuery } from "@/features/auth/queries";
import {
  ModerationBulkActions,
  type ModerationBulkTarget,
} from "@/features/moderation/moderation-bulk-actions";
import { ModerationQuickActions } from "@/features/moderation/moderation-quick-actions";
import { useAdminModQueueQuery } from "@/features/moderation/queries";
import type {
  ModQueueItem,
  ModerationTargetType,
} from "@/features/moderation/types";
import { ApiError } from "@/lib/api/client";

import {
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
import { formatDateTime, formatShortId } from "./display";
import { useAdminAuditLogsQuery } from "./queries";
import { useEffectiveAdminPlatformRole } from "./use-effective-platform-role";

const PAGE_SIZE = 20;

type AdminModQueueKind =
  | "edited"
  | "needs_review"
  | "removed"
  | "reports"
  | "spam"
  | "unmoderated";

const queueTabs: Array<{
  description: string;
  label: string;
  value: AdminModQueueKind;
}> = [
  { description: "用户举报和目标预览。", label: "举报", value: "reports" },
  { description: "后端 spam 队列。", label: "垃圾", value: "spam" },
  { description: "已移除内容回看。", label: "已移除", value: "removed" },
  { description: "编辑后需要复核。", label: "已编辑", value: "edited" },
  { description: "尚未审核内容。", label: "未审核", value: "unmoderated" },
  {
    description: "算法或规则标记的重点项。",
    label: "需要关注",
    value: "needs_review",
  },
];

export function AdminModQueuePage() {
  const currentUserQuery = useCurrentUserQuery();
  const { role: platformRole } = useEffectiveAdminPlatformRole(currentUserQuery.data);
  const [activeQueue, setActiveQueue] =
    useState<AdminModQueueKind>("reports");
  const [offset, setOffset] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedTargetKeys, setSelectedTargetKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const queueQuery = useAdminModQueueQuery({
    limit: PAGE_SIZE,
    offset,
    queue: activeQueue,
  });
  const queueItems = queueQuery.data?.items;
  const visibleItems = useMemo(
    () => filterQueueItems(queueItems ?? [], query),
    [queueItems, query],
  );
  const selectedItem =
    visibleItems.find((item) => item.id === selectedItemId) ??
    visibleItems[0] ??
    null;
  const selectableItems = useMemo(
    () => visibleItems.filter((item) => Boolean(normalizeTargetType(item.target_type))),
    [visibleItems],
  );
  const selectedBulkTargets = useMemo(
    () =>
      selectableItems.reduce<ModerationBulkTarget[]>((targets, item) => {
        const targetType = normalizeTargetType(item.target_type);
        if (!targetType || !selectedTargetKeys.has(getQueueTargetKey(item))) {
          return targets;
        }

        targets.push({
          label: item.preview,
          targetId: item.target_id,
          targetType,
        });
        return targets;
      }, []),
    [selectableItems, selectedTargetKeys],
  );
  const allVisibleTargetsSelected =
    selectableItems.length > 0 &&
    selectableItems.every((item) => selectedTargetKeys.has(getQueueTargetKey(item)));
  const selectedTargetType = selectedItem
    ? normalizeTargetType(selectedItem.target_type)
    : null;
  const canLoadAudit =
    (platformRole === "owner" || platformRole === "admin") &&
    Boolean(selectedItem && selectedTargetType);
  const canOpenCommunityManagement = platformRole === "owner";
  const auditQuery = useAdminAuditLogsQuery(
    {
      limit: 5,
      offset: 0,
      target_id: selectedItem?.target_id,
      target_type: selectedTargetType ?? undefined,
    },
    canLoadAudit,
  );

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(searchInput.trim());
    setSelectedItemId(null);
    setSelectedTargetKeys(new Set());
  }

  function clearSearch() {
    setSearchInput("");
    setQuery("");
    setSelectedItemId(null);
    setSelectedTargetKeys(new Set());
  }

  function changeQueue(queue: string) {
    setActiveQueue(queue as AdminModQueueKind);
    setOffset(0);
    setSelectedItemId(null);
    setSelectedTargetKeys(new Set());
  }

  function toggleCurrentPageSelection() {
    setSelectedTargetKeys((current) => {
      if (allVisibleTargetsSelected) {
        return new Set();
      }

      const next = new Set(current);
      for (const item of selectableItems) {
        next.add(getQueueTargetKey(item));
      }
      return next;
    });
  }

  function toggleTargetSelection(item: ModQueueItem) {
    setSelectedTargetKeys((current) => {
      const next = new Set(current);
      const key = getQueueTargetKey(item);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <AdminQueueLayout
      detail={
        <AdminModQueueRail
          auditQuery={{
            error: auditQuery.error,
            isError: auditQuery.isError,
            isLoading: auditQuery.isPending && canLoadAudit,
            logs: auditQuery.data?.audit_logs ?? [],
            refetch: () => {
              void auditQuery.refetch();
            },
          }}
          canLoadAudit={canLoadAudit}
          canOpenCommunityManagement={canOpenCommunityManagement}
          item={selectedItem}
          platformRole={platformRole}
          queue={activeQueue}
        />
      }
    >
      <AdminQueueToolbar
        activeTab={activeQueue}
        description={
          <>
            {getQueueDescription(activeQueue)} 搜索只过滤当前页，分页仍由后端队列合同提供。
          </>
        }
        isRefreshing={queueQuery.isFetching}
        onRefresh={() => {
          void queueQuery.refetch();
        }}
        onSearchClear={clearSearch}
        onSearchSubmit={submitSearch}
        onSearchValueChange={setSearchInput}
        onTabChange={changeQueue}
        searchAriaLabel="搜索当前页队列"
        searchDisabled={queueQuery.isPending}
        searchPlaceholder="搜索预览、社区、作者或目标 ID"
        searchValue={searchInput}
        tabs={queueTabs}
        title="全站 Mod Queue"
      />

      {queueQuery.isPending ? <AdminLoadingPanel rows={6} /> : null}

      {queueQuery.isError ? (
        <AdminErrorPanel
          title="无法加载全站队列"
          description={getErrorDescription(queueQuery.error)}
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => queueQuery.refetch()}
            >
              重试
            </Button>
          }
        />
      ) : null}

      {queueQuery.isSuccess && visibleItems.length > 0 ? (
        <div className="flex flex-col gap-3 border-b border-border py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <StatusToken tone={selectedBulkTargets.length > 0 ? "primary" : "default"}>
              已选 {selectedBulkTargets.length}
            </StatusToken>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={selectableItems.length === 0}
              onClick={toggleCurrentPageSelection}
            >
              {allVisibleTargetsSelected ? "取消本页" : "选择本页"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={selectedBulkTargets.length === 0}
              onClick={() => setSelectedTargetKeys(new Set())}
            >
              清空
            </Button>
          </div>
          <ModerationBulkActions
            selectedTargets={selectedBulkTargets}
            onCompleted={() => {
              setSelectedTargetKeys(new Set());
              setSelectedItemId(null);
            }}
          />
        </div>
      ) : null}

      {queueQuery.isSuccess && visibleItems.length === 0 ? (
        <AdminEmptyPanel
          title={query ? "当前页没有匹配项" : `没有${getQueueLabel(activeQueue)}内容`}
          description={
            query
              ? "清空搜索或翻到其他页继续查找。"
              : "这个全站队列当前为空，稍后刷新或切换队列。"
          }
        />
      ) : null}

      {visibleItems.length > 0 ? (
        <>
          <div className="border-b border-border">
            {visibleItems.map((item, index) => (
              <AdminResourceRow
                key={item.id}
                index={offset + index}
                isSelected={selectedItem?.id === item.id}
                onSelect={() => setSelectedItemId(item.id)}
                selection={
                  normalizeTargetType(item.target_type) ? (
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 accent-primary"
                      aria-label={`选择 ${item.preview || item.target_id}`}
                      checked={selectedTargetKeys.has(getQueueTargetKey(item))}
                      onChange={() => toggleTargetSelection(item)}
                    />
                  ) : null
                }
                icon={getTargetIcon(item.target_type)}
                title={item.preview || `${formatTargetType(item.target_type)} ${formatShortId(item.target_id)}`}
                tokens={
                  <QueueTokens
                    queue={item.queue}
                    reportCount={item.report_count}
                    status={item.status}
                    targetType={item.target_type}
                  />
                }
                description={item.preview || "后端没有返回内容预览。"}
                meta={`/${item.community_slug} · 作者 ${formatShortId(item.author_id)} · 更新 ${formatDateTime(item.updated_at)}`}
                actions={<StatusToken>查看上下文</StatusToken>}
              />
            ))}
          </div>
          <AdminPagination
            hasMore={queueQuery.data?.has_more ?? false}
            isFetching={queueQuery.isFetching}
            offset={offset}
            pageSize={PAGE_SIZE}
            onJump={(nextOffset) => {
              setOffset(nextOffset);
              setSelectedItemId(null);
              setSelectedTargetKeys(new Set());
            }}
            onNext={() => {
              setOffset(queueQuery.data?.next_offset ?? offset + PAGE_SIZE);
              setSelectedItemId(null);
              setSelectedTargetKeys(new Set());
            }}
            onPrevious={() => {
              setOffset(Math.max(0, offset - PAGE_SIZE));
              setSelectedItemId(null);
              setSelectedTargetKeys(new Set());
            }}
          />
        </>
      ) : null}
    </AdminQueueLayout>
  );
}

function AdminModQueueRail({
  auditQuery,
  canLoadAudit,
  canOpenCommunityManagement,
  item,
  platformRole,
  queue,
}: {
  auditQuery: {
    error: Error | null;
    isError: boolean;
    isLoading: boolean;
    logs: Array<{
      action: string;
      created_at: string;
      id: string;
      target_id: string;
      target_type: string;
    }>;
    refetch: () => void;
  };
  canLoadAudit: boolean;
  canOpenCommunityManagement: boolean;
  item: ModQueueItem | null;
  platformRole?: string | null;
  queue: AdminModQueueKind;
}) {
  const targetType = item ? normalizeTargetType(item.target_type) : null;
  const canModerateTarget = Boolean(item && targetType);
  const targetLabel = item?.preview || `${formatTargetType(item?.target_type ?? "")} ${formatShortId(item?.target_id)}`;

  return (
    <>
      <AdminDetailRail
        title="队列上下文"
        emptyTitle="选择队列项"
        emptyDescription="从左侧选择帖子或评论后，在这里查看目标、社区、作者和处理入口。"
      >
        {item ? (
          <div className="space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusToken tone="primary">{getQueueLabel(item.queue)}</StatusToken>
                <StatusToken tone={getContentStatusTone(item.status)}>
                  {formatContentStatus(item.status)}
                </StatusToken>
              </div>
              <h3 className="mt-3 break-words text-lg font-semibold">
                {targetLabel}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                当前位于{getQueueLabel(queue)}队列，举报数 {item.report_count}。
              </p>
            </div>
            <dl className="divide-y divide-border border-y border-border">
              <InfoRow label="目标" value={formatTargetType(item.target_type)} />
              <InfoRow label="目标 ID" value={formatShortId(item.target_id)} />
              <InfoRow label="社区" value={`/${item.community_slug}`} />
              <InfoRow label="作者" value={formatShortId(item.author_id)} />
              <InfoRow label="创建" value={formatDateTime(item.created_at)} />
              <InfoRow label="更新" value={formatDateTime(item.updated_at)} />
            </dl>
          </div>
        ) : null}
      </AdminDetailRail>

      <AdminRailSection title="处理动作">
        {item && canModerateTarget && targetType ? (
          <ModerationQuickActions
            auditHref={`/admin/audit-logs?target_type=${encodeURIComponent(targetType)}&target_id=${encodeURIComponent(item.target_id)}`}
            canRemove={item.status !== "removed"}
            communityManageHref={
              canOpenCommunityManagement
                ? `/communities/${encodeURIComponent(item.community_slug)}/manage`
                : null
            }
            targetId={item.target_id}
            targetAuthorId={item.author_id}
            targetLabel={targetLabel}
            targetPostId={item.post_id}
            targetStatus={item.status}
            targetType={targetType}
            userHref={`/admin/users?q=${encodeURIComponent(item.author_id)}`}
          />
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            当前队列项缺少可处置的帖子或评论目标。
          </p>
        )}
      </AdminRailSection>

      <AdminRailSection title="回看入口">
        {item ? (
          <div className="flex flex-col border-t border-border">
            {canOpenCommunityManagement ? (
              <TextAction
                href={`/communities/${encodeURIComponent(item.community_slug)}/manage`}
                variant="bar"
              >
                进入社区管理
              </TextAction>
            ) : null}
            <TextAction
              href={`/admin/users?q=${encodeURIComponent(item.author_id)}`}
              variant="bar"
            >
              查看作者账号
            </TextAction>
            {targetType ? (
              <AdminAuditLink targetId={item.target_id} targetType={targetType} />
            ) : null}
          </div>
        ) : (
          <StatusToken>等待选择</StatusToken>
        )}
      </AdminRailSection>

      <AdminRailSection title="最近审计">
        {platformRole === "staff" ? (
          <p className="text-sm leading-6 text-muted-foreground">
            平台审核员只处理队列，不加载平台审计页。
          </p>
        ) : !canLoadAudit ? (
          <p className="text-sm leading-6 text-muted-foreground">
            选择队列项后会按目标加载最近审计。
          </p>
        ) : auditQuery.isLoading ? (
          <p className="text-sm leading-6 text-muted-foreground">正在加载审计...</p>
        ) : auditQuery.isError ? (
          <div className="space-y-3">
            <p className="text-sm leading-6 text-muted-foreground">
              {getErrorDescription(auditQuery.error)}
            </p>
            <Button variant="ghost" size="sm" onClick={auditQuery.refetch}>
              重试
            </Button>
          </div>
        ) : auditQuery.logs.length === 0 ? (
          <p className="text-sm leading-6 text-muted-foreground">
            暂无该目标的审计记录。
          </p>
        ) : (
          <div className="divide-y divide-border border-t border-border">
            {auditQuery.logs.map((log) => (
              <Link
                key={log.id}
                href={`/admin/audit-logs?target_type=${encodeURIComponent(log.target_type)}&target_id=${encodeURIComponent(log.target_id)}`}
                className="block py-3 text-sm transition-colors hover:text-primary"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <FileClock className="size-4" aria-hidden="true" />
                  {log.action}
                </span>
                <span className="mt-1 block font-mono text-xs text-muted-foreground">
                  {formatDateTime(log.created_at)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </AdminRailSection>
    </>
  );
}

function QueueTokens({
  queue,
  reportCount,
  status,
  targetType,
}: {
  queue: string;
  reportCount: number;
  status: string;
  targetType: string;
}) {
  return (
    <>
      <StatusToken>{formatTargetType(targetType)}</StatusToken>
      <StatusToken tone={getContentStatusTone(status)}>
        {formatContentStatus(status)}
      </StatusToken>
      <StatusToken>{getQueueLabel(queue)}</StatusToken>
      {reportCount > 0 ? (
        <StatusToken tone="warning">举报 {reportCount}</StatusToken>
      ) : null}
    </>
  );
}

function filterQueueItems(items: ModQueueItem[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) =>
    [
      item.id,
      item.author_id,
      item.community_slug,
      item.preview,
      item.queue,
      item.status,
      item.target_id,
      item.target_type,
    ]
      .filter(Boolean)
      .some((value) =>
        String(value).toLocaleLowerCase().includes(normalizedQuery),
      ),
  );
}

function getQueueDescription(queue: string) {
  return queueTabs.find((item) => item.value === queue)?.description ?? "全站队列。";
}

function getQueueLabel(queue: string) {
  return queueTabs.find((item) => item.value === queue)?.label ?? queue;
}

function normalizeTargetType(value: string): ModerationTargetType | null {
  if (value === "post" || value === "comment") {
    return value;
  }

  return null;
}

function getQueueTargetKey(item: ModQueueItem) {
  return `${item.target_type}:${item.target_id}`;
}

function formatTargetType(value: string) {
  switch (value) {
    case "post":
      return "帖子";
    case "comment":
      return "评论";
    default:
      return value || "目标";
  }
}

function formatContentStatus(status: string) {
  switch (status) {
    case "visible":
      return "可见";
    case "removed":
      return "已移除";
    case "deleted":
      return "已删除";
    case "hidden":
      return "已隐藏";
    case "locked":
      return "已锁定";
    default:
      return status || "未知";
  }
}

function getContentStatusTone(status: string): StatusTokenTone {
  switch (status) {
    case "visible":
      return "success";
    case "removed":
    case "deleted":
      return "danger";
    case "hidden":
    case "locked":
      return "warning";
    default:
      return "default";
  }
}

function getTargetIcon(targetType: string): ReactNode {
  if (targetType === "comment") {
    return <MessageSquareWarning className="size-4" aria-hidden="true" />;
  }

  if (targetType === "post") {
    return <Flag className="size-4" aria-hidden="true" />;
  }

  return <ShieldAlert className="size-4" aria-hidden="true" />;
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}
