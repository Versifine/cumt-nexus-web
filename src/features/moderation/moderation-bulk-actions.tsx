"use client";

import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";

import {
  useApplyAdminModQueueActionMutation,
  useApplyCommunityModQueueActionMutation,
} from "./queries";
import type {
  ModerationActionType,
  ModerationBulkActionResponse,
  ModerationTargetType,
} from "./types";

export type ModerationBulkTarget = {
  label?: string;
  targetId: string;
  targetType: ModerationTargetType | string;
};

type BulkActionDefinition = {
  action: ModerationActionType;
  confirmLabel: string;
  description: string;
  label: string;
  reasonRequired?: boolean;
  variant?: "default" | "destructive";
};

const bulkActions: BulkActionDefinition[] = [
  {
    action: "approve",
    confirmLabel: "批量批准",
    description: "批准选中的帖子或评论，并写入审核动作记录。",
    label: "批准",
  },
  {
    action: "ignore_reports",
    confirmLabel: "批量忽略举报",
    description: "忽略选中目标上的待处理举报，不改变内容本身状态。",
    label: "忽略举报",
  },
  {
    action: "spam",
    confirmLabel: "批量标记垃圾",
    description: "把选中的内容标记为垃圾，并处理相关待处理举报。",
    label: "标记垃圾",
    reasonRequired: true,
    variant: "destructive",
  },
  {
    action: "remove",
    confirmLabel: "批量移除",
    description: "移除选中的内容。原因会写入审核记录，便于审计回看。",
    label: "移除",
    reasonRequired: true,
    variant: "destructive",
  },
];

type ModerationBulkActionsProps = {
  communitySlug?: string;
  disabled?: boolean;
  onCompleted?: (response: ModerationBulkActionResponse) => void;
  selectedTargets: ModerationBulkTarget[];
};

export function ModerationBulkActions({
  communitySlug,
  disabled = false,
  onCompleted,
  selectedTargets,
}: ModerationBulkActionsProps) {
  const [activeAction, setActiveAction] = useState<BulkActionDefinition | null>(
    null,
  );
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const adminMutation = useApplyAdminModQueueActionMutation();
  const communityMutation = useApplyCommunityModQueueActionMutation();
  const mutation = communitySlug ? communityMutation : adminMutation;
  const selectedCount = selectedTargets.length;
  const isSubmitting = mutation.isPending;
  const isDisabled = disabled || selectedCount === 0 || isSubmitting;

  async function submitAction() {
    if (!activeAction) {
      return;
    }

    const trimmedReason = reason.trim();
    if (activeAction.reasonRequired && !trimmedReason) {
      setFormError("请填写批量处理原因。");
      return;
    }

    setFormError(null);
    setMessage(null);

    const input = {
      action: activeAction.action,
      confirm: true,
      reason: trimmedReason || undefined,
      targets: selectedTargets.map((target) => ({
        target_id: target.targetId,
        target_type: target.targetType,
      })),
    };

    const result = communitySlug
      ? await communityMutation.mutateAsync({ input, slug: communitySlug })
      : await adminMutation.mutateAsync(input);
    const okCount = result.results.filter((item) => item.ok).length;
    const failedCount = result.results.length - okCount;
    setMessage(
      failedCount > 0
        ? `已提交 ${okCount} 项，${failedCount} 项失败。`
        : `已提交 ${okCount} 项。`,
    );
    setReason("");
    setActiveAction(null);
    onCompleted?.(result);
  }

  function openAction(action: BulkActionDefinition) {
    setActiveAction(action);
    setReason("");
    setFormError(null);
    setMessage(null);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {bulkActions.map((action) => (
        <Button
          key={action.action}
          type="button"
          variant={action.variant === "destructive" ? "destructive" : "ghost"}
          size="sm"
          disabled={isDisabled}
          onClick={() => openAction(action)}
        >
          {action.label}
        </Button>
      ))}

      {message ? (
        <span className="text-xs leading-5 text-muted-foreground">{message}</span>
      ) : null}

      <Dialog
        open={Boolean(activeAction)}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) {
            setActiveAction(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeAction?.label ?? "批量处理"}</DialogTitle>
            <DialogDescription>
              {activeAction?.description} 当前已选择 {selectedCount} 项。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={
                activeAction?.reasonRequired
                  ? "填写批量处理原因"
                  : "可选：补充处理原因"
              }
              aria-label="批量处理原因"
              disabled={isSubmitting}
            />
            {formError ? (
              <Alert variant="destructive">
                <AlertTitle>无法提交</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}
            {mutation.error ? (
              <Alert variant="destructive">
                <AlertTitle>操作失败</AlertTitle>
                <AlertDescription>
                  {getErrorDescription(mutation.error)}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              onClick={() => setActiveAction(null)}
            >
              取消
            </Button>
            <Button
              type="button"
              variant={
                activeAction?.variant === "destructive" ? "destructive" : "default"
              }
              disabled={isSubmitting || selectedCount === 0}
              onClick={submitAction}
            >
              {isSubmitting
                ? "提交中..."
                : (activeAction?.confirmLabel ?? "确认提交")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}
