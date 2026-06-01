"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";

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

export function CommunityApplicationForm() {
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

  if (applicationMutation.isSuccess) {
    return (
      <Alert variant="success">
        <AlertTitle>申请已提交</AlertTitle>
        <AlertDescription>
          当前状态：{formatApplicationStatus(applicationMutation.data.application.status)}
          。平台审核通过后才会创建社区。
        </AlertDescription>
      </Alert>
    );
  }

  const submitError = getSubmitError(applicationMutation.error);

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((values) => applicationMutation.mutate(values))}
    >
      {submitError ? (
        <Alert variant="destructive">
          <AlertTitle>提交申请失败</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="requested_slug">
          URL 标识
        </label>
        <Input
          id="requested_slug"
          autoComplete="off"
          aria-invalid={Boolean(form.formState.errors.requested_slug)}
          disabled={applicationMutation.isPending}
          placeholder="campus-life"
          {...form.register("requested_slug")}
        />
        {form.formState.errors.requested_slug ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.requested_slug.message}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            这会成为社区页面地址的一部分，只能使用小写字母、数字和连字符。
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="requested_name">
          社区名称
        </label>
        <Input
          id="requested_name"
          autoComplete="off"
          aria-invalid={Boolean(form.formState.errors.requested_name)}
          disabled={applicationMutation.isPending}
          placeholder="校园生活"
          {...form.register("requested_name")}
        />
        {form.formState.errors.requested_name ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.requested_name.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="reason">
          申请理由
        </label>
        <Textarea
          id="reason"
          aria-invalid={Boolean(form.formState.errors.reason)}
          disabled={applicationMutation.isPending}
          placeholder="说明为什么需要这个社区。"
          {...form.register("reason")}
        />
        {form.formState.errors.reason ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.reason.message}
          </p>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={applicationMutation.isPending}>
          {applicationMutation.isPending ? "正在提交..." : "提交申请"}
        </Button>
      </div>
    </form>
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
    default:
      return status;
  }
}
