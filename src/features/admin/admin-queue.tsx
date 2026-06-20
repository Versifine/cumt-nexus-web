"use client";

import { Children, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

import { ManagementSearchField } from "@/components/app-shell/management-search-field";
import {
  ReviewDeskBoard,
  ReviewDeskPanel,
  ReviewDeskState,
} from "@/components/app-shell/review-desk";
import { RightRail, RightRailSection } from "@/components/app-shell/right-rail";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StatusToken } from "@/components/ui/data-display";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextAction } from "@/components/ui/text-action";
import { cn } from "@/lib/utils";

type AdminQueueLayoutProps = {
  children: ReactNode;
  detail?: ReactNode;
};

export function AdminQueueLayout({ children, detail }: AdminQueueLayoutProps) {
  const childItems = Children.toArray(children);
  const [toolbar, ...content] = childItems;

  return (
    <ReviewDeskBoard inspector={detail ? <RightRail>{detail}</RightRail> : undefined}>
      {toolbar}
      {content}
    </ReviewDeskBoard>
  );
}

type AdminQueueToolbarProps = {
  actions?: ReactNode;
  activeTab?: string;
  description: ReactNode;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onSearchClear?: () => void;
  onSearchSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  searchAriaLabel?: string;
  searchDisabled?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  tabs?: Array<{ label: string; value: string }>;
  title: ReactNode;
  onSearchValueChange?: (value: string) => void;
  onTabChange?: (value: string) => void;
};

export function AdminQueueToolbar({
  actions,
  activeTab,
  description,
  isRefreshing = false,
  onRefresh,
  onSearchClear,
  onSearchSubmit,
  onSearchValueChange,
  onTabChange,
  searchAriaLabel,
  searchDisabled,
  searchPlaceholder,
  searchValue,
  tabs,
  title,
}: AdminQueueToolbarProps) {
  const hasSearch = Boolean(onSearchSubmit && onSearchValueChange);

  return (
    <ReviewDeskPanel
      title={title}
      description={description}
      headerAction={
        actions || onRefresh ? (
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {actions}

            {onRefresh ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isRefreshing}
                onClick={onRefresh}
              >
                <RefreshCw
                  className={isRefreshing ? "size-4 animate-spin" : "size-4"}
                  aria-hidden="true"
                />
                {isRefreshing ? "刷新中" : "刷新"}
              </Button>
            ) : null}
          </div>
        ) : null
      }
    >
      <div className="space-y-3">
        {hasSearch ? (
          <ManagementSearchField
            ariaLabel={searchAriaLabel ?? "搜索"}
            disabled={searchDisabled}
            isSearching={isRefreshing}
            onClear={onSearchClear}
            onSubmit={onSearchSubmit}
            onValueChange={(value) => onSearchValueChange?.(value)}
            placeholder={searchPlaceholder}
            value={searchValue ?? ""}
          />
        ) : null}

        {tabs && activeTab && onTabChange ? (
          <Tabs value={activeTab} onValueChange={onTabChange}>
            <TabsList className="h-auto flex-wrap justify-start rounded-md bg-surface-raised p-1">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="h-8 rounded px-3 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : null}
      </div>
    </ReviewDeskPanel>
  );
}

type AdminResourceRowProps = {
  actions?: ReactNode;
  description?: ReactNode;
  href?: string;
  icon?: ReactNode;
  index: number;
  isSelected?: boolean;
  meta?: ReactNode;
  onSelect?: () => void;
  selection?: ReactNode;
  title: ReactNode;
  tokens?: ReactNode;
};

export function AdminResourceRow({
  actions,
  description,
  href,
  icon,
  index,
  isSelected = false,
  meta,
  onSelect,
  selection,
  title,
  tokens,
}: AdminResourceRowProps) {
  const mainContent = (
    <span className="grid min-w-0 gap-3 text-left sm:grid-cols-[40px_minmax(0,1fr)]">
      <span className="font-mono text-xs text-muted-foreground">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="min-w-0">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          {icon ? <span className="text-primary">{icon}</span> : null}
          <span className="min-w-0 break-words text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
            {title}
          </span>
          {tokens}
        </span>
        {description ? (
          <span className="mt-2 line-clamp-2 block text-sm leading-6 text-muted-foreground">
            {description}
          </span>
        ) : null}
        {meta ? (
          <span className="mt-2 block text-xs leading-5 text-muted-foreground">
            {meta}
          </span>
        ) : null}
      </span>
    </span>
  );
  const rowClassName = cn(
    "grid w-full gap-3 rounded-md bg-surface-raised px-3 py-4 transition-colors",
    selection
      ? "grid-cols-[auto_minmax(0,1fr)] sm:grid-cols-[auto_minmax(0,1fr)_auto]"
      : "grid-cols-[minmax(0,1fr)] sm:grid-cols-[minmax(0,1fr)_auto]",
    isSelected
      ? "bg-primary/10 ring-1 ring-primary/30"
      : "hover:bg-surface-hover",
  );
  const contentClassName = "min-w-0";
  const content = href ? (
    <Link href={href} className={contentClassName}>
      {mainContent}
    </Link>
  ) : onSelect ? (
    <button type="button" className={contentClassName} onClick={onSelect}>
      {mainContent}
    </button>
  ) : (
    <span className={contentClassName}>{mainContent}</span>
  );

  return (
    <div className={rowClassName}>
      {selection ? (
        <span className="flex items-start pt-0.5">{selection}</span>
      ) : null}
      {content}
      {actions ? (
          <span className="flex min-w-0 flex-wrap items-start justify-start gap-2 sm:justify-end">
            {actions}
          </span>
      ) : null}
    </div>
  );
}

type AdminDetailRailProps = {
  children?: ReactNode;
  emptyDescription?: string;
  emptyTitle?: string;
  title: ReactNode;
};

export function AdminDetailRail({
  children,
  emptyDescription = "从左侧队列选择一项后查看上下文和可执行动作。",
  emptyTitle = "选择一项",
  title,
}: AdminDetailRailProps) {
  return (
    <RightRailSection title={title}>
      {children ? (
        <div className="mt-3">{children}</div>
      ) : (
        <div className="mt-3">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      )}
    </RightRailSection>
  );
}

export function AdminRailSection({
  children,
  title,
}: {
  children: ReactNode;
  title: ReactNode;
}) {
  return (
    <RightRailSection title={title}>
      <div className="mt-3">{children}</div>
    </RightRailSection>
  );
}

type AdminActionDialogProps = {
  cancelLabel?: string;
  children?: ReactNode;
  confirmDisabled?: boolean;
  confirmLabel: string;
  confirmVariant?: "default" | "destructive";
  description: ReactNode;
  error?: string | null;
  isSubmitting?: boolean;
  onConfirm: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: ReactNode;
  trigger: ReactNode;
};

export function AdminActionDialog({
  cancelLabel = "取消",
  children,
  confirmDisabled = false,
  confirmLabel,
  confirmVariant = "default",
  description,
  error,
  isSubmitting = false,
  onConfirm,
  onOpenChange,
  open,
  title,
  trigger,
}: AdminActionDialogProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const visibleError = error ?? localError;

  async function handleConfirm() {
    setLocalError(null);

    try {
      await onConfirm();
    } catch (caughtError) {
      setLocalError(
        caughtError instanceof Error
          ? caughtError.message
          : "请求失败，请稍后重试。",
      );
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setLocalError(null);
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        {visibleError ? (
          <Alert variant="destructive">
            <AlertTitle>操作失败</AlertTitle>
            <AlertDescription>{visibleError}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={() => handleOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            disabled={isSubmitting || confirmDisabled}
            onClick={handleConfirm}
          >
            {isSubmitting ? "提交中..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminAuditLink({
  targetId,
  targetType,
}: {
  targetId?: string;
  targetType: string;
}) {
  if (!targetId) {
    return <StatusToken>暂无审计目标</StatusToken>;
  }

  return (
    <TextAction
      href={`/admin/audit-logs?target_type=${encodeURIComponent(targetType)}&target_id=${encodeURIComponent(targetId)}`}
      variant="bar"
    >
      查看审计
    </TextAction>
  );
}

export function AdminPagination({
  hasMore,
  isFetching,
  offset,
  onNext,
  onJump,
  onPrevious,
  pageSize = 20,
}: {
  hasMore: boolean;
  isFetching: boolean;
  offset: number;
  onNext: () => void;
  onJump?: (offset: number) => void;
  onPrevious: () => void;
  pageSize?: number;
}) {
  const [jumpOffset, setJumpOffset] = useState("");
  const currentPage = Math.floor(offset / pageSize) + 1;

  function submitJump(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onJump) {
      return;
    }

    const parsedOffset = Number.parseInt(jumpOffset.trim(), 10);
    if (Number.isNaN(parsedOffset)) {
      return;
    }

    onJump(Math.max(0, parsedOffset));
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-surface p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {onJump ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={offset === 0 || isFetching}
            onClick={() => onJump(0)}
          >
            最新
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          disabled={offset === 0 || isFetching}
          onClick={onPrevious}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          上一页
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={!hasMore || isFetching}
          onClick={onNext}
        >
          下一页
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>第 {currentPage} 页</span>
        <span className="font-mono">OFFSET {offset}</span>
        <span>每页 {pageSize}</span>
      </div>

      {onJump ? (
        <form
          className="flex min-w-0 items-center gap-2"
          onSubmit={submitJump}
        >
          <label className="sr-only" htmlFor="admin-pagination-offset">
            跳转到 offset
          </label>
          <Input
            id="admin-pagination-offset"
            value={jumpOffset}
            onChange={(event) => setJumpOffset(event.target.value)}
            inputMode="numeric"
            placeholder="Offset"
            className="h-9 w-28"
            disabled={isFetching}
          />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            disabled={isFetching || !jumpOffset.trim()}
          >
            跳转
          </Button>
        </form>
      ) : null}
    </div>
  );
}

export function AdminStatePanel({ children }: { children: ReactNode }) {
  return <ReviewDeskState>{children}</ReviewDeskState>;
}

export function AdminLoadingPanel({ rows = 5 }: { rows?: number }) {
  return (
    <AdminStatePanel>
      <LoadingState rows={rows} />
    </AdminStatePanel>
  );
}

export function AdminErrorPanel({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <AdminStatePanel>
      <ErrorState title={title} description={description} action={action} />
    </AdminStatePanel>
  );
}

export function AdminEmptyPanel({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <AdminStatePanel>
      <EmptyState title={title} description={description} />
    </AdminStatePanel>
  );
}
