"use client";

import {
  forwardRef,
  useState,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";

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
import { commentQueryKeys } from "@/features/comment/queries";
import { useCommunityModerationTemplatesQuery } from "@/features/community/queries";
import { postQueryKeys } from "@/features/post/queries";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import {
  useApplyAdminModQueueActionMutation,
  useApplyCommunityModQueueActionMutation,
} from "./queries";
import type { ModerationBulkActionInput, ModerationTargetType } from "./types";

type ModerationRemoveDialogProps = {
  communitySlug?: string;
  targetId: string;
  targetLabel: string;
  targetPostId?: string;
  targetStatus?: string;
  targetType: ModerationTargetType;
};

export function ModerationRemoveDialog({
  communitySlug,
  targetId,
  targetLabel,
  targetPostId,
  targetStatus,
  targetType,
}: ModerationRemoveDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [removalReasonId, setRemovalReasonId] = useState("");
  const [notifyAuthor, setNotifyAuthor] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const useCommunityScope = Boolean(communitySlug);
  const removalReasonsQuery = useCommunityModerationTemplatesQuery(
    { kind: "removal-reasons", slug: communitySlug ?? "" },
    open && useCommunityScope,
  );
  const communityMutation = useApplyCommunityModQueueActionMutation();
  const adminMutation = useApplyAdminModQueueActionMutation();
  const mutation = useCommunityScope ? communityMutation : adminMutation;
  const isRemoved = targetStatus === "removed" || Boolean(successMessage);
  const scopeLabel = useCommunityScope ? "社区" : "平台";
  const removalReasons = removalReasonsQuery.data?.items ?? [];
  const selectedReason = removalReasons.find((item) => item.id === removalReasonId);

  async function submitRemove(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const trimmedReason = reason.trim();
    const resolvedReason = trimmedReason || selectedReason?.title || "";

    if (!resolvedReason) {
      setFormError("请选择移除原因或填写处理原因。");
      return;
    }

    const input: ModerationBulkActionInput = {
      action: "remove",
      confirm: true,
      notify_author: useCommunityScope ? notifyAuthor : undefined,
      reason: resolvedReason,
      removal_reason_id: removalReasonId || undefined,
      target_ids: [targetId],
      target_type: targetType,
    };

    const result = useCommunityScope
      ? await communityMutation.mutateAsync({
          input,
          slug: communitySlug ?? "",
        })
      : await adminMutation.mutateAsync(input);
    const failed = result.results.find((item) => !item.ok);

    if (failed) {
      setFormError(failed.error_message || "移除失败。");
      return;
    }

    const actionId = result.results.find((item) => item.action)?.action?.id;
    setSuccessMessage(
      actionId
        ? `${scopeLabel}已移除内容，操作编号 ${actionId.slice(0, 8)}。`
        : `${scopeLabel}已移除内容。`,
    );
    setReason("");
    setRemovalReasonId("");

    void Promise.all([
      queryClient.invalidateQueries({
        queryKey: postQueryKeys.latestPrefix(),
      }),
      targetType === "post"
        ? queryClient.invalidateQueries({
            queryKey: postQueryKeys.detail(targetId),
          })
        : Promise.resolve(),
      targetPostId
        ? queryClient.invalidateQueries({
            queryKey: postQueryKeys.detail(targetPostId),
          })
        : Promise.resolve(),
      targetPostId
        ? queryClient.invalidateQueries({
            queryKey: commentQueryKeys.postCommentsPrefix(targetPostId),
          })
        : Promise.resolve(),
      queryClient.invalidateQueries({
        queryKey: postQueryKeys.communityPostsAll(),
      }),
      queryClient.invalidateQueries({
        queryKey: postQueryKeys.userPostsAll(),
      }),
      queryClient.invalidateQueries({
        queryKey: postQueryKeys.savedPostsAll(),
      }),
      queryClient.invalidateQueries({
        queryKey: commentQueryKeys.userCommentsAll(),
      }),
    ]);
  }

  const submitError = formError ?? getSubmitError(mutation.error);

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
        <RemoveTrigger disabled={isRemoved}>
          <ShieldAlert className="size-3.5" aria-hidden="true" />
          {isRemoved ? "已移除" : `${scopeLabel}移除`}
        </RemoveTrigger>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {scopeLabel}移除{targetType === "post" ? "帖子" : "评论"}
          </DialogTitle>
          <DialogDescription>
            这是审核操作。后端会校验{scopeLabel}权限，并把操作写入审核记录。
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

        <form className="space-y-4" onSubmit={submitRemove}>
          {useCommunityScope ? (
            <div className="space-y-2">
              <label
                htmlFor={`moderation-remove-template-${targetId}`}
                className="text-sm font-semibold"
              >
                移除原因模板
              </label>
              <select
                id={`moderation-remove-template-${targetId}`}
                value={removalReasonId}
                onChange={(event) => setRemovalReasonId(event.target.value)}
                disabled={mutation.isPending || isRemoved}
                className="flex min-h-10 w-full border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">不使用模板</option>
                {removalReasons.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.title}
                  </option>
                ))}
              </select>
              {removalReasonsQuery.isError ? (
                <p className="text-xs text-muted-foreground">
                  移除原因模板暂时无法加载，可以继续手填原因。
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <label htmlFor={`moderation-remove-${targetId}`} className="text-sm font-semibold">
              移除原因
            </label>
            <Textarea
              id={`moderation-remove-${targetId}`}
              disabled={mutation.isPending || isRemoved}
              placeholder="写清移除依据，便于后续审计。"
              className="min-h-32"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              {selectedReason
                ? "不填写时会使用所选模板标题作为原因。"
                : "移除原因会记录到审核操作中。"}
            </p>
          </div>

          {useCommunityScope ? (
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={notifyAuthor}
                onChange={(event) => setNotifyAuthor(event.target.checked)}
                disabled={mutation.isPending || isRemoved}
                className="mt-1 size-4"
              />
              通知作者本次移除原因
            </label>
          ) : null}

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
              disabled={mutation.isPending || isRemoved}
            >
              {isRemoved
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
          "inline-flex min-h-8 shrink-0 items-center gap-1.5 whitespace-nowrap px-1 py-1 text-xs text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40",
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
