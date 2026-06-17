"use client";

import { forwardRef, useState, type ComponentProps, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { getReferencedAttachmentIdsForSubmit } from "@/features/content/attachment-markdown";
import { MarkdownComposerField } from "@/features/content/markdown-composer-field";
import {
  IMAGE_UPLOAD_LIMITS,
  type MediaAttachment,
} from "@/features/media/types";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import { useDeletePostMutation, useUpdatePostMutation } from "./queries";
import type { Post } from "./types";

const postLifecycleSchema = z.object({
  title: z.string().trim().min(1, "请输入标题。"),
  body: z.string().trim().min(1, "请输入正文。"),
});

type PostLifecycleFormValues = z.infer<typeof postLifecycleSchema>;

type PostLifecycleControlsProps = {
  canManage: boolean;
  post: Post;
};

export function PostLifecycleControls({
  canManage,
  post,
}: PostLifecycleControlsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editAttachments, setEditAttachments] = useState<MediaAttachment[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const updateMutation = useUpdatePostMutation(post.id);
  const deleteMutation = useDeletePostMutation(post.id);
  const form = useForm<PostLifecycleFormValues>({
    resolver: zodResolver(postLifecycleSchema),
    defaultValues: {
      title: post.title,
      body: post.body,
    },
  });
  const titleValue = useWatch({ control: form.control, name: "title" }) ?? "";
  const bodyValue = useWatch({ control: form.control, name: "body" }) ?? "";
  const isUpdating = updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;
  const updateError = getSubmitError(updateMutation.error);
  const deleteError = getSubmitError(deleteMutation.error);

  function setBodyValue(nextValue: string) {
    form.setValue("body", nextValue, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  function resetEditDraft() {
    form.reset({
      title: post.title,
      body: post.body,
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

  async function handleUpdate(values: PostLifecycleFormValues) {
    const result = await updateMutation.mutateAsync({
      attachment_ids: getReferencedAttachmentIdsForSubmit(
        values.body,
        mergeMediaAttachments(post.attachments, editAttachments),
      ),
      body: values.body,
      title: values.title,
    });

    form.reset({
      title: result.post.title,
      body: result.post.body,
    });
    setEditAttachments([]);
    setSuccessMessage("已保存");
    setEditOpen(false);
  }

  async function handleDelete() {
    await deleteMutation.mutateAsync();
    setDeleteOpen(false);
    router.push(getDeleteFallbackHref(post));
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
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑帖子</DialogTitle>
            <DialogDescription>
              编辑时直接显示渲染后的正文；保存时只绑定正文中保留的图片。
            </DialogDescription>
          </DialogHeader>

          <form className="min-w-0 space-y-4" onSubmit={form.handleSubmit(handleUpdate)}>
            {updateError ? (
              <Alert variant="destructive">
                <AlertTitle>帖子更新失败</AlertTitle>
                <AlertDescription>{updateError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="min-w-0 space-y-2">
              <label
                htmlFor="post-lifecycle-title"
                className="text-sm font-semibold"
              >
                标题
              </label>
              <Input
                id="post-lifecycle-title"
                autoComplete="off"
                aria-invalid={Boolean(form.formState.errors.title)}
                disabled={isUpdating}
                className="h-11 border-border bg-background text-base font-semibold"
                {...form.register("title")}
              />
              <FieldMeta
                count={titleValue.trim().length}
                error={form.formState.errors.title?.message}
                hint="标题会同步更新到帖子列表。"
              />
            </div>

            <div className="min-w-0 space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-semibold">正文</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {bodyValue.trim().length} 字
                </span>
              </div>
              <MarkdownComposerField
                boundAttachments={post.attachments}
                disabled={isUpdating}
                key={`${post.id}:${post.updated_at}:${editOpen ? "open" : "closed"}`}
                maxReferencedAttachments={IMAGE_UPLOAD_LIMITS.maxCountPerPost}
                onChange={setBodyValue}
                fieldProps={{
                  "aria-label": "帖子正文",
                  "aria-invalid": Boolean(form.formState.errors.body),
                  className: "min-h-56 border-border bg-background text-sm leading-7",
                  placeholder: "写正文，粘贴或拖拽图片会进入当前位置。",
                }}
                value={bodyValue}
                imageUpload={{
                  attachments: editAttachments,
                  maxCount: IMAGE_UPLOAD_LIMITS.maxCountPerPost,
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
                  选中文字后可以设置格式。删除正文里的图片并保存后，这张图片会从当前帖子解绑。
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
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
            <DialogTitle>删除帖子</DialogTitle>
            <DialogDescription>
              删除后这条帖子和评论入口将无法继续访问。这个操作不能在前端撤销。
            </DialogDescription>
          </DialogHeader>

          {deleteError ? (
            <Alert variant="destructive">
              <AlertTitle>帖子删除失败</AlertTitle>
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="border-t border-border pt-3">
            <div className="font-mono text-xs text-muted-foreground">
              将删除
            </div>
            <p className="mt-2 break-words text-sm font-semibold">
              {post.title}
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

function getDeleteFallbackHref(post: Post) {
  const slug = post.community?.slug?.trim() || post.community_slug?.trim();

  return slug ? `/communities/${encodeURIComponent(slug)}` : "/communities";
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
