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

import { login } from "./api";
import { useAuthSession } from "./auth-session";
import { authQueryKeys } from "./query-keys";

const loginSchema = z.object({
  username: z.string().trim().min(1, "请输入用户名。"),
  password: z.string().min(1, "请输入密码。"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
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
      router.push("/");
    },
  });

  const submitError = getSubmitError(loginMutation.error);

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((values) => loginMutation.mutate(values))}
    >
      {submitError ? (
        <Alert variant="destructive">
          <AlertTitle>登录失败</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="username">
          用户名
        </label>
        <Input
          id="username"
          autoComplete="username"
          aria-invalid={Boolean(form.formState.errors.username)}
          disabled={loginMutation.isPending}
          placeholder="zhangsan"
          {...form.register("username")}
        />
        {form.formState.errors.username ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.username.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">
          密码
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(form.formState.errors.password)}
          disabled={loginMutation.isPending}
          placeholder="输入密码"
          {...form.register("password")}
        />
        {form.formState.errors.password ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.password.message}
          </p>
        ) : null}
      </div>

      <Button className="w-full" type="submit" disabled={loginMutation.isPending}>
        {loginMutation.isPending ? "正在登录..." : "登录"}
      </Button>
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

  return "请求失败，请稍后重试。";
}
