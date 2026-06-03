"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
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
};

export function LoginForm({ className }: LoginFormProps) {
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
      router.push(getSafeNextPath());
    },
  });

  const usernameValue = useWatch({ control: form.control, name: "username" }) ?? "";
  const passwordValue = useWatch({ control: form.control, name: "password" }) ?? "";
  const submitError = getSubmitError(loginMutation.error);
  const isLocked = loginMutation.isPending || loginMutation.isSuccess;
  const statusText = loginMutation.isSuccess
    ? "验证通过，正在进入首页。"
    : form.formState.isDirty
      ? "表单已修改，提交前会先校验。"
      : "输入账号信息后即可登录。";

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

      <div className="grid gap-4 border-b border-border py-5 md:grid-cols-[128px_minmax(0,1fr)]">
        <FieldLabel
          description="使用注册时设置的用户名。"
          htmlFor="login-username"
          index="01"
          title="用户名"
        />
        <div className="min-w-0 space-y-2">
          <Input
            id="login-username"
            autoComplete="username"
            aria-invalid={Boolean(form.formState.errors.username)}
            disabled={isLocked}
            placeholder="输入用户名"
            className="h-12 border-border bg-background text-base font-semibold"
            {...form.register("username")}
          />
          <FieldMeta
            detail={`已输入 ${usernameValue.trim().length} 字`}
            error={form.formState.errors.username?.message}
            hint="用户名区分你在社区中的身份。"
          />
        </div>
      </div>

      <div className="grid gap-4 border-b border-border py-5 md:grid-cols-[128px_minmax(0,1fr)]">
        <FieldLabel
          description="密码只用于本次验证，不会在页面中明文展示。"
          htmlFor="login-password"
          index="02"
          title="密码"
        />
        <div className="min-w-0 space-y-2">
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(form.formState.errors.password)}
            disabled={isLocked}
            placeholder="输入密码"
            className="h-12 border-border bg-background text-base"
            {...form.register("password")}
          />
          <FieldMeta
            detail={`已输入 ${passwordValue.length} 位`}
            error={form.formState.errors.password?.message}
            hint="如果登录失败，请先检查用户名和密码。"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">{statusText}</div>
        <Button type="submit" disabled={isLocked}>
          {loginMutation.isPending
            ? "正在登录..."
            : loginMutation.isSuccess
              ? "正在进入..."
              : "登录"}
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
      <p className="mt-2 hidden text-sm leading-6 text-muted-foreground sm:block">
        {description}
      </p>
    </div>
  );
}

function FieldMeta({
  detail,
  error,
  hint,
}: {
  detail: string;
  error?: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
      <p className={error ? "text-destructive" : "text-muted-foreground"}>
        {error ?? hint}
      </p>
      <span
        className={cn(
          "hidden font-mono text-muted-foreground sm:inline",
          error && "text-destructive",
        )}
      >
        {detail}
      </span>
    </div>
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
