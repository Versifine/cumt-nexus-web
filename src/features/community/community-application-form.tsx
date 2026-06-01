"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";

import { submitCommunityApplication } from "./api";

const applicationSchema = z.object({
  requested_slug: z
    .string()
    .trim()
    .min(1, "Slug is required.")
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens."),
  requested_name: z.string().trim().min(1, "Name is required."),
  reason: z.string().trim().min(1, "Reason is required."),
});

type ApplicationFormValues = z.infer<typeof applicationSchema>;

export function CommunityApplicationForm() {
  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      requested_slug: "",
      requested_name: "",
      reason: "",
    },
  });

  const applicationMutation = useMutation({
    mutationFn: submitCommunityApplication,
    onSuccess: () => {
      form.reset();
    },
  });

  if (applicationMutation.isSuccess) {
    return (
      <Alert variant="success">
        <AlertTitle>Application submitted</AlertTitle>
        <AlertDescription>
          Status: {applicationMutation.data.application.status}. The community is
          not created until platform review approves it.
        </AlertDescription>
      </Alert>
    );
  }

  const submitError = getSubmitError(applicationMutation.error);

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((values) => applicationMutation.mutate(values))}
    >
      {submitError ? (
        <Alert variant="destructive">
          <AlertTitle>Could not submit application</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="requested_slug">
          Slug
        </label>
        <Input
          id="requested_slug"
          autoComplete="off"
          aria-invalid={Boolean(form.formState.errors.requested_slug)}
          disabled={applicationMutation.isPending}
          placeholder="campus-life"
          {...form.register("requested_slug")}
        />
        {form.formState.errors.requested_slug ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.requested_slug.message}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            This becomes the board URL identifier.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="requested_name">
          Name
        </label>
        <Input
          id="requested_name"
          autoComplete="off"
          aria-invalid={Boolean(form.formState.errors.requested_name)}
          disabled={applicationMutation.isPending}
          placeholder="Campus Life"
          {...form.register("requested_name")}
        />
        {form.formState.errors.requested_name ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.requested_name.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="reason">
          Reason
        </label>
        <Textarea
          id="reason"
          aria-invalid={Boolean(form.formState.errors.reason)}
          disabled={applicationMutation.isPending}
          placeholder="Explain why this board should exist."
          {...form.register("reason")}
        />
        {form.formState.errors.reason ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.reason.message}
          </p>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={applicationMutation.isPending}>
          {applicationMutation.isPending ? "Submitting..." : "Submit application"}
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
