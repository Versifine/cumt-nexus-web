"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import {
  loginWithEmailCode,
  loginWithIdentifier,
  registerWithEmail,
  sendLoginEmailCode,
  sendRegisterEmailCode,
} from "./api";
import {
  emailCodeLoginAuthErrorOptions,
  getAuthSubmitError,
  passwordLoginAuthErrorOptions,
} from "./auth-error";
import { useAuthSession } from "./auth-session";
import {
  emailCodeLoginSchema,
  registerWithEmailSchema,
  passwordLoginSchema,
} from "./schemas";
import { syncAuthenticatedSession } from "./session-sync";

type QuickPasswordLoginValues = z.infer<typeof passwordLoginSchema>;
type QuickEmailLoginValues = z.infer<typeof emailCodeLoginSchema>;
type QuickRegisterValues = z.infer<typeof registerWithEmailSchema>;

type QuickAuthFormProps = {
  className?: string;
  onSuccess?: () => void;
};

export function QuickPasswordLoginForm({ className, onSuccess }: QuickAuthFormProps) {
  const queryClient = useQueryClient();
  const { setToken } = useAuthSession();
  const form = useForm<QuickPasswordLoginValues>({
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
    },
  });
  const submitError = getAuthSubmitError(loginMutation.error, {
    ...passwordLoginAuthErrorOptions,
    unauthenticated: "用户名、邮箱或密码不正确。",
  });
  const isLocked = loginMutation.isPending || loginMutation.isSuccess;

  return (
    <form
      className={cn("space-y-3", className)}
      method="post"
      onChangeCapture={() => {
        if (loginMutation.error) {
          loginMutation.reset();
        }
      }}
      onSubmit={form.handleSubmit((values) => loginMutation.mutate(values))}
    >
      <SubmitAlert error={submitError} title="登录失败" />

      <CompactField
        autoComplete="username"
        disabled={isLocked}
        error={form.formState.errors.identifier?.message}
        id="quick-login-identifier"
        label="用户名或邮箱"
        placeholder="用户名 / student@cumt.edu.cn"
        registration={form.register("identifier")}
      />

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-semibold text-foreground" htmlFor="quick-login-password">
            密码
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            找回密码
          </Link>
        </div>
        <Input
          id="quick-login-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(form.formState.errors.password)}
          disabled={isLocked}
          placeholder="输入密码"
          className="h-10 bg-background"
          {...form.register("password")}
        />
        <FieldMeta error={form.formState.errors.password?.message} />
      </div>

      <Button type="submit" className="h-10 w-full" disabled={isLocked}>
        {loginMutation.isPending
          ? "正在登录..."
          : loginMutation.isSuccess
            ? "正在进入..."
            : "登录"}
      </Button>
    </form>
  );
}

export function QuickEmailCodeLoginForm({ className, onSuccess }: QuickAuthFormProps) {
  const queryClient = useQueryClient();
  const { setToken } = useAuthSession();
  const [resendAvailableAt, setResendAvailableAt] = useState<number | undefined>();
  const form = useForm<QuickEmailLoginValues>({
    resolver: zodResolver(emailCodeLoginSchema),
    defaultValues: {
      code: "",
      email: "",
    },
  });
  const email = useWatch({ control: form.control, name: "email" }) ?? "";
  const sendCodeMutation = useMutation({
    mutationFn: sendLoginEmailCode,
    onSuccess: (result) => setResendAvailableAt(Date.now() + result.resend_after * 1000),
  });
  const loginMutation = useMutation({
    mutationFn: loginWithEmailCode,
    onSuccess: async (result) => {
      await syncAuthenticatedSession({ queryClient, result, setToken });
      onSuccess?.();
    },
  });
  const submitError = getAuthSubmitError(loginMutation.error, {
    ...emailCodeLoginAuthErrorOptions,
    unauthenticated: "验证码无效、已过期，或该邮箱尚未绑定账号。",
  });
  const sendError = getAuthSubmitError(sendCodeMutation.error, emailCodeLoginAuthErrorOptions);
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
      className={cn("space-y-3", className)}
      method="post"
      onChangeCapture={() => {
        if (loginMutation.error) {
          loginMutation.reset();
        }

        if (sendCodeMutation.error) {
          sendCodeMutation.reset();
        }
      }}
      onSubmit={form.handleSubmit((values) => loginMutation.mutate(values))}
    >
      <SubmitAlert error={submitError} title="登录失败" />
      <SubmitAlert error={sendError} title="验证码发送失败" />

      <CompactField
        autoComplete="email"
        disabled={isLocked}
        error={form.formState.errors.email?.message}
        id="quick-login-email"
        label="矿大邮箱"
        placeholder="student@cumt.edu.cn"
        registration={form.register("email")}
        type="email"
      />
      <CompactCodeField
        codeInputProps={{
          id: "quick-login-code",
          "aria-invalid": Boolean(form.formState.errors.code),
          ...form.register("code"),
        }}
        disabled={isLocked}
        email={email}
        error={form.formState.errors.code?.message}
        isSending={sendCodeMutation.isPending}
        onSend={handleSendCode}
        resendAvailableAt={resendAvailableAt}
      />

      <Button type="submit" className="h-10 w-full" disabled={isLocked}>
        {loginMutation.isPending
          ? "正在登录..."
          : loginMutation.isSuccess
            ? "正在进入..."
            : "验证码登录"}
      </Button>
    </form>
  );
}

export function QuickRegisterForm({ className, onSuccess }: QuickAuthFormProps) {
  const queryClient = useQueryClient();
  const { setToken } = useAuthSession();
  const [step, setStep] = useState<"email" | "account">("email");
  const [resendAvailableAt, setResendAvailableAt] = useState<number | undefined>();
  const form = useForm<QuickRegisterValues>({
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
    onSuccess: (result) => setResendAvailableAt(Date.now() + result.resend_after * 1000),
  });
  const registerMutation = useMutation({
    mutationFn: (values: QuickRegisterValues) =>
      registerWithEmail({
        code: values.code,
        email: values.email,
        password: values.password,
        username: values.username,
      }),
    onSuccess: async (result) => {
      await syncAuthenticatedSession({ queryClient, result, setToken });
      onSuccess?.();
    },
  });
  const sendError = getAuthSubmitError(sendCodeMutation.error);
  const submitError = getAuthSubmitError(registerMutation.error, {
    conflict: "用户名或邮箱已被占用，请换一个再试。",
    unauthenticated: "验证码无效或已过期，请重新确认。",
  });
  const isLocked =
    sendCodeMutation.isPending || registerMutation.isPending || registerMutation.isSuccess;

  async function handleSendCode() {
    const isValid = await form.trigger("email");

    if (!isValid) {
      return;
    }

    sendCodeMutation.reset();
    sendCodeMutation.mutate({ email });
  }

  async function goAccountStep() {
    const isValid = await form.trigger(["email", "code"]);

    if (isValid) {
      setStep("account");
    }
  }

  return (
    <form
      className={cn("space-y-3", className)}
      method="post"
      onChangeCapture={() => {
        if (registerMutation.error) {
          registerMutation.reset();
        }

        if (sendCodeMutation.error) {
          sendCodeMutation.reset();
        }
      }}
      onSubmit={form.handleSubmit((values) => registerMutation.mutate(values))}
    >
      <StepHeader current={step === "email" ? 1 : 2} />
      <SubmitAlert error={submitError} title="注册失败" />
      <SubmitAlert error={sendError} title="验证码发送失败" />

      {step === "email" ? (
        <>
          <CompactField
            autoComplete="email"
            disabled={isLocked}
            error={form.formState.errors.email?.message}
            id="quick-register-email"
            label="矿大邮箱"
            placeholder="student@cumt.edu.cn"
            registration={form.register("email")}
            type="email"
          />
          <CompactCodeField
            codeInputProps={{
              id: "quick-register-code",
              "aria-invalid": Boolean(form.formState.errors.code),
              ...form.register("code"),
            }}
            disabled={isLocked}
            email={email}
            error={form.formState.errors.code?.message}
            isSending={sendCodeMutation.isPending}
            onSend={handleSendCode}
            resendAvailableAt={resendAvailableAt}
          />
          <Button type="button" className="h-10 w-full" disabled={isLocked} onClick={goAccountStep}>
            下一步
          </Button>
        </>
      ) : (
        <>
          <CompactField
            autoComplete="username"
            disabled={isLocked}
            error={form.formState.errors.username?.message}
            id="quick-register-username"
            label="用户名"
            placeholder="输入用户名"
            registration={form.register("username")}
          />
          <CompactField
            autoComplete="new-password"
            disabled={isLocked}
            error={form.formState.errors.password?.message}
            id="quick-register-password"
            label="密码"
            placeholder="设置密码"
            registration={form.register("password")}
            type="password"
          />
          <CompactField
            autoComplete="new-password"
            disabled={isLocked}
            error={form.formState.errors.confirm_password?.message}
            id="quick-register-confirm-password"
            label="确认密码"
            placeholder="再次输入密码"
            registration={form.register("confirm_password")}
            type="password"
          />
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
            <Button
              type="button"
              variant="ghost"
              className="h-10 px-3"
              disabled={isLocked}
              onClick={() => setStep("email")}
            >
              返回
            </Button>
            <Button type="submit" className="h-10" disabled={isLocked}>
              {registerMutation.isPending
                ? "正在注册..."
                : registerMutation.isSuccess
                  ? "正在进入..."
                  : "注册账号"}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}

function StepHeader({ current }: { current: 1 | 2 }) {
  return (
    <div className="grid grid-cols-2 border-y border-border text-xs font-medium">
      <div className={cn("py-2 text-center", current === 1 ? "text-primary" : "text-muted-foreground")}>
        01 验证邮箱
      </div>
      <div className={cn("border-l border-border py-2 text-center", current === 2 ? "text-primary" : "text-muted-foreground")}>
        02 账号信息
      </div>
    </div>
  );
}

function CompactField({
  disabled,
  error,
  id,
  label,
  registration,
  type = "text",
  ...inputProps
}: ComponentProps<"input"> & {
  error?: string;
  label: string;
  registration: ReturnType<ReturnType<typeof useForm>["register"]>;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-foreground" htmlFor={id}>
        {label}
      </label>
      <Input
        id={id}
        type={type}
        aria-invalid={Boolean(error)}
        disabled={disabled}
        className="h-10 bg-background"
        {...inputProps}
        {...registration}
      />
      <FieldMeta error={error} />
    </div>
  );
}

function CompactCodeField({
  codeInputProps,
  disabled,
  email,
  error,
  isSending,
  onSend,
  resendAvailableAt,
}: {
  codeInputProps: ComponentProps<"input">;
  disabled: boolean;
  email: string;
  error?: string;
  isSending: boolean;
  onSend: () => void;
  resendAvailableAt?: number;
}) {
  const [now, setNow] = useState(() => Date.now());
  const cooldown = resendAvailableAt
    ? Math.max(0, Math.ceil((resendAvailableAt - now) / 1000))
    : 0;

  useEffect(() => {
    if (!resendAvailableAt || resendAvailableAt <= now) {
      return;
    }

    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, [now, resendAvailableAt]);

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-foreground" htmlFor={codeInputProps.id}>
        邮箱验证码
      </label>
      <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2">
        <Input
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="6 位验证码"
          className="h-10 bg-background"
          disabled={disabled}
          {...codeInputProps}
        />
        <Button
          type="button"
          variant="secondary"
          className="h-10 px-2 text-xs"
          disabled={disabled || isSending || cooldown > 0 || !email.trim()}
          onClick={onSend}
        >
          {isSending ? "发送中" : cooldown > 0 ? `${cooldown}s` : "发送验证码"}
        </Button>
      </div>
      <FieldMeta error={error} />
    </div>
  );
}

function SubmitAlert({ error, title }: { error: string | null; title: string }) {
  if (!error) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}

function FieldMeta({ error }: { error?: string }) {
  if (!error) {
    return null;
  }

  return <p className="text-xs text-destructive">{error}</p>;
}
