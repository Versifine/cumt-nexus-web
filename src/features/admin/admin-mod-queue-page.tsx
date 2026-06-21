"use client";

import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  FileClock,
  Flag,
  MessageSquareWarning,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

import { ManagementSearchField } from "@/components/app-shell/management-search-field";
import {
  ReviewDesk,
  ReviewDeskBoard,
  ReviewDeskInspector,
  ReviewDeskMasthead,
  ReviewDeskPanel,
  ReviewDeskState,
} from "@/components/app-shell/review-desk";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import {
  MetricBlock,
  StatusToken,
  type StatusTokenTone,
} from "@/components/ui/data-display";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { useCurrentUserQuery } from "@/features/auth/queries";
import {
  ModerationBulkActions,
  type ModerationBulkTarget,
} from "@/features/moderation/moderation-bulk-actions";
import { ModerationQuickActions } from "@/features/moderation/moderation-quick-actions";
import {
  useAdminModQueueItemQuery,
  useAdminModQueueQuery,
  useAdminModQueueSummaryQuery,
} from "@/features/moderation/queries";
import type {
  ModQueueItem,
  ModQueueItemDetailResponse,
  ModerationTargetType,
} from "@/features/moderation/types";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import { AdminToolsNav } from "./admin-tools-nav";
import { formatDateTime, formatShortId } from "./display";
import { useAdminAuditLogsQuery } from "./queries";
import type { PlatformRole } from "./types";
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
  const { isReady, token } = useAuthSession();
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
  const canLoadQueue = isReady && Boolean(token) && Boolean(platformRole);
  const queueQuery = useAdminModQueueQuery(
    {
      limit: PAGE_SIZE,
      offset,
      queue: activeQueue,
    },
    canLoadQueue,
  );
  const summaryQuery = useAdminModQueueSummaryQuery(canLoadQueue);
  const queueItems = queueQuery.data?.items;
  const visibleItems = useMemo(
    () => filterQueueItems(queueItems ?? [], query),
    [queueItems, query],
  );
  const selectedItem =
    visibleItems.find((item) => item.id === selectedItemId) ??
    visibleItems[0] ??
    null;
  const itemDetailQuery = useAdminModQueueItemQuery(
    selectedItem?.id ?? "",
    canLoadQueue && Boolean(selectedItem),
  );
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
    canLoadQueue &&
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
  const loginHref = `/login?next=${encodeURIComponent("/admin/reports")}`;

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

  if (!isReady || (token && currentUserQuery.isLoading)) {
    return (
      <QueueLayout
        activeQueue={activeQueue}
        platformRole={platformRole}
        body={
          <ReviewDeskState>
            <LoadingState rows={5} />
          </ReviewDeskState>
        }
        itemCount={0}
        offset={0}
      />
    );
  }

  if (!token) {
    return (
      <QueueLayout
        activeQueue={activeQueue}
        platformRole={platformRole}
        body={
          <ReviewDeskState>
            <EmptyState
              title="登录后进入全站队列"
              description="全站队列需要平台管理权限。登录后会自动确认权限。"
              action={
                <TextAction href={loginHref} tone="primary">
                  登录
                </TextAction>
              }
            />
          </ReviewDeskState>
        }
        itemCount={0}
        offset={0}
      />
    );
  }

  if (currentUserQuery.isError) {
    return (
      <QueueLayout
        activeQueue={activeQueue}
        platformRole={platformRole}
        body={
          <ReviewDeskState>
            <ErrorState
              title="无法确认用户身份"
              description={getErrorDescription(currentUserQuery.error)}
              action={
                <Button variant="outline" onClick={() => currentUserQuery.refetch()}>
                  重试
                </Button>
              }
            />
          </ReviewDeskState>
        }
        itemCount={0}
        offset={0}
      />
    );
  }

  if (!platformRole) {
    return (
      <QueueLayout
        activeQueue={activeQueue}
        platformRole={platformRole}
        body={
          <ReviewDeskState>
            <EmptyState
              title="需要平台权限"
              description="当前账号没有平台管理权限，不能查看全站队列或执行审核处理。"
              action={<TextAction href="/">信息流首页</TextAction>}
            />
          </ReviewDeskState>
        }
        itemCount={0}
        offset={0}
      />
    );
  }

  return (
    <QueueLayout
      activeQueue={activeQueue}
      platformRole={platformRole}
      itemCount={visibleItems.length}
      offset={offset}
      queueTotal={getQueueCount(summaryQuery.data?.queues ?? [], activeQueue)}
      toolbar={
        <QueueToolbar
          activeQueue={activeQueue}
          isRefreshing={queueQuery.isFetching}
          onClearSearch={clearSearch}
          onQueueChange={changeQueue}
          onRefresh={() => {
            void queueQuery.refetch();
          }}
          onSearchSubmit={submitSearch}
          searchInput={searchInput}
          setSearchInput={setSearchInput}
        />
      }
      inspector={
        <QueueInspector
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
          detail={itemDetailQuery.data}
          detailQuery={{
            error: itemDetailQuery.error,
            isError: itemDetailQuery.isError,
            isLoading: itemDetailQuery.isPending && Boolean(selectedItem),
            refetch: () => {
              void itemDetailQuery.refetch();
            },
          }}
          item={selectedItem}
          platformRole={platformRole}
          queue={activeQueue}
        />
      }
      body={
        <>
          {queueQuery.isPending ? (
            <ReviewDeskState>
              <LoadingState rows={6} />
            </ReviewDeskState>
          ) : null}

          {queueQuery.isError ? (
            <ReviewDeskState>
              <ErrorState
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
            </ReviewDeskState>
          ) : null}

          {queueQuery.isSuccess && visibleItems.length > 0 ? (
            <BulkActionPanel
              allVisibleTargetsSelected={allVisibleTargetsSelected}
              selectableCount={selectableItems.length}
              selectedBulkTargets={selectedBulkTargets}
              onClear={() => setSelectedTargetKeys(new Set())}
              onCompleted={() => {
                setSelectedTargetKeys(new Set());
                setSelectedItemId(null);
              }}
              onToggleCurrentPage={toggleCurrentPageSelection}
            />
          ) : null}

          {queueQuery.isSuccess && visibleItems.length === 0 ? (
            <ReviewDeskState>
              <EmptyState
                title={
                  query
                    ? "当前页没有匹配项"
                    : `没有${getQueueLabel(activeQueue)}内容`
                }
                description={
                  query
                    ? "清空搜索或翻到其他页继续查找。"
                    : "这个全站队列当前为空，稍后刷新或切换队列。"
                }
              />
            </ReviewDeskState>
          ) : null}

          {visibleItems.length > 0 ? (
            <QueueListPanel
              hasMore={queueQuery.data?.has_more ?? false}
              isFetching={queueQuery.isFetching}
              items={visibleItems}
              offset={offset}
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
              onSelect={setSelectedItemId}
              onToggleTarget={toggleTargetSelection}
              selectedItemId={selectedItem?.id ?? null}
              selectedTargetKeys={selectedTargetKeys}
            />
          ) : null}
        </>
      }
    />
  );
}

export function AdminModQueueDetailPage({ itemId }: { itemId: string }) {
  const { isReady, token } = useAuthSession();
  const currentUserQuery = useCurrentUserQuery();
  const { role: platformRole } = useEffectiveAdminPlatformRole(currentUserQuery.data);
  const canLoadDetail = isReady && Boolean(token) && Boolean(platformRole);
  const detailQuery = useAdminModQueueItemQuery(itemId, canLoadDetail);
  const item = detailQuery.data?.item ?? null;
  const targetType = item ? normalizeTargetType(item.target_type) : null;
  const canLoadAudit =
    canLoadDetail &&
    (platformRole === "owner" || platformRole === "admin") &&
    Boolean(item && targetType);
  const auditQuery = useAdminAuditLogsQuery(
    {
      limit: 5,
      offset: 0,
      target_id: item?.target_id,
      target_type: targetType ?? undefined,
    },
    canLoadAudit,
  );
  const loginHref = `/login?next=${encodeURIComponent(`/admin/reports/${itemId}`)}`;

  if (!isReady || (token && currentUserQuery.isLoading)) {
    return (
      <QueueDetailLayout item={item} itemId={itemId} platformRole={platformRole}>
        <ReviewDeskState>
          <LoadingState rows={5} />
        </ReviewDeskState>
      </QueueDetailLayout>
    );
  }

  if (!token) {
    return (
      <QueueDetailLayout item={item} itemId={itemId} platformRole={platformRole}>
        <ReviewDeskState>
          <EmptyState
            title="登录后查看队列详情"
            description="全站队列详情需要平台管理权限。登录后会自动确认身份。"
            action={
              <TextAction href={loginHref} tone="primary">
                登录
              </TextAction>
            }
          />
        </ReviewDeskState>
      </QueueDetailLayout>
    );
  }

  if (currentUserQuery.isError) {
    return (
      <QueueDetailLayout item={item} itemId={itemId} platformRole={platformRole}>
        <ReviewDeskState>
          <ErrorState
            title="无法确认用户身份"
            description={getErrorDescription(currentUserQuery.error)}
            action={
              <Button variant="ghost" size="sm" onClick={() => currentUserQuery.refetch()}>
                重试
              </Button>
            }
          />
        </ReviewDeskState>
      </QueueDetailLayout>
    );
  }

  if (!platformRole) {
    return (
      <QueueDetailLayout item={item} itemId={itemId} platformRole={platformRole}>
        <ReviewDeskState>
          <EmptyState
            title="需要平台权限"
            description="当前账号没有平台管理权限，不能查看队列详情或执行审核处理。"
            action={<TextAction href="/">信息流首页</TextAction>}
          />
        </ReviewDeskState>
      </QueueDetailLayout>
    );
  }

  return (
    <QueueDetailLayout
      item={item}
      itemId={itemId}
      platformRole={platformRole}
      inspector={
        <QueueInspector
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
          canOpenCommunityManagement={platformRole === "owner"}
          detail={detailQuery.data}
          detailQuery={{
            error: detailQuery.error,
            isError: detailQuery.isError,
            isLoading: detailQuery.isPending,
            refetch: () => {
              void detailQuery.refetch();
            },
          }}
          item={item}
          platformRole={platformRole}
          queue={(item?.queue as AdminModQueueKind | undefined) ?? "reports"}
        />
      }
    >
      {detailQuery.isPending ? (
        <ReviewDeskState>
          <LoadingState rows={5} />
        </ReviewDeskState>
      ) : null}

      {detailQuery.isError ? (
        <ReviewDeskState>
          <ErrorState
            title="无法加载队列详情"
            description={getErrorDescription(detailQuery.error)}
            action={
              <Button variant="ghost" size="sm" onClick={() => detailQuery.refetch()}>
                重试
              </Button>
            }
          />
        </ReviewDeskState>
      ) : null}

      {detailQuery.data ? (
        <QueueDetailBody detail={detailQuery.data} />
      ) : null}
    </QueueDetailLayout>
  );
}

function QueueDetailLayout({
  children,
  inspector,
  item,
  itemId,
  platformRole,
}: {
  children: ReactNode;
  inspector?: ReactNode;
  item: ModQueueItem | null;
  itemId: string;
  platformRole: PlatformRole | null;
}) {
  const shortId = formatShortId(itemId);

  return (
    <ReviewDesk>
      <ReviewDeskMasthead
        eyebrow={`/admin/reports/${shortId}`}
        title={item?.preview || `队列项 ${shortId}`}
        description="队列详情来自新的 Admin Mod Queue 读模型，用于查看目标预览、关联举报、最近处理和动作入口。"
        meta={
          <>
            <MetricBlock
              label="队列"
              value={item ? getQueueLabel(item.queue) : "读取中"}
              variant="compact"
            />
            <MetricBlock
              label="目标"
              value={item ? formatTargetType(item.target_type) : "--"}
              variant="compact"
            />
            <MetricBlock
              label="举报数"
              value={item?.report_count ?? "--"}
              variant="compact"
            />
          </>
        }
      />
      <ReviewDeskBoard
        inspector={
          <div className="space-y-4">
            <AdminToolsNav
              activePath="/admin/reports"
              platformRole={platformRole}
              variant="compact"
            />
            {inspector}
          </div>
        }
      >
        {children}
      </ReviewDeskBoard>
    </ReviewDesk>
  );
}

function QueueDetailBody({ detail }: { detail: ModQueueItemDetailResponse }) {
  const { item, reports, target_preview: preview } = detail;
  const targetType = normalizeTargetType(item.target_type);

  return (
    <article className="space-y-4">
      <ReviewDeskPanel
        title="目标预览"
        description="这里展示后端返回的目标读模型，避免从旧举报接口倒推内容。"
      >
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusToken tone="primary">{getQueueLabel(item.queue)}</StatusToken>
            <StatusToken tone={getContentStatusTone(item.status)}>
              {formatContentStatus(item.status)}
            </StatusToken>
            <StatusToken>{formatTargetType(item.target_type)}</StatusToken>
          </div>
          {preview.title ? (
            <h3 className="break-words text-lg font-semibold leading-7">
              {preview.title}
            </h3>
          ) : null}
          <p className="break-words text-sm leading-7 text-muted-foreground">
            {preview.body_excerpt || item.preview || "暂无目标正文预览。"}
          </p>
          <div className="flex flex-wrap gap-3 rounded-md bg-surface-raised p-3">
            {targetType && item.post_id ? (
              <TextAction href={`/posts/${encodeURIComponent(item.post_id)}`}>
                打开帖子
              </TextAction>
            ) : null}
            <TextAction href={`/admin/users?q=${encodeURIComponent(item.author_id)}`}>
              作者账号
            </TextAction>
            <TextAction
              href={`/communities/${encodeURIComponent(item.community_slug)}/manage`}
            >
              社区管理
            </TextAction>
          </div>
        </div>
      </ReviewDeskPanel>

      <ReviewDeskPanel
        title="举报集合"
        description="同一目标的举报会合并展示，处理动作仍通过队列动作合同执行。"
        headerAction={<StatusToken>{reports.length} 条</StatusToken>}
      >
        {reports.length ? (
          <div className="mt-3 space-y-2">
            {reports.map((report) => (
              <div key={report.id} className="rounded-md bg-surface-raised px-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusToken tone={getReportStatusTone(report.status)}>
                    {formatReportStatus(report.status)}
                  </StatusToken>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatShortId(report.reporter_id)}
                  </span>
                </div>
                <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
                  {report.reason || "未填写举报理由。"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            暂无关联举报。
          </p>
        )}
      </ReviewDeskPanel>
    </article>
  );
}

function QueueLayout({
  activeQueue,
  body,
  inspector,
  itemCount,
  offset,
  platformRole,
  queueTotal,
  toolbar,
}: {
  activeQueue: AdminModQueueKind;
  body: ReactNode;
  inspector?: ReactNode;
  itemCount: number;
  offset: number;
  platformRole: PlatformRole | null;
  queueTotal?: number;
  toolbar?: ReactNode;
}) {
  return (
    <ReviewDesk>
      <ReviewDeskMasthead
        actions={toolbar}
        eyebrow="/admin/reports"
        title="全站审核队列"
        description={`${getQueueDescription(activeQueue)} 队列用于快速扫读、批量处理和进入目标上下文，操作模型参考成熟社区审核队列。`}
        meta={
          <>
            <MetricBlock
              label="当前队列"
              value={getQueueLabel(activeQueue)}
              variant="compact"
            />
            <MetricBlock label="本页项目" value={itemCount} variant="compact" />
            <MetricBlock
              label="队列总数"
              value={typeof queueTotal === "number" ? queueTotal : "--"}
              variant="compact"
            />
            <MetricBlock label="页偏移" value={offset} variant="compact" />
            <MetricBlock label="分页大小" value={PAGE_SIZE} variant="compact" />
          </>
        }
      />

      <ReviewDeskBoard
        inspector={
          <div className="space-y-4">
            <AdminToolsNav
              activePath="/admin/reports"
              platformRole={platformRole}
              variant="compact"
            />
            {inspector}
          </div>
        }
      >
        {body}
      </ReviewDeskBoard>
    </ReviewDesk>
  );
}

function QueueToolbar({
  activeQueue,
  isRefreshing,
  onClearSearch,
  onQueueChange,
  onRefresh,
  onSearchSubmit,
  searchInput,
  setSearchInput,
}: {
  activeQueue: AdminModQueueKind;
  isRefreshing: boolean;
  onClearSearch: () => void;
  onQueueChange: (queue: string) => void;
  onRefresh: () => void;
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  searchInput: string;
  setSearchInput: (value: string) => void;
}) {
  return (
    <div className="flex max-w-3xl flex-col gap-3">
      <Tabs value={activeQueue} onValueChange={onQueueChange}>
        <TabsList className="h-auto flex-wrap justify-start gap-1 rounded-md bg-surface-raised p-1">
          {queueTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="h-8 rounded px-3 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <ManagementSearchField
          className="min-w-[260px] flex-1"
          ariaLabel="搜索当前页队列"
          disabled={isRefreshing}
          isSearching={isRefreshing}
          onClear={onClearSearch}
          onSubmit={onSearchSubmit}
          onValueChange={setSearchInput}
          placeholder="搜索预览、社区、作者或目标 ID"
          value={searchInput}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isRefreshing}
          onClick={onRefresh}
        >
          <RefreshCw
            className={isRefreshing ? "size-4 animate-spin" : "size-4"}
            aria-hidden="true"
          />
          {isRefreshing ? "刷新中" : "刷新"}
        </Button>
      </div>
    </div>
  );
}

function BulkActionPanel({
  allVisibleTargetsSelected,
  onClear,
  onCompleted,
  onToggleCurrentPage,
  selectableCount,
  selectedBulkTargets,
}: {
  allVisibleTargetsSelected: boolean;
  onClear: () => void;
  onCompleted: () => void;
  onToggleCurrentPage: () => void;
  selectableCount: number;
  selectedBulkTargets: ModerationBulkTarget[];
}) {
  return (
    <ReviewDeskPanel
      title="批量处理"
      description="只对当前页可处置的帖子或评论生效。"
      headerAction={
        <StatusToken tone={selectedBulkTargets.length > 0 ? "primary" : "default"}>
          已选 {selectedBulkTargets.length}
        </StatusToken>
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={selectableCount === 0}
            onClick={onToggleCurrentPage}
          >
            {allVisibleTargetsSelected ? "取消本页" : "选择本页"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={selectedBulkTargets.length === 0}
            onClick={onClear}
          >
            清空
          </Button>
        </div>
        <ModerationBulkActions
          selectedTargets={selectedBulkTargets}
          onCompleted={onCompleted}
        />
      </div>
    </ReviewDeskPanel>
  );
}

function QueueListPanel({
  hasMore,
  isFetching,
  items,
  offset,
  onNext,
  onPrevious,
  onSelect,
  onToggleTarget,
  selectedItemId,
  selectedTargetKeys,
}: {
  hasMore: boolean;
  isFetching: boolean;
  items: ModQueueItem[];
  offset: number;
  onNext: () => void;
  onPrevious: () => void;
  onSelect: (id: string) => void;
  onToggleTarget: (item: ModQueueItem) => void;
  selectedItemId: string | null;
  selectedTargetKeys: Set<string>;
}) {
  return (
    <ReviewDeskPanel
      title="队列内容"
      description="选择一项后，右侧会固定显示上下文、处理动作和最近审计。"
      headerAction={<StatusToken>{items.length} 项</StatusToken>}
    >
      <div className="space-y-2">
        {items.map((item, index) => (
          <QueueItemCard
            key={item.id}
            index={offset + index}
            isSelected={selectedItemId === item.id}
            item={item}
            isTargetSelected={selectedTargetKeys.has(getQueueTargetKey(item))}
            onSelect={() => onSelect(item.id)}
            onToggleTarget={() => onToggleTarget(item)}
          />
        ))}
      </div>
      <QueuePagination
        hasMore={hasMore}
        isFetching={isFetching}
        offset={offset}
        onNext={onNext}
        onPrevious={onPrevious}
      />
    </ReviewDeskPanel>
  );
}

function QueueItemCard({
  index,
  isSelected,
  isTargetSelected,
  item,
  onSelect,
  onToggleTarget,
}: {
  index: number;
  isSelected: boolean;
  isTargetSelected: boolean;
  item: ModQueueItem;
  onSelect: () => void;
  onToggleTarget: () => void;
}) {
  const targetType = normalizeTargetType(item.target_type);

  return (
    <article
      className={cn(
        "nexus-micro-lift grid gap-3 rounded-md bg-surface-raised px-3 py-3 transition-colors sm:grid-cols-[36px_minmax(0,1fr)]",
        isSelected
          ? "bg-primary/10 ring-1 ring-primary/30"
          : "hover:bg-surface-hover",
      )}
    >
      <div className="flex items-start justify-between gap-2 sm:block">
        {targetType ? (
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-primary"
            aria-label={`选择 ${item.preview || item.target_id}`}
            checked={isTargetSelected}
            onChange={onToggleTarget}
          />
        ) : (
          <span className="mt-0.5 block size-4" />
        )}
        <span className="mt-2 hidden font-mono text-xs text-muted-foreground sm:block">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <button type="button" className="min-w-0 text-left" onClick={onSelect}>
        <span className="flex flex-wrap items-center gap-2">
          <QueueTokens
            queue={item.queue}
            reportCount={item.report_count}
            status={item.status}
            targetType={item.target_type}
          />
        </span>
        <span className="mt-2 flex min-w-0 items-start gap-2">
          <span className="mt-1 shrink-0 text-muted-foreground">
            {getTargetIcon(item.target_type)}
          </span>
          <span className="min-w-0">
            <span className="block break-words text-sm font-semibold leading-6 text-foreground [overflow-wrap:anywhere]">
              {item.preview ||
                `${formatTargetType(item.target_type)} ${formatShortId(item.target_id)}`}
            </span>
            <span className="mt-1 block break-words text-xs leading-5 text-muted-foreground [overflow-wrap:anywhere]">
              /{item.community_slug} · 作者 {formatShortId(item.author_id)} · 更新{" "}
              {formatDateTime(item.updated_at)}
            </span>
          </span>
        </span>
      </button>
    </article>
  );
}

function QueuePagination({
  hasMore,
  isFetching,
  offset,
  onNext,
  onPrevious,
}: {
  hasMore: boolean;
  isFetching: boolean;
  offset: number;
  onNext: () => void;
  onPrevious: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <Button
        variant="ghost"
        size="sm"
        className="px-1 hover:bg-transparent hover:text-primary"
        disabled={offset === 0 || isFetching}
        onClick={onPrevious}
      >
        上一页
      </Button>
      <span className="font-mono text-xs text-muted-foreground">OFFSET {offset}</span>
      <Button
        variant="ghost"
        size="sm"
        className="px-1 hover:bg-transparent hover:text-primary"
        disabled={!hasMore || isFetching}
        onClick={onNext}
      >
        下一页
      </Button>
    </div>
  );
}

function QueueInspector({
  auditQuery,
  canLoadAudit,
  canOpenCommunityManagement,
  detail,
  detailQuery,
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
  detail?: ModQueueItemDetailResponse;
  detailQuery: {
    error: Error | null;
    isError: boolean;
    isLoading: boolean;
    refetch: () => void;
  };
  item: ModQueueItem | null;
  platformRole?: string | null;
  queue: AdminModQueueKind;
}) {
  const targetType = item ? normalizeTargetType(item.target_type) : null;
  const canModerateTarget = Boolean(item && targetType);
  const preview = detail?.target_preview;
  const hasPreview = Boolean(
    preview &&
      (preview.title ||
        preview.body_excerpt ||
        preview.author_id ||
        preview.status),
  );
  const targetLabel =
    preview?.title ||
    item?.preview ||
    `${formatTargetType(item?.target_type ?? "")} ${formatShortId(item?.target_id ?? "")}`;

  return (
    <ReviewDeskInspector
      title="队列上下文"
      description={
        item
          ? `当前位于${getQueueLabel(queue)}队列，举报数 ${item.report_count}。`
          : "选择队列项后，在这里处理目标。"
      }
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
            <h3 className="mt-3 break-words text-lg font-semibold leading-7 text-foreground [overflow-wrap:anywhere]">
              {targetLabel}
            </h3>
          </div>

          <div className="rounded-md bg-surface-raised p-3">
            <div className="grid grid-cols-2 gap-3">
              <InspectorMeta label="目标" value={formatTargetType(item.target_type)} />
              <InspectorMeta label="目标 ID" value={formatShortId(item.target_id)} />
              <InspectorMeta label="社区" value={`/${item.community_slug}`} />
              <InspectorMeta label="作者" value={formatShortId(item.author_id)} />
              <InspectorMeta label="创建" value={formatDateTime(item.created_at)} />
              <InspectorMeta label="更新" value={formatDateTime(item.updated_at)} />
            </div>
          </div>

          <section className="rounded-md bg-surface-raised p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-sm font-semibold">目标详情</h4>
              {detailQuery.isLoading ? (
                <StatusToken>读取中</StatusToken>
              ) : detailQuery.isError ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
                  onClick={detailQuery.refetch}
                >
                  重试
                </button>
              ) : null}
            </div>
            {detailQuery.isError ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {getErrorDescription(detailQuery.error)}
              </p>
            ) : hasPreview && preview ? (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusToken>{formatTargetType(preview.target_type)}</StatusToken>
                  <StatusToken tone={getContentStatusTone(preview.status)}>
                    {formatContentStatus(preview.status)}
                  </StatusToken>
                  <StatusToken>作者 {formatShortId(preview.author_id)}</StatusToken>
                </div>
                {preview.title ? (
                  <p className="break-words text-sm font-semibold leading-6">
                    {preview.title}
                  </p>
                ) : null}
                {preview.body_excerpt ? (
                  <p className="break-words text-xs leading-6 text-muted-foreground">
                    {preview.body_excerpt}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                后端没有返回额外预览，当前只展示队列摘要。
              </p>
            )}
          </section>

          <section className="rounded-md bg-surface-raised p-3">
            <h4 className="text-sm font-semibold">关联举报</h4>
            {detail?.reports?.length ? (
              <div className="mt-3 space-y-2">
                {detail.reports.map((report) => (
                  <div key={report.id} className="rounded-md bg-background px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusToken tone={getReportStatusTone(report.status)}>
                        {formatReportStatus(report.status)}
                      </StatusToken>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {formatShortId(report.reporter_id)}
                      </span>
                    </div>
                    <p className="mt-2 break-words text-xs leading-5 text-muted-foreground">
                      {report.reason || "未填写举报理由。"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                暂无关联举报。
              </p>
            )}
          </section>

          <section className="rounded-md bg-surface-raised p-3">
            <h4 className="text-sm font-semibold">最近处理</h4>
            {detail?.recent_actions?.length ? (
              <div className="mt-3 space-y-2">
                {detail.recent_actions.map((action) => (
                  <div key={action.id} className="rounded-md bg-background px-3 py-2">
                    <span className="text-sm font-semibold">
                      {formatModerationAction(action.action)}
                    </span>
                    <span className="mt-1 block font-mono text-[11px] text-muted-foreground">
                      {formatDateTime(action.created_at)}
                    </span>
                    {action.reason ? (
                      <p className="mt-2 break-words text-xs leading-5 text-muted-foreground">
                        {action.reason}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                暂无最近处理记录。
              </p>
            )}
          </section>

          <section className="rounded-md bg-surface-raised p-3">
            <h4 className="text-sm font-semibold">处理动作</h4>
            <div className="mt-3">
              {canModerateTarget && targetType ? (
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
            </div>
          </section>

          <section className="rounded-md bg-surface-raised p-3">
            <h4 className="text-sm font-semibold">回看入口</h4>
            <div className="mt-2 flex flex-wrap gap-3">
              {canOpenCommunityManagement ? (
                <TextAction
                  href={`/communities/${encodeURIComponent(item.community_slug)}/manage`}
                >
                  社区管理
                </TextAction>
              ) : null}
              <TextAction href={`/admin/users?q=${encodeURIComponent(item.author_id)}`}>
                作者账号
              </TextAction>
              {targetType ? (
                <TextAction
                  href={`/admin/audit-logs?target_type=${encodeURIComponent(targetType)}&target_id=${encodeURIComponent(item.target_id)}`}
                >
                  审计记录
                </TextAction>
              ) : null}
            </div>
          </section>
        </div>
      ) : (
        <EmptyState
          title="选择队列项"
          description="从左侧选择帖子或评论后，在这里查看目标、社区、作者和处理入口。"
        />
      )}

      <AuditLogPanel
        auditQuery={auditQuery}
        canLoadAudit={canLoadAudit}
        platformRole={platformRole}
      />
    </ReviewDeskInspector>
  );
}

function AuditLogPanel({
  auditQuery,
  canLoadAudit,
  platformRole,
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
  platformRole?: string | null;
}) {
  return (
    <section className="mt-4 rounded-md bg-surface-raised p-3">
      <h4 className="text-sm font-semibold">最近审计</h4>
      {platformRole === "staff" ? (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          平台审核员只处理队列，不加载平台审计页。
        </p>
      ) : !canLoadAudit ? (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          选择队列项后会按目标加载最近审计。
        </p>
      ) : auditQuery.isLoading ? (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">正在加载审计...</p>
      ) : auditQuery.isError ? (
        <div className="mt-2 space-y-3">
          <p className="text-sm leading-6 text-muted-foreground">
            {getErrorDescription(auditQuery.error)}
          </p>
          <Button variant="ghost" size="sm" onClick={auditQuery.refetch}>
            重试
          </Button>
        </div>
      ) : auditQuery.logs.length === 0 ? (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          暂无该目标的审计记录。
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          {auditQuery.logs.map((log) => (
            <Link
              key={log.id}
              href={`/admin/audit-logs?target_type=${encodeURIComponent(log.target_type)}&target_id=${encodeURIComponent(log.target_id)}`}
              className="nexus-micro-lift block rounded-md bg-background px-3 py-2.5 text-sm transition-colors hover:bg-surface-hover hover:text-primary"
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
    </section>
  );
}

function InspectorMeta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-medium text-foreground">{value}</div>
    </div>
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

function getQueueCount(
  queues: Array<{ count: number; queue: string }>,
  queue: string,
) {
  return queues.find((item) => item.queue === queue)?.count;
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

function formatReportStatus(status: string) {
  switch (status) {
    case "pending":
      return "待处理";
    case "resolved":
      return "已处理";
    case "dismissed":
      return "已驳回";
    default:
      return status || "未知";
  }
}

function getReportStatusTone(status: string): StatusTokenTone {
  switch (status) {
    case "pending":
      return "warning";
    case "resolved":
      return "success";
    case "dismissed":
      return "default";
    default:
      return "default";
  }
}

function formatModerationAction(action: string) {
  switch (action) {
    case "approve":
      return "批准内容";
    case "remove":
      return "移除内容";
    case "spam":
      return "标记垃圾";
    case "ignore_reports":
      return "忽略举报";
    case "lock":
      return "锁定评论";
    case "pin":
      return "置顶帖子";
    case "mark_nsfw":
      return "标记 NSFW";
    case "mark_spoiler":
      return "标记剧透";
    case "set_flair":
      return "设置 flair";
    default:
      return action || "处理动作";
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
