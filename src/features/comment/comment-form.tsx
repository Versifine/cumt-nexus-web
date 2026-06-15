"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { InlineFeedback } from "@/components/feedback/inline-feedback";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { getReferencedAttachmentIdsForSubmit } from "@/features/content/attachment-markdown";
import { MarkdownComposerField } from "@/features/content/markdown-composer-field";
import {
  IMAGE_UPLOAD_LIMITS,
  type MediaAttachment,
} from "@/features/media/types";
import { ApiError } from "@/lib/api/client";

import { publishComment } from "./api";
import { commentQueryKeys } from "./queries";
import { postQueryKeys } from "../post/queries";

const commentSchema = z.object({
  body: z.string().trim().min(1, "请输入评论内容。"),
});

type CommentFormValues = z.infer<typeof commentSchema>;

type CommentFormProps = {
  compact?: boolean;
  defaultExpanded?: boolean;
  docked?: boolean;
  focusSignal?: number;
  onExpandedChange?: (isExpanded: boolean) => void;
  onSubmitted?: () => void;
  parentId?: string | null;
  postId: string;
  placeholder?: string;
  submitLabel?: string;
};

export function CommentForm({
  compact = false,
  defaultExpanded,
  docked = false,
  focusSignal,
  onExpandedChange,
  onSubmitted,
  parentId = null,
  postId,
  placeholder,
  submitLabel,
}: CommentFormProps) {
  const pathname = usePathname();
  const { isReady, token } = useAuthSession();
  const queryClient = useQueryClient();
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded ?? compact);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [editorFocusKey, setEditorFocusKey] = useState(0);
  const lastFocusSignalRef = useRef(focusSignal);
  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      body: "",
    },
  });

  const commentMutation = useMutation({
    mutationFn: (values: CommentFormValues) =>
      publishComment(postId, {
        attachment_ids: getReferencedAttachmentIdsForSubmit(
          values.body,
          attachments,
        ),
        body: values.body,
        parent_id: parentId || undefined,
      }),
    onSuccess: async () => {
      form.reset();
      setAttachments([]);
      if (!compact) {
        setIsExpanded(false);
      }
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: commentQueryKeys.postCommentsPrefix(postId),
        }),
        queryClient.invalidateQueries({
          queryKey: postQueryKeys.detail(postId),
        }),
      ]);
      onSubmitted?.();
    },
  });

  const submitError = getSubmitError(commentMutation.error);
  const next = pathname || `/posts/${postId}`;
  const loginHref = `/login?next=${encodeURIComponent(next)}`;
  const registerHref = `/register?next=${encodeURIComponent(next)}`;
  const bodyValue = useWatch({ control: form.control, name: "body" }) ?? "";
  const hasDraft = bodyValue.trim().length > 0 || attachments.length > 0;

  useEffect(() => {
    if (
      focusSignal === undefined ||
      focusSignal === lastFocusSignalRef.current ||
      !token
    ) {
      return;
    }

    lastFocusSignalRef.current = focusSignal;
    setIsExpanded(true);
    setEditorFocusKey((value) => value + 1);
  }, [focusSignal, token]);

  useEffect(() => {
    onExpandedChange?.(isExpanded);
  }, [isExpanded, onExpandedChange]);

  function expandComposer() {
    setIsExpanded(true);
    setEditorFocusKey((value) => value + 1);
  }

  function collapseComposer() {
    if (commentMutation.isPending || isUploadingImage) {
      return;
    }

    setIsExpanded(false);
  }

  function setBodyValue(nextValue: string) {
    if (commentMutation.error) {
      commentMutation.reset();
    }

    form.setValue("body", nextValue, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  if (!isReady) {
    return (
      <div
        className={
          compact || docked
            ? "text-sm text-muted-foreground"
            : "border-t border-border py-4 text-sm text-muted-foreground"
        }
        aria-label="正在读取登录状态"
      >
        正在确认登录状态...
      </div>
    );
  }

  if (!token) {
    if (docked && !compact) {
      return (
        <section className="flex min-h-11 w-full items-center justify-between gap-3 border-t border-border pt-3">
          <span className="min-w-0 truncate text-sm text-muted-foreground">
            登录后发表评论
          </span>
          <TextAction href={loginHref} tone="primary" className="h-9 shrink-0">
            去登录
          </TextAction>
        </section>
      );
    }

    return (
      <section
        className={
          compact ? "py-1" : "border-t border-border py-4"
        }
      >
        <h3
          className={
            compact
              ? "text-sm font-semibold"
              : "text-base font-semibold tracking-normal"
          }
        >
          登录后{parentId ? "回复评论" : "发表评论"}
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          未登录可以阅读帖子和评论；发表内容、投票和举报需要登录。
        </p>
        <div className="mt-3 flex flex-wrap gap-4 border-t border-border pt-3">
          <TextAction href={loginHref} tone="primary">
            去登录
          </TextAction>
          <TextAction href={registerHref}>
            创建账号
          </TextAction>
        </div>
      </section>
    );
  }

  if (!compact && !isExpanded) {
    return (
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between gap-3 border-b border-border px-0 py-2 text-left text-sm transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label="展开评论输入框"
        onClick={expandComposer}
      >
        <span className="min-w-0 truncate text-muted-foreground">
          {hasDraft ? "继续编辑评论草稿" : (placeholder ?? "写下你的评论")}
        </span>
      </button>
    );
  }

  return (
    <form
      className={
        compact
          ? "space-y-2"
          : docked
            ? "w-full space-y-3"
            : "w-full space-y-3"
      }
      onSubmit={form.handleSubmit((values) => {
        if (commentMutation.error) {
          commentMutation.reset();
        }

        commentMutation.mutate(values);
      })}
    >
      {!compact ? (
        <div className="flex min-w-0 items-center justify-between gap-3">
          <span className="truncate text-sm font-semibold text-muted-foreground">
            {docked ? "底部评论窗" : "评论输入"}
          </span>
          <button
            type="button"
            className="inline-flex h-8 shrink-0 items-center px-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
            disabled={commentMutation.isPending || isUploadingImage}
            onClick={collapseComposer}
          >
            收起
          </button>
        </div>
      ) : null}

      {submitError ? (
        <InlineFeedback
          title="评论发布失败"
          description={submitError}
          onDismiss={() => commentMutation.reset()}
        />
      ) : null}

      <div className="space-y-2">
        <MarkdownComposerField
          autoFocusKey={editorFocusKey}
          disabled={commentMutation.isPending}
          maxReferencedAttachments={IMAGE_UPLOAD_LIMITS.maxCountPerComment}
          onChange={setBodyValue}
          fieldProps={{
            "aria-label": "评论内容",
            "aria-invalid": Boolean(form.formState.errors.body),
            className: compact
              ? "min-h-24"
              : docked
                ? "max-h-[34vh] min-h-24 overflow-y-auto sm:min-h-28"
                : "min-h-28 sm:min-h-32",
            placeholder:
              placeholder ?? (parentId ? "回复这条评论" : "写下你的评论"),
          }}
          value={bodyValue}
          imageUpload={{
            attachments,
            maxCount: IMAGE_UPLOAD_LIMITS.maxCountPerComment,
            onChange: setAttachments,
            onUploadingChange: setIsUploadingImage,
          }}
        />
        {form.formState.errors.body ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.body.message}
          </p>
        ) : null}
      </div>

      <div className="flex justify-end">
        <CommentSubmitAction
          type="submit"
          disabled={commentMutation.isPending || isUploadingImage}
        >
          {isUploadingImage
            ? "图片上传中..."
            : commentMutation.isPending
              ? "正在发布..."
              : (submitLabel ?? (parentId ? "发布回复" : "发表评论"))}
        </CommentSubmitAction>
      </div>
    </form>
  );
}

function CommentSubmitAction({
  children,
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      className={[
        "group inline-flex h-9 items-center gap-2 border-b border-transparent px-0.5 text-sm font-semibold text-primary transition-colors",
        "hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:border-transparent disabled:text-muted-foreground disabled:opacity-60",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <span>{children}</span>
      <span
        className="font-mono text-xs text-primary transition-colors group-disabled:text-muted-foreground"
        aria-hidden="true"
      >
        +
      </span>
    </button>
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
