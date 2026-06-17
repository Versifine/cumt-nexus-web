"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { FileClock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InfoRow, StatusToken } from "@/components/ui/data-display";
import { Input } from "@/components/ui/input";
import { TextAction } from "@/components/ui/text-action";
import { ApiError } from "@/lib/api/client";

import {
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
import type { AdminAuditLog } from "./types";

const PAGE_SIZE = 20;

type AdminAuditLogsPageProps = {
  initialQuery?: string;
  initialTargetId?: string;
  initialTargetType?: string;
};

export function AdminAuditLogsPage({
  initialQuery = "",
  initialTargetId = "",
  initialTargetType = "",
}: AdminAuditLogsPageProps) {
  const [queryInput, setQueryInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [targetType, setTargetType] = useState(initialTargetType);
  const [targetId, setTargetId] = useState(initialTargetId);
  const [offset, setOffset] = useState(0);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const auditQuery = useAdminAuditLogsQuery({
    limit: PAGE_SIZE,
    offset,
    q: query,
    target_id: targetId,
    target_type: targetType,
  });
  const logs = auditQuery.data?.audit_logs ?? [];
  const selectedLog =
    logs.find((log) => log.id === selectedLogId) ?? logs[0] ?? null;

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(queryInput.trim());
    setOffset(0);
    setSelectedLogId(null);
  }

  function clearSearch() {
    setQuery("");
    setQueryInput("");
    setTargetType("");
    setTargetId("");
    setOffset(0);
    setSelectedLogId(null);
  }

  return (
    <AdminQueueLayout
      detail={
        <AuditDetailRail
          log={selectedLog}
          targetId={targetId}
          targetType={targetType}
          onTargetIdChange={setTargetId}
          onTargetTypeChange={setTargetType}
          onFilterReset={clearSearch}
        />
      }
    >
      <AdminQueueToolbar
        actions={
          <>
            <Input
              value={targetType}
              onChange={(event) => {
                setTargetType(event.target.value);
                setOffset(0);
                setSelectedLogId(null);
              }}
              placeholder="目标类型"
              className="w-full sm:w-36"
            />
            <Input
              value={targetId}
              onChange={(event) => {
                setTargetId(event.target.value);
                setOffset(0);
                setSelectedLogId(null);
              }}
              placeholder="目标 ID"
              className="w-full sm:w-56"
            />
          </>
        }
        description="按动作、操作者、目标类型或目标 ID 过滤后端平台管理日志。"
        isRefreshing={auditQuery.isFetching}
        onRefresh={() => {
          void auditQuery.refetch();
        }}
        onSearchClear={clearSearch}
        onSearchSubmit={submitSearch}
        onSearchValueChange={setQueryInput}
        searchAriaLabel="搜索审计日志"
        searchDisabled={auditQuery.isPending}
        searchPlaceholder="搜索动作、操作者或目标"
        searchValue={queryInput}
        title="审计队列"
      />

      {auditQuery.isPending ? <AdminLoadingPanel rows={6} /> : null}

      {auditQuery.isError ? (
        <AdminErrorPanel
          title="无法加载审计日志"
          description={getErrorDescription(auditQuery.error)}
          action={
            <Button variant="ghost" size="sm" onClick={() => auditQuery.refetch()}>
              重试
            </Button>
          }
        />
      ) : null}

      {auditQuery.isSuccess && logs.length === 0 ? (
        <AdminEmptyPanel
          title="暂无审计日志"
          description={
            query || targetType || targetId
              ? "换一个关键词、目标类型或目标 ID 后再试。"
              : "平台管理写操作完成后会显示在这里。"
          }
        />
      ) : null}

      {logs.length > 0 ? (
        <>
          <div className="border-b border-border">
            {logs.map((log, index) => (
              <AdminResourceRow
                key={log.id}
                index={offset + index}
                isSelected={selectedLog?.id === log.id}
                onSelect={() => setSelectedLogId(log.id)}
                icon={<FileClock className="size-4" aria-hidden="true" />}
                title={log.action}
                tokens={<StatusToken>{log.target_type}</StatusToken>}
                description={`actor ${formatShortId(log.actor_id)} · target ${formatShortId(log.target_id)}`}
                meta={formatDateTime(log.created_at)}
                actions={<StatusToken>详情</StatusToken>}
              />
            ))}
          </div>
          <AdminPagination
            hasMore={auditQuery.data?.has_more ?? false}
            isFetching={auditQuery.isFetching}
            offset={offset}
            pageSize={PAGE_SIZE}
            onJump={(nextOffset) => {
              setOffset(nextOffset);
              setSelectedLogId(null);
            }}
            onNext={() => {
              setOffset(auditQuery.data?.next_offset ?? offset + PAGE_SIZE);
              setSelectedLogId(null);
            }}
            onPrevious={() => {
              setOffset(Math.max(0, offset - PAGE_SIZE));
              setSelectedLogId(null);
            }}
          />
        </>
      ) : null}
    </AdminQueueLayout>
  );
}

function AuditDetailRail({
  log,
  onFilterReset,
  onTargetIdChange,
  onTargetTypeChange,
  targetId,
  targetType,
}: {
  log: AdminAuditLog | null;
  onFilterReset: () => void;
  onTargetIdChange: (value: string) => void;
  onTargetTypeChange: (value: string) => void;
  targetId: string;
  targetType: string;
}) {
  return (
    <>
      <AdminDetailRail title="审计上下文" emptyTitle="选择日志">
        {log ? (
          <div className="space-y-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusToken>{log.target_type}</StatusToken>
                <span className="font-mono text-xs text-muted-foreground">
                  {formatShortId(log.id)}
                </span>
              </div>
              <h3 className="mt-3 break-words text-lg font-semibold">
                {log.action}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatDateTime(log.created_at)}
              </p>
            </div>
            <dl className="divide-y divide-border border-y border-border">
              <InfoRow label="操作者" value={formatShortId(log.actor_id)} />
              <InfoRow label="目标类型" value={log.target_type} />
              <InfoRow label="目标 ID" value={formatShortId(log.target_id)} />
            </dl>
            <JsonBlock label="变更前" value={log.before} />
            <JsonBlock label="变更后" value={log.after} />
          </div>
        ) : null}
      </AdminDetailRail>

      <AdminRailSection title="筛选">
        <div className="grid gap-3">
          <Input
            value={targetType}
            onChange={(event) => onTargetTypeChange(event.target.value)}
            placeholder="目标类型"
          />
          <Input
            value={targetId}
            onChange={(event) => onTargetIdChange(event.target.value)}
            placeholder="目标 ID"
          />
          <Button type="button" variant="ghost" size="sm" onClick={onFilterReset}>
            清空筛选
          </Button>
        </div>
      </AdminRailSection>

      <AdminRailSection title="相关入口">
        <div className="flex flex-col border-t border-border">
          <TextAction href="/admin/users" variant="bar">
            用户管理
          </TextAction>
        </div>
      </AdminRailSection>
    </>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="min-w-0 border border-border bg-background-soft/40 p-3">
      <div className="font-mono text-[11px] text-muted-foreground">{label}</div>
      <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground">
        {JSON.stringify(value ?? {}, null, 2)}
      </pre>
    </div>
  );
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}
