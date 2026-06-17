"use client";

import { useId, useState } from "react";
import { Search, UserRound, X } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StatusToken } from "@/components/ui/data-display";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import { formatAdminUserStatus, getAdminUserStatusTone } from "./display";
import { useAdminUsersQuery } from "./queries";
import type { AdminUser } from "./types";

type AdminUserPickerProps = {
  className?: string;
  disabled?: boolean;
  label: string;
  onChange: (user: AdminUser | null) => void;
  placeholder?: string;
  value: AdminUser | null;
};

export function AdminUserPicker({
  className,
  disabled = false,
  label,
  onChange,
  placeholder = "搜索用户名或昵称",
  value,
}: AdminUserPickerProps) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const searchQuery = query.trim();
  const usersQuery = useAdminUsersQuery(
    {
      limit: 6,
      offset: 0,
      q: searchQuery,
      status: "active",
    },
    Boolean(searchQuery),
  );
  const users = usersQuery.data?.users ?? [];

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-xs font-semibold text-foreground" htmlFor={inputId}>
        {label}
      </label>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <div className="relative min-w-0">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id={inputId}
            value={query}
            disabled={disabled}
            placeholder={placeholder}
            className="pl-9"
            onChange={(event) => {
              setQuery(event.target.value);
              onChange(null);
            }}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || (!query && !value)}
          onClick={() => {
            setQuery("");
            onChange(null);
          }}
          aria-label="清空用户选择"
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {value ? (
        <SelectedUserPanel
          user={value}
          onClear={() => {
            setQuery("");
            onChange(null);
          }}
          disabled={disabled}
        />
      ) : null}

      {usersQuery.isFetching && searchQuery && !value ? (
        <p className="text-xs leading-5 text-muted-foreground">正在搜索用户...</p>
      ) : null}

      {usersQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>搜索失败</AlertTitle>
          <AlertDescription>{getErrorDescription(usersQuery.error)}</AlertDescription>
        </Alert>
      ) : null}

      {usersQuery.isSuccess && searchQuery && users.length === 0 && !value ? (
        <div className="border-y border-border py-3 text-sm text-muted-foreground">
          没有匹配用户。请检查用户名或昵称是否完整。
        </div>
      ) : null}

      {users.length > 0 && !value ? (
        <div className="divide-y divide-border border-y border-border">
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              className="grid w-full min-w-0 gap-3 px-3 py-3 text-left transition-colors hover:bg-background-soft sm:grid-cols-[minmax(0,1fr)_auto]"
              disabled={disabled}
              onClick={() => {
                onChange(user);
                setQuery(getAdminUserDisplayName(user));
              }}
            >
              <AdminUserIdentity user={user} />
              <span className="flex flex-wrap items-center gap-2 sm:justify-end">
                <StatusToken tone={getAdminUserStatusTone(user.status)}>
                  {formatAdminUserStatus(user.status)}
                </StatusToken>
                <span className="text-xs font-semibold text-primary">选择此人</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AdminUserIdentity({ user }: { user: AdminUser }) {
  const displayName = getAdminUserDisplayName(user);
  const hasDisplayName = displayName !== user.username;

  return (
    <span className="flex min-w-0 items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center border border-border bg-background-soft text-xs font-semibold text-primary">
        {getAdminUserInitial(displayName)}
      </span>
      <span className="min-w-0">
        <span className="block break-words text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
          {displayName}
        </span>
        <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-muted-foreground">
          <span>@{user.username}</span>
          {hasDisplayName ? <span>昵称匹配</span> : null}
          <span className="font-mono">{user.id}</span>
        </span>
      </span>
    </span>
  );
}

export function getAdminUserDisplayName(user: AdminUser) {
  return user.display_name?.trim() || user.username;
}

function SelectedUserPanel({
  disabled,
  onClear,
  user,
}: {
  disabled: boolean;
  onClear: () => void;
  user: AdminUser;
}) {
  return (
    <div className="grid gap-3 border border-primary/50 bg-primary/5 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto]">
      <AdminUserIdentity user={user} />
      <span className="flex flex-wrap items-center gap-2 sm:justify-end">
        <StatusToken tone="primary">已选择</StatusToken>
        <button
          type="button"
          className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
          disabled={disabled}
          onClick={onClear}
        >
          重新选择
        </button>
      </span>
    </div>
  );
}

function getAdminUserInitial(displayName: string) {
  const trimmed = displayName.trim();

  if (!trimmed) {
    return <UserRound className="size-4" aria-hidden="true" />;
  }

  return trimmed.slice(0, 1).toUpperCase();
}

function getErrorDescription(error: Error | null) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}
