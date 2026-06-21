"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch, type UseFormRegisterReturn } from "react-hook-form";
import { z } from "zod";

import { InlineFeedback } from "@/components/feedback/inline-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfoRow } from "@/components/ui/data-display";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TextAction } from "@/components/ui/text-action";
import { cn } from "@/lib/utils";

import {
  changeEmail,
  changePassword,
  deleteAccount,
  logoutAll,
  sendChangeEmailCode,
  sendDeleteAccountCode,
} from "./api";
import { getAuthSubmitError } from "./auth-error";
import { AuthRequired } from "./auth-required";
import { useAuthSession } from "./auth-session";
import { EmailCodeField } from "./email-code-field";
import { authQueryKeys } from "./query-keys";
import { useAuthSecurityQuery } from "./queries";
import { changeEmailSchema, changePasswordSchema, deleteAccountSchema } from "./schemas";

type ChangeEmailValues = z.infer<typeof changeEmailSchema>;
type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
type DeleteAccountValues = z.infer<typeof deleteAccountSchema>;

export function AccountSecurityPage() {
  return (
    <AuthRequired
      title="需要登录后管理账号安全"
      description="登录后可以查看邮箱验证状态、修改绑定邮箱、修改密码和退出所有会话。"
    >
      <AccountSecurityContent />
    </AuthRequired>
  );
}

function AccountSecurityContent() {
  const securityQuery = useAuthSecurityQuery();

  if (securityQuery.isLoading) {
    return (
      <section className="space-y-3 rounded-lg bg-surface px-4 py-5 sm:px-5" aria-label="正在加载账号安全">
        <div className="h-4 w-32 animate-pulse bg-muted" />
        <div className="h-6 w-56 max-w-full animate-pulse bg-muted" />
        <div className="h-4 w-80 max-w-full animate-pulse bg-muted" />
      </section>
    );
  }

  if (securityQuery.isError || !securityQuery.data) {
    return (
      <section className="rounded-lg bg-surface px-4 py-5 sm:px-5">
        <InlineFeedback
          title="无法读取账号安全信息"
          description="请重试当前请求，或重新登录后再打开账号安全。"
        />
        <div className="mt-4">
          <Button type="button" onClick={() => securityQuery.refetch()}>
            重试
          </Button>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-4 py-2">
      <SecurityOverview data={securityQuery.data} />
      <ChangeEmailForm currentEmail={securityQuery.data.email} />
      <ChangePasswordForm />
      <LogoutAllPanel />
      <DeleteAccountPanel currentEmail={securityQuery.data.email} />
    </div>
  );
}

function SecurityOverview({
  data,
}: {
  data: {
    email: string;
    email_verified: boolean;
    email_verified_at: string | null;
    password_set: boolean;
    last_login_at: string | null;
  };
}) {
  return (
    <section className="rounded-lg bg-surface px-4 py-5 sm:px-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={data.email_verified ? "success" : "warning"}>
          {data.email_verified ? "邮箱已验证" : "邮箱未验证"}
        </Badge>
        <Badge variant={data.password_set ? "secondary" : "warning"}>
          {data.password_set ? "已设置密码" : "未设置密码"}
        </Badge>
      </div>
      <h2 className="mt-4 text-base font-semibold leading-6 tracking-normal">
        账号安全
      </h2>
      <dl className="mt-4 divide-y divide-border rounded-md bg-surface-raised px-3 text-sm">
        <InfoRow label="绑定邮箱" value={data.email || "未绑定"} />
        <InfoRow
          label="邮箱验证时间"
          value={data.email_verified_at ? formatDate(data.email_verified_at) : "未验证"}
        />
        <InfoRow
          label="最近登录"
          value={data.last_login_at ? formatDate(data.last_login_at) : "暂无记录"}
        />
      </dl>
      <div className="mt-4 grid overflow-hidden rounded-md bg-surface-raised sm:grid-cols-3">
        <TextAction href="#password" tone="primary" variant="bar">
          修改密码
        </TextAction>
        <TextAction href="#email" variant="bar">
          修改邮箱
        </TextAction>
        <TextAction href="#delete-account" variant="bar">
          注销账号
        </TextAction>
      </div>
    </section>
  );
}

function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const queryClient = useQueryClient();
  const [resendAvailableAt, setResendAvailableAt] = useState<number | undefined>();
  const form = useForm<ChangeEmailValues>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: {
      code: "",
      new_email: "",
    },
  });
  const sendCodeMutation = useMutation({
    mutationFn: sendChangeEmailCode,
    onSuccess: (result) => setResendAvailableAt(Date.now() + result.resend_after * 1000),
  });
  const changeMutation = useMutation({
    mutationFn: changeEmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authQueryKeys.security() });
      queryClient.invalidateQueries({ queryKey: authQueryKeys.me() });
      form.reset({ code: "", new_email: "" });
    },
  });
  const isLocked = sendCodeMutation.isPending || changeMutation.isPending;
  const newEmail = useWatch({ control: form.control, name: "new_email" }) ?? "";
  const sendError = getAuthSubmitError(sendCodeMutation.error);
  const submitError = getAuthSubmitError(changeMutation.error, {
    conflict: "这个邮箱已绑定其他账号。",
    unauthenticated: "验证码无效或已过期，请重新确认。",
  });

  async function handleSendCode() {
    const isValid = await form.trigger("new_email");

    if (!isValid) {
      return;
    }

    sendCodeMutation.reset();
    sendCodeMutation.mutate({ new_email: newEmail });
  }

  return (
    <form
      id="email"
      className="rounded-lg bg-surface px-4 py-5 sm:px-5"
      method="post"
      onChangeCapture={() => {
        if (changeMutation.error) {
          changeMutation.reset();
        }

        if (sendCodeMutation.error) {
          sendCodeMutation.reset();
        }
      }}
      onSubmit={form.handleSubmit((values) => {
        if (changeMutation.error) {
          changeMutation.reset();
        }

        changeMutation.mutate(values);
      })}
    >
      <p className="font-mono text-xs text-primary">邮箱绑定</p>
      <h2 className="mt-3 text-base font-semibold leading-6 tracking-normal">
        修改绑定邮箱
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        当前邮箱：{currentEmail || "未绑定"}。新邮箱必须通过后端配置的矿大邮箱域名白名单。
      </p>
      {sendError ? <InlineAlert title="验证码发送失败" detail={sendError} /> : null}
      {submitError ? <InlineAlert title="邮箱修改失败" detail={submitError} /> : null}
      {changeMutation.isSuccess ? (
        <InlineAlert title="邮箱已更新" detail="新的邮箱已验证并绑定到当前账号。" />
      ) : null}
      <div className="mt-4 rounded-md bg-surface-raised px-3 py-4">
        <label className="text-sm font-semibold text-foreground" htmlFor="security-email">
          新邮箱
        </label>
        <Input
          id="security-email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(form.formState.errors.new_email)}
          disabled={isLocked}
          placeholder="new@cumt.edu.cn"
          className="mt-2 h-11 border-border bg-background text-base"
          {...form.register("new_email")}
        />
        <FieldMeta
          error={form.formState.errors.new_email?.message}
          hint="验证码会发送到新的绑定邮箱。"
        />
      </div>
      <EmailCodeField
        email={newEmail}
        disabled={isLocked}
        isSending={sendCodeMutation.isPending}
        onSend={handleSendCode}
        resendAvailableAt={resendAvailableAt}
        error={form.formState.errors.code?.message}
        codeInputProps={{
          id: "security-email-code",
          "aria-invalid": Boolean(form.formState.errors.code),
          ...form.register("code"),
        }}
      />
      <div className="pt-4">
        <Button type="submit" disabled={isLocked}>
          {changeMutation.isPending ? "正在保存..." : "保存邮箱"}
        </Button>
      </div>
    </form>
  );
}

function ChangePasswordForm() {
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
    },
  });
  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => form.reset({ current_password: "", new_password: "" }),
  });
  const submitError = getAuthSubmitError(mutation.error, {
    unauthenticated: "当前密码不正确，请检查后重试。",
  });

  return (
    <form
      id="password"
      className="rounded-lg bg-surface px-4 py-5 sm:px-5"
      method="post"
      onChangeCapture={() => {
        if (mutation.error) {
          mutation.reset();
        }
      }}
      onSubmit={form.handleSubmit((values) => {
        if (mutation.error) {
          mutation.reset();
        }

        mutation.mutate(values);
      })}
    >
      <p className="font-mono text-xs text-primary">密码</p>
      <h2 className="mt-3 text-base font-semibold leading-6 tracking-normal">
        修改密码
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        修改后其他会话会按后端 token 失效机制处理。
      </p>
      {submitError ? <InlineAlert title="密码修改失败" detail={submitError} /> : null}
      {mutation.isSuccess ? (
        <InlineAlert title="密码已更新" detail="下次登录请使用新密码。" />
      ) : null}
      <PasswordField
        id="current-password"
        label="当前密码"
        autoComplete="current-password"
        disabled={mutation.isPending}
        error={form.formState.errors.current_password?.message}
        hint="用于确认当前账号身份。"
        registration={form.register("current_password")}
      />
      <PasswordField
        id="new-password"
        label="新密码"
        autoComplete="new-password"
        disabled={mutation.isPending}
        error={form.formState.errors.new_password?.message}
        hint="至少 8 位，最多 256 bytes。"
        registration={form.register("new_password")}
      />
      <div className="pt-4">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "正在保存..." : "保存密码"}
        </Button>
      </div>
    </form>
  );
}

function LogoutAllPanel() {
  const { clearSession } = useAuthSession();
  const mutation = useMutation({
    mutationFn: logoutAll,
    onSuccess: () => clearSession(),
  });
  const submitError = getAuthSubmitError(mutation.error);

  return (
    <section className="rounded-lg bg-surface px-4 py-5 sm:px-5">
      <p className="font-mono text-xs text-destructive">会话</p>
      <h2 className="mt-3 text-base font-semibold leading-6 tracking-normal">
        退出所有会话
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        成功后旧 access token 后续会失效，当前浏览器也会清理本地登录态。
      </p>
      {submitError ? <InlineAlert title="退出失败" detail={submitError} /> : null}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          type="button"
          variant="destructive"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "正在退出..." : "退出所有会话"}
        </Button>
        <TextAction href="/settings/profile">返回资料设置</TextAction>
      </div>
    </section>
  );
}

function DeleteAccountPanel({ currentEmail }: { currentEmail: string }) {
  const router = useRouter();
  const { clearSession } = useAuthSession();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState<number | undefined>();
  const form = useForm<DeleteAccountValues>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: {
      code: "",
      confirmation: "" as DeleteAccountValues["confirmation"],
      current_password: "",
      email: currentEmail,
    },
  });
  const email = useWatch({ control: form.control, name: "email" }) ?? currentEmail;
  const sendCodeMutation = useMutation({
    mutationFn: sendDeleteAccountCode,
    onSuccess: (result) => setResendAvailableAt(Date.now() + result.resend_after * 1000),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      setConfirmOpen(false);
      clearSession();
      router.push("/");
      router.refresh();
    },
  });
  const isLocked = sendCodeMutation.isPending || deleteMutation.isPending || deleteMutation.isSuccess;
  const sendError = getAuthSubmitError(sendCodeMutation.error);
  const submitError = getAuthSubmitError(deleteMutation.error, {
    invalidArgument: "请先输入当前密码或 6 位邮箱验证码，并确认 DELETE 已填写正确。",
    unauthenticated: "当前密码或验证码不正确，请检查后重试。",
  });

  async function handleSendCode() {
    const isValid = await form.trigger("email");

    if (!isValid) {
      return;
    }

    sendCodeMutation.reset();
    sendCodeMutation.mutate({ email });
  }

  async function handleSubmit() {
    const isValid = await form.trigger();

    if (!isValid) {
      return;
    }

    if (deleteMutation.error) {
      deleteMutation.reset();
    }

    setConfirmOpen(true);
  }

  function handleConfirmDelete() {
    if (deleteMutation.isPending) {
      return;
    }

    const values = form.getValues();
    const code = values.code.trim();
    const currentPassword = values.current_password.trim();

    deleteMutation.reset();
    deleteMutation.mutate({
      code: code || undefined,
      confirmation: values.confirmation,
      current_password: currentPassword ? values.current_password : undefined,
    });
  }

  return (
    <>
      <form
        id="delete-account"
        className="rounded-lg bg-surface px-4 py-5 ring-1 ring-destructive/25 sm:px-5"
        method="post"
        onChangeCapture={() => {
          if (deleteMutation.error) {
            deleteMutation.reset();
          }

          if (sendCodeMutation.error) {
            sendCodeMutation.reset();
          }
        }}
        onSubmit={form.handleSubmit(handleSubmit)}
      >
        <p className="font-mono text-xs text-destructive">危险区</p>
        <h2 className="mt-3 text-base font-semibold leading-6 tracking-normal">
          注销账号
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          注销后账号会被软删除，公开主页和用户搜索不再返回该用户，所有 token 立即失效。原用户名和邮箱会释放，可用于重新注册。当前密码和邮箱验证码二选一即可。
        </p>
        {sendError ? <InlineAlert title="验证码发送失败" detail={sendError} /> : null}
        {submitError ? <InlineAlert title="注销失败" detail={submitError} /> : null}

        <div className="mt-4 rounded-md bg-surface-raised px-3 py-4">
          <label className="text-sm font-semibold text-foreground" htmlFor="delete-account-email">
            当前邮箱
          </label>
          <Input
            id="delete-account-email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(form.formState.errors.email)}
            disabled={isLocked}
            className="mt-2 h-11 border-border bg-background text-base"
            {...form.register("email")}
          />
          <FieldMeta
            error={form.formState.errors.email?.message}
            hint="验证码只会发送到当前账号已验证邮箱。"
          />
        </div>

        <EmailCodeField
          email={email}
          disabled={isLocked}
          isSending={sendCodeMutation.isPending}
          onSend={handleSendCode}
          resendAvailableAt={resendAvailableAt}
          error={form.formState.errors.code?.message}
          hint="可用邮箱验证码代替当前密码；验证码用途为注销账号，请不要转发给他人。"
          codeInputProps={{
            id: "delete-account-code",
            "aria-invalid": Boolean(form.formState.errors.code),
            ...form.register("code"),
          }}
        />

        <PasswordField
          id="delete-current-password"
          label="当前密码"
          autoComplete="current-password"
          disabled={isLocked}
          error={form.formState.errors.current_password?.message}
          hint="可用当前密码代替邮箱验证码。"
          registration={form.register("current_password")}
        />

        <div className="mt-4 rounded-md bg-surface-raised px-3 py-4">
          <label className="text-sm font-semibold text-foreground" htmlFor="delete-confirmation">
            确认文本
          </label>
          <Input
            id="delete-confirmation"
            autoComplete="off"
            aria-invalid={Boolean(form.formState.errors.confirmation)}
            disabled={isLocked}
            placeholder="输入 DELETE"
            className="mt-2 h-11 border-border bg-background font-mono text-base"
            {...form.register("confirmation")}
          />
          <FieldMeta
            error={form.formState.errors.confirmation?.message}
            hint="必须输入 DELETE，避免误操作。"
          />
        </div>

        <div className="pt-4">
          <Button type="submit" variant="destructive" disabled={isLocked}>
            {deleteMutation.isPending ? "正在注销..." : "注销账号"}
          </Button>
        </div>
      </form>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>确认注销账号</DialogTitle>
            <DialogDescription>
              这个操作会软删除当前账号、清理公开资料并让所有登录会话失效。历史内容和审计记录会按后端合同保留。
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-surface-raised px-3 py-4 text-sm leading-6 text-muted-foreground">
            注销后原用户名和邮箱会释放，可用于重新注册。确认继续后，当前浏览器也会退出登录。
          </div>
          {submitError ? <InlineAlert title="注销失败" detail={submitError} /> : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              disabled={deleteMutation.isPending}
              onClick={() => setConfirmOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={handleConfirmDelete}
            >
              {deleteMutation.isPending ? "正在注销..." : "确认注销"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PasswordField({
  autoComplete,
  disabled,
  error,
  hint,
  id,
  label,
  registration,
}: {
  autoComplete: string;
  disabled: boolean;
  error?: string;
  hint: string;
  id: string;
  label: string;
  registration: UseFormRegisterReturn;
}) {
  return (
    <div className="mt-4 rounded-md bg-surface-raised px-3 py-4">
      <label className="text-sm font-semibold text-foreground" htmlFor={id}>
        {label}
      </label>
      <Input
        id={id}
        type="password"
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        disabled={disabled}
        placeholder={label}
        className="mt-2 h-11 border-border bg-background text-base"
        {...registration}
      />
      <FieldMeta error={error} hint={hint} />
    </div>
  );
}

function InlineAlert({ detail, title }: { detail: string; title: string }) {
  return <InlineFeedback className="mt-4" title={title} description={detail} />;
}

function FieldMeta({
  error,
  hint,
}: {
  error?: string;
  hint: string;
}) {
  return (
    <p className={cn("mt-2 text-xs", error ? "text-destructive" : "text-muted-foreground")}>
      {error ?? hint}
    </p>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
