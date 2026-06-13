"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bookmark } from "lucide-react";

import { useAuthSession } from "@/features/auth/auth-session";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

import { useTogglePostSaveMutation } from "./queries";

type PostSaveButtonProps = {
  className?: string;
  isSaved?: boolean;
  postId: string;
  saveCount?: number;
};

export function PostSaveButton({
  className,
  isSaved = false,
  postId,
  saveCount,
}: PostSaveButtonProps) {
  const { isReady, token } = useAuthSession();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mutation = useTogglePostSaveMutation();
  const canSave = isReady && Boolean(token);
  const isPending = mutation.isPending;
  const label = isSaved ? "取消收藏" : "收藏";
  const error = getSaveError(mutation.error);

  function handleClick() {
    if (!isReady || isPending) {
      return;
    }

    if (!token) {
      router.push(`/login?next=${encodeURIComponent(getCurrentPath(pathname, searchParams))}`);
      return;
    }

    mutation.mutate({ isSaved, postId });
  }

  return (
    <button
      type="button"
      aria-label={canSave ? label : "登录后收藏"}
      aria-pressed={isSaved}
      disabled={!isReady || isPending}
      title={canSave ? label : "登录后收藏"}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 px-1 font-semibold transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60",
        isSaved && "text-primary",
        className,
      )}
      onClick={handleClick}
    >
      <Bookmark
        className={cn("size-4", isSaved && "fill-primary")}
        aria-hidden="true"
      />
      {isPending ? "处理中" : label}
      {typeof saveCount === "number" ? (
        <span className="font-mono text-[11px] text-muted-foreground">
          {formatCompactNumber(saveCount)}
        </span>
      ) : null}
      {error ? <span className="sr-only">{error}</span> : null}
    </button>
  );
}

function getCurrentPath(
  pathname: string,
  searchParams: { toString(): string },
) {
  const query = searchParams.toString();

  return query ? `${pathname}?${query}` : pathname;
}

function formatCompactNumber(value: number) {
  if (Math.abs(value) >= 1000) {
    return `${Math.round(value / 100) / 10}k`;
  }

  return String(value);
}

function getSaveError(error: Error | null) {
  if (!error) {
    return null;
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  return "收藏失败，请稍后重试。";
}
