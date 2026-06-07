"use client";

import { useEffect, useState } from "react";
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
import { MarkdownComposerField } from "@/features/content/markdown-composer-field";
import { IMAGE_UPLOAD_LIMITS } from "@/features/media/types";
import { ApiError } from "@/lib/api/client";

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
  const bodyField = form.register("body");
  const { ref: bodyFieldRef, ...bodyFieldProps } = bodyField;
  const updateError = getSubmitError(updateMutation.error);
  const deleteError = getSubmitError(deleteMutation.error);
  const hasBoundImages = Boolean(post.attachments?.length);

  function setBodyValue(nextValue: string) {
    form.setValue("body", nextValue, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  function handleEditOpenChange(open: boolean) {
    if (isUpdating) {
      return;
    }

    setEditOpen(open);
  }

  useEffect(() => {
    if (!editOpen) {
      form.reset({
        title: post.title,
        body: post.body,
      });
    }
  }, [editOpen, form, post.body, post.title]);

  if (!canManage) {
    return null;
  }

  const isUpdating = updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  async function handleUpdate(values: PostLifecycleFormValues) {
    const result = await updateMutation.mutateAsync({
      body: values.body,
      title: values.title,
    });

    form.reset({
      title: result.post.title,
      body: result.post.body,
    });
    setSuccessMessage("帖子已更新。");
    setEditOpen(false);
  }

  async function handleDelete() {
    await deleteMutation.mutateAsync();
    setDeleteOpen(false);
    router.push("/communities");
  }

  return (
    <section className="border-b border-border py-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="font-mono text-xs uppercase text-primary">
            CONTENT / 内容管理
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            你是这条帖子的作者，可以更新正文或删除整条讨论。删除后帖子详情不可继续访问。
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Dialog
            open={editOpen}
            onOpenChange={handleEditOpenChange}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Pencil className="size-4" aria-hidden="true" />
                编辑
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>编辑帖子</DialogTitle>
                <DialogDescription>
                  修改标题和正文后会直接更新当前帖子，评论和投票不会被修改。
                </DialogDescription>
              </DialogHeader>

              <form
                className="space-y-4"
                onSubmit={form.handleSubmit(handleUpdate)}
              >
                {updateError ? (
                  <Alert variant="destructive">
                    <AlertTitle>帖子更新失败</AlertTitle>
                    <AlertDescription>{updateError}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="space-y-2">
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

                <div className="space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-semibold">正文</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {bodyValue.trim().length} 字
                    </span>
                  </div>
                  <MarkdownComposerField
                    defaultMode="preview"
                    disabled={isUpdating}
                    maxReferencedAttachments={IMAGE_UPLOAD_LIMITS.maxCountPerPost}
                    onChange={setBodyValue}
                    textareaProps={{
                      ...bodyFieldProps,
                      "aria-label": "帖子正文",
                      "aria-invalid": Boolean(form.formState.errors.body),
                      className: "min-h-56 border-border bg-background text-sm leading-7",
                    }}
                    textareaRef={bodyFieldRef}
                    value={bodyValue}
                    boundAttachments={post.attachments}
                  />
                  {form.formState.errors.body ? (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.body.message}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      默认显示发布后的正文样式；需要改内容时点“编辑”。
                      {hasBoundImages
                        ? "当前编辑接口暂不支持新增图片；可把已有图片重新放入正文。"
                        : "当前编辑接口暂不支持新增图片。"}
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
              <Button variant="ghost" size="sm" className="text-destructive">
                <Trash2 className="size-4" aria-hidden="true" />
                删除
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>删除帖子</DialogTitle>
                <DialogDescription>
                  删除后这条帖子和它的评论入口将不可继续访问。这个操作不能在前端撤销。
                </DialogDescription>
              </DialogHeader>

              {deleteError ? (
                <Alert variant="destructive">
                  <AlertTitle>帖子删除失败</AlertTitle>
                  <AlertDescription>{deleteError}</AlertDescription>
                </Alert>
              ) : null}

              <div className="border-y border-border py-3">
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
      </div>

      {successMessage ? (
        <Alert variant="success" className="mt-4">
          <AlertTitle>已保存</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      ) : null}
    </section>
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
