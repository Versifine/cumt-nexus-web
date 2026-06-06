"use client";

import { forwardRef, useState, type ComponentProps, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Flag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSession } from "@/features/auth/auth-session";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import {
  useReportCommentMutation,
  useReportPostMutation,
} from "./queries";
import type { ModerationTargetType } from "./types";

const reportSchema = z.object({
  reason: z.string().trim().min(1, "请输入举报原因。"),
});

type ReportFormValues = z.infer<typeof reportSchema>;

type ReportContentDialogProps = {
  targetId: string;
  targetLabel: string;
  targetType: ModerationTargetType;
};

export function ReportContentDialog({
  targetId,
  targetLabel,
  targetType,
}: ReportContentDialogProps) {
  const pathname = usePathname();
  const { isReady, token } = useAuthSession();
  const [open, setOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const postMutation = useReportPostMutation(targetId);
  const commentMutation = useReportCommentMutation(targetId);
  const mutation = targetType === "post" ? postMutation : commentMutation;
  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reason: "",
    },
  });

  async function submitReport(values: ReportFormValues) {
    const result = await mutation.mutateAsync(values);
    setSuccessMessage(`举报已提交，编号 ${result.report.id.slice(0, 8)}。`);
    form.reset();
  }

  const submitError = getSubmitError(mutation.error);
  const next = pathname || "/";
  const loginHref = `/login?next=${encodeURIComponent(next)}`;

  if (!isReady) {
    return (
      <ReportTrigger disabled aria-label="正在确认举报权限">
        <Flag className="size-3.5" aria-hidden="true" />
        举报
      </ReportTrigger>
    );
  }

  if (!token) {
    return (
      <Link
        href={loginHref}
        className={cn(
          "-mx-1 inline-flex min-h-10 items-center gap-1.5 px-1 py-2 text-xs text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        )}
      >
        <Flag className="size-3.5" aria-hidden="true" />
        登录后举报
      </Link>
    );
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
        <ReportTrigger>
          <Flag className="size-3.5" aria-hidden="true" />
          举报
        </ReportTrigger>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>举报{targetType === "post" ? "帖子" : "评论"}</DialogTitle>
          <DialogDescription>
            提交后会进入审核队列。请写清楚违反规则或需要平台处理的原因。
          </DialogDescription>
        </DialogHeader>

        {successMessage ? (
          <Alert variant="success">
            <AlertTitle>已提交</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        ) : null}

        {submitError ? (
          <Alert variant="destructive">
            <AlertTitle>举报提交失败</AlertTitle>
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="border-y border-border py-3">
          <div className="font-mono text-xs text-muted-foreground">目标</div>
          <p className="mt-2 break-words text-sm font-semibold">{targetLabel}</p>
        </div>

        <form className="space-y-4" onSubmit={form.handleSubmit(submitReport)}>
          <div className="space-y-2">
            <label htmlFor={`report-reason-${targetId}`} className="text-sm font-semibold">
              举报原因
            </label>
            <Textarea
              id={`report-reason-${targetId}`}
              aria-invalid={Boolean(form.formState.errors.reason)}
              disabled={mutation.isPending}
              placeholder="例如：包含人身攻击、垃圾信息、泄露隐私或明显违规内容。"
              className="min-h-32"
              {...form.register("reason")}
            />
            {form.formState.errors.reason ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.reason.message}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                举报原因会提交给平台审核人员。
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
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "正在提交..." : "提交举报"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type ReportTriggerProps = {
  children: ReactNode;
} & ComponentProps<"button">;

const ReportTrigger = forwardRef<HTMLButtonElement, ReportTriggerProps>(
  function ReportTrigger(
    { children, className, type = "button", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        {...props}
        className={cn(
          "-mx-1 inline-flex min-h-10 items-center gap-1.5 px-1 py-2 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40",
          className,
        )}
      >
        {children}
      </button>
    );
  },
);

function getSubmitError(error: Error | null) {
  if (!error) {
    return null;
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}
