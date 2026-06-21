"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { InlineFeedback } from "@/components/feedback/inline-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TextAction } from "@/components/ui/text-action";
import { cn } from "@/lib/utils";

import { resetPassword, sendPasswordResetCode } from "./api";
import { AuthPageShell } from "./auth-page-shell";
import { getAuthSubmitError } from "./auth-error";
import { EmailCodeField } from "./email-code-field";
import { passwordResetSchema } from "./schemas";

type ForgotPasswordValues = z.infer<typeof passwordResetSchema>;

export function ForgotPasswordPage() {
  return (
    <AuthPageShell
      action={
        <TextAction href="/login" tone="primary">
          去登录
        </TextAction>
      }
      description="通过已验证的矿大邮箱接收验证码，并设置新的登录密码。"
      eyebrow="账号恢复"
      footer={
        <TextAction href="/login" tone="primary" variant="bar">
          想起密码，返回登录
        </TextAction>
      }
      title="找回密码"
    >
      <PasswordResetForm />
    </AuthPageShell>
  );
}

function PasswordResetForm() {
  const [resendAvailableAt, setResendAvailableAt] = useState<number | undefined>();
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      code: "",
      email: "",
      new_password: "",
    },
  });
  const sendCodeMutation = useMutation({
    mutationFn: sendPasswordResetCode,
    onSuccess: (result) => {
      setResendAvailableAt(Date.now() + result.resend_after * 1000);
    },
  });
  const resetMutation = useMutation({
    mutationFn: resetPassword,
  });
  const isLocked = sendCodeMutation.isPending || resetMutation.isPending;
  const email = useWatch({ control: form.control, name: "email" }) ?? "";
  const submitError = getAuthSubmitError(resetMutation.error, {
    unauthenticated: "验证码无效或已过期，请重新确认。",
  });
  const sendError = getAuthSubmitError(sendCodeMutation.error);

  async function handleSendCode() {
    const isValid = await form.trigger("email");

    if (!isValid) {
      return;
    }

    sendCodeMutation.reset();
    sendCodeMutation.mutate({ email });
  }

  if (resetMutation.isSuccess) {
    return (
      <section className="mt-4 rounded-lg bg-surface-raised px-4 py-5">
        <p className="font-mono text-xs text-primary">已提交</p>
        <h2 className="mt-3 text-base font-semibold leading-6 tracking-normal">
          密码已更新
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          可以使用新密码重新登录。为了账号安全，后端会让旧会话在后续请求中失效。
        </p>
        <div className="mt-4 rounded-md bg-background px-3 py-3">
          <TextAction href="/login" tone="primary" variant="bar">
            返回登录
          </TextAction>
        </div>
      </section>
    );
  }

  return (
    <form
      className="space-y-0"
      method="post"
      onChangeCapture={() => {
        if (resetMutation.error) {
          resetMutation.reset();
        }

        if (sendCodeMutation.error) {
          sendCodeMutation.reset();
        }
      }}
      onSubmit={form.handleSubmit((values) => {
        if (resetMutation.error) {
          resetMutation.reset();
        }

        resetMutation.mutate(values);
      })}
    >
      {submitError ? (
        <InlineFeedback
          className="mt-5"
          title="重置失败"
          description={submitError}
          onDismiss={() => resetMutation.reset()}
        />
      ) : null}
      {sendError ? (
        <InlineFeedback
          className="mt-5"
          title="验证码发送失败"
          description={sendError}
          onDismiss={() => sendCodeMutation.reset()}
        />
      ) : null}

      <div className="mt-4 rounded-md bg-surface-raised px-3 py-4">
        <label className="text-sm font-semibold text-foreground" htmlFor="reset-email">
          矿大邮箱
        </label>
        <div className="min-w-0 space-y-2">
          <Input
            id="reset-email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(form.formState.errors.email)}
            disabled={isLocked}
            placeholder="student@cumt.edu.cn"
            className="h-11 border-border bg-background text-base"
            {...form.register("email")}
          />
          <FieldMeta
            error={form.formState.errors.email?.message}
            hint="使用账号已绑定并验证过的矿大邮箱。"
          />
        </div>
      </div>

      <EmailCodeField
        email={email}
        disabled={isLocked}
        isSending={sendCodeMutation.isPending}
        onSend={handleSendCode}
        resendAvailableAt={resendAvailableAt}
        error={form.formState.errors.code?.message}
        codeInputProps={{
          id: "reset-code",
          "aria-invalid": Boolean(form.formState.errors.code),
          ...form.register("code"),
        }}
      />

      <div className="mt-4 rounded-md bg-surface-raised px-3 py-4">
        <label className="text-sm font-semibold text-foreground" htmlFor="reset-password">
          新密码
        </label>
        <div className="min-w-0 space-y-2">
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(form.formState.errors.new_password)}
            disabled={isLocked}
            placeholder="设置新密码"
            className="h-11 border-border bg-background text-base"
            {...form.register("new_password")}
          />
          <FieldMeta
            error={form.formState.errors.new_password?.message}
            hint="至少 8 位，最多 256 bytes。"
          />
        </div>
      </div>

      <div className="space-y-3 py-4">
        <Button type="submit" className="w-full" disabled={isLocked}>
          {resetMutation.isPending ? "正在更新..." : "更新密码"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          验证码只用于本次密码重置。
        </p>
      </div>
    </form>
  );
}

function FieldMeta({
  error,
  hint,
}: {
  error?: string;
  hint: string;
}) {
  return (
    <p className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}>
      {error ?? hint}
    </p>
  );
}
