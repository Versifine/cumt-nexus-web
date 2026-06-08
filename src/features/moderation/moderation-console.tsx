"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { SourceBackLink } from "@/components/app-shell/source-back-link";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  InfoRow,
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
import { useAuthSession } from "@/features/auth/auth-session";
import { getMarkdownPlainTextSummary } from "@/features/content/markdown-summary";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

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
  const [status, setStatus] = useState<ReportStatusFilter>("pending");
  const canLoadReports = isReady && Boolean(token);
  const reportsQuery = useModerationReportsQuery(
    { limit: 20, offset: 0, status },
    canLoadReports,
  );
  const reports = reportsQuery.data?.reports ?? [];
  const loginHref = `/login?next=${encodeURIComponent("/moderation")}`;

  return (
    <>
      <SourceBackLink href="/">返回最新讨论</SourceBackLink>
      <header className="border-b border-border py-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div className="min-w-0">
              <div className="font-mono text-xs uppercase text-primary">
                CUMT NEXUS / 审核台
              </div>
              <h1 className="mt-4 text-5xl font-black leading-[0.95] tracking-normal text-foreground md:text-6xl">
                举报审核台
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
                查看举报列表、目标预览和处理状态。
              </p>
            </div>

            <div className="grid grid-cols-3 border border-border text-center">
              <MetricBlock
                label="当前"
                value={canLoadReports ? String(reports.length) : "--"}
              />
              <MetricBlock label="状态" value={formatReportStatus(status)} />
              <MetricBlock
                label="分页"
                value={reportsQuery.data ? String(reportsQuery.data.offset) : "--"}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-y border-border py-4 sm:flex-row sm:items-center sm:justify-between">
            <ReportStatusTabs
              disabled={!isReady || reportsQuery.isFetching}
              onStatusChange={setStatus}
              status={status}
            />
            <p className="text-sm leading-6 text-muted-foreground">
            切换状态会重新请求后端审核列表。
          </p>
        </div>
      </header>

      <section className="py-5">
          {!isReady ? (
            <div className="border-b border-border pb-5">
              <LoadingState rows={3} />
            </div>
          ) : null}

          {isReady && !token ? (
            <EmptyState
              title="登录后进入审核台"
              description="审核台需要登录身份。平台权限会由后端继续校验。"
              action={
                <TextAction href={loginHref} tone="primary">
                  登录
                </TextAction>
              }
            />
          ) : null}

          {canLoadReports && reportsQuery.isPending ? (
            <div className="border-b border-border pb-5">
              <LoadingState rows={5} />
            </div>
          ) : null}

          {canLoadReports && reportsQuery.isError ? (
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
                    variant="outline"
                    size="sm"
                    onClick={() => reportsQuery.refetch()}
                  >
                    重试
                  </Button>
                )
              }
            />
          ) : null}

          {canLoadReports && reportsQuery.isSuccess && reports.length === 0 ? (
            <EmptyState
              title={`没有${formatReportStatus(status)}举报`}
              description="该状态下暂时没有举报记录。"
              action={<TextAction href="/">回到信息流</TextAction>}
            />
          ) : null}

          {canLoadReports && reportsQuery.isSuccess && reports.length > 0 ? (
            <div className="divide-y divide-border border-b border-border">
              {reports.map((report, index) => (
                <ReportRow key={report.id} index={index} report={report} />
              ))}
            </div>
          ) : null}
      </section>
    </>
  );
}

export function ModerationReportDetail({ id }: { id: string }) {
  const { isReady, token } = useAuthSession();
  const canLoadReport = isReady && Boolean(token);
  const reportQuery = useModerationReportQuery(id, canLoadReport);
  const report = reportQuery.data?.report;
  const loginHref = `/login?next=${encodeURIComponent(`/moderation/reports/${id}`)}`;

  return (
    <>
      <SourceBackLink href="/moderation">返回审核台</SourceBackLink>
      <section className="py-6">
          {!isReady ? (
            <LoadingState rows={3} />
          ) : !token ? (
            <EmptyState
              title="登录后查看举报详情"
              description="举报详情需要登录身份。平台权限会由后端继续校验。"
              action={
                <TextAction href={loginHref} tone="primary">
                  登录
                </TextAction>
              }
            />
          ) : reportQuery.isPending ? (
            <LoadingState rows={4} />
          ) : reportQuery.isError ? (
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
                    variant="outline"
                    size="sm"
                    onClick={() => reportQuery.refetch()}
                  >
                    重试
                  </Button>
                )
              }
            />
          ) : report ? (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
              <article className="min-w-0">
                <div className="border-b border-border pb-6">
                  <div className="font-mono text-xs uppercase text-primary">
                    MODERATION / 举报详情
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <StatusToken tone={getReportStatusTone(report.status)}>
                      {formatReportStatus(report.status)}
                    </StatusToken>
                    <StatusToken>{formatTargetType(report.target_type)}</StatusToken>
                    <StatusToken>举报人 {formatShortId(report.reporter_id)}</StatusToken>
                  </div>
                  <h1 className="mt-4 break-words text-4xl font-black leading-tight tracking-normal text-foreground md:text-5xl">
                    举报 {formatShortId(report.id)}
                  </h1>
                  <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
                    {report.reason}
                  </p>
                </div>

                <TargetPreviewPanel preview={report.target_preview} />

                <ReportDecisionPanel
                  onAfterAction={() => reportQuery.refetch()}
                  report={report}
                />
              </article>

              <ReportDetailRail report={report} />
            </div>
          ) : null}
      </section>
    </>
  );
}

function ReportStatusTabs({
  disabled,
  onStatusChange,
  status,
}: {
  disabled: boolean;
  onStatusChange: (status: ReportStatusFilter) => void;
  status: ReportStatusFilter;
}) {
  return (
    <Tabs
      value={status}
      onValueChange={(value) => onStatusChange(value as ReportStatusFilter)}
    >
      <TabsList className="rounded-none border-border bg-background p-0">
        {statusOptions.map((option, index) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            disabled={disabled}
            className={cn(
              "rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
              index < statusOptions.length - 1 ? "border-r border-border" : null,
            )}
          >
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

function ReportRow({ index, report }: { index: number; report: ContentReport }) {
  const preview = report.target_preview;
  const title = preview?.title || getMarkdownPlainTextSummary(preview?.body_excerpt, report.reason);

  return (
    <Link
      href={`/moderation/reports/${report.id}`}
      className="group grid gap-4 py-5 transition-colors hover:bg-background-soft/70 md:grid-cols-[56px_minmax(0,1fr)_160px]"
    >
      <div className="font-mono text-xs text-muted-foreground">
        {String(index + 1).padStart(2, "0")}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusToken tone={getReportStatusTone(report.status)}>
            {formatReportStatus(report.status)}
          </StatusToken>
          <StatusToken>{formatTargetType(report.target_type)}</StatusToken>
          <span className="text-xs text-muted-foreground">
            {formatDate(report.created_at)}
          </span>
        </div>
        <h2 className="mt-3 break-words text-xl font-semibold leading-7 group-hover:text-primary">
          {title}
        </h2>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
          {report.reason}
        </p>
      </div>
      <div className="flex items-center justify-end gap-2 text-sm font-semibold text-muted-foreground group-hover:text-primary">
        查看
        <ArrowRight
          className="size-4 transition-transform group-hover:translate-x-1"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}

function TargetPreviewPanel({ preview }: { preview?: ReportTargetPreview | null }) {
  const previewText = getMarkdownPlainTextSummary(
    preview?.body_excerpt,
    "暂无预览。",
  );

  return (
    <section className="border-b border-border py-6">
      <div className="font-mono text-xs uppercase text-primary">TARGET / 目标预览</div>
      {preview ? (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusToken>{formatTargetType(preview.target_type)}</StatusToken>
            <StatusToken>{formatContentStatus(preview.status)}</StatusToken>
            <StatusToken>作者 {formatShortId(preview.author_id)}</StatusToken>
          </div>
          {preview.title ? (
            <h2 className="break-words text-2xl font-black leading-tight">
              {preview.title}
            </h2>
          ) : null}
          <p className="break-words text-sm leading-7 text-muted-foreground">
            {previewText}
          </p>
          <div className="flex flex-wrap gap-3">
            {preview.post_id ? (
              <TextAction href={`/posts/${preview.post_id}`}>
                打开帖子
              </TextAction>
            ) : null}
            {preview.comment_id && preview.post_id ? (
              <TextAction href={`/posts/${preview.post_id}`}>
                查看评论上下文
              </TextAction>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          后端没有返回目标预览，仍可根据举报编号执行处理。
        </p>
      )}
    </section>
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

  async function dismissReport() {
    await dismissMutation.mutateAsync();
    onAfterAction();
  }

  return (
    <section className="border-b border-border py-6">
      <div className="font-mono text-xs uppercase text-primary">
        DECISION / 审核处理
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
        <Button
          type="button"
          variant="outline"
          disabled={!isPending || dismissMutation.isPending}
          onClick={dismissReport}
        >
          {dismissMutation.isPending ? "正在驳回..." : "驳回举报"}
        </Button>
        <RemoveTargetDialog
          disabled={!isPending}
          onAfterAction={onAfterAction}
          report={report}
        />
      </div>
    </section>
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
  const mutation = useRemoveModerationReportTargetMutation(report.id);
  const form = useForm<RemoveTargetFormValues>({
    resolver: zodResolver(removeTargetSchema),
    defaultValues: {
      reason: "",
    },
  });

  async function submit(values: RemoveTargetFormValues) {
    await mutation.mutateAsync(values);
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
        <Button type="button" variant="destructive" disabled={disabled}>
          <ShieldAlert className="size-4" aria-hidden="true" />
          移除目标
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
              disabled={mutation.isPending}
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
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button type="submit" variant="destructive" disabled={mutation.isPending}>
              {mutation.isPending ? "正在移除..." : "确认移除"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReportDetailRail({ report }: { report: ContentReport }) {
  return (
    <aside className="border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
      <div className="sticky top-6 space-y-8">
        <section className="border-b border-border pb-6">
          <div className="font-mono text-xs uppercase text-muted-foreground">
            举报信息
          </div>
          <div className="mt-3 divide-y divide-border border-y border-border">
            <InfoRow label="编号" value={formatShortId(report.id)} />
            <InfoRow label="目标" value={formatTargetType(report.target_type)} />
            <InfoRow label="状态" value={formatReportStatus(report.status)} />
            <InfoRow label="创建" value={formatDate(report.created_at)} />
            <InfoRow label="更新" value={formatDate(report.updated_at)} />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold">稳定出口</h2>
          <div className="mt-3 flex flex-col border-y border-border">
            <TextAction href="/moderation" variant="bar">
              审核台列表
            </TextAction>
            <TextAction href="/" variant="bar">
              最新讨论
            </TextAction>
          </div>
        </section>
      </div>
    </aside>
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
