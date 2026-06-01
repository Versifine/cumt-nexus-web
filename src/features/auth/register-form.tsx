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

import { register } from "./api";
import { useAuthSession } from "./auth-session";
import { authQueryKeys } from "./query-keys";

const registerSchema = z.object({
  username: z.string().trim().min(1, "请输入用户名。"),
  password: z.string().min(1, "请输入密码。"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setToken } = useAuthSession();
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: (result) => {
      setToken(result.access_token);
      queryClient.setQueryData(authQueryKeys.me(), result.user);
      router.push("/");
    },
  });

  const submitError = getSubmitError(registerMutation.error);

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit((values) => registerMutation.mutate(values))}
    >
      {submitError ? (
        <Alert variant="destructive">
          <AlertTitle>注册失败</AlertTitle>
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
          disabled={registerMutation.isPending}
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
          autoComplete="new-password"
          aria-invalid={Boolean(form.formState.errors.password)}
          disabled={registerMutation.isPending}
          placeholder="设置密码"
          {...form.register("password")}
        />
        {form.formState.errors.password ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.password.message}
          </p>
        ) : null}
      </div>

      <Button className="w-full" type="submit" disabled={registerMutation.isPending}>
        {registerMutation.isPending ? "正在注册..." : "注册账号"}
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
