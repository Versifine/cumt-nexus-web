"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";

import { publishComment } from "./api";
import { commentQueryKeys } from "./queries";

const commentSchema = z.object({
  body: z.string().trim().min(1, "Comment body is required."),
});

type CommentFormValues = z.infer<typeof commentSchema>;

type CommentFormProps = {
  postId: string;
};

export function CommentForm({ postId }: CommentFormProps) {
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

  return (
    <form
      className="space-y-3"
      onSubmit={form.handleSubmit((values) => commentMutation.mutate(values))}
    >
      {submitError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not publish comment</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Textarea
          aria-label="Comment body"
          aria-invalid={Boolean(form.formState.errors.body)}
          disabled={commentMutation.isPending}
          placeholder="Write a comment."
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
          {commentMutation.isPending ? "Publishing..." : "Publish comment"}
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

  return "Request failed. Please try again.";
}
