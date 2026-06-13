"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getReferencedAttachmentIdsForSubmit } from "@/features/content/attachment-markdown";
import { MarkdownComposerField } from "@/features/content/markdown-composer-field";
import {
  IMAGE_UPLOAD_LIMITS,
  type MediaAttachment,
} from "@/features/media/types";
import type { Community } from "@/features/community/types";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import { publishPost } from "./api";
import { PostCommunityPicker } from "./post-community-picker";
import { postQueryKeys } from "./queries";

const postSchema = z.object({
  communitySlug: z.string().trim().min(1, "请选择社区。"),
  title: z.string().trim().min(1, "请输入标题。"),
  body: z.string().trim().min(1, "请输入正文。"),
});

type PostFormValues = z.infer<typeof postSchema>;

type PostFormProps = {
  className?: string;
  communitySlug: string;
  isSelectedCommunityLoading?: boolean;
  onCommunitySlugChange: (slug: string) => void;
  selectedCommunity?: Community | null;
  selectedCommunityError?: Error | null;
  suggestedCommunities?: Community[];
};

export function PostForm({
  className,
  communitySlug,
  isSelectedCommunityLoading = false,
  onCommunitySlugChange,
  selectedCommunity = null,
  selectedCommunityError = null,
  suggestedCommunities = [],
}: PostFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      communitySlug,
      title: "",
      body: "",
    },
  });
  const communitySlugValue =
    useWatch({ control: form.control, name: "communitySlug" }) ?? "";

  useEffect(() => {
    if (communitySlug !== communitySlugValue) {
      form.setValue("communitySlug", communitySlug, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
    }
  }, [communitySlug, communitySlugValue, form]);

  const postMutation = useMutation({
    mutationFn: (values: PostFormValues) => {
      const { communitySlug, ...postInput } = values;

      return publishPost(communitySlug, {
        ...postInput,
        attachment_ids: getReferencedAttachmentIdsForSubmit(
          values.body,
          attachments,
        ),
      });
    },
    onSuccess: async (result, values) => {
      await queryClient.invalidateQueries({
        queryKey: postQueryKeys.communityPostsPrefix(values.communitySlug),
      });
      await queryClient.invalidateQueries({
        queryKey: postQueryKeys.latestPrefix(),
      });
      router.push(`/posts/${result.post.id}`);
    },
  });

  const submitError = getSubmitError(postMutation.error);
  const titleValue = useWatch({ control: form.control, name: "title" }) ?? "";
  const bodyValue = useWatch({ control: form.control, name: "body" }) ?? "";
  const confirmedSelectedCommunity =
    selectedCommunity?.slug === communitySlugValue ? selectedCommunity : null;
  const hasSelectedCommunitySlug = communitySlugValue.trim().length > 0;
  const isSelectedCommunityMissing =
    hasSelectedCommunitySlug &&
    !isSelectedCommunityLoading &&
    !confirmedSelectedCommunity;
  const cannotPublishToSelectedCommunity =
    confirmedSelectedCommunity && !canPublishToCommunity(confirmedSelectedCommunity);
  const titleLength = titleValue.trim().length;
  const bodyLength = bodyValue.trim().length;
  const isSubmitDisabled =
    postMutation.isPending ||
    isUploadingImage ||
    isSelectedCommunityLoading ||
    !hasSelectedCommunitySlug ||
    isSelectedCommunityMissing ||
    Boolean(cannotPublishToSelectedCommunity) ||
    titleLength === 0 ||
    bodyLength === 0;

  function setBodyValue(nextValue: string) {
    form.setValue("body", nextValue, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  function setCommunitySlugValue(nextValue: string) {
    form.setValue("communitySlug", nextValue, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    onCommunitySlugChange(nextValue);
  }

  return (
    <form
      className={cn("divide-y divide-border", className)}
      onSubmit={form.handleSubmit((values) => {
        if (isSubmitDisabled) {
          return;
        }

        postMutation.mutate(values);
      })}
    >
      <input type="hidden" {...form.register("communitySlug")} />

      {submitError ? (
        <div className="px-3 py-3 sm:px-4">
          <Alert variant="destructive">
            <AlertTitle>发布失败</AlertTitle>
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        </div>
      ) : null}

      <div className="space-y-2 px-3 py-3 sm:px-4">
        <PostCommunityPicker
          disabled={postMutation.isPending || isUploadingImage}
          isSelectedCommunityLoading={isSelectedCommunityLoading}
          onChange={setCommunitySlugValue}
          selectedCommunity={confirmedSelectedCommunity}
          suggestedCommunities={suggestedCommunities}
          value={communitySlugValue}
        />
        <FieldMeta
          error={form.formState.errors.communitySlug?.message}
          hint={getCommunityHint(
            isSelectedCommunityLoading,
            selectedCommunityError,
            confirmedSelectedCommunity,
            hasSelectedCommunitySlug,
            isSelectedCommunityMissing,
            Boolean(cannotPublishToSelectedCommunity),
          )}
        />
      </div>

      <div className="space-y-2 px-3 py-3 sm:px-4">
        <Input
          id="title"
          autoComplete="off"
          aria-invalid={Boolean(form.formState.errors.title)}
          disabled={postMutation.isPending}
          placeholder="标题"
          className="h-12 border-border bg-background-soft text-base font-semibold"
          {...form.register("title")}
        />
        <FieldMeta
          count={titleLength}
          error={form.formState.errors.title?.message}
        />
      </div>

      <div className="space-y-2 px-3 py-3 sm:px-4">
        <MarkdownComposerField
          disabled={postMutation.isPending}
          maxReferencedAttachments={IMAGE_UPLOAD_LIMITS.maxCountPerPost}
          onChange={setBodyValue}
          fieldProps={{
            "aria-invalid": Boolean(form.formState.errors.body),
            className:
              "min-h-80 border-border bg-background-soft text-base leading-7",
            id: "body",
            placeholder: "正文",
          }}
          value={bodyValue}
          imageUpload={{
            attachments,
            maxCount: IMAGE_UPLOAD_LIMITS.maxCountPerPost,
            onChange: setAttachments,
            onUploadingChange: setIsUploadingImage,
          }}
        />
        <FieldMeta
          count={bodyLength}
          error={form.formState.errors.body?.message}
        />
      </div>

      <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="min-h-5 text-xs text-muted-foreground">
          {getSubmitStatusText(
            isSelectedCommunityLoading,
            confirmedSelectedCommunity,
            hasSelectedCommunitySlug,
            titleLength,
            bodyLength,
            isUploadingImage,
            postMutation.isPending,
          )}
        </div>
        <Button
          className="h-9 rounded-full px-5"
          type="submit"
          disabled={isSubmitDisabled}
        >
          {isSelectedCommunityLoading
            ? "正在确认社区..."
            : isUploadingImage
            ? "图片上传中..."
            : postMutation.isPending
              ? "正在发布..."
              : "发布帖子"}
        </Button>
      </div>
    </form>
  );
}

function FieldMeta({
  count,
  error,
  hint,
}: {
  count?: number;
  error?: string;
  hint?: string | null;
}) {
  if (!error && !hint && typeof count !== "number") {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
      {error || hint ? (
        <p className={error ? "text-destructive" : "text-muted-foreground"}>
          {error ?? hint}
        </p>
      ) : (
        <span aria-hidden="true" />
      )}
      {typeof count === "number" ? (
        <span className="font-mono text-muted-foreground">{count} 字</span>
      ) : null}
    </div>
  );
}

function canPublishToCommunity(community: Community) {
  if (community.status !== "active") {
    return false;
  }

  if (community.viewer_permissions) {
    return community.viewer_permissions.can_post !== false;
  }

  return true;
}

function getCommunityHint(
  isLoading: boolean,
  error: Error | null,
  selectedCommunity: Community | null,
  hasSelectedSlug: boolean,
  isSelectedCommunityMissing: boolean,
  cannotPublishToSelectedCommunity: boolean,
) {
  if (isLoading) {
    return "正在确认社区。";
  }

  if (!hasSelectedSlug) {
    return "选择社区后可发布。";
  }

  if (error || isSelectedCommunityMissing) {
    return "没有找到这个社区，或当前账号无法读取它。";
  }

  if (cannotPublishToSelectedCommunity) {
    return "当前账号不能在这个社区发帖。";
  }

  if (selectedCommunity) {
    return null;
  }

  return null;
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

function getSubmitStatusText(
  isCommunityLoading: boolean,
  selectedCommunity: Community | null,
  hasSelectedSlug: boolean,
  titleLength: number,
  bodyLength: number,
  isUploadingImage: boolean,
  isSubmitting: boolean,
) {
  if (isSubmitting) {
    return "正在发布帖子。";
  }

  if (isUploadingImage) {
    return "图片上传完成后可发布。";
  }

  if (isCommunityLoading) {
    return "正在确认社区权限。";
  }

  if (selectedCommunity) {
    if (titleLength === 0 || bodyLength === 0) {
      return "填写标题和正文后可发布。";
    }

    return `将发布到 /${selectedCommunity.slug}。`;
  }

  if (hasSelectedSlug) {
    return "正在等待社区确认。";
  }

  return "选择社区后可发布。";
}
