"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TextAction } from "@/components/ui/text-action";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import { submitCommunityApplication } from "./api";

const applicationSchema = z.object({
  requested_slug: z
    .string()
    .trim()
    .min(1, "请输入社区 URL 标识。")
    .regex(/^[a-z0-9-]+$/, "只能使用小写字母、数字和连字符。"),
  requested_name: z.string().trim().min(1, "请输入社区名称。"),
  reason: z.string().trim().min(1, "请输入申请理由。"),
});

type ApplicationFormValues = z.infer<typeof applicationSchema>;

type CommunityApplicationFormProps = {
  className?: string;
};

export function CommunityApplicationForm({
  className,
}: CommunityApplicationFormProps) {
  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      requested_slug: "",
      requested_name: "",
      reason: "",
    },
  });

  const applicationMutation = useMutation({
    mutationFn: submitCommunityApplication,
    onSuccess: () => {
      form.reset();
    },
  });

  const slugValue =
    useWatch({ control: form.control, name: "requested_slug" }) ?? "";
  const nameValue =
    useWatch({ control: form.control, name: "requested_name" }) ?? "";
  const reasonValue = useWatch({ control: form.control, name: "reason" }) ?? "";
  const submitError = getSubmitError(applicationMutation.error);

  if (applicationMutation.isSuccess) {
    return (
      <div className={cn("border-y border-border py-5", className)}>
        <Alert variant="success">
          <AlertTitle>申请已提交</AlertTitle>
          <AlertDescription>
            当前状态：
            {formatApplicationStatus(applicationMutation.data.application.status)}
            。平台审核通过后才会创建社区。
          </AlertDescription>
        </Alert>
        <div className="mt-5 border-y border-border">
          <TextAction href="/communities" tone="primary" variant="bar">
            返回社区列表
          </TextAction>
        </div>
      </div>
    );
  }

  return (
    <form
      className={cn("space-y-0", className)}
      onSubmit={form.handleSubmit((values) => applicationMutation.mutate(values))}
    >
      {submitError ? (
        <Alert variant="destructive" className="mb-5">
          <AlertTitle>提交申请失败</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 border-b border-border py-5 md:grid-cols-[160px_minmax(0,1fr)]">
        <FieldLabel
          description="这会成为社区页面地址的一部分。"
          htmlFor="requested_slug"
          index="01"
          title="URL 标识"
        />
        <div className="min-w-0 space-y-2">
          <Input
            id="requested_slug"
            autoComplete="off"
            aria-invalid={Boolean(form.formState.errors.requested_slug)}
            disabled={applicationMutation.isPending}
            placeholder="campus-life"
            className="h-12 border-border bg-background text-base font-semibold"
            {...form.register("requested_slug")}
          />
          <FieldMeta
            count={slugValue.trim().length}
            error={form.formState.errors.requested_slug?.message}
            hint="只能使用小写字母、数字和连字符，例如 campus-life。"
          />
        </div>
      </div>

      <div className="grid gap-4 border-b border-border py-5 md:grid-cols-[160px_minmax(0,1fr)]">
        <FieldLabel
          description="给用户看到的社区名称。"
          htmlFor="requested_name"
          index="02"
          title="社区名称"
        />
        <div className="min-w-0 space-y-2">
          <Input
            id="requested_name"
            autoComplete="off"
            aria-invalid={Boolean(form.formState.errors.requested_name)}
            disabled={applicationMutation.isPending}
            placeholder="校园生活"
            className="h-12 border-border bg-background text-base font-semibold"
            {...form.register("requested_name")}
          />
          <FieldMeta
            count={nameValue.trim().length}
            error={form.formState.errors.requested_name?.message}
            hint="建议使用真实、稳定、容易理解的名称。"
          />
        </div>
      </div>

      <div className="grid gap-4 border-b border-border py-5 md:grid-cols-[160px_minmax(0,1fr)]">
        <FieldLabel
          description="说明这个社区要解决什么讨论需求。"
          htmlFor="reason"
          index="03"
          title="申请理由"
        />
        <div className="min-w-0 space-y-2">
          <Textarea
            id="reason"
            aria-invalid={Boolean(form.formState.errors.reason)}
            disabled={applicationMutation.isPending}
            placeholder="说明谁会使用这个社区、为什么需要它、你准备如何维护讨论秩序。"
            className="min-h-56 border-border bg-background text-base leading-7"
            {...form.register("reason")}
          />
          <FieldMeta
            count={reasonValue.trim().length}
            error={form.formState.errors.reason?.message}
            hint="写清使用场景、目标用户和维护方式，有助于审核。"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          {form.formState.isDirty
            ? "申请尚未提交。"
            : "开始输入后会在这里保留草稿状态。"}
        </div>
        <Button type="submit" disabled={applicationMutation.isPending}>
          {applicationMutation.isPending ? "正在提交..." : "提交申请"}
        </Button>
      </div>
    </form>
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
