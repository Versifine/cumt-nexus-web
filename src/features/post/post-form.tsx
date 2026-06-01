"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";

import { publishPost } from "./api";
import { postQueryKeys } from "./queries";

const postSchema = z.object({
  title: z.string().trim().min(1, "请输入标题。"),
  body: z.string().trim().min(1, "请输入正文。"),
});

type PostFormValues = z.infer<typeof postSchema>;

type PostFormProps = {
  slug: string;
};

export function PostForm({ slug }: PostFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: "",
      body: "",
    },
  });

  const postMutation = useMutation({
    mutationFn: (values: PostFormValues) => publishPost(slug, values),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: postQueryKeys.communityPostsPrefix(slug),
      });
      router.push(`/posts/${result.post.id}`);
    },
  });

  const submitError = getSubmitError(postMutation.error);

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((values) => postMutation.mutate(values))}
    >
      {submitError ? (
        <Alert variant="destructive">
          <AlertTitle>发布失败</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="title">
          标题
        </label>
        <Input
          id="title"
          autoComplete="off"
          aria-invalid={Boolean(form.formState.errors.title)}
          disabled={postMutation.isPending}
          placeholder="想讨论什么？"
          {...form.register("title")}
        />
        {form.formState.errors.title ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.title.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="body">
          正文
        </label>
        <Textarea
          id="body"
          aria-invalid={Boolean(form.formState.errors.body)}
          disabled={postMutation.isPending}
          placeholder="先把第一版写清楚。当前版本暂不支持编辑。"
          {...form.register("body")}
        />
        {form.formState.errors.body ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.body.message}
          </p>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={postMutation.isPending}>
          {postMutation.isPending ? "正在发布..." : "发布帖子"}
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
