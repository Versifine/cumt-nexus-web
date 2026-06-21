"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { InlineFeedback } from "@/components/feedback/inline-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { registerWithEmail, sendRegisterEmailCode } from "./api";
import { getAuthSubmitError } from "./auth-error";
import { useAuthSession } from "./auth-session";
import { EmailCodeField } from "./email-code-field";
import { registerWithEmailSchema } from "./schemas";
import { syncAuthenticatedSession } from "./session-sync";

type RegisterFormValues = z.infer<typeof registerWithEmailSchema>;

type RegisterFormProps = {
  className?: string;
  onSuccess?: () => void;
};

export function RegisterForm({ className, onSuccess }: RegisterFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setToken } = useAuthSession();
  const [resendAvailableAt, setResendAvailableAt] = useState<number | undefined>();
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerWithEmailSchema),
    defaultValues: {
      code: "",
      confirm_password: "",
      email: "",
      password: "",
      username: "",
    },
  });
  const email = useWatch({ control: form.control, name: "email" }) ?? "";

  const sendCodeMutation = useMutation({
    mutationFn: sendRegisterEmailCode,
    onSuccess: (result) => {
      setResendAvailableAt(Date.now() + result.resend_after * 1000);
    },
  });
  const registerMutation = useMutation({
    mutationFn: (values: RegisterFormValues) =>
      registerWithEmail({
        code: values.code,
        email: values.email,
        password: values.password,
        username: values.username,
      }),
    onSuccess: async (result) => {
      await syncAuthenticatedSession({ queryClient, result, setToken });
      onSuccess?.();
      router.push("/settings/profile");
    },
  });

  const sendError = getAuthSubmitError(sendCodeMutation.error);
  const submitError = getAuthSubmitError(registerMutation.error, {
    conflict: "用户名或邮箱已被占用，请换一个再试。",
    unauthenticated: "验证码无效或已过期，请重新确认。",
  });
  const isLocked =
    sendCodeMutation.isPending || registerMutation.isPending || registerMutation.isSuccess;
  const statusText = registerMutation.isSuccess
    ? "账号已创建，正在进入资料设置。"
    : form.formState.isDirty
      ? "确认邮箱、验证码和账号信息后创建账号。"
      : "使用矿大邮箱验证后创建账号。";

  async function handleSendCode() {
    const isValid = await form.trigger("email");

    if (!isValid) {
      return;
    }

    sendCodeMutation.reset();
    sendCodeMutation.mutate({ email });
  }

  return (
    <form
      className={cn("space-y-0", className)}
      method="post"
      onChangeCapture={() => {
        if (registerMutation.error) {
          registerMutation.reset();
        }

        if (sendCodeMutation.error) {
          sendCodeMutation.reset();
        }
      }}
      onSubmit={form.handleSubmit((values) => {
        if (registerMutation.error) {
          registerMutation.reset();
        }

        registerMutation.mutate(values);
      })}
    >
      {submitError ? (
        <InlineFeedback
          className="mb-5"
          title="注册失败"
          description={submitError}
          onDismiss={() => registerMutation.reset()}
        />
      ) : null}
      {sendError ? (
        <InlineFeedback
          className="mb-5"
          title="验证码发送失败"
          description={sendError}
          onDismiss={() => sendCodeMutation.reset()}
        />
      ) : null}

      <div className="mt-4 rounded-md bg-surface-raised px-3 py-4">
        <FieldLabel htmlFor="register-email" title="矿大邮箱" />
        <div className="min-w-0 space-y-2">
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(form.formState.errors.email)}
            disabled={isLocked}
            placeholder="student@cumt.edu.cn"
            className="h-11 border-border bg-background text-base font-semibold"
            {...form.register("email")}
          />
          <FieldMeta
            error={form.formState.errors.email?.message}
            hint="验证码会发送到符合后端白名单的矿大邮箱。"
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
          id: "register-email-code",
          "aria-invalid": Boolean(form.formState.errors.code),
          ...form.register("code"),
        }}
      />

      <div className="mt-4 rounded-md bg-surface-raised px-3 py-4">
        <FieldLabel htmlFor="register-username" title="用户名" />
        <div className="min-w-0 space-y-2">
          <Input
            id="register-username"
            autoComplete="username"
            aria-invalid={Boolean(form.formState.errors.username)}
            disabled={isLocked}
            placeholder="输入用户名"
            className="h-11 border-border bg-background text-base font-semibold"
            {...form.register("username")}
          />
          <FieldMeta
            error={form.formState.errors.username?.message}
            hint="3-32 位，只支持字母、数字和下划线；注册时会统一转为小写。"
          />
        </div>
      </div>

      <div className="mt-4 rounded-md bg-surface-raised px-3 py-4">
        <FieldLabel htmlFor="register-password" title="密码" />
        <div className="min-w-0 space-y-2">
          <Input
            id="register-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(form.formState.errors.password)}
            disabled={isLocked}
            placeholder="设置密码"
            className="h-11 border-border bg-background text-base"
            {...form.register("password")}
          />
          <FieldMeta
            error={form.formState.errors.password?.message}
            hint="至少 8 位，最多 256 bytes；建议混合数字、字母和符号。"
          />
        </div>
      </div>

      <div className="mt-4 rounded-md bg-surface-raised px-3 py-4">
        <FieldLabel htmlFor="register-confirm-password" title="确认密码" />
        <div className="min-w-0 space-y-2">
          <Input
            id="register-confirm-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(form.formState.errors.confirm_password)}
            disabled={isLocked}
            placeholder="再次输入密码"
            className="h-11 border-border bg-background text-base"
            {...form.register("confirm_password")}
          />
          <FieldMeta
            error={form.formState.errors.confirm_password?.message}
            hint="用于避免输错密码。"
          />
        </div>
      </div>

      <div className="space-y-3 py-4">
        <Button type="submit" className="w-full" disabled={isLocked}>
          {registerMutation.isPending
            ? "正在注册..."
            : registerMutation.isSuccess
              ? "正在进入..."
              : "注册账号"}
        </Button>
        <div className="text-center text-xs text-muted-foreground">{statusText}</div>
      </div>
    </form>
  );
}

function FieldLabel({
  htmlFor,
  title,
}: {
  htmlFor: string;
  title: string;
}) {
  return (
    <label className="text-sm font-semibold text-foreground" htmlFor={htmlFor}>
      {title}
    </label>
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
