"use client";

import {
  forwardRef,
  useEffect,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Trash2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
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
import { MarkdownComposerField } from "@/features/content/markdown-composer-field";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import {
  useDeleteCommentMutation,
  useUpdateCommentMutation,
} from "./queries";
import type { Comment } from "./types";

const commentLifecycleSchema = z.object({
  body: z.string().trim().min(1, "请输入评论内容。"),
});

type CommentLifecycleFormValues = z.infer<typeof commentLifecycleSchema>;

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
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const updateMutation = useUpdateCommentMutation(comment.id, postId);
  const deleteMutation = useDeleteCommentMutation(comment.id, postId);
  const form = useForm<CommentLifecycleFormValues>({
    resolver: zodResolver(commentLifecycleSchema),
    defaultValues: {
      body: comment.body,
    },
  });
  const bodyValue = useWatch({ control: form.control, name: "body" }) ?? "";
  const bodyField = form.register("body");
  const { ref: bodyFieldRef, ...bodyFieldProps } = bodyField;
  const updateError = getSubmitError(updateMutation.error);
  const deleteError = getSubmitError(deleteMutation.error);

  function setBodyValue(nextValue: string) {
    form.setValue("body", nextValue, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  useEffect(() => {
    if (!editOpen) {
      form.reset({
        body: comment.body,
      });
    }
  }, [comment.body, editOpen, form]);

  if (!canManage) {
    return null;
  }

  const isUpdating = updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  async function handleUpdate(values: CommentLifecycleFormValues) {
    await updateMutation.mutateAsync(values);
    setSuccessMessage("评论已更新。");
    setEditOpen(false);
  }

  async function handleDelete() {
    await deleteMutation.mutateAsync();
    setSuccessMessage("评论已删除，列表正在刷新。");
    setDeleteOpen(false);
  }

  return (
    <div className="mt-3 border-l border-border pl-3">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <Dialog
          open={editOpen}
          onOpenChange={(open) => {
            if (!isUpdating) {
              setEditOpen(open);
            }
          }}
        >
          <DialogTrigger asChild>
            <TextCommand>
              <Pencil className="size-3.5" aria-hidden="true" />
              编辑
            </TextCommand>
          </DialogTrigger>
          <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>编辑评论</DialogTitle>
              <DialogDescription>
                修改后会刷新当前帖子评论列表，回复关系不会改变。
              </DialogDescription>
            </DialogHeader>

            <form
              className="space-y-4"
              onSubmit={form.handleSubmit(handleUpdate)}
            >
              {updateError ? (
                <Alert variant="destructive">
                  <AlertTitle>评论更新失败</AlertTitle>
                  <AlertDescription>{updateError}</AlertDescription>
                </Alert>
              ) : null}

              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-semibold">评论内容</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {bodyValue.trim().length} 字
                  </span>
                </div>
                <MarkdownComposerField
                  defaultMode="preview"
                  disabled={isUpdating}
                  onChange={setBodyValue}
                  textareaProps={{
                    ...bodyFieldProps,
                    "aria-label": "评论内容",
                    "aria-invalid": Boolean(form.formState.errors.body),
                    className: "min-h-36 border-border bg-background text-sm leading-7",
                  }}
                  textareaRef={bodyFieldRef}
                  value={bodyValue}
                  boundAttachments={comment.attachments}
                />
                {form.formState.errors.body ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.body.message}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    默认显示发布后的评论样式；需要改内容时点“编辑”。
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUpdating}
                  onClick={() => setEditOpen(false)}
                >
                  取消
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? "正在保存..." : "保存修改"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

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
              <Alert variant="destructive">
                <AlertTitle>评论删除失败</AlertTitle>
                <AlertDescription>{deleteError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="border-y border-border py-3">
              <div className="font-mono text-xs text-muted-foreground">
                将删除
              </div>
              <p className="mt-2 line-clamp-3 break-words text-sm leading-6">
                {comment.body}
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
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
      </div>

      {successMessage ? (
        <Alert variant="success" className="mt-3">
          <AlertTitle>已保存</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      ) : null}
    </div>
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
            : "text-muted-foreground hover:bg-primary/10 hover:text-primary focus-visible:ring-primary",
          "-mx-1 inline-flex min-h-10 items-center gap-1.5 px-1 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2",
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
