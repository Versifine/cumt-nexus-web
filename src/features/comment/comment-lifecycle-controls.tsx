"use client";

import {
  forwardRef,
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
import { getReferencedAttachmentIdsForSubmit } from "@/features/content/attachment-markdown";
import { MarkdownComposerField } from "@/features/content/markdown-composer-field";
import { getMarkdownPlainTextSummary } from "@/features/content/markdown-summary";
import {
  IMAGE_UPLOAD_LIMITS,
  type MediaAttachment,
} from "@/features/media/types";
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
  const [editAttachments, setEditAttachments] = useState<MediaAttachment[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
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
  const isUpdating = updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;
  const updateError = getSubmitError(updateMutation.error);
  const deleteError = getSubmitError(deleteMutation.error);
  const deletePreview = getMarkdownPlainTextSummary(comment.body, "暂无内容。");

  function setBodyValue(nextValue: string) {
    form.setValue("body", nextValue, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  function resetEditDraft() {
    form.reset({
      body: comment.body,
    });
    setEditAttachments([]);
    setIsUploadingImage(false);
  }

  function handleEditOpenChange(open: boolean) {
    if (isUpdating || isUploadingImage) {
      return;
    }

    resetEditDraft();
    setEditOpen(open);
  }

  if (!canManage) {
    return null;
  }

  async function handleUpdate(values: CommentLifecycleFormValues) {
    const result = await updateMutation.mutateAsync({
      attachment_ids: getReferencedAttachmentIdsForSubmit(
        values.body,
        mergeMediaAttachments(comment.attachments, editAttachments),
      ),
      body: values.body,
    });
    form.reset({
      body: result.comment.body,
    });
    setEditAttachments([]);
    setSuccessMessage("已保存");
    setEditOpen(false);
  }

  async function handleDelete() {
    await deleteMutation.mutateAsync();
    setSuccessMessage("已删除");
    setDeleteOpen(false);
  }

  return (
    <>
      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
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
              编辑时直接显示渲染后的评论；保存时只绑定正文中保留的图片。
            </DialogDescription>
          </DialogHeader>

          <form className="min-w-0 space-y-4" onSubmit={form.handleSubmit(handleUpdate)}>
            {updateError ? (
              <Alert variant="destructive">
                <AlertTitle>评论更新失败</AlertTitle>
                <AlertDescription>{updateError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="min-w-0 space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-semibold">评论内容</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {bodyValue.trim().length} 字
                </span>
              </div>
              <MarkdownComposerField
                boundAttachments={comment.attachments}
                disabled={isUpdating}
                key={`${comment.id}:${comment.updated_at}:${
                  editOpen ? "open" : "closed"
                }`}
                maxReferencedAttachments={IMAGE_UPLOAD_LIMITS.maxCountPerComment}
                onChange={setBodyValue}
                fieldProps={{
                  "aria-label": "评论内容",
                  "aria-invalid": Boolean(form.formState.errors.body),
                  className: "min-h-36 border-border bg-background text-sm leading-7",
                  placeholder: "编辑评论，粘贴或拖拽图片会进入当前位置。",
                }}
                value={bodyValue}
                imageUpload={{
                  attachments: editAttachments,
                  maxCount: IMAGE_UPLOAD_LIMITS.maxCountPerComment,
                  onChange: setEditAttachments,
                  onUploadingChange: setIsUploadingImage,
                }}
              />
              {form.formState.errors.body ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.body.message}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  图片会作为评论正文的一部分保存。删除正文里的图片并保存后，这张图片会从当前评论解绑。
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={isUpdating}
                onClick={() => handleEditOpenChange(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={isUpdating || isUploadingImage}>
                {isUploadingImage
                  ? "图片上传中..."
                  : isUpdating
                    ? "正在保存..."
                    : "保存修改"}
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

function mergeMediaAttachments(
  boundAttachments: MediaAttachment[] | undefined,
  newAttachments: MediaAttachment[],
) {
  const attachmentById = new Map<string, MediaAttachment>();

  for (const attachment of [...(boundAttachments ?? []), ...newAttachments]) {
    attachmentById.set(attachment.id, attachment);
  }

  return [...attachmentById.values()];
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
            ? "text-destructive focus-visible:ring-destructive/40"
            : "text-muted-foreground hover:text-primary focus-visible:ring-ring",
          "inline-flex h-8 items-center gap-1.5 px-1 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
