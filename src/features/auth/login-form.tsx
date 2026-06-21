"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { InlineFeedback } from "@/components/feedback/inline-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import {
  loginWithEmailCode,
  loginWithIdentifier,
  sendLoginEmailCode,
} from "./api";
import {
  emailCodeLoginAuthErrorOptions,
  getAuthSubmitError,
  passwordLoginAuthErrorOptions,
} from "./auth-error";
import { useAuthSession } from "./auth-session";
import { EmailCodeField } from "./email-code-field";
import { getSafeAuthRedirectPath } from "./redirect";
import { emailCodeLoginSchema, passwordLoginSchema } from "./schemas";
import { syncAuthenticatedSession } from "./session-sync";

type PasswordLoginValues = z.infer<typeof passwordLoginSchema>;
type EmailCodeLoginValues = z.infer<typeof emailCodeLoginSchema>;

type LoginFormProps = {
  className?: string;
  onSuccess?: () => void;
  redirectTo?: string;
};

export function LoginForm({ className, onSuccess, redirectTo }: LoginFormProps) {
  const [activeTab, setActiveTab] = useState("password");

  return (
    <div className={cn("space-y-0", className)}>
      <div className="flex border-b border-border" role="tablist" aria-label="登录方式">
        <ModeButton
          active={activeTab === "password"}
          id="password"
          label="密码登录"
          onSelect={setActiveTab}
        />
        <ModeButton
          active={activeTab === "email-code"}
          id="email-code"
          label="邮箱验证码"
          onSelect={setActiveTab}
        />
      </div>
      <div role="tabpanel" aria-label={activeTab === "password" ? "密码登录" : "邮箱验证码"}>
        {activeTab === "password" ? (
          <PasswordLoginForm onSuccess={onSuccess} redirectTo={redirectTo} />
        ) : (
          <EmailCodeLoginForm onSuccess={onSuccess} redirectTo={redirectTo} />
        )}
      </div>
    </div>
  );
}

function ModeButton({
  active,
  id,
  label,
  onSelect,
}: {
  active: boolean;
  id: string;
  label: string;
  onSelect: (value: string) => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={cn(
        "h-9 border-b px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
      onClick={() => onSelect(id)}
    >
      {label}
    </button>
  );
}

function PasswordLoginForm({
  onSuccess,
  redirectTo,
}: {
  onSuccess?: () => void;
  redirectTo?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setToken } = useAuthSession();
  const form = useForm<PasswordLoginValues>({
    resolver: zodResolver(passwordLoginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: loginWithIdentifier,
    onSuccess: async (result) => {
      await syncAuthenticatedSession({ queryClient, result, setToken });
      onSuccess?.();
      router.push(redirectTo ?? getSafeNextPath());
    },
  });

  const submitError = getAuthSubmitError(loginMutation.error, {
    ...passwordLoginAuthErrorOptions,
    unauthenticated: "用户名、邮箱或密码不正确，请检查后重试。",
  });
  const isLocked = loginMutation.isPending || loginMutation.isSuccess;
  const statusText = loginMutation.isSuccess
    ? "验证通过，正在进入。"
    : form.formState.isDirty
      ? "确认信息后登录。"
      : "输入用户名或矿大邮箱后登录。";

  return (
    <form
      className="space-y-0"
      method="post"
      onChangeCapture={() => {
        if (loginMutation.error) {
          loginMutation.reset();
        }
      }}
      onSubmit={form.handleSubmit((values) => {
        if (loginMutation.error) {
          loginMutation.reset();
        }

        loginMutation.mutate(values);
      })}
    >
      {submitError ? (
        <InlineFeedback
          className="mb-5"
          title="登录失败"
          description={submitError}
          onDismiss={() => loginMutation.reset()}
        />
      ) : null}

      <div className="mt-4 rounded-md bg-surface-raised px-3 py-4">
        <FieldLabel htmlFor="login-identifier" title="用户名或邮箱" />
        <div className="min-w-0 space-y-2">
          <Input
            id="login-identifier"
            autoComplete="username"
            aria-invalid={Boolean(form.formState.errors.identifier)}
            disabled={isLocked}
            placeholder="用户名 / student@cumt.edu.cn"
            className="h-11 border-border bg-background text-base font-semibold"
            {...form.register("identifier")}
          />
          <FieldMeta
            error={form.formState.errors.identifier?.message}
            hint="支持用户名或已验证的矿大邮箱。"
          />
        </div>
      </div>

      <div className="mt-4 rounded-md bg-surface-raised px-3 py-4">
        <div className="flex items-center justify-between gap-3">
          <FieldLabel htmlFor="login-password" title="密码" />
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            找回密码
          </Link>
        </div>
        <div className="min-w-0 space-y-2">
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(form.formState.errors.password)}
            disabled={isLocked}
            placeholder="输入密码"
            className="h-11 border-border bg-background text-base"
            {...form.register("password")}
          />
          <FieldMeta
            error={form.formState.errors.password?.message}
            hint="密码不会在页面中明文展示。"
          />
        </div>
      </div>

      <SubmitBlock
        disabled={isLocked}
        isPending={loginMutation.isPending}
        isSuccess={loginMutation.isSuccess}
        pendingText="正在登录..."
        successText="正在进入..."
        submitText="登录"
        statusText={statusText}
      />
    </form>
  );
}

function EmailCodeLoginForm({
  onSuccess,
  redirectTo,
}: {
  onSuccess?: () => void;
  redirectTo?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setToken } = useAuthSession();
  const [resendAvailableAt, setResendAvailableAt] = useState<number | undefined>();
  const form = useForm<EmailCodeLoginValues>({
    resolver: zodResolver(emailCodeLoginSchema),
    defaultValues: {
      code: "",
      email: "",
    },
  });
  const email = useWatch({ control: form.control, name: "email" }) ?? "";

  const sendCodeMutation = useMutation({
    mutationFn: sendLoginEmailCode,
    onSuccess: (result) => {
      setResendAvailableAt(Date.now() + result.resend_after * 1000);
    },
  });
  const loginMutation = useMutation({
    mutationFn: loginWithEmailCode,
    onSuccess: async (result) => {
      await syncAuthenticatedSession({ queryClient, result, setToken });
      onSuccess?.();
      router.push(redirectTo ?? getSafeNextPath());
    },
  });

  const sendError = getAuthSubmitError(sendCodeMutation.error, emailCodeLoginAuthErrorOptions);
  const submitError = getAuthSubmitError(loginMutation.error, {
    ...emailCodeLoginAuthErrorOptions,
    unauthenticated: "验证码无效、已过期，或该邮箱尚未绑定账号。",
  });
  const isLocked =
    sendCodeMutation.isPending || loginMutation.isPending || loginMutation.isSuccess;

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
      className="space-y-0"
      method="post"
      onChangeCapture={() => {
        if (loginMutation.error) {
          loginMutation.reset();
        }

        if (sendCodeMutation.error) {
          sendCodeMutation.reset();
        }
      }}
      onSubmit={form.handleSubmit((values) => {
        if (loginMutation.error) {
          loginMutation.reset();
        }

        loginMutation.mutate(values);
      })}
    >
      {submitError ? (
        <InlineFeedback
          className="mb-5"
          title="登录失败"
          description={submitError}
          onDismiss={() => loginMutation.reset()}
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
        <FieldLabel htmlFor="login-email" title="矿大邮箱" />
        <div className="min-w-0 space-y-2">
          <Input
            id="login-email"
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
            hint="验证码会发送到已绑定并验证的矿大邮箱。"
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
          id: "login-email-code",
          "aria-invalid": Boolean(form.formState.errors.code),
          ...form.register("code"),
        }}
      />

      <SubmitBlock
        disabled={isLocked}
        isPending={loginMutation.isPending}
        isSuccess={loginMutation.isSuccess}
        pendingText="正在登录..."
        successText="正在进入..."
        submitText="验证码登录"
        statusText={
          loginMutation.isSuccess
            ? "验证通过，正在进入。"
            : "邮箱验证码只用于本次登录。"
        }
      />
    </form>
  );
}

function SubmitBlock({
  disabled,
  isPending,
  isSuccess,
  pendingText,
  statusText,
  submitText,
  successText,
}: {
  disabled: boolean;
  isPending: boolean;
  isSuccess: boolean;
  pendingText: string;
  statusText: string;
  submitText: string;
  successText: string;
}) {
  return (
    <div className="space-y-3 py-4">
      <Button type="submit" className="w-full" disabled={disabled}>
        {isPending ? pendingText : isSuccess ? successText : submitText}
      </Button>
      <div className="text-center text-xs text-muted-foreground">{statusText}</div>
    </div>
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

function getSafeNextPath() {
  if (typeof window === "undefined") {
    return "/";
  }

  return getSafeAuthRedirectPath(window.location.search);
}
