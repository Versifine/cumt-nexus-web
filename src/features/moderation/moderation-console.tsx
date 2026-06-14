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

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
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
  const canLoadReports =
    isReady && Boolean(token) && currentUserQuery.data?.is_platform_staff === true;
  const reportsQuery = useModerationReportsQuery(
    { limit: 20, offset: 0, status },
    canLoadReports,
  );
  const reports = reportsQuery.data?.reports ?? [];
  const loginHref = `/login?next=${encodeURIComponent("/moderation")}`;

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
                description="举报审核需要平台 staff 身份。登录后会自动确认权限。"
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
          !currentUserQuery.data?.is_platform_staff ? (
            <StatePanel>
              <EmptyState
                title="需要平台权限"
                description="当前账号不是平台 staff，不能查看举报列表或执行审核处理。"
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
      onRefresh={() => reportsQuery.refetch()}
      onStatusChange={setStatus}
      reportCount={reports.length}
      status={status}
    />
  );
}

export function ModerationReportDetail({ id }: { id: string }) {
  const { isReady, token } = useAuthSession();
  const currentUserQuery = useCurrentUserQuery();
  const canLoadReport =
    isReady && Boolean(token) && currentUserQuery.data?.is_platform_staff === true;
  const reportQuery = useModerationReportQuery(id, canLoadReport);
  const report = reportQuery.data?.report;
  const loginHref = `/login?next=${encodeURIComponent(`/moderation/reports/${id}`)}`;

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
                description="举报详情需要平台 staff 身份。登录后会自动确认权限。"
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
          !currentUserQuery.data?.is_platform_staff ? (
            <StatePanel>
              <EmptyState
                title="需要平台权限"
                description="当前账号不是平台 staff，不能查看举报详情或执行审核处理。"
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
    <div className="grid grid-cols-1 gap-0 py-2 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0">
        <section className="bg-background">
          <ModerationHeader
            offset={offset}
            reportCount={reportCount}
            status={status}
          />
        </section>

        <section className="bg-background">
          <div className="flex min-h-12 flex-col gap-3 border-b border-border py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">举报列表</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                当前查看{formatReportStatus(status)}举报
              </p>
            </div>
            <ModerationToolbar
              disabled={isFetching}
              onRefresh={onRefresh}
              onStatusChange={onStatusChange}
              status={status}
            />
          </div>
          {body}
        </section>
      </div>

      <ModerationRail reportCount={reportCount} status={status} />
    </div>
  );
}

function ModerationHeader({
  offset,
  reportCount,
  status,
}: {
  offset: number;
  reportCount: number;
  status: ReportStatusFilter;
}) {
  return (
    <div className="border-b border-border py-4">
      <div className="min-w-0">
        <h1 className="break-words text-xl font-semibold leading-7 tracking-normal text-foreground sm:text-2xl">
          举报审核
        </h1>
        <p className="mt-1 truncate font-mono text-xs text-primary">
          /moderation
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          当前查看{formatReportStatus(status)}举报，本页 {reportCount} 条，偏移 {offset}。
        </p>
      </div>
    </div>
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
        <TabsList className="h-9 rounded-none bg-transparent p-0">
          {statusOptions.map((option) => (
            <TabsTrigger
              key={option.value}
              value={option.value}
              disabled={disabled}
              className="h-9 rounded-none border-b border-transparent px-3 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
            >
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Button variant="ghost" size="sm" disabled={disabled} onClick={onRefresh}>
        <RefreshCw className="size-4" aria-hidden="true" />
        刷新
      </Button>
    </div>
  );
}

function ModerationRail({
  reportCount,
  status,
}: {
  reportCount: number;
  status: ReportStatusFilter;
}) {
  return (
    <aside className="border-t border-border py-5 xl:border-l xl:border-t-0 xl:pl-5">
      <div className="sticky top-20 right-rail-scroll space-y-6">
        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">审核上下文</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            当前从用户菜单进入举报审核，正在查看{formatReportStatus(status)}
            举报，本页 {reportCount} 条。
          </p>
        </section>

        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">处理规则</h2>
          <ol className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
            <li><span className="font-mono text-primary">01</span> 详情页以目标预览和举报理由共同判断。</li>
            <li><span className="font-mono text-primary">02</span> 驳回和移除目标都会记录审核动作。</li>
            <li><span className="font-mono text-primary">03</span> 入口显隐不替代后端 staff 权限校验。</li>
          </ol>
        </section>

        <section>
          <h2 className="text-sm font-semibold">其他入口</h2>
          <div className="mt-3 flex flex-col border-t border-border">
            <TextAction href="/community-applications/review" variant="bar">
              社区审批
            </TextAction>
            <TextAction href="/" variant="bar">
              信息流首页
            </TextAction>
          </div>
        </section>
      </div>
    </aside>
  );
}

function ReportList({ reports }: { reports: ContentReport[] }) {
  return (
    <div className="border-b border-border">
      {reports.map((report, index) => (
        <ReportRow key={report.id} index={index} report={report} />
      ))}
    </div>
  );
}

function ReportRow({ index, report }: { index: number; report: ContentReport }) {
  const preview = report.target_preview;
  const title =
    preview?.title ||
    getMarkdownPlainTextSummary(preview?.body_excerpt, report.reason);

  return (
    <Link
      href={`/moderation/reports/${report.id}`}
      className="group grid grid-cols-[40px_minmax(0,1fr)] gap-3 border-b border-border px-3 py-3 last:border-b-0 sm:px-4"
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
  report,
  reportId,
}: {
  body: ReactNode;
  report?: ContentReport;
  reportId: string;
}) {
  const shortId = formatShortId(reportId);

  return (
    <div className="grid grid-cols-1 gap-0 py-2 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0">
        <section className="bg-background">
          <ReportHeader report={report} shortId={shortId} />
        </section>

        <section className="bg-background">
          <div className="border-b border-border py-3">
            <h2 className="text-sm font-semibold">举报详情</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              目标预览、举报理由和处理动作。
            </p>
          </div>
          {body}
        </section>
      </div>

      <ReportRail report={report} shortId={shortId} />
    </div>
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
    <div className="border-b border-border py-4">
      <div className="min-w-0">
        <h1 className="break-words text-xl font-semibold leading-7 tracking-normal text-foreground sm:text-2xl">
          举报 {shortId}
        </h1>
        <p className="mt-1 truncate font-mono text-xs text-primary">
          /moderation/reports/{shortId}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {report ? (
            <>
              <StatusToken tone={getReportStatusTone(report.status)}>
                {formatReportStatus(report.status)}
              </StatusToken>
              <StatusToken>{formatTargetType(report.target_type)}</StatusToken>
            </>
          ) : (
            <StatusToken>读取中</StatusToken>
          )}
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          {report?.reason || "读取举报详情后会显示举报理由和目标预览。"}
        </p>
      </div>
    </div>
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
    <article className="border-b border-border">
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
    <section className="border-b border-border px-3 py-4 sm:px-4">
      <h3 className="text-sm font-semibold">目标预览</h3>
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
          <div className="flex flex-wrap gap-3">
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
  const isTargetRemoved = report.target_preview?.status === "removed";

  async function dismissReport() {
    await dismissMutation.mutateAsync();
    onAfterAction();
  }

  return (
    <section className="px-3 py-4 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">审核处理</h3>
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

function ReportRail({
  report,
  shortId,
}: {
  report?: ContentReport;
  shortId: string;
}) {
  return (
    <aside className="border-t border-border py-5 xl:border-l xl:border-t-0 xl:pl-5">
      <div className="sticky top-20 right-rail-scroll space-y-6">
        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">举报信息</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            编号 <span className="font-mono text-foreground">{shortId}</span>，
            目标 {report ? formatTargetType(report.target_type) : "--"}，
            状态 {report ? formatReportStatus(report.status) : "--"}。
          </p>
          {report ? (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              创建 {formatDate(report.created_at)}，更新 {formatDate(report.updated_at)}。
            </p>
          ) : null}
        </section>

        <section className="border-b border-border pb-5">
          <h2 className="text-sm font-semibold">处理规则</h2>
          <ol className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
            <li><span className="font-mono text-primary">01</span> 举报不成立时只关闭举报。</li>
            <li><span className="font-mono text-primary">02</span> 目标违规时填写原因并移除帖子或评论。</li>
          </ol>
        </section>

        <section>
          <h2 className="text-sm font-semibold">稳定出口</h2>
          <div className="mt-3 flex flex-col border-t border-border">
            <TextAction href="/moderation" variant="bar">
              举报审核
            </TextAction>
            <TextAction href="/" variant="bar">
              信息流首页
            </TextAction>
          </div>
        </section>
      </div>
    </aside>
  );
}

function StatePanel({ children }: { children: ReactNode }) {
  return <div className="border-b border-border p-4">{children}</div>;
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

