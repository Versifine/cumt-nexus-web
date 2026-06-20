"use client";

import type { FormEvent } from "react";
import { ArrowRight, Loader2, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

type ManagementSearchFieldProps = {
  ariaLabel: string;
  className?: string;
  clearLabel?: string;
  disabled?: boolean;
  fieldClassName?: string;
  id?: string;
  isSearching?: boolean;
  onClear?: () => void;
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  onValueChange: (value: string) => void;
  placeholder?: string;
  preventEnterSubmit?: boolean;
  submitLabel?: string;
  value: string;
};

export function ManagementSearchField({
  ariaLabel,
  className,
  clearLabel = "清空搜索",
  disabled = false,
  fieldClassName,
  id,
  isSearching = false,
  onClear,
  onSubmit,
  onValueChange,
  placeholder,
  preventEnterSubmit = true,
  submitLabel = "搜索",
  value,
}: ManagementSearchFieldProps) {
  const input = (
    <div
      className={cn(
        "group relative flex h-11 min-w-0 items-center gap-2 bg-transparent px-0",
        "after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border/70 after:transition-[height,background-color] after:duration-150",
        "hover:after:bg-muted-foreground/45 focus-within:after:h-0.5 focus-within:after:bg-primary",
        disabled && "opacity-60",
        fieldClassName,
      )}
    >
      <Search
        className="ml-0.5 size-4 shrink-0 text-subtle-foreground transition-colors group-focus-within:text-primary"
        aria-hidden="true"
      />
      <input
        id={id}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="h-full min-w-0 flex-1 bg-transparent px-1 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={
          onSubmit || !preventEnterSubmit
            ? undefined
            : (event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                }
              }
        }
      />
      {onClear && value ? (
        <button
          type="button"
          className="relative z-10 inline-flex size-8 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
          onClick={onClear}
          aria-label={clearLabel}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
      {onSubmit ? (
        <button
          type="submit"
          className="relative z-10 inline-flex h-8 shrink-0 items-center gap-1.5 px-1 text-xs font-semibold text-primary transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled || isSearching}
        >
          {isSearching ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowRight className="size-4" aria-hidden="true" />
          )}
          {isSearching ? "搜索中" : submitLabel}
        </button>
      ) : null}
    </div>
  );

  if (onSubmit) {
    return (
      <form className={cn("min-w-0", className)} role="search" onSubmit={onSubmit}>
        {input}
      </form>
    );
  }

  return (
    <div className={cn("min-w-0", className)} role="search">
      {input}
    </div>
  );
}
