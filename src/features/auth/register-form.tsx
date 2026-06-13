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

import { register } from "./api";
import { useAuthSession } from "./auth-session";
import { authQueryKeys } from "./query-keys";

const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/;
const MAX_PASSWORD_BYTES = 256;

const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "用户名至少 3 位。")
    .max(32, "用户名最多 32 位。")
    .regex(USERNAME_PATTERN, "用户名只能使用字母、数字和下划线。")
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(8, "密码至少 8 位。")
    .refine(
      (value) => new TextEncoder().encode(value).length <= MAX_PASSWORD_BYTES,
      "密码最多 256 bytes。",
    ),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

type RegisterFormProps = {
  className?: string;
  onSuccess?: () => void;
};

export function RegisterForm({ className, onSuccess }: RegisterFormProps) {
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
      onSuccess?.();
      router.push("/settings/profile");
    },
  });

  const submitError = getSubmitError(registerMutation.error);
  const isLocked = registerMutation.isPending || registerMutation.isSuccess;
  const statusText = registerMutation.isSuccess
    ? "账号已创建，正在进入资料设置。"
    : form.formState.isDirty
      ? "确认信息后创建账号。"
      : "创建后先完善公开资料。";

  return (
    <form
      className={cn("space-y-0", className)}
      method="post"
      onSubmit={form.handleSubmit((values) => registerMutation.mutate(values))}
    >
      {submitError ? (
        <Alert variant="destructive" className="mb-5">
          <AlertTitle>注册失败</AlertTitle>
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="border-b border-border py-4">
        <FieldLabel htmlFor="register-username" title="用户名" />
        <div className="min-w-0 space-y-2">
          <Input
            id="register-username"
            autoComplete="username"
            aria-invalid={Boolean(form.formState.errors.username)}
            disabled={isLocked}
            placeholder="输入用户名"
            className="h-11 rounded-none border-x-0 border-t-0 border-border bg-transparent px-0 text-base font-semibold focus-visible:ring-0"
            {...form.register("username")}
          />
          <FieldMeta
            error={form.formState.errors.username?.message}
            hint="3-32 位，支持字母、数字和下划线；注册时会统一转为小写。"
          />
        </div>
      </div>

      <div className="border-b border-border py-4">
        <FieldLabel htmlFor="register-password" title="密码" />
        <div className="min-w-0 space-y-2">
          <Input
            id="register-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(form.formState.errors.password)}
            disabled={isLocked}
            placeholder="设置密码"
            className="h-11 rounded-none border-x-0 border-t-0 border-border bg-transparent px-0 text-base focus-visible:ring-0"
            {...form.register("password")}
          />
          <FieldMeta
            error={form.formState.errors.password?.message}
            hint="至少 8 位，最多 256 bytes；建议混合数字、字母和符号。"
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

function getSubmitError(error: Error | null) {
  if (!error) {
    return null;
  }

  if (error instanceof ApiError) {
    if (error.status === 409) {
      return "用户名已被占用，请换一个用户名。";
    }

    return error.message;
  }

  return "请求失败，请稍后重试。";
}
