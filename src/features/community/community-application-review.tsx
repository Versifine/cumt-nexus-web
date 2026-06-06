"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  RefreshCw,
  XCircle,
} from "lucide-react";

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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextAction } from "@/components/ui/text-action";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { useAuthSession } from "@/features/auth/auth-session";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import {
  useApproveCommunityApplicationMutation,
  useCommunityApplicationQuery,
  useCommunityApplicationsQuery,
  useRejectCommunityApplicationMutation,
} from "./queries";
import type {
  CommunityApplication,
  CommunityApplicationStatus,
} from "./types";

const PAGE_SIZE = 20;

const statusTabs: Array<{
  label: string;
  status: CommunityApplicationStatus;
}> = [
  { label: "待审核", status: "pending" },
  { label: "已通过", status: "approved" },
  { label: "已拒绝", status: "rejected" },
];

export function CommunityApplicationReview() {
  const { isReady, token } = useAuthSession();
  const currentUserQuery = useCurrentUserQuery();
  const [status, setStatus] = useState<CommunityApplicationStatus>("pending");
  const [offset, setOffset] = useState(0);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(
    null,
  );
  const [rejectReason, setRejectReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [lastReviewMessage, setLastReviewMessage] = useState<string | null>(null);
  const canReview =
    isReady && Boolean(token) && currentUserQuery.data?.is_platform_staff === true;
  const applicationsQuery = useCommunityApplicationsQuery(
    {
      status,
      limit: PAGE_SIZE,
      offset,
    },
    canReview,
  );
  const applications = applicationsQuery.data?.applications ?? [];
  const selectedId = selectedApplicationId ?? applications[0]?.id ?? null;
  const selectedQuery = useCommunityApplicationQuery(selectedId, canReview);
  const selectedApplication =
    selectedQuery.data?.application ??
    applications.find((application) => application.id === selectedId) ??
    null;
  const approveMutation = useApproveCommunityApplicationMutation();
  const rejectMutation = useRejectCommunityApplicationMutation();
  const isReviewing = approveMutation.isPending || rejectMutation.isPending;
  const submitError = getSubmitError(approveMutation.error ?? rejectMutation.error);
  const loginHref = `/login?next=${encodeURIComponent("/community-applications/review")}`;

  const metrics = useMemo(
    () => [
      {
        label: "当前视图",
        value: formatApplicationStatus(status),
      },
      {
        label: "本页数量",
        value: String(applications.length),
      },
      {
        label: "分页",
        value:
          applications.length > 0
            ? `${offset + 1}-${offset + applications.length}`
            : "0-0",
      },
    ],
    [applications.length, offset, status],
  );

  async function approveSelectedApplication() {
    if (!selectedApplication) {
      return;
    }

    setFormError(null);
    setLastReviewMessage(null);
    try {
      const result = await approveMutation.mutateAsync(selectedApplication.id);
      setSelectedApplicationId(result.application.id);
      setLastReviewMessage(
        `已通过 /${result.application.requested_slug}，社区 ${result.community.name} 已创建。`,
      );
    } catch {
      // TanStack Query exposes the mutation error through state for the page alert.
    }
  }

  async function rejectSelectedApplication() {
    if (!selectedApplication) {
      return;
    }

    const trimmedReason = rejectReason.trim();
    if (!trimmedReason) {
      setFormError("拒绝申请时必须填写拒绝原因。");
      return;
    }

    setFormError(null);
    setLastReviewMessage(null);
    try {
      const result = await rejectMutation.mutateAsync({
        id: selectedApplication.id,
        input: {
          reject_reason: trimmedReason,
        },
      });
      setSelectedApplicationId(result.application.id);
      setRejectReason("");
      setLastReviewMessage(`已拒绝 /${result.application.requested_slug}。`);
    } catch {
      // TanStack Query exposes the mutation error through state for the page alert.
    }
  }

  function changeStatus(nextStatus: CommunityApplicationStatus) {
    setStatus(nextStatus);
    setOffset(0);
    setSelectedApplicationId(null);
    setRejectReason("");
    setFormError(null);
    setLastReviewMessage(null);
  }

  if (!isReady || (token && currentUserQuery.isLoading)) {
    return <ReviewShell body={<LoadingPanel />} />;
  }

  if (!token) {
    return (
      <ReviewShell
        body={
          <div className="py-6">
            <EmptyState
              title="登录后审核社区申请"
              description="社区申请审核需要平台 staff 身份。登录后会自动确认权限。"
              action={
                <TextAction href={loginHref} tone="primary">
                  登录
                </TextAction>
              }
            />
          </div>
        }
      />
    );
  }

  if (currentUserQuery.isError) {
    return (
      <ReviewShell
        body={
          <div className="py-6">
            <ErrorState
              title="无法确认用户身份"
              description={getErrorDescription(currentUserQuery.error)}
              action={
                <Button variant="outline" onClick={() => currentUserQuery.refetch()}>
                  重试
                </Button>
              }
            />
          </div>
        }
      />
    );
  }

  if (!currentUserQuery.data?.is_platform_staff) {
    return (
      <ReviewShell
        body={
          <div className="py-6">
            <EmptyState
              title="需要平台权限"
              description="当前账号不是平台 staff，不能查看社区申请列表或执行审批。"
              action={<TextAction href="/">返回最新讨论</TextAction>}
            />
          </div>
        }
      />
    );
  }

  return (
    <>
      <SourceBackLink href="/community-applications/new">返回社区申请</SourceBackLink>
      <header className="border-b border-border pb-6 pt-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
            <div className="min-w-0">
              <div className="font-mono text-xs uppercase text-primary">
                CUMT NEXUS / 社区申请审核
              </div>
              <h1 className="mt-4 text-5xl font-black leading-[0.95] tracking-normal text-foreground md:text-6xl">
                审批社区申请
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
                读取后端待审列表和申请详情，平台 staff 可以在同一工作台完成通过或拒绝。
              </p>
            </div>

            <div className="grid grid-cols-3 border border-border text-center">
              {metrics.map((metric) => (
                <MetricBlock
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                />
              ))}
            </div>
          </div>
      </header>

      <section className="border-b border-border py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <Tabs
              value={status}
              onValueChange={(value) =>
                changeStatus(value as CommunityApplicationStatus)
              }
            >
              <TabsList className="rounded-none border-border bg-background p-0">
                {statusTabs.map((tab) => (
                  <TabsTrigger
                    key={tab.status}
                    value={tab.status}
                    className="rounded-none border-r border-border last:border-r-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={applicationsQuery.isFetching}
                onClick={() => applicationsQuery.refetch()}
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                刷新
              </Button>
            </div>
          </div>
      </section>

      {submitError ? (
        <Alert variant="destructive" className="mt-5">
          <AlertTitle>审批失败</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      {lastReviewMessage ? (
        <Alert variant="success" className="mt-5">
          <AlertTitle>审批已提交</AlertTitle>
          <AlertDescription>{lastReviewMessage}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-0 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <ApplicationListPanel
            applications={applications}
            applicationsQueryState={{
              error: applicationsQuery.error,
              isError: applicationsQuery.isError,
              isFetching: applicationsQuery.isFetching,
              isLoading: applicationsQuery.isLoading,
              refetch: applicationsQuery.refetch,
            }}
            offset={offset}
            onNextPage={() => {
              setOffset(offset + PAGE_SIZE);
              setSelectedApplicationId(null);
            }}
            onPreviousPage={() => {
              setOffset(Math.max(0, offset - PAGE_SIZE));
              setSelectedApplicationId(null);
            }}
            onSelect={setSelectedApplicationId}
            selectedId={selectedId}
          />

          <ApplicationDetailPanel
            application={selectedApplication}
            detailError={selectedQuery.error}
            formError={formError}
            isDetailError={selectedQuery.isError}
            isDetailLoading={selectedQuery.isLoading && Boolean(selectedId)}
            isReviewing={isReviewing}
            onApprove={approveSelectedApplication}
            onReject={rejectSelectedApplication}
            onRejectReasonChange={(value) => {
              setRejectReason(value);
              if (formError) {
                setFormError(null);
              }
            }}
            onRetryDetail={() => selectedQuery.refetch()}
            rejectReason={rejectReason}
          />
      </section>
    </>
  );
}

function ReviewShell({ body }: { body: React.ReactNode }) {
  return (
    <>
      <SourceBackLink href="/community-applications/new">返回社区申请</SourceBackLink>
      {body}
    </>
  );
}

function LoadingPanel() {
  return (
    <div className="py-6">
      <LoadingState rows={5} />
    </div>
  );
}

function ApplicationListPanel({
  applications,
  applicationsQueryState,
  offset,
  onNextPage,
  onPreviousPage,
  onSelect,
  selectedId,
}: {
  applications: CommunityApplication[];
  applicationsQueryState: {
    error: Error | null;
    isError: boolean;
    isFetching: boolean;
    isLoading: boolean;
    refetch: () => void;
  };
  offset: number;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
}) {
  return (
    <aside className="border-b border-border py-5 lg:border-b-0 lg:border-r lg:pr-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">申请列表</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            按状态分页读取后端申请。
          </p>
        </div>
        <StatusToken>{applicationsQueryState.isFetching ? "同步中" : "已同步"}</StatusToken>
      </div>

      {applicationsQueryState.isLoading ? <LoadingState rows={5} /> : null}

      {applicationsQueryState.isError ? (
        <ErrorState
          title="无法加载申请列表"
          description={getErrorDescription(applicationsQueryState.error)}
          action={
            <Button variant="outline" onClick={applicationsQueryState.refetch}>
              重试
            </Button>
          }
        />
      ) : null}

      {!applicationsQueryState.isLoading &&
      !applicationsQueryState.isError &&
      applications.length === 0 ? (
        <EmptyState
          title="当前没有申请"
          description="切换状态或稍后刷新，新的社区申请会出现在这里。"
        />
      ) : null}

      {applications.length > 0 ? (
        <div className="divide-y divide-border border-y border-border">
          {applications.map((application, index) => (
            <button
              key={application.id}
              type="button"
              className={cn(
                "grid w-full grid-cols-[44px_minmax(0,1fr)] gap-3 py-4 text-left transition-colors hover:bg-background-soft/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                selectedId === application.id ? "bg-primary/10" : null,
              )}
              onClick={() => onSelect(application.id)}
            >
              <span className="font-mono text-xs text-muted-foreground">
                {String(offset + index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">
                    {application.requested_name}
                  </span>
                  <ApplicationStatusToken status={application.status} />
                </span>
                <span className="mt-2 block truncate font-mono text-xs text-muted-foreground">
                  /{application.requested_slug}
                </span>
                <span className="mt-2 block text-xs text-muted-foreground">
                  {formatDateTime(application.created_at)}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={offset === 0 || applicationsQueryState.isFetching}
          onClick={onPreviousPage}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          上一页
        </Button>
        <span className="font-mono text-xs text-muted-foreground">
          OFFSET {offset}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={applications.length < PAGE_SIZE || applicationsQueryState.isFetching}
          onClick={onNextPage}
        >
          下一页
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </aside>
  );
}

function ApplicationDetailPanel({
  application,
  detailError,
  formError,
  isDetailError,
  isDetailLoading,
  isReviewing,
  onApprove,
  onReject,
  onRejectReasonChange,
  onRetryDetail,
  rejectReason,
}: {
  application: CommunityApplication | null;
  detailError: Error | null;
  formError: string | null;
  isDetailError: boolean;
  isDetailLoading: boolean;
  isReviewing: boolean;
  onApprove: () => void;
  onReject: () => void;
  onRejectReasonChange: (value: string) => void;
  onRetryDetail: () => void;
  rejectReason: string;
}) {
  if (isDetailLoading) {
    return (
      <section className="py-5 lg:pl-5">
        <LoadingState rows={6} />
      </section>
    );
  }

  if (isDetailError) {
    return (
      <section className="py-5 lg:pl-5">
        <ErrorState
          title="无法加载申请详情"
          description={getErrorDescription(detailError)}
          action={
            <Button variant="outline" onClick={onRetryDetail}>
              重试
            </Button>
          }
        />
      </section>
    );
  }

  if (!application) {
    return (
      <section className="py-5 lg:pl-5">
        <EmptyState
          title="选择一条申请"
          description="从左侧列表选择申请后，可以查看详情并执行审批动作。"
          action={<ClipboardList className="size-5 text-primary" aria-hidden="true" />}
        />
      </section>
    );
  }

  const canReview = application.status === "pending";

  return (
    <section className="py-5 lg:pl-5">
      <div className="border-b border-border pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <ApplicationStatusToken status={application.status} />
          <span className="font-mono text-xs text-muted-foreground">
            {application.id}
          </span>
        </div>
        <h2 className="mt-4 text-3xl font-black leading-tight tracking-normal text-foreground">
          {application.requested_name}
        </h2>
        <p className="mt-2 font-mono text-sm text-primary">
          /{application.requested_slug}
        </p>
      </div>

      <div className="divide-y divide-border border-b border-border">
        <InfoRow label="申请人" value={formatShortId(application.applicant_id)} />
        <InfoRow label="创建时间" value={formatDateTime(application.created_at)} />
        <InfoRow label="更新时间" value={formatDateTime(application.updated_at)} />
        <InfoRow
          label="审核人"
          value={application.reviewed_by ? formatShortId(application.reviewed_by) : "尚未审核"}
        />
        <InfoRow
          label="审核时间"
          value={application.reviewed_at ? formatDateTime(application.reviewed_at) : "尚未审核"}
        />
      </div>

      <section className="border-b border-border py-5">
        <h3 className="text-sm font-semibold">申请理由</h3>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
          {application.reason}
        </p>
      </section>

      {application.reject_reason ? (
        <section className="border-b border-border py-5">
          <h3 className="text-sm font-semibold text-destructive">拒绝原因</h3>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
            {application.reject_reason}
          </p>
        </section>
      ) : null}

      <section className="py-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">审核动作</h3>
          <StatusToken tone={canReview ? "primary" : "default"}>
            {canReview ? "可审核" : "已结束"}
          </StatusToken>
        </div>

        {canReview ? (
          <div className="space-y-3">
            <Textarea
              value={rejectReason}
              disabled={isReviewing}
              onChange={(event) => onRejectReasonChange(event.target.value)}
              placeholder="拒绝时填写原因；通过申请不需要填写。"
              className="min-h-28 border-border bg-background text-sm leading-7"
              aria-invalid={Boolean(formError)}
            />
            <div className="flex flex-col gap-3 text-xs sm:flex-row sm:items-center sm:justify-between">
              <p className={formError ? "text-destructive" : "text-muted-foreground"}>
                {formError ?? "通过后后端会创建社区并建立 owner 成员关系。"}
              </p>
              <span className="font-mono text-muted-foreground">
                {rejectReason.trim().length} 字
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button disabled={isReviewing} onClick={onApprove}>
                <CheckCircle2 className="size-4" aria-hidden="true" />
                {isReviewing ? "正在提交..." : "通过申请"}
              </Button>
              <Button
                variant="destructive"
                disabled={isReviewing}
                onClick={onReject}
              >
                <XCircle className="size-4" aria-hidden="true" />
                {isReviewing ? "正在提交..." : "拒绝申请"}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            该申请已处理，不能重复审核。
          </p>
        )}
      </section>
    </section>
  );
}

function ApplicationStatusToken({ status }: { status: string }) {
  return (
    <StatusToken tone={getStatusTone(status)}>
      {formatApplicationStatus(status)}
    </StatusToken>
  );
}

function getStatusTone(status: string): StatusTokenTone {
  switch (status) {
    case "pending":
      return "warning";
    case "approved":
      return "success";
    case "rejected":
      return "danger";
    default:
      return "default";
  }
}

function getSubmitError(error: Error | null) {
  if (!error) {
    return null;
  }

  return getErrorDescription(error);
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}

function formatApplicationStatus(status: string) {
  switch (status) {
    case "pending":
      return "待审核";
    case "approved":
      return "已通过";
    case "rejected":
      return "已拒绝";
    case "canceled":
      return "已取消";
    default:
      return status;
  }
}

function formatShortId(value: string) {
  return value.slice(0, 8);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
