"use client";

import { useState, type ReactNode } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  RefreshCw,
  XCircle,
} from "lucide-react";

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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextAction } from "@/components/ui/text-action";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSession } from "@/features/auth/auth-session";
import { resolvePlatformRole, type PlatformRole } from "@/features/auth/platform-role";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { AdminToolsNav } from "@/features/admin/admin-tools-nav";
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
  const platformRole = resolvePlatformRole(currentUserQuery.data);
  const canReview = isReady && Boolean(token) && Boolean(platformRole);
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
  const loginHref = `/login?next=${encodeURIComponent(
    "/admin/community-applications",
  )}`;

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
      // Mutation state drives the visible error alert.
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
      // Mutation state drives the visible error alert.
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
    return (
      <ReviewLayout
        applicationsCount={0}
        platformRole={platformRole}
        body={
          <ReviewDeskState>
            <LoadingState rows={5} />
          </ReviewDeskState>
        }
        currentUserState="确认中"
        offset={0}
        status={status}
      />
    );
  }

  if (!token) {
    return (
      <ReviewLayout
        applicationsCount={0}
        platformRole={platformRole}
        body={
          <ReviewDeskState>
            <EmptyState
              title="登录后审核社区申请"
              description="社区申请审核需要平台管理权限。登录后会自动确认权限。"
              action={
                <TextAction href={loginHref} tone="primary">
                  登录
                </TextAction>
              }
            />
          </ReviewDeskState>
        }
        currentUserState="未登录"
        offset={0}
        status={status}
      />
    );
  }

  if (currentUserQuery.isError) {
    return (
      <ReviewLayout
        applicationsCount={0}
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
        currentUserState="验证失败"
        offset={0}
        status={status}
      />
    );
  }

  if (!platformRole) {
    return (
      <ReviewLayout
        applicationsCount={0}
        platformRole={platformRole}
        body={
          <ReviewDeskState>
            <EmptyState
              title="需要平台权限"
              description="当前账号没有平台管理权限，不能查看社区申请列表或执行审批。"
              action={<TextAction href="/">信息流首页</TextAction>}
            />
          </ReviewDeskState>
        }
        currentUserState="无权限"
        offset={0}
        status={status}
      />
    );
  }

  return (
    <ReviewLayout
      applicationsCount={applications.length}
      currentUserState={formatReviewerRole(platformRole)}
      offset={offset}
      platformRole={platformRole}
      status={status}
      toolbar={
        <ReviewToolbar
          isFetching={applicationsQuery.isFetching}
          onRefresh={() => {
            void applicationsQuery.refetch({ cancelRefetch: false });
          }}
          onStatusChange={changeStatus}
          status={status}
        />
      }
      body={
        <>
          {submitError ? (
            <Alert variant="destructive">
              <AlertTitle>审批失败</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}

          {lastReviewMessage ? (
            <Alert variant="success">
              <AlertTitle>审批已提交</AlertTitle>
              <AlertDescription>{lastReviewMessage}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
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
          </div>
        </>
      }
    />
  );
}

function ReviewLayout({
  applicationsCount,
  body,
  currentUserState,
  offset,
  platformRole,
  status,
  toolbar,
}: {
  applicationsCount: number;
  body: ReactNode;
  currentUserState: string;
  offset: number;
  platformRole: PlatformRole | null;
  status: CommunityApplicationStatus;
  toolbar?: ReactNode;
}) {
  return (
    <ReviewDesk>
      <ReviewDeskMasthead
        actions={toolbar}
        eyebrow="/admin/community-applications"
        title="社区审批工作台"
        description="左侧按申请队列扫读，右侧直接完成详情判断和审批动作。通过会创建社区并建立 owner 关系；拒绝必须留下原因。"
        meta={
          <>
            <MetricBlock
              label="当前状态"
              value={formatApplicationStatus(status)}
              variant="compact"
            />
            <MetricBlock label="本页申请" value={applicationsCount} variant="compact" />
            <MetricBlock label="页偏移" value={offset} variant="compact" />
            <MetricBlock
              label="审核身份"
              value={currentUserState}
              valueClassName="truncate"
              variant="compact"
            />
          </>
        }
      />

      <ReviewDeskBoard
        inspector={
          <div className="space-y-4">
            <AdminToolsNav
              activePath="/admin/community-applications"
              platformRole={platformRole}
              variant="compact"
            />
            <ApplicationContextPanel
              applicationsCount={applicationsCount}
              currentUserState={currentUserState}
              status={status}
            />
          </div>
        }
      >
        {body}
      </ReviewDeskBoard>
    </ReviewDesk>
  );
}

function ReviewToolbar({
  isFetching,
  onRefresh,
  onStatusChange,
  status,
}: {
  isFetching: boolean;
  onRefresh: () => void;
  onStatusChange: (status: CommunityApplicationStatus) => void;
  status: CommunityApplicationStatus;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Tabs
        value={status}
        onValueChange={(value) =>
          onStatusChange(value as CommunityApplicationStatus)
        }
      >
        <TabsList className="h-9 rounded-md bg-surface-raised p-1">
          {statusTabs.map((tab) => (
            <TabsTrigger
              key={tab.status}
              value={tab.status}
              className="h-7 rounded px-3 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={isFetching}
        onClick={onRefresh}
      >
        <RefreshCw
          className={isFetching ? "size-4 animate-spin" : "size-4"}
          aria-hidden="true"
        />
        {isFetching ? "刷新中" : "刷新"}
      </Button>
    </div>
  );
}

function ApplicationContextPanel({
  applicationsCount,
  currentUserState,
  status,
}: {
  applicationsCount: number;
  currentUserState: string;
  status: CommunityApplicationStatus;
}) {
  return (
    <ReviewDeskInspector
      title="审批上下文"
      description={`当前查看${formatApplicationStatus(status)}申请。`}
    >
      <div className="grid grid-cols-2 gap-2">
        <ContextMetric label="本页" value={`${applicationsCount} 条`} />
        <ContextMetric label="身份" value={currentUserState} />
      </div>

      <div className="mt-4 space-y-2">
        <IndexedInfoRow
          index="01"
          title="先看详情"
          text="列表只用于定位，最终判断以详情区返回的数据为准。"
        />
        <IndexedInfoRow
          index="02"
          title="拒绝留痕"
          text="拒绝申请必须填写原因，便于申请人按反馈重新整理。"
        />
        <IndexedInfoRow
          index="03"
          title="后端兜底"
          text="入口显隐只做体验控制，平台权限仍由后端校验。"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3 rounded-md bg-surface-raised p-3">
        <TextAction href="/community-applications/new">社区申请入口</TextAction>
        <TextAction href="/communities">社区列表</TextAction>
      </div>
    </ReviewDeskInspector>
  );
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
    <ReviewDeskPanel
      title="申请队列"
      description="按状态分页读取后端申请。"
      headerAction={
        <StatusToken tone={applicationsQueryState.isFetching ? "primary" : "default"}>
          {applicationsQueryState.isFetching ? "同步中" : "已同步"}
        </StatusToken>
      }
    >
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
        <div className="space-y-2">
          {applications.map((application, index) => (
            <button
              key={application.id}
              type="button"
              className={cn(
                "nexus-micro-lift grid w-full grid-cols-[40px_minmax(0,1fr)] gap-3 rounded-md bg-surface-raised px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                selectedId === application.id
                  ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                  : "hover:bg-surface-hover hover:text-primary",
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
          variant="ghost"
          size="sm"
          className="px-1 hover:bg-transparent hover:text-primary"
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
          variant="ghost"
          size="sm"
          className="px-1 hover:bg-transparent hover:text-primary"
          disabled={applications.length < PAGE_SIZE || applicationsQueryState.isFetching}
          onClick={onNextPage}
        >
          下一页
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </ReviewDeskPanel>
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
      <ReviewDeskPanel>
        <LoadingState rows={6} />
      </ReviewDeskPanel>
    );
  }

  if (isDetailError) {
    return (
      <ReviewDeskPanel>
        <ErrorState
          title="无法加载申请详情"
          description={getErrorDescription(detailError)}
          action={
            <Button variant="outline" onClick={onRetryDetail}>
              重试
            </Button>
          }
        />
      </ReviewDeskPanel>
    );
  }

  if (!application) {
    return (
      <ReviewDeskPanel>
        <EmptyState
          title="选择一条申请"
          description="从申请列表选择项目后，可以查看详情并执行审批动作。"
          action={<ClipboardList className="size-5 text-primary" aria-hidden="true" />}
        />
      </ReviewDeskPanel>
    );
  }

  const canReviewApplication = application.status === "pending";

  return (
    <ReviewDeskPanel>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <ApplicationStatusToken status={application.status} />
            <span className="font-mono text-xs text-muted-foreground">
              {application.id}
            </span>
          </div>
          <h2 className="mt-3 break-words text-2xl font-semibold leading-8 tracking-normal text-foreground">
            {application.requested_name}
          </h2>
          <p className="mt-1 break-words font-mono text-xs text-primary">
            /{application.requested_slug}
          </p>
        </div>
        <StatusToken tone={canReviewApplication ? "primary" : "default"}>
          {canReviewApplication ? "可审核" : "已结束"}
        </StatusToken>
      </div>

      <div className="mt-5 rounded-md bg-surface-raised p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ApplicationMeta label="申请人" value={formatShortId(application.applicant_id)} />
          <ApplicationMeta label="创建时间" value={formatDateTime(application.created_at)} />
          <ApplicationMeta label="更新时间" value={formatDateTime(application.updated_at)} />
          <ApplicationMeta
            label="审核人"
            value={
              application.reviewed_by
                ? formatShortId(application.reviewed_by)
                : "尚未审核"
            }
          />
          <ApplicationMeta
            label="审核时间"
            value={
              application.reviewed_at
                ? formatDateTime(application.reviewed_at)
                : "尚未审核"
            }
          />
        </div>
      </div>

      <section className="mt-4 rounded-md bg-surface-raised p-4">
        <h3 className="text-sm font-semibold">申请理由</h3>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
          {application.reason}
        </p>
      </section>

      {application.reject_reason ? (
        <section className="mt-4 rounded-md bg-red-500/10 p-4">
          <h3 className="text-sm font-semibold text-destructive">拒绝原因</h3>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
            {application.reject_reason}
          </p>
        </section>
      ) : null}

      <section className="mt-4 rounded-md bg-surface-raised p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">审核动作</h3>
        </div>

        {canReviewApplication ? (
          <div className="space-y-3">
            <Textarea
              value={rejectReason}
              disabled={isReviewing}
              onChange={(event) => onRejectReasonChange(event.target.value)}
              placeholder="拒绝时填写原因；通过申请不需要填写。"
              className="min-h-28 border-border bg-background text-sm leading-7"
              aria-invalid={Boolean(formError)}
            />
            <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
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
    </ReviewDeskPanel>
  );
}

function ApplicationMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-sm font-medium text-foreground">
        {value}
      </div>
    </div>
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

function formatReviewerRole(role: ReturnType<typeof resolvePlatformRole>) {
  switch (role) {
    case "owner":
      return "站点负责人";
    case "admin":
      return "平台管理员";
    case "staff":
      return "平台审核员";
    default:
      return "平台权限";
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
