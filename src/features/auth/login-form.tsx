"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import { login } from "./api";
import { useAuthSession } from "./auth-session";
import { authQueryKeys } from "./query-keys";
import { getSafeAuthRedirectPath } from "./redirect";

const loginSchema = z.object({
  username: z.string().trim().min(1, "请输入用户名。"),
  password: z.string().min(1, "请输入密码。"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

type LoginFormProps = {
  className?: string;
  onSuccess?: () => void;
  redirectTo?: string;
};

export function LoginForm({ className, onSuccess, redirectTo }: LoginFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setToken } = useAuthSession();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (result) => {
      setToken(result.access_token);
      queryClient.setQueryData(authQueryKeys.me(), result.user);
      onSuccess?.();
      router.push(redirectTo ?? getSafeNextPath());
    },
  });

  const submitError = getSubmitError(loginMutation.error);
  const isLocked = loginMutation.isPending || loginMutation.isSuccess;
  const statusText = loginMutation.isSuccess
    ? "验证通过，正在进入。"
    : form.formState.isDirty
      ? "确认信息后登录。"
      : "输入账号信息后登录。";

  return (
    <form
      className={cn("space-y-0", className)}
      method="post"
      onSubmit={form.handleSubmit((values) => loginMutation.mutate(values))}
    >
      {submitError ? (
        <Alert variant="destructive" className="mb-5">
          <AlertTitle>登录失败</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="border-b border-border py-4">
        <FieldLabel htmlFor="login-username" title="用户名" />
        <div className="min-w-0 space-y-2">
          <Input
            id="login-username"
            autoComplete="username"
            aria-invalid={Boolean(form.formState.errors.username)}
            disabled={isLocked}
            placeholder="输入用户名"
            className="h-11 rounded-none border-x-0 border-t-0 border-border bg-transparent px-0 text-base font-semibold focus-visible:ring-0"
            {...form.register("username")}
          />
          <FieldMeta
            error={form.formState.errors.username?.message}
            hint="使用注册时设置的用户名。"
          />
        </div>
      </div>

      <div className="border-b border-border py-4">
        <FieldLabel htmlFor="login-password" title="密码" />
        <div className="min-w-0 space-y-2">
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(form.formState.errors.password)}
            disabled={isLocked}
            placeholder="输入密码"
            className="h-11 rounded-none border-x-0 border-t-0 border-border bg-transparent px-0 text-base focus-visible:ring-0"
            {...form.register("password")}
          />
          <FieldMeta
            error={form.formState.errors.password?.message}
            hint="密码不会在页面中明文展示。"
          />
        </div>
      </div>

      <div className="space-y-3 py-4">
        <Button type="submit" className="w-full" disabled={isLocked}>
          {loginMutation.isPending
            ? "正在登录..."
            : loginMutation.isSuccess
              ? "正在进入..."
              : "登录"}
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

function getSubmitError(error: Error | null) {
  if (!error) {
    return null;
  }

  if (error instanceof ApiError) {
    if (error.status === 401) {
      return "用户名或密码不正确，请检查后重试。";
    }

    return error.message;
  }

  return "请求失败，请稍后重试。";
}

function getSafeNextPath() {
  if (typeof window === "undefined") {
    return "/";
  }

  return getSafeAuthRedirectPath(window.location.search);
}
