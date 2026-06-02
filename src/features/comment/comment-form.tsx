"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TextAction } from "@/components/ui/text-action";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSession } from "@/features/auth/auth-session";
import { ApiError } from "@/lib/api/client";

import { publishComment } from "./api";
import { commentQueryKeys } from "./queries";

const commentSchema = z.object({
  body: z.string().trim().min(1, "请输入评论内容。"),
});

type CommentFormValues = z.infer<typeof commentSchema>;

type CommentFormProps = {
  postId: string;
};

export function CommentForm({ postId }: CommentFormProps) {
  const pathname = usePathname();
  const { isReady, token } = useAuthSession();
  const queryClient = useQueryClient();
  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      body: "",
    },
  });

  const commentMutation = useMutation({
    mutationFn: (values: CommentFormValues) => publishComment(postId, values),
    onSuccess: async () => {
      form.reset();
      await queryClient.invalidateQueries({
        queryKey: commentQueryKeys.postCommentsPrefix(postId),
      });
    },
  });

  const submitError = getSubmitError(commentMutation.error);
  const next = pathname || `/posts/${postId}`;
  const loginHref = `/login?next=${encodeURIComponent(next)}`;
  const registerHref = `/register?next=${encodeURIComponent(next)}`;

  if (!isReady) {
    return (
      <div
        className="border-y border-border py-4 text-sm text-muted-foreground"
        aria-label="正在读取登录状态"
      >
        正在确认登录状态...
      </div>
    );
  }

  if (!token) {
    return (
      <section className="border-y border-border py-4">
        <div className="font-mono text-xs text-primary">COMMENT / LOGIN</div>
        <h3 className="mt-3 text-lg font-semibold tracking-normal">
          登录后发表评论
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          评论会绑定到当前账号。登录或注册后会回到这条帖子继续参与讨论。
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
      className="space-y-3"
      onSubmit={form.handleSubmit((values) => commentMutation.mutate(values))}
    >
      {submitError ? (
        <Alert variant="destructive">
          <AlertTitle>评论发布失败</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Textarea
          aria-label="评论内容"
          aria-invalid={Boolean(form.formState.errors.body)}
          disabled={commentMutation.isPending}
          placeholder="写下你的评论。"
          {...form.register("body")}
        />
        {form.formState.errors.body ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.body.message}
          </p>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={commentMutation.isPending}>
          {commentMutation.isPending ? "正在发布..." : "发布评论"}
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
