"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import { publishPost } from "./api";
import { postQueryKeys } from "./queries";

const postSchema = z.object({
  title: z.string().trim().min(1, "请输入标题。"),
  body: z.string().trim().min(1, "请输入正文。"),
});

type PostFormValues = z.infer<typeof postSchema>;

type PostFormProps = {
  className?: string;
  slug: string;
};

export function PostForm({ className, slug }: PostFormProps) {
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
  const titleValue = useWatch({ control: form.control, name: "title" }) ?? "";
  const bodyValue = useWatch({ control: form.control, name: "body" }) ?? "";
  const titleLength = titleValue.trim().length;
  const bodyLength = bodyValue.trim().length;

  return (
    <form
      className={cn("space-y-0", className)}
      onSubmit={form.handleSubmit((values) => postMutation.mutate(values))}
    >
      {submitError ? (
        <Alert variant="destructive" className="mb-5">
          <AlertTitle>发布失败</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 border-b border-border py-5 md:grid-cols-[160px_minmax(0,1fr)]">
        <FieldLabel
          description="一句话说明这条讨论的主题。"
          htmlFor="title"
          index="01"
          title="标题"
        />
        <div className="min-w-0 space-y-2">
        <Input
          id="title"
          autoComplete="off"
          aria-invalid={Boolean(form.formState.errors.title)}
          disabled={postMutation.isPending}
          placeholder="想讨论什么？"
          className="h-12 border-border bg-background text-base font-semibold"
          {...form.register("title")}
        />
          <FieldMeta
            count={titleLength}
            error={form.formState.errors.title?.message}
            hint="建议 8 到 40 个字，便于别人快速扫读。"
          />
        </div>
      </div>

      <div className="grid gap-4 border-b border-border py-5 md:grid-cols-[160px_minmax(0,1fr)]">
        <FieldLabel
          description="把背景、问题、观点或需要的帮助写清楚。"
          htmlFor="body"
          index="02"
          title="正文"
        />
        <div className="min-w-0 space-y-2">
        <Textarea
          id="body"
          aria-invalid={Boolean(form.formState.errors.body)}
          disabled={postMutation.isPending}
          placeholder="先把第一版写清楚。当前版本暂不支持编辑。"
          className="min-h-72 border-border bg-background text-base leading-7"
          {...form.register("body")}
        />
          <FieldMeta
            count={bodyLength}
            error={form.formState.errors.body?.message}
            hint="正文支持换行；发布前检查是否有遗漏的上下文。"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          {form.formState.isDirty ? "草稿尚未发布。" : "开始输入后会在这里保留草稿状态。"}
        </div>
        <Button type="submit" disabled={postMutation.isPending}>
          {postMutation.isPending ? "正在发布..." : "发布帖子"}
        </Button>
      </div>
    </form>
  );
}

function FieldLabel({
  description,
  htmlFor,
  index,
  title,
}: {
  description: string;
  htmlFor: string;
  index: string;
  title: string;
}) {
  return (
    <div>
      <label
        className="flex items-center gap-3 text-sm font-semibold text-foreground"
        htmlFor={htmlFor}
      >
        <span className="font-mono text-xs text-primary">{index}</span>
        {title}
      </label>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
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
