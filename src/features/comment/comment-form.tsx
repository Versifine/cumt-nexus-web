"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  type InfiniteData,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
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
import { refreshCurrentUserGrowthLedgers } from "@/features/progression/queries";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import { publishComment } from "./api";
import { commentQueryKeys } from "./queries";
import type { Comment, ListCommentsResponse } from "./types";
import { postQueryKeys } from "../post/queries";

const commentSchema = z.object({
  body: z.string().trim().min(1, "请输入评论内容。"),
});

type CommentFormValues = z.infer<typeof commentSchema>;

type CommentCommentsCacheData =
  | ListCommentsResponse
  | InfiniteData<ListCommentsResponse, number>;

type CommentFormProps = {
  compact?: boolean;
  defaultExpanded?: boolean;
  docked?: boolean;
  focusSignal?: number;
  onExpandedChange?: (isExpanded: boolean) => void;
  onSubmitted?: (comment: Comment) => void;
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
    onSuccess: (result) => {
      queryClient.setQueriesData<CommentCommentsCacheData>(
        {
          queryKey: commentQueryKeys.postCommentsPrefix(postId),
        },
        (current) => insertPublishedCommentIntoCache(current, result.comment),
      );
      form.reset();
      setAttachments([]);
      if (!compact) {
        setIsExpanded(false);
      }
      onSubmitted?.(result.comment);

      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: commentQueryKeys.postCommentsPrefix(postId),
        }),
        queryClient.invalidateQueries({
          queryKey: postQueryKeys.detail(postId),
        }),
        refreshCurrentUserGrowthLedgers(queryClient),
      ]);
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
    if (docked) {
      return;
    }

    const focusFrame = window.requestAnimationFrame(() => {
      setEditorFocusKey((value) => value + 1);
    });

    return () => window.cancelAnimationFrame(focusFrame);
  }, [docked, focusSignal, token]);

  useEffect(() => {
    onExpandedChange?.(isExpanded);
  }, [isExpanded, onExpandedChange]);

  function expandComposer() {
    setIsExpanded(true);
    if (!docked) {
      setEditorFocusKey((value) => value + 1);
    }
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
            : "rounded-md bg-surface-raised px-3 py-3 text-sm text-muted-foreground"
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
        <section className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md bg-surface-raised px-3 py-3">
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
          compact ? "py-1" : "rounded-md bg-surface-raised px-4 py-4"
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
        <div className="mt-3 flex flex-wrap gap-4">
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
        className="group flex min-h-14 w-full items-center justify-between gap-3 rounded-lg bg-background-soft px-3 py-3 text-left text-sm shadow-[0_0_0_1px_var(--border)] transition-colors hover:bg-surface-raised hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label="展开评论输入框"
        onClick={expandComposer}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            className="size-1.5 shrink-0 rounded-full bg-primary"
            aria-hidden="true"
          />
          <span className="min-w-0 truncate text-muted-foreground transition-colors group-hover:text-foreground">
            {hasDraft ? "继续编辑评论草稿" : (placeholder ?? "写下你的评论")}
          </span>
        </span>
        <span
          className="shrink-0 font-mono text-sm font-semibold text-primary"
          aria-hidden="true"
        >
          +
        </span>
      </button>
    );
  }

  return (
    <form
      className={cn(
        compact
          ? "space-y-2"
          : "w-full space-y-3 rounded-lg bg-background-soft p-2 shadow-[0_0_0_1px_var(--border)] sm:p-3",
        docked && !compact && "p-1.5 sm:p-2",
      )}
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

function insertPublishedCommentIntoCache(
  current: CommentCommentsCacheData | undefined,
  comment: Comment,
): CommentCommentsCacheData | undefined {
  if (!current) {
    return current;
  }

  if (isInfiniteCommentsData(current)) {
    return insertPublishedCommentIntoInfiniteData(current, comment);
  }

  return insertPublishedCommentIntoPage(current, comment);
}

function insertPublishedCommentIntoInfiniteData(
  current: InfiniteData<ListCommentsResponse, number>,
  comment: Comment,
): InfiniteData<ListCommentsResponse, number> {
  if (current.pages.some((page) => containsComment(page.comments, comment.id))) {
    return current;
  }

  const normalizedComment = normalizePublishedComment(comment);
  if (current.pages.length === 0) {
    return current;
  }

  if (!normalizedComment.parent_id || current.pages[0]?.view === "flat") {
    const [firstPage, ...otherPages] = current.pages;

    return {
      ...current,
      pages: [
        {
          ...firstPage,
          comments: [normalizedComment, ...firstPage.comments],
        },
        ...otherPages,
      ],
    };
  }

  let didInsert = false;
  const nextPages = current.pages.map((page) => {
    if (didInsert) {
      return page;
    }

    const result = insertReplyComment(
      page.comments,
      normalizedComment.parent_id ?? "",
      normalizedComment,
    );
    if (!result.didInsert) {
      return page;
    }

    didInsert = true;
    return {
      ...page,
      comments: result.comments,
    };
  });

  if (didInsert) {
    return {
      ...current,
      pages: nextPages,
    };
  }

  const [firstPage, ...otherPages] = current.pages;

  return {
    ...current,
    pages: [
      {
        ...firstPage,
        comments: [normalizedComment, ...firstPage.comments],
      },
      ...otherPages,
    ],
  };
}

function insertPublishedCommentIntoPage(
  current: ListCommentsResponse | undefined,
  comment: Comment,
): ListCommentsResponse | undefined {
  if (!current || containsComment(current.comments, comment.id)) {
    return current;
  }

  const normalizedComment = normalizePublishedComment(comment);
  if (!normalizedComment.parent_id || current.view === "flat") {
    return {
      ...current,
      comments: [normalizedComment, ...current.comments],
    };
  }

  const result = insertReplyComment(
    current.comments,
    normalizedComment.parent_id,
    normalizedComment,
  );

  return result.didInsert
    ? {
        ...current,
        comments: result.comments,
      }
    : {
        ...current,
        comments: [normalizedComment, ...current.comments],
      };
}

function isInfiniteCommentsData(
  current: CommentCommentsCacheData,
): current is InfiniteData<ListCommentsResponse, number> {
  return Array.isArray(
    (current as Partial<InfiniteData<ListCommentsResponse, number>>).pages,
  );
}

function normalizePublishedComment(comment: Comment): Comment {
  return {
    ...comment,
    children: comment.children ?? [],
  };
}

function containsComment(comments: Comment[], commentId: string): boolean {
  return comments.some(
    (comment) =>
      comment.id === commentId ||
      (comment.children ? containsComment(comment.children, commentId) : false),
  );
}

function insertReplyComment(
  comments: Comment[],
  parentId: string,
  reply: Comment,
): { comments: Comment[]; didInsert: boolean } {
  let didInsert = false;

  const nextComments = comments.map((comment) => {
    if (comment.id === parentId) {
      didInsert = true;
      const children = comment.children ?? [];

      return {
        ...comment,
        children: [reply, ...children],
        reply_count: Math.max(comment.reply_count ?? children.length, children.length) + 1,
      };
    }

    if (!comment.children?.length) {
      return comment;
    }

    const childResult = insertReplyComment(comment.children, parentId, reply);
    if (!childResult.didInsert) {
      return comment;
    }

    didInsert = true;
    return {
      ...comment,
      children: childResult.comments,
    };
  });

  return { comments: nextComments, didInsert };
}
