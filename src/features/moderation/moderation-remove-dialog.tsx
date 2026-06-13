"use client";

import { forwardRef, useState, type ComponentProps, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldAlert } from "lucide-react";
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
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import {
  useRemoveCommentByModerationMutation,
  useRemovePostByModerationMutation,
} from "./queries";
import type { ModerationTargetType } from "./types";

const removeSchema = z.object({
  reason: z.string().trim().min(1, "请输入移除原因。"),
});

type RemoveFormValues = z.infer<typeof removeSchema>;

type ModerationRemoveDialogProps = {
  targetId: string;
  targetLabel: string;
  targetType: ModerationTargetType;
};

export function ModerationRemoveDialog({
  targetId,
  targetLabel,
  targetType,
}: ModerationRemoveDialogProps) {
  const [open, setOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const postMutation = useRemovePostByModerationMutation(targetId);
  const commentMutation = useRemoveCommentByModerationMutation(targetId);
  const mutation = targetType === "post" ? postMutation : commentMutation;
  const form = useForm<RemoveFormValues>({
    resolver: zodResolver(removeSchema),
    defaultValues: {
      reason: "",
    },
  });

  async function submitRemove(values: RemoveFormValues) {
    const result = await mutation.mutateAsync(values);
    setSuccessMessage(`内容已移除，操作编号 ${result.action.id.slice(0, 8)}。`);
    form.reset();
  }

  const submitError = getSubmitError(mutation.error);

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
        <RemoveTrigger>
          <ShieldAlert className="size-3.5" aria-hidden="true" />
          平台移除
        </RemoveTrigger>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>平台移除{targetType === "post" ? "帖子" : "评论"}</DialogTitle>
          <DialogDescription>
            这是审核操作。后端会校验平台权限，普通用户提交会返回权限错误。
          </DialogDescription>
        </DialogHeader>

        {successMessage ? (
          <Alert variant="success">
            <AlertTitle>已移除</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        ) : null}

        {submitError ? (
          <Alert variant="destructive">
            <AlertTitle>移除失败</AlertTitle>
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="border-t border-border pt-3">
          <div className="font-mono text-xs text-muted-foreground">目标</div>
          <p className="mt-2 break-words text-sm font-semibold">{targetLabel}</p>
        </div>

        <form className="space-y-4" onSubmit={form.handleSubmit(submitRemove)}>
          <div className="space-y-2">
            <label htmlFor={`moderation-remove-${targetId}`} className="text-sm font-semibold">
              移除原因
            </label>
            <Textarea
              id={`moderation-remove-${targetId}`}
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
                移除原因会记录到审核操作中。
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
            <Button type="submit" variant="destructive" disabled={mutation.isPending}>
              {mutation.isPending ? "正在移除..." : "确认移除"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type RemoveTriggerProps = {
  children: ReactNode;
} & ComponentProps<"button">;

const RemoveTrigger = forwardRef<HTMLButtonElement, RemoveTriggerProps>(
  function RemoveTrigger(
    { children, className, type = "button", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        {...props}
        className={cn(
          "-mx-1 inline-flex min-h-10 items-center gap-1.5 px-1 py-2 text-xs text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40",
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
