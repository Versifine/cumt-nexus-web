"use client";

import { useId, useState } from "react";
import { UserRound } from "lucide-react";

import { ManagementSearchField } from "@/components/app-shell/management-search-field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatusToken } from "@/components/ui/data-display";
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

type AdminUserSearchPanelProps = {
  className?: string;
  description?: string;
  limit?: number;
  onSelect?: (user: AdminUser) => void;
  placeholder?: string;
  status?: "active" | "suspended" | "banned" | "all";
  title?: string;
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
      <ManagementSearchField
        id={inputId}
        ariaLabel={label}
        clearLabel="清空用户选择"
        disabled={disabled}
        onClear={() => {
          setQuery("");
          onChange(null);
        }}
        onValueChange={(nextQuery) => {
          setQuery(nextQuery);
          onChange(null);
        }}
        placeholder={placeholder}
        value={query}
      />

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
        <div className="rounded-md bg-surface-raised px-3 py-3 text-sm text-muted-foreground">
          没有匹配用户。请检查用户名或昵称是否完整。
        </div>
      ) : null}

      {users.length > 0 && !value ? (
        <div className="space-y-2">
          {users.map((user) => (
            <AdminUserResultButton
              key={user.id}
              user={user}
              disabled={disabled}
              actionLabel="选择此人"
              onClick={() => {
                onChange(user);
                setQuery(getAdminUserDisplayName(user));
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AdminUserSearchPanel({
  className,
  description = "按用户名、昵称或用户资料定位账号，结果直接展示头像、用户名和昵称。",
  limit = 6,
  onSelect,
  placeholder = "搜索用户、昵称或简介",
  status = "all",
  title = "用户搜索",
}: AdminUserSearchPanelProps) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const searchQuery = query.trim();
  const usersQuery = useAdminUsersQuery(
    {
      limit,
      offset: 0,
      q: searchQuery,
      status,
    },
    Boolean(searchQuery),
  );
  const users = usersQuery.data?.users ?? [];

  function handleSelect(user: AdminUser) {
    setSelectedUserId(user.id);
    onSelect?.(user);
  }

  return (
    <section className={cn("rounded-md bg-surface-raised p-3", className)}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
        {usersQuery.isFetching && searchQuery ? (
          <StatusToken tone="primary">搜索中</StatusToken>
        ) : null}
      </div>

      <ManagementSearchField
        id={inputId}
        className="mt-3"
        ariaLabel={title}
        clearLabel="清空用户搜索"
        onClear={() => {
          setQuery("");
          setSelectedUserId(null);
        }}
        onValueChange={(nextQuery) => {
          setQuery(nextQuery);
          setSelectedUserId(null);
        }}
        placeholder={placeholder}
        value={query}
      />

      {usersQuery.isError ? (
        <Alert className="mt-3" variant="destructive">
          <AlertTitle>搜索失败</AlertTitle>
          <AlertDescription>{getErrorDescription(usersQuery.error)}</AlertDescription>
        </Alert>
      ) : null}

      {usersQuery.isSuccess && searchQuery && users.length === 0 ? (
        <div className="mt-3 rounded-md bg-surface px-3 py-3 text-sm text-muted-foreground">
          没有匹配用户。
        </div>
      ) : null}

      {users.length > 0 ? (
        <div className="mt-3 space-y-2">
          {users.map((user) => (
            <AdminUserResultButton
              key={user.id}
              user={user}
              selected={selectedUserId === user.id}
              actionLabel={selectedUserId === user.id ? "已选中" : "查看"}
              onClick={() => handleSelect(user)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function AdminUserResultButton({
  actionLabel,
  disabled,
  onClick,
  selected = false,
  user,
}: {
  actionLabel: string;
  disabled?: boolean;
  onClick: () => void;
  selected?: boolean;
  user: AdminUser;
}) {
  return (
    <button
      type="button"
      className={cn(
        "nexus-micro-lift grid w-full min-w-0 gap-3 rounded-md bg-surface px-3 py-3 text-left transition-colors sm:grid-cols-[minmax(0,1fr)_auto]",
        selected
          ? "bg-primary/10 ring-1 ring-primary/30"
          : "hover:bg-surface-hover",
      )}
      disabled={disabled}
      onClick={onClick}
    >
      <AdminUserIdentity user={user} />
      <span className="flex flex-wrap items-center gap-2 sm:justify-end">
        <StatusToken tone={getAdminUserStatusTone(user.status)}>
          {formatAdminUserStatus(user.status)}
        </StatusToken>
        <span className="text-xs font-semibold text-primary">{actionLabel}</span>
      </span>
    </button>
  );
}

export function AdminUserIdentity({
  avatarSize = "md",
  user,
}: {
  avatarSize?: "sm" | "md";
  user: AdminUser;
}) {
  const displayName = getAdminUserDisplayName(user);
  const hasDisplayName = Boolean(user.display_name?.trim());
  const avatarUrl = user.avatar_url?.trim();

  return (
    <span className="flex min-w-0 items-start gap-3">
      <span
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-semibold text-primary ring-1 ring-primary/20",
          avatarSize === "sm" ? "size-8" : "size-10",
        )}
      >
        {avatarUrl ? (
          <span
            className="size-full bg-cover bg-center"
            style={{ backgroundImage: `url(${JSON.stringify(avatarUrl)})` }}
            role="img"
            aria-label={`${displayName} 的头像`}
          />
        ) : (
          getAdminUserInitial(displayName)
        )}
      </span>
      <span className="min-w-0">
        <span className="block break-words text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
          @{user.username}
        </span>
        <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5 text-muted-foreground">
          <span>{hasDisplayName ? displayName : "未设置昵称"}</span>
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
    <div className="grid gap-3 rounded-md bg-primary/5 px-3 py-3 ring-1 ring-primary/30 sm:grid-cols-[minmax(0,1fr)_auto]">
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
