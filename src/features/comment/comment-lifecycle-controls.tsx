"use client";

import {
  forwardRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Trash2 } from "lucide-react";

import { InlineFeedback } from "@/components/feedback/inline-feedback";
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
import { getMarkdownPlainTextSummary } from "@/features/content/markdown-summary";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import { useDeleteCommentMutation } from "./queries";
import type { Comment } from "./types";

type CommentLifecycleControlsProps = {
  canManage: boolean;
  comment: Comment;
  postId: string;
};

export function CommentLifecycleControls({
  canManage,
  comment,
  postId,
}: CommentLifecycleControlsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const deleteMutation = useDeleteCommentMutation(comment.id, postId);
  const isDeleting = deleteMutation.isPending;
  const deleteError = getSubmitError(deleteMutation.error);
  const deletePreview = getMarkdownPlainTextSummary(comment.body, "暂无内容。");

  if (!canManage) {
    return null;
  }

  async function handleDelete() {
    await deleteMutation.mutateAsync();
    setSuccessMessage("已删除");
    setDeleteOpen(false);
  }

  return (
    <>
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!isDeleting) {
            setDeleteOpen(open);
          }
        }}
      >
        <DialogTrigger asChild>
          <TextCommand tone="danger">
            <Trash2 className="size-3.5" aria-hidden="true" />
            删除
          </TextCommand>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除评论</DialogTitle>
            <DialogDescription>
              删除后这条评论会从当前讨论中移除。这个操作不能在前端撤销。
            </DialogDescription>
          </DialogHeader>

          {deleteError ? (
            <InlineFeedback title="评论删除失败" description={deleteError} />
          ) : null}

          <div className="border-t border-border pt-3">
            <div className="font-mono text-xs text-muted-foreground">
              将删除
            </div>
            <p className="mt-2 line-clamp-3 break-words text-sm leading-6">
              {deletePreview}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={isDeleting}
              onClick={() => setDeleteOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? "正在删除..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {successMessage ? (
        <span className="inline-flex h-8 items-center px-2 font-semibold text-primary">
          {successMessage}
        </span>
      ) : null}
    </>
  );
}

type TextCommandProps = {
  children: ReactNode;
  tone?: "danger" | "default";
} & ComponentProps<"button">;

const TextCommand = forwardRef<HTMLButtonElement, TextCommandProps>(
  function TextCommand(
    { children, className, tone = "default", type = "button", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        {...props}
        className={cn(
          tone === "danger"
            ? "text-destructive hover:bg-destructive/10 focus-visible:ring-destructive/40"
            : "text-muted-foreground hover:bg-surface-hover hover:text-foreground focus-visible:ring-ring",
          "inline-flex h-7 items-center gap-1.5 rounded-sm px-1.5 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
