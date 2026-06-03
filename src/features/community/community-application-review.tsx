"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, XCircle } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { PageNav } from "@/components/app-shell/page-nav";
import { EmptyState } from "@/components/feedback/empty-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InfoRow, MetricBlock, StatusToken } from "@/components/ui/data-display";
import { Input } from "@/components/ui/input";
import { TextAction } from "@/components/ui/text-action";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSession } from "@/features/auth/auth-session";
import { ApiError } from "@/lib/api/client";

import {
  useApproveCommunityApplicationMutation,
  useRejectCommunityApplicationMutation,
} from "./queries";
import type { CommunityApplication } from "./types";

const reviewSchema = z.object({
  applicationId: z.string().trim().min(1, "请输入申请 ID。"),
  rejectReason: z.string().trim(),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;
type ReviewAction = "approve" | "reject";

export function CommunityApplicationReview() {
  const { isReady, token } = useAuthSession();
  const [lastReviewedApplication, setLastReviewedApplication] =
    useState<CommunityApplication | null>(null);
  const approveMutation = useApproveCommunityApplicationMutation();
  const rejectMutation = useRejectCommunityApplicationMutation();
  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      applicationId: "",
      rejectReason: "",
    },
  });
  const applicationId = useWatch({ control: form.control, name: "applicationId" }) ?? "";
  const rejectReason = useWatch({ control: form.control, name: "rejectReason" }) ?? "";
  const loginHref = `/login?next=${encodeURIComponent("/community-applications/review")}`;
  const submitError = getSubmitError(approveMutation.error ?? rejectMutation.error);
  const isSubmitting = approveMutation.isPending || rejectMutation.isPending;

  async function submitReview(values: ReviewFormValues, action: ReviewAction) {
    const id = values.applicationId.trim();

    if (action === "approve") {
      const result = await approveMutation.mutateAsync(id);
      setLastReviewedApplication(result.application);
      return;
    }

    const reason = values.rejectReason.trim();
    if (!reason) {
      form.setError("rejectReason", {
        message: "拒绝申请时必须填写拒绝原因。",
      });
      return;
    }

    const result = await rejectMutation.mutateAsync({
      id,
      input: {
        reject_reason: reason,
      },
    });
    setLastReviewedApplication(result.application);
  }

  if (!isReady) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto w-full max-w-[960px] px-4 py-6 md:px-6">
          <PageNav backHref="/community-applications/new" backLabel="返回社区申请" />
          <div className="border-b border-border py-6 text-sm text-muted-foreground">
            正在确认登录状态...
          </div>
        </div>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto w-full max-w-[960px] px-4 py-6 md:px-6">
          <PageNav backHref="/community-applications/new" backLabel="返回社区申请" />
          <div className="py-6">
            <EmptyState
              title="登录后审核社区申请"
              description="审批接口需要登录身份，平台权限由后端继续校验。"
              action={
                <TextAction href={loginHref} tone="primary">
                  登录
                </TextAction>
              }
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[960px] px-4 py-6 md:px-6">
        <PageNav backHref="/community-applications/new" backLabel="返回社区申请" />

        <header className="border-b border-border pb-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
            <div className="min-w-0">
              <div className="font-mono text-xs uppercase text-primary">
                CUMT NEXUS / 社区申请审核
              </div>
              <h1 className="mt-4 text-5xl font-black leading-[0.95] tracking-normal text-foreground md:text-6xl">
                审批社区申请
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
                当前后端提供 approve/reject 动作，但没有申请列表接口。本页只按申请 ID 执行审批，不伪造待审列表。
              </p>
            </div>

            <div className="grid grid-cols-2 border border-border text-center">
              <MetricBlock label="动作" value="通过 / 拒绝" />
              <MetricBlock label="列表" value="待后端" />
            </div>
          </div>
        </header>

        <form className="space-y-0" onSubmit={(event) => event.preventDefault()}>
          {submitError ? (
            <Alert variant="destructive" className="mt-5">
              <AlertTitle>审批失败</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}

          {lastReviewedApplication ? (
            <Alert variant="success" className="mt-5">
              <AlertTitle>审批已提交</AlertTitle>
              <AlertDescription>
                申请 {lastReviewedApplication.id.slice(0, 8)} 当前状态：
                {formatApplicationStatus(lastReviewedApplication.status)}。
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 border-b border-border py-5 md:grid-cols-[160px_minmax(0,1fr)]">
            <FieldLabel
              description="后端目前没有列表接口，需要粘贴申请 ID。"
              htmlFor="application-id"
              index="01"
              title="申请 ID"
            />
            <div className="min-w-0 space-y-2">
              <Input
                id="application-id"
                autoComplete="off"
                aria-invalid={Boolean(form.formState.errors.applicationId)}
                disabled={isSubmitting}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="h-12 border-border bg-background font-mono text-sm"
                {...form.register("applicationId")}
              />
              <FieldMeta
                count={applicationId.trim().length}
                error={form.formState.errors.applicationId?.message}
                hint="输入完整申请 ID 后，可以选择通过或拒绝。"
              />
            </div>
          </div>

          <div className="grid gap-4 border-b border-border py-5 md:grid-cols-[160px_minmax(0,1fr)]">
            <FieldLabel
              description="只有拒绝时必填。"
              htmlFor="reject-reason"
              index="02"
              title="拒绝原因"
            />
            <div className="min-w-0 space-y-2">
              <Textarea
                id="reject-reason"
                aria-invalid={Boolean(form.formState.errors.rejectReason)}
                disabled={isSubmitting}
                placeholder="说明拒绝原因，方便申请人调整后重新提交。"
                className="min-h-36 border-border bg-background text-sm leading-7"
                {...form.register("rejectReason")}
              />
              <FieldMeta
                count={rejectReason.trim().length}
                error={form.formState.errors.rejectReason?.message}
                hint="通过申请时可以留空。"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              后端会在权限不足时返回权限错误，前端不预判 staff 身份。
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={isSubmitting}
                onClick={form.handleSubmit((values) => submitReview(values, "approve"))}
              >
                <CheckCircle2 className="size-4" aria-hidden="true" />
                {approveMutation.isPending ? "正在通过..." : "通过申请"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isSubmitting}
                onClick={form.handleSubmit((values) => submitReview(values, "reject"))}
              >
                <XCircle className="size-4" aria-hidden="true" />
                {rejectMutation.isPending ? "正在拒绝..." : "拒绝申请"}
              </Button>
            </div>
          </div>
        </form>

        {lastReviewedApplication ? (
          <section className="border-t border-border py-5">
            <div className="font-mono text-xs uppercase text-primary">
              RESULT / 最近审批
            </div>
            <div className="mt-3 divide-y divide-border border-y border-border">
              <InfoRow label="申请 ID" value={lastReviewedApplication.id.slice(0, 8)} />
              <InfoRow label="Slug" value={`/${lastReviewedApplication.requested_slug}`} />
              <InfoRow label="名称" value={lastReviewedApplication.requested_name} />
              <InfoRow label="状态" value={formatApplicationStatus(lastReviewedApplication.status)} />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <StatusToken tone="primary">
                {formatApplicationStatus(lastReviewedApplication.status)}
              </StatusToken>
              <TextAction href="/communities">查看社区索引</TextAction>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function FieldLabel({
  description,
  htmlFor,
  index,
  title,
}: {
  description: string;
  htmlFor: string;
  index: string;
  title: string;
}) {
  return (
    <div>
      <label
        className="flex items-center gap-3 text-sm font-semibold text-foreground"
        htmlFor={htmlFor}
      >
        <span className="font-mono text-xs text-primary">{index}</span>
        {title}
      </label>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function FieldMeta({
  count,
  error,
  hint,
}: {
  count: number;
  error?: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
      <p className={error ? "text-destructive" : "text-muted-foreground"}>
        {error ?? hint}
      </p>
      <span className="font-mono text-muted-foreground">{count} 字</span>
    </div>
  );
}

function getSubmitError(error: Error | null) {
  if (!error) {
    return null;
  }

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
