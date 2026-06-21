"use client";

import { FormEvent, useState } from "react";
import {
  Check,
  EyeOff,
  MessageCircle,
  Save,
  ShieldAlert,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import { TextAction } from "@/components/ui/text-action";
import { useAuthSession } from "@/features/auth/auth-session";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import {
  useMessagePrivacyMutation,
  useMessagePrivacyQuery,
} from "./queries";
import type { MessagePrivacyAllow } from "./types";

const allowOptions: Array<{
  description: string;
  icon: LucideIcon;
  label: string;
  value: MessagePrivacyAllow;
}> = [
  {
    description: "互关用户直接进入普通会话，非互关进入陌生人请求。",
    icon: Users,
    label: "所有人可发起",
    value: "everyone",
  },
  {
    description: "只有互关用户可以发起私信，其他用户会被隐私设置拦截。",
    icon: UserCheck,
    label: "仅互关",
    value: "mutuals",
  },
  {
    description: "不接收新的私信发起，已有会话是否可发由当前会话状态决定。",
    icon: EyeOff,
    label: "不接收",
    value: "none",
  },
];

export function MessagePrivacySettingsPage() {
  const { isReady, token } = useAuthSession();
  const canLoad = isReady && Boolean(token);
  const privacyQuery = useMessagePrivacyQuery(canLoad);
  const privacyMutation = useMessagePrivacyMutation();
  const [draftAllowMessages, setDraftAllowMessages] =
    useState<MessagePrivacyAllow | null>(null);
  const [draftOnlineStatusEnabled, setDraftOnlineStatusEnabled] =
    useState<boolean | null>(null);
  const allowMessages =
    draftAllowMessages ?? privacyQuery.data?.allow_messages ?? "everyone";
  const onlineStatusEnabled =
    draftOnlineStatusEnabled ??
    privacyQuery.data?.online_status_enabled ??
    false;
  const isDirty = Boolean(
    privacyQuery.data &&
      (allowMessages !== privacyQuery.data.allow_messages ||
        onlineStatusEnabled !== privacyQuery.data.online_status_enabled),
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    privacyMutation.mutate({
      allow_messages: allowMessages,
      online_status_enabled: onlineStatusEnabled,
    });
  }

  if (!isReady) {
    return (
      <div className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-4 lg:px-0">
        <LoadingState rows={4} />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="mx-auto w-full max-w-5xl px-3 py-6 sm:px-4 lg:px-0">
        <EmptyState
          title="登录后管理私信设置"
          description="私信权限和在线状态设置需要登录后同步。"
          action={
            <TextAction href="/login?next=%2Fsettings%2Fprivacy">
              去登录
            </TextAction>
          }
        />
      </div>
    );
  }

  if (privacyQuery.isPending) {
    return (
      <div className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-4 lg:px-0">
        <LoadingState rows={5} />
      </div>
    );
  }

  if (privacyQuery.isError) {
    return (
      <div className="mx-auto w-full max-w-5xl px-3 py-6 sm:px-4 lg:px-0">
        <ErrorState
          title="隐私设置暂时无法加载"
          description={getErrorMessage(privacyQuery.error)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl py-2 sm:px-4 sm:py-4 lg:px-0">
      <div className="grid min-h-[calc(100vh-104px)] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-lg bg-surface px-4 py-5">
            <TextAction href="/messages" direction="back">
              私信
            </TextAction>
            <div className="mt-6">
              <p className="font-mono text-xs font-semibold text-primary">
                隐私设置
              </p>
              <h1 className="mt-2 text-2xl font-semibold leading-8 text-foreground">
                隐私与私信
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                控制谁可以发起私信，以及互关会话是否展示在线状态。
              </p>
            </div>

            <div className="mt-6 grid gap-2">
              <SettingStat
                label="私信权限"
                value={formatAllowLabel(allowMessages)}
              />
              <SettingStat
                label="在线状态"
                value={onlineStatusEnabled ? "互关可见" : "关闭"}
              />
            </div>
          </aside>

          <form className="flex min-w-0 flex-col overflow-hidden rounded-lg bg-surface" onSubmit={submit}>
            <main className="min-w-0 flex-1 space-y-4 px-4 py-5 sm:px-5">
              <SettingSection
                description="陌生人请求未接受前不能连续追发，拉黑后双方不能继续发送。"
                icon={ShieldAlert}
                title="谁可以发起私信"
              >
                <div className="grid gap-2">
                  {allowOptions.map((option) => (
                    <PermissionOption
                      key={option.value}
                      checked={allowMessages === option.value}
                      description={option.description}
                      icon={option.icon}
                      label={option.label}
                      name="allow_messages"
                      onChange={() => setDraftAllowMessages(option.value)}
                      value={option.value}
                    />
                  ))}
                </div>
              </SettingSection>

              <SettingSection
                description="默认关闭。开启后也只对互关用户展示；关闭后你也不能查看对方在线状态。"
                icon={MessageCircle}
                title="在线状态"
              >
                <label className="flex cursor-pointer items-center justify-between gap-4 rounded-md bg-background px-3 py-4">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">
                      展示在线状态
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                      仅在互关且双方允许时显示。
                    </span>
                  </span>
                  <span
                    className={cn(
                      "inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-border bg-background-soft p-0.5 transition-colors",
                      onlineStatusEnabled ? "border-primary bg-primary/20" : "",
                    )}
                  >
                    <span
                      className={cn(
                        "size-5 rounded-full bg-muted-foreground/50 transition-transform",
                        onlineStatusEnabled
                          ? "translate-x-5 bg-primary"
                          : "translate-x-0",
                      )}
                    />
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={onlineStatusEnabled}
                      onChange={(event) =>
                        setDraftOnlineStatusEnabled(event.target.checked)
                      }
                    />
                  </span>
                </label>
              </SettingSection>
            </main>

            <footer className="bg-surface-raised px-4 py-4 sm:px-5">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  {privacyMutation.isError ? (
                    <p className="text-sm leading-6 text-destructive">
                      {getErrorMessage(privacyMutation.error)}
                    </p>
                  ) : privacyMutation.isSuccess ? (
                    <p className="inline-flex items-center gap-2 text-sm text-primary">
                      <Check className="size-4" aria-hidden="true" />
                      设置已保存
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      设置会影响新的会话发起和在线状态展示。
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={privacyMutation.isPending || !isDirty}
                >
                  <Save className="size-4" aria-hidden="true" />
                  保存
                </Button>
              </div>
            </footer>
          </form>
      </div>
    </div>
  );
}

function PermissionOption({
  checked,
  description,
  icon: Icon,
  label,
  name,
  onChange,
  value,
}: {
  checked: boolean;
  description: string;
  icon: LucideIcon;
  label: string;
  name: string;
  onChange: () => void;
  value: MessagePrivacyAllow;
}) {
  return (
    <label
      className={cn(
        "grid cursor-pointer grid-cols-[32px_minmax(0,1fr)_24px] gap-3 rounded-md bg-background px-3 py-4 transition-colors hover:bg-surface-hover",
        checked ? "bg-primary/10" : "",
      )}
    >
      <span
        className={cn(
          "mt-0.5 inline-flex size-8 items-center justify-center rounded-full border",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background-soft text-muted-foreground",
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">
          {label}
        </span>
        <span className="mt-1 block text-sm leading-6 text-muted-foreground">
          {description}
        </span>
      </span>
      <span
        className={cn(
          "mt-1 flex size-5 items-center justify-center rounded-full border",
          checked ? "border-primary bg-primary" : "border-border",
        )}
      >
        {checked ? (
          <Check className="size-3 text-primary-foreground" aria-hidden="true" />
        ) : null}
        <input
          type="radio"
          name={name}
          value={value}
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
      </span>
    </label>
  );
}

function SettingSection({
  children,
  className,
  description,
  icon: Icon,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  description: string;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <section className={cn("rounded-lg bg-surface-raised px-4 py-4", className)}>
      <div className="mb-3 flex items-start gap-3">
        <span className="inline-flex size-9 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function SettingStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-surface-raised px-3 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

function formatAllowLabel(value: MessagePrivacyAllow) {
  switch (value) {
    case "mutuals":
      return "仅互关";
    case "none":
      return "不接收";
    case "everyone":
    default:
      return "所有人";
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}
