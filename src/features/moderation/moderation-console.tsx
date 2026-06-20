"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  IndexedInfoRow,
  MetricBlock,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextAction } from "@/components/ui/text-action";
import { Textarea } from "@/components/ui/textarea";
import { AdminToolsNav } from "@/features/admin/admin-tools-nav";
import { useAuthSession } from "@/features/auth/auth-session";
import { resolvePlatformRole, type PlatformRole } from "@/features/auth/platform-role";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { getMarkdownPlainTextSummary } from "@/features/content/markdown-summary";
import { ApiError } from "@/lib/api/client";

import {
  useDismissModerationReportMutation,
  useModerationReportQuery,
  useModerationReportsQuery,
  useRemoveModerationReportTargetMutation,
} from "./queries";
import type {
  ContentReport,
  ContentReportStatus,
  ReportTargetPreview,
} from "./types";

type ReportStatusFilter = "pending" | "resolved" | "dismissed";

const statusOptions: Array<{ label: string; value: ReportStatusFilter }> = [
  { label: "待处理", value: "pending" },
  { label: "已处理", value: "resolved" },
  { label: "已驳回", value: "dismissed" },
];

const removeTargetSchema = z.object({
  reason: z.string().trim().min(1, "请输入移除原因。"),
});

type RemoveTargetFormValues = z.infer<typeof removeTargetSchema>;

export function ModerationConsole() {
  const { isReady, token } = useAuthSession();
  const currentUserQuery = useCurrentUserQuery();
  const [status, setStatus] = useState<ReportStatusFilter>("pending");
  const platformRole = resolvePlatformRole(currentUserQuery.data);
  const canLoadReports = isReady && Boolean(token) && Boolean(platformRole);
  const reportsQuery = useModerationReportsQuery(
    { limit: 20, offset: 0, status },
    canLoadReports,
  );
  const reports = reportsQuery.data?.reports ?? [];
  const loginHref = `/login?next=${encodeURIComponent("/admin/reports")}`;

  return (
    <ModerationLayout
      body={
        <>
          {!isReady ? (
            <StatePanel>
              <LoadingState rows={3} />
            </StatePanel>
          ) : null}

          {isReady && token && currentUserQuery.isLoading ? (
            <StatePanel>
              <LoadingState rows={3} />
            </StatePanel>
          ) : null}

          {isReady && !token ? (
            <StatePanel>
              <EmptyState
                title="登录后进入举报审核"
                description="举报审核需要平台管理权限。登录后会自动确认权限。"
                action={
                  <TextAction href={loginHref} tone="primary">
                    登录
                  </TextAction>
                }
              />
            </StatePanel>
          ) : null}

          {isReady && token && currentUserQuery.isError ? (
            <StatePanel>
              <ErrorState
                title="无法确认用户身份"
                description={getErrorDescription(currentUserQuery.error)}
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => currentUserQuery.refetch()}
                  >
                    重试
                  </Button>
                }
              />
            </StatePanel>
          ) : null}

          {isReady &&
          token &&
          !currentUserQuery.isLoading &&
          !currentUserQuery.isError &&
          !platformRole ? (
            <StatePanel>
              <EmptyState
                title="需要平台权限"
                description="当前账号没有平台管理权限，不能查看举报列表或执行审核处理。"
                action={<TextAction href="/">信息流首页</TextAction>}
              />
            </StatePanel>
          ) : null}

          {canLoadReports && reportsQuery.isPending ? (
            <StatePanel>
              <LoadingState rows={5} />
            </StatePanel>
          ) : null}

          {canLoadReports && reportsQuery.isError ? (
            <StatePanel>
              <ErrorState
                title={getModerationErrorTitle(reportsQuery.error)}
                description={getErrorDescription(reportsQuery.error)}
                action={
                  isUnauthenticated(reportsQuery.error) ? (
                    <TextAction href={loginHref} tone="primary">
                      登录
                    </TextAction>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => reportsQuery.refetch()}
                    >
                      重试
                    </Button>
                  )
                }
              />
            </StatePanel>
          ) : null}

          {canLoadReports && reportsQuery.isSuccess && reports.length === 0 ? (
            <StatePanel>
              <EmptyState
                title={`没有${formatReportStatus(status)}举报`}
                description="该状态下暂时没有举报记录。"
                action={<TextAction href="/">信息流首页</TextAction>}
              />
            </StatePanel>
          ) : null}

          {canLoadReports && reportsQuery.isSuccess && reports.length > 0 ? (
            <ReportList reports={reports} />
          ) : null}
        </>
      }
      isFetching={canLoadReports && reportsQuery.isFetching}
      offset={reportsQuery.data?.offset ?? 0}
      onRefresh={() => {
        void reportsQuery.refetch({ cancelRefetch: false });
      }}
      onStatusChange={setStatus}
      reportCount={reports.length}
      status={status}
    />
  );
}

export function ModerationReportDetail({ id }: { id: string }) {
  const { isReady, token } = useAuthSession();
  const currentUserQuery = useCurrentUserQuery();
  const platformRole = resolvePlatformRole(currentUserQuery.data);
  const canLoadReport = isReady && Boolean(token) && Boolean(platformRole);
  const reportQuery = useModerationReportQuery(id, canLoadReport);
  const report = reportQuery.data?.report;
  const loginHref = `/login?next=${encodeURIComponent(`/admin/reports/${id}`)}`;

  return (
    <ReportDetailLayout
      body={
        <>
          {!isReady ? (
            <StatePanel>
              <LoadingState rows={3} />
            </StatePanel>
          ) : null}

          {isReady && token && currentUserQuery.isLoading ? (
            <StatePanel>
              <LoadingState rows={3} />
            </StatePanel>
          ) : null}

          {isReady && !token ? (
            <StatePanel>
              <EmptyState
                title="登录后查看举报详情"
                description="举报详情需要平台管理权限。登录后会自动确认权限。"
                action={
                  <TextAction href={loginHref} tone="primary">
                    登录
                  </TextAction>
                }
              />
            </StatePanel>
          ) : null}

          {isReady && token && currentUserQuery.isError ? (
            <StatePanel>
              <ErrorState
                title="无法确认用户身份"
                description={getErrorDescription(currentUserQuery.error)}
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => currentUserQuery.refetch()}
                  >
                    重试
                  </Button>
                }
              />
            </StatePanel>
          ) : null}

          {isReady &&
          token &&
          !currentUserQuery.isLoading &&
          !currentUserQuery.isError &&
          !platformRole ? (
            <StatePanel>
              <EmptyState
                title="需要平台权限"
                description="当前账号没有平台管理权限，不能查看举报详情或执行审核处理。"
                action={<TextAction href="/">信息流首页</TextAction>}
              />
            </StatePanel>
          ) : null}

          {canLoadReport && reportQuery.isPending ? (
            <StatePanel>
              <LoadingState rows={4} />
            </StatePanel>
          ) : null}

          {canLoadReport && reportQuery.isError ? (
            <StatePanel>
              <ErrorState
                title={getModerationErrorTitle(reportQuery.error)}
                description={getErrorDescription(reportQuery.error)}
                action={
                  isUnauthenticated(reportQuery.error) ? (
                    <TextAction href={loginHref} tone="primary">
                      登录
                    </TextAction>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => reportQuery.refetch()}
                    >
                      重试
                    </Button>
                  )
                }
              />
            </StatePanel>
          ) : null}

          {report ? (
            <ReportDetailBody
              onAfterAction={() => reportQuery.refetch()}
              report={report}
            />
          ) : null}
        </>
      }
      platformRole={platformRole}
      report={report}
      reportId={id}
    />
  );
}

function ModerationLayout({
  body,
  isFetching,
  offset,
  onRefresh,
  onStatusChange,
  reportCount,
  status,
}: {
  body: ReactNode;
  isFetching: boolean;
  offset: number;
  onRefresh: () => void;
  onStatusChange: (status: ReportStatusFilter) => void;
  reportCount: number;
  status: ReportStatusFilter;
}) {
  return (
    <ReviewDesk>
      <ModerationHeader
        isFetching={isFetching}
        offset={offset}
        onRefresh={onRefresh}
        onStatusChange={onStatusChange}
        reportCount={reportCount}
        status={status}
      />

      <ReviewDeskBoard
        inspector={<ModerationContextPanel reportCount={reportCount} status={status} />}
      >
        {body}
      </ReviewDeskBoard>
    </ReviewDesk>
  );
}

function ModerationHeader({
  isFetching,
  offset,
  onRefresh,
  onStatusChange,
  reportCount,
  status,
}: {
  isFetching: boolean;
  offset: number;
  onRefresh: () => void;
  onStatusChange: (status: ReportStatusFilter) => void;
  reportCount: number;
  status: ReportStatusFilter;
}) {
  return (
    <ReviewDeskMasthead
      actions={
        <ModerationToolbar
          disabled={isFetching}
          onRefresh={onRefresh}
          onStatusChange={onStatusChange}
          status={status}
        />
      }
      eyebrow="/admin/reports"
      title="举报审核工作台"
      description="集中处理平台举报。队列用于扫读和定位，详情页负责目标预览、举报理由和最终处理动作。"
      meta={
        <>
          <MetricBlock
            label="当前状态"
            value={formatReportStatus(status)}
            variant="compact"
          />
          <MetricBlock label="本页举报" value={reportCount} variant="compact" />
          <MetricBlock label="页偏移" value={offset} variant="compact" />
        </>
      }
    />
  );
}

function ModerationToolbar({
  disabled,
  onRefresh,
  onStatusChange,
  status,
}: {
  disabled: boolean;
  onRefresh: () => void;
  onStatusChange: (status: ReportStatusFilter) => void;
  status: ReportStatusFilter;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Tabs
        value={status}
        onValueChange={(value) => onStatusChange(value as ReportStatusFilter)}
      >
        <TabsList className="h-9 rounded-md bg-surface-raised p-1">
          {statusOptions.map((option) => (
            <TabsTrigger
              key={option.value}
              value={option.value}
              disabled={disabled}
              className="h-7 rounded px-3 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={onRefresh}
      >
        <RefreshCw
          className={disabled ? "size-4 animate-spin" : "size-4"}
          aria-hidden="true"
        />
        {disabled ? "刷新中" : "刷新"}
      </Button>
    </div>
  );
}

function ModerationContextPanel({
  reportCount,
  status,
}: {
  reportCount: number;
  status: ReportStatusFilter;
}) {
  return (
    <ReviewDeskInspector
      title="审核上下文"
      description={`正在查看${formatReportStatus(status)}举报。`}
    >
      <div className="grid grid-cols-2 gap-2">
        <ContextMetric label="本页" value={`${reportCount} 条`} />
        <ContextMetric label="状态" value={formatReportStatus(status)} />
      </div>

      <section className="mt-4">
        <h3 className="text-sm font-semibold">处理规则</h3>
        <div className="mt-3 space-y-2">
          <IndexedInfoRow
            index="01"
            title="详情判断"
            text="以目标预览、举报理由和当前内容状态一起判断。"
          />
          <IndexedInfoRow
            index="02"
            title="动作留痕"
            text="驳回和移除目标都会记录审核动作，不能用入口状态替代后端权限。"
          />
          <IndexedInfoRow
            index="03"
            title="避免重复"
            text="已处理举报只展示结果，不再暴露重复处理入口。"
          />
        </div>
      </section>

      <div className="mt-4 flex flex-wrap gap-3 rounded-md bg-surface-raised p-3">
        <TextAction href="/admin/community-applications">社区审批</TextAction>
        <TextAction href="/">信息流首页</TextAction>
      </div>
    </ReviewDeskInspector>
  );
}

function ReportList({ reports }: { reports: ContentReport[] }) {
  return (
    <ReviewDeskPanel
      title="举报队列"
      description="选择一条举报进入详情页处理。"
      headerAction={<StatusToken>{reports.length} 条</StatusToken>}
    >
      <div className="space-y-2">
        {reports.map((report, index) => (
          <ReportRow key={report.id} index={index} report={report} />
        ))}
      </div>
    </ReviewDeskPanel>
  );
}

function ReportRow({ index, report }: { index: number; report: ContentReport }) {
  const preview = report.target_preview;
  const title =
    preview?.title ||
    getMarkdownPlainTextSummary(preview?.body_excerpt, report.reason);

  return (
    <Link
      href={`/admin/reports/${report.id}`}
      className="group grid grid-cols-[40px_minmax(0,1fr)] gap-3 rounded-md bg-surface-raised px-3 py-3 transition-colors hover:bg-surface-hover"
    >
      <span className="font-mono text-xs text-muted-foreground">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <StatusToken tone={getReportStatusTone(report.status)}>
            {formatReportStatus(report.status)}
          </StatusToken>
          <StatusToken>{formatTargetType(report.target_type)}</StatusToken>
          <span className="text-xs text-muted-foreground">
            {formatDate(report.created_at)}
          </span>
        </span>
        <span className="mt-2 block break-words text-base font-semibold leading-6 text-foreground group-hover:text-primary">
          {title}
        </span>
        <span className="mt-2 line-clamp-2 block text-sm leading-6 text-muted-foreground">
          {report.reason}
        </span>
      </span>
    </Link>
  );
}

function ReportDetailLayout({
  body,
  platformRole,
  report,
  reportId,
}: {
  body: ReactNode;
  platformRole: PlatformRole | null;
  report?: ContentReport;
  reportId: string;
}) {
  const shortId = formatShortId(reportId);

  return (
    <ReviewDesk>
      <ReportHeader report={report} shortId={shortId} />
      <ReviewDeskBoard
        inspector={
          <div className="space-y-4">
            <AdminToolsNav
              activePath="/admin/reports"
              platformRole={platformRole}
              variant="compact"
            />
            <ReportContextPanel report={report} shortId={shortId} />
          </div>
        }
      >
        {body}
      </ReviewDeskBoard>
    </ReviewDesk>
  );
}

function ReportHeader({
  report,
  shortId,
}: {
  report?: ContentReport;
  shortId: string;
}) {
  return (
    <ReviewDeskMasthead
      eyebrow={`/admin/reports/${shortId}`}
      title={`举报 ${shortId}`}
      description={report?.reason || "读取举报详情后会显示举报理由和目标预览。"}
      meta={
        <>
          <MetricBlock
            label="处理状态"
            value={report ? formatReportStatus(report.status) : "读取中"}
            variant="compact"
          />
          <MetricBlock
            label="目标类型"
            value={report ? formatTargetType(report.target_type) : "--"}
            variant="compact"
          />
          <MetricBlock
            label="举报编号"
            value={shortId}
            valueClassName="font-mono"
            variant="compact"
          />
        </>
      }
    />
  );
}

function ReportDetailBody({
  onAfterAction,
  report,
}: {
  onAfterAction: () => void;
  report: ContentReport;
}) {
  return (
    <article className="space-y-4">
      <TargetPreviewPanel preview={report.target_preview} />
      <ReportDecisionPanel onAfterAction={onAfterAction} report={report} />
    </article>
  );
}

function TargetPreviewPanel({ preview }: { preview?: ReportTargetPreview | null }) {
  const previewText = getMarkdownPlainTextSummary(
    preview?.body_excerpt,
    "暂无预览。",
  );

  return (
    <ReviewDeskPanel title="目标预览">
      {preview ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusToken>{formatTargetType(preview.target_type)}</StatusToken>
            <StatusToken>{formatContentStatus(preview.status)}</StatusToken>
            <StatusToken>作者 {formatShortId(preview.author_id)}</StatusToken>
          </div>
          {preview.title ? (
            <h4 className="break-words text-base font-semibold leading-6">
              {preview.title}
            </h4>
          ) : null}
          <p className="break-words text-sm leading-7 text-muted-foreground">
            {previewText}
          </p>
          <div className="flex flex-wrap gap-3 rounded-md bg-surface-raised p-3">
            {preview.post_id ? (
              <TextAction href={`/posts/${preview.post_id}`}>打开帖子</TextAction>
            ) : null}
            {preview.comment_id && preview.post_id ? (
              <TextAction href={`/posts/${preview.post_id}`}>
                查看评论上下文
              </TextAction>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          后端没有返回目标预览，仍可根据举报编号执行处理。
        </p>
      )}
    </ReviewDeskPanel>
  );
}

function ReportDecisionPanel({
  onAfterAction,
  report,
}: {
  onAfterAction: () => void;
  report: ContentReport;
}) {
  const dismissMutation = useDismissModerationReportMutation(report.id);
  const isPending = report.status === "pending";
  const isTargetRemoved = report.target_preview?.status === "removed";

  async function dismissReport() {
    await dismissMutation.mutateAsync();
    onAfterAction();
  }

  return (
    <ReviewDeskPanel title="审核处理">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusToken tone={isPending ? "primary" : "default"}>
          {isPending ? "可处理" : "已结束"}
        </StatusToken>
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        待处理举报可以驳回，也可以移除被举报目标。已处理举报只展示状态。
      </p>

      {dismissMutation.error ? (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>驳回失败</AlertTitle>
          <AlertDescription>{getErrorDescription(dismissMutation.error)}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!isPending || dismissMutation.isPending}
          className="min-h-10 text-sm font-semibold text-foreground underline-offset-4 transition-colors hover:text-primary hover:underline disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          onClick={dismissReport}
        >
          {dismissMutation.isPending ? "正在驳回..." : "驳回举报"}
        </button>
        <RemoveTargetDialog
          disabled={!isPending || isTargetRemoved}
          onAfterAction={onAfterAction}
          report={report}
        />
      </div>
    </ReviewDeskPanel>
  );
}

function RemoveTargetDialog({
  disabled,
  onAfterAction,
  report,
}: {
  disabled: boolean;
  onAfterAction: () => void;
  report: ContentReport;
}) {
  const [open, setOpen] = useState(false);
  const [hasRemoved, setHasRemoved] = useState(false);
  const mutation = useRemoveModerationReportTargetMutation(report.id, {
    postId: report.target_preview?.post_id,
    targetType: report.target_type,
  });
  const isDisabled = disabled || hasRemoved;
  const form = useForm<RemoveTargetFormValues>({
    resolver: zodResolver(removeTargetSchema),
    defaultValues: {
      reason: "",
    },
  });

  async function submit(values: RemoveTargetFormValues) {
    await mutation.mutateAsync(values);
    setHasRemoved(true);
    form.reset();
    setOpen(false);
    onAfterAction();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!mutation.isPending) {
          setOpen(nextOpen);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="destructive" disabled={isDisabled}>
          <ShieldAlert className="size-4" aria-hidden="true" />
          {hasRemoved ? "已移除目标" : "移除目标"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>移除被举报目标</DialogTitle>
          <DialogDescription>
            这个操作会处理举报并移除对应帖子或评论。后端会记录审核动作。
          </DialogDescription>
        </DialogHeader>

        {mutation.error ? (
          <Alert variant="destructive">
            <AlertTitle>移除失败</AlertTitle>
            <AlertDescription>{getErrorDescription(mutation.error)}</AlertDescription>
          </Alert>
        ) : null}

        <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
          <div className="space-y-2">
            <label htmlFor="remove-target-reason" className="text-sm font-semibold">
              移除原因
            </label>
            <Textarea
              id="remove-target-reason"
              aria-invalid={Boolean(form.formState.errors.reason)}
              disabled={mutation.isPending || isDisabled}
              placeholder="写清移除依据，便于后续审计。"
              className="min-h-32"
              {...form.register("reason")}
            />
            {form.formState.errors.reason ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.reason.message}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                移除原因会写入审核动作。
              </p>
            )}
          </div>

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
              type="submit"
              variant="destructive"
              disabled={mutation.isPending || isDisabled}
            >
              {hasRemoved
                ? "已移除"
                : mutation.isPending
                  ? "正在移除..."
                  : "确认移除"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReportContextPanel({
  report,
  shortId,
}: {
  report?: ContentReport;
  shortId: string;
}) {
  return (
    <ReviewDeskInspector title="举报信息">
      <div className="grid grid-cols-2 gap-2">
        <ContextMetric label="编号" value={shortId} />
        <ContextMetric
          label="目标"
          value={report ? formatTargetType(report.target_type) : "--"}
        />
        <ContextMetric
          label="状态"
          value={report ? formatReportStatus(report.status) : "--"}
        />
      </div>
      <section className="mt-4 rounded-md bg-surface-raised p-3">
        {report ? (
          <p className="text-xs leading-5 text-muted-foreground">
            创建 {formatDate(report.created_at)}，更新 {formatDate(report.updated_at)}。
          </p>
        ) : null}
      </section>

      <section className="mt-4">
        <h3 className="text-sm font-semibold">处理规则</h3>
        <div className="mt-3 space-y-2">
          <IndexedInfoRow
            index="01"
            title="关闭举报"
            text="举报不成立时只关闭举报，不改动原内容。"
          />
          <IndexedInfoRow
            index="02"
            title="移除目标"
            text="目标违规时填写原因并移除帖子或评论。"
          />
        </div>
      </section>

      <div className="mt-4 flex flex-wrap gap-3 rounded-md bg-surface-raised p-3">
        <TextAction href="/admin/reports">举报审核</TextAction>
        <TextAction href="/">信息流首页</TextAction>
      </div>
    </ReviewDeskInspector>
  );
}

function StatePanel({ children }: { children: ReactNode }) {
  return <ReviewDeskState>{children}</ReviewDeskState>;
}

function ContextMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-md bg-surface-raised px-3 py-3">
      <div className="font-mono text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-foreground">
        {value}
      </div>
    </div>
  );
}

function formatShortId(value: string) {
  return value.slice(0, 8);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatTargetType(value: string) {
  switch (value) {
    case "post":
      return "帖子";
    case "comment":
      return "评论";
    default:
      return value;
  }
}

function formatReportStatus(status: ContentReportStatus) {
  switch (status) {
    case "pending":
      return "待处理";
    case "resolved":
      return "已处理";
    case "dismissed":
      return "已驳回";
    default:
      return status;
  }
}

function getReportStatusTone(status: ContentReportStatus): StatusTokenTone {
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

function formatContentStatus(status: string) {
  switch (status) {
    case "visible":
      return "可见";
    case "removed":
      return "已移除";
    case "hidden":
      return "已隐藏";
    default:
      return status;
  }
}

function isUnauthenticated(error: Error | null) {
  return error instanceof ApiError && error.code === "unauthenticated";
}

function isForbidden(error: Error | null) {
  return error instanceof ApiError && error.code === "forbidden";
}

function getModerationErrorTitle(error: Error | null) {
  if (isUnauthenticated(error)) {
    return "需要登录";
  }

  if (isForbidden(error)) {
    return "需要平台权限";
  }

  return "无法加载审核数据";
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}

