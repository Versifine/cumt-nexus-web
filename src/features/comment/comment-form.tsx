"use client";

import { useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextAction } from "@/components/ui/text-action";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSession } from "@/features/auth/auth-session";
import { ContentPreview } from "@/features/content/content-preview";
import { MarkdownToolbar } from "@/features/content/markdown-toolbar";
import { ApiError } from "@/lib/api/client";

import { publishComment } from "./api";
import { commentQueryKeys } from "./queries";

const commentSchema = z.object({
  body: z.string().trim().min(1, "请输入评论内容。"),
});

type CommentFormValues = z.infer<typeof commentSchema>;

type CommentFormProps = {
  compact?: boolean;
  onSubmitted?: () => void;
  parentId?: string | null;
  postId: string;
  placeholder?: string;
  submitLabel?: string;
};

export function CommentForm({
  compact = false,
  onSubmitted,
  parentId = null,
  postId,
  placeholder,
  submitLabel,
}: CommentFormProps) {
  const pathname = usePathname();
  const { isReady, token } = useAuthSession();
  const queryClient = useQueryClient();
  const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      body: "",
    },
  });

  const commentMutation = useMutation({
    mutationFn: (values: CommentFormValues) =>
      publishComment(postId, {
        body: values.body,
        parent_id: parentId || undefined,
      }),
    onSuccess: async () => {
      form.reset();
      await queryClient.invalidateQueries({
        queryKey: commentQueryKeys.postCommentsPrefix(postId),
      });
      onSubmitted?.();
    },
  });

  const submitError = getSubmitError(commentMutation.error);
  const next = pathname || `/posts/${postId}`;
  const loginHref = `/login?next=${encodeURIComponent(next)}`;
  const registerHref = `/register?next=${encodeURIComponent(next)}`;
  const bodyValue = useWatch({ control: form.control, name: "body" }) ?? "";
  const bodyField = form.register("body");

  if (!isReady) {
    return (
      <div
        className={
          compact
            ? "border-l border-border pl-4 text-sm text-muted-foreground"
            : "border-y border-border py-4 text-sm text-muted-foreground"
        }
        aria-label="正在读取登录状态"
      >
        正在确认登录状态...
      </div>
    );
  }

  if (!token) {
    return (
      <section className={compact ? "border-l border-border pl-4" : "border-y border-border py-4"}>
        <div className="font-mono text-xs text-primary">
          {parentId ? "REPLY / LOGIN" : "COMMENT / LOGIN"}
        </div>
        <h3 className={compact ? "mt-2 text-sm font-semibold" : "mt-3 text-lg font-semibold tracking-normal"}>
          登录后{parentId ? "回复评论" : "发表评论"}
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {parentId
            ? "回复会绑定到当前账号。登录或注册后会回到这条帖子继续参与讨论。"
            : "评论会绑定到当前账号。登录或注册后会回到这条帖子继续参与讨论。"}
        </p>
        <div className="mt-4 border-y border-border">
          <TextAction href={loginHref} tone="primary" variant="bar">
            去登录
          </TextAction>
          <TextAction href={registerHref} variant="bar">
            创建账号
          </TextAction>
        </div>
      </section>
    );
  }

  return (
    <form
      className={compact ? "space-y-3 border-l border-border pl-4" : "space-y-3"}
      onSubmit={form.handleSubmit((values) => commentMutation.mutate(values))}
    >
      {submitError ? (
        <Alert variant="destructive">
          <AlertTitle>评论发布失败</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Tabs defaultValue="edit">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <MarkdownToolbar
              disabled={commentMutation.isPending}
              onChange={(nextValue) =>
                form.setValue("body", nextValue, {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                })
              }
              textareaRef={bodyTextareaRef}
              value={bodyValue}
            />
            <TabsList className="rounded-none bg-background">
              <TabsTrigger value="edit">编辑</TabsTrigger>
              <TabsTrigger value="preview">预览</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="edit" className="mt-2">
            <Textarea
              aria-label="评论内容"
              aria-invalid={Boolean(form.formState.errors.body)}
              disabled={commentMutation.isPending}
              placeholder={placeholder ?? (parentId ? "回复这条评论。" : "写下你的评论。")}
              className={compact ? "min-h-28" : undefined}
              {...bodyField}
              ref={(element) => {
                bodyField.ref(element);
                bodyTextareaRef.current = element;
              }}
            />
          </TabsContent>
          <TabsContent value="preview" className="mt-2">
            <ContentPreview
              value={bodyValue}
              minHeightClassName={compact ? "min-h-28" : "min-h-36"}
            />
          </TabsContent>
        </Tabs>
        {form.formState.errors.body ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.body.message}
          </p>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={commentMutation.isPending}>
          {commentMutation.isPending ? "正在发布..." : (submitLabel ?? (parentId ? "发布回复" : "发布评论"))}
        </Button>
      </div>
    </form>
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
