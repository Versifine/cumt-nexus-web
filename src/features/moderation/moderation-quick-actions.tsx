"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Ban,
  CheckCircle2,
  FileClock,
  Flag,
  Lock,
  Mail,
  MoreHorizontal,
  Pin,
  ShieldAlert,
  Sparkles,
  Tag,
  UserRound,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  StatusToken,
  type StatusTokenTone,
} from "@/components/ui/data-display";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useCommunityModerationUserProfileQuery,
  useCommunityModeratorNotesQuery,
  useCreateCommunityModeratorNoteMutation,
  useUpsertCommunityUserStateMutation,
} from "@/features/community/queries";
import type {
  CommunityUserStateKind,
  ModeratorNote,
  ModerationUserProfile,
} from "@/features/community/types";
import { ApiError } from "@/lib/api/client";

import { ModerationRemoveDialog } from "./moderation-remove-dialog";
import {
  useApplyAdminModQueueActionMutation,
  useApplyCommunityModQueueActionMutation,
} from "./queries";
import type {
  ModerationActionType,
  ModerationBulkActionInput,
  ModerationTargetType,
} from "./types";

type ModerationQuickActionsProps = {
  auditHref?: string | null;
  canRemove: boolean;
  communityManageHref?: string | null;
  communitySlug?: string | null;
  targetId: string;
  targetAuthorId?: string | null;
  targetLabel: string;
  targetPostId?: string;
  targetStatus?: string;
  targetState?: {
    flairText?: string | null;
    isLocked?: boolean;
    isNsfw?: boolean;
    isPinned?: boolean;
    isSpoiler?: boolean;
  };
  targetType: ModerationTargetType;
  userHref?: string | null;
};

type QuickActionDefinition = {
  action: ModerationActionType;
  confirmLabel: string;
  description: string;
  icon: typeof CheckCircle2;
  label: string;
  needsFlair?: boolean;
  reasonRequired?: boolean;
  value?: boolean;
};

const postQuickActions: QuickActionDefinition[] = [
  {
    action: "approve",
    confirmLabel: "确认批准",
    description: "批准后内容会回到正常可见处理链路，并写入社区 Mod Log。",
    icon: CheckCircle2,
    label: "批准",
  },
  {
    action: "spam",
    confirmLabel: "标记垃圾",
    description: "标记为垃圾会让内容离开普通公开读取，并处理相关待处理举报。",
    icon: ShieldAlert,
    label: "标记垃圾",
    reasonRequired: true,
  },
  {
    action: "ignore_reports",
    confirmLabel: "忽略举报",
    description: "忽略当前目标上的待处理举报，不改变内容本身状态。",
    icon: Flag,
    label: "忽略举报",
  },
  {
    action: "lock",
    confirmLabel: "确认锁定",
    description: "锁定后普通用户不能继续在该帖下评论。",
    icon: Lock,
    label: "锁定",
    value: true,
  },
  {
    action: "pin",
    confirmLabel: "确认置顶",
    description: "置顶会把帖子标记为社区置顶内容。",
    icon: Pin,
    label: "置顶",
    value: true,
  },
  {
    action: "mark_nsfw",
    confirmLabel: "确认标记",
    description: "标记 NSFW 后，帖子会带有敏感内容提示。",
    icon: Sparkles,
    label: "标记 NSFW",
    value: true,
  },
  {
    action: "mark_spoiler",
    confirmLabel: "确认标记",
    description: "标记剧透后，帖子会带有剧透提示。",
    icon: Sparkles,
    label: "标记剧透",
    value: true,
  },
  {
    action: "set_flair",
    confirmLabel: "保存 flair",
    description: "设置帖子 flair，用于社区内内容分类。",
    icon: Tag,
    label: "调整 flair",
    needsFlair: true,
  },
];

const commentQuickActions: QuickActionDefinition[] = [
  {
    action: "approve",
    confirmLabel: "确认批准",
    description: "批准后评论会回到正常可见处理链路，并写入社区 Mod Log。",
    icon: CheckCircle2,
    label: "批准",
  },
  {
    action: "spam",
    confirmLabel: "标记垃圾",
    description: "标记为垃圾会让评论离开普通公开读取，并处理相关待处理举报。",
    icon: ShieldAlert,
    label: "标记垃圾",
    reasonRequired: true,
  },
  {
    action: "ignore_reports",
    confirmLabel: "忽略举报",
    description: "忽略当前评论上的待处理举报，不改变评论本身状态。",
    icon: Flag,
    label: "忽略举报",
  },
];

type QuickUserStateDefinition = {
  confirmLabel: string;
  description: string;
  icon: typeof Ban;
  kind: CommunityUserStateKind;
  label: string;
};

const communityUserStateActions: QuickUserStateDefinition[] = [
  {
    confirmLabel: "确认封禁",
    description: "封禁后该用户不能继续在当前社区发帖或评论，并写入社区 Mod Log。",
    icon: Ban,
    kind: "banned",
    label: "封禁作者",
  },
  {
    confirmLabel: "确认禁言",
    description: "禁言后该用户不能继续在当前社区发起沟通类互动，并写入社区 Mod Log。",
    icon: ShieldAlert,
    kind: "muted",
    label: "禁言作者",
  },
];

const unsupportedActions: Array<{
  icon: typeof Mail;
  label: string;
  note: string;
}> = [
  { icon: Mail, label: "打开 Modmail", note: "待接入" },
];

export function ModerationQuickActions({
  auditHref,
  canRemove,
  communityManageHref,
  communitySlug,
  targetId,
  targetAuthorId,
  targetLabel,
  targetPostId,
  targetStatus,
  targetState,
  targetType,
  userHref,
}: ModerationQuickActionsProps) {
  const isRemoved = targetStatus === "removed";
  const [completedActions, setCompletedActions] = useState<Set<string>>(
    () => new Set(),
  );
  const [completedUserActions, setCompletedUserActions] = useState<Set<string>>(
    () => new Set(),
  );
  const canUseModTools = Boolean(communitySlug || auditHref);
  const canUseCommunityUserGovernance = Boolean(
    communitySlug?.trim() && targetAuthorId?.trim(),
  );
  const supportedActions =
    targetType === "post"
      ? resolvePostQuickActions(postQuickActions, targetState)
      : commentQuickActions;
  const primaryActions = supportedActions.filter(isPrimaryQuickAction);
  const secondaryActions = supportedActions.filter(
    (action) => !isPrimaryQuickAction(action),
  );

  return (
    <div className="flex min-h-8 w-full min-w-0 flex-wrap items-center gap-1">
      {canRemove ? (
        <ModerationRemoveDialog
          communitySlug={communitySlug ?? undefined}
          targetId={targetId}
          targetLabel={targetLabel}
          targetPostId={targetPostId}
          targetStatus={targetStatus}
          targetType={targetType}
        />
      ) : isRemoved ? (
        <StatusToken>已移除</StatusToken>
      ) : null}

      {canUseModTools
        ? primaryActions.map((action) => (
            <ModerationActionButton
              action={action}
              communitySlug={communitySlug}
              disabled={completedActions.has(action.action)}
              key={action.action}
              onCompleted={(completedAction) => {
                setCompletedActions((current) => {
                  const next = new Set(current);
                  next.add(completedAction);
                  return next;
                });
              }}
              targetId={targetId}
              targetLabel={targetLabel}
              targetType={targetType}
            />
          ))
        : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 px-0 text-xs"
            aria-label="打开快捷管理菜单"
          >
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>快捷管理</DropdownMenuLabel>
          {userHref ? (
            <DropdownMenuItem asChild>
              <Link href={userHref}>查看作者账号</Link>
            </DropdownMenuItem>
          ) : null}
          {communityManageHref ? (
            <DropdownMenuItem asChild>
              <Link href={communityManageHref}>进入社区管理</Link>
            </DropdownMenuItem>
          ) : null}
          {auditHref ? (
            <DropdownMenuItem asChild>
              <Link href={auditHref}>
                <FileClock className="size-4" aria-hidden="true" />
                查看审计
              </Link>
            </DropdownMenuItem>
          ) : null}
          {(userHref || communityManageHref || auditHref) && (
            <DropdownMenuSeparator />
          )}
          {canUseModTools ? (
            <>
              {secondaryActions.length > 0 ? (
                <>
                  <DropdownMenuLabel>高级处置</DropdownMenuLabel>
                  {secondaryActions.map((action) => (
                    <ModerationActionMenuItem
                      action={action}
                      communitySlug={communitySlug}
                      disabled={completedActions.has(action.action)}
                      key={action.action}
                      onCompleted={(completedAction) => {
                        setCompletedActions((current) => {
                          const next = new Set(current);
                          next.add(completedAction);
                          return next;
                        });
                      }}
                      targetId={targetId}
                      targetLabel={targetLabel}
                      targetType={targetType}
                    />
                  ))}
                  <DropdownMenuSeparator />
                </>
              ) : null}
            </>
          ) : null}
          {canUseCommunityUserGovernance ? (
            <>
              <DropdownMenuLabel>作者处置</DropdownMenuLabel>
              <CommunityUserProfileMenuItem
                communitySlug={communitySlug}
                targetAuthorId={targetAuthorId}
                targetLabel={targetLabel}
              />
              {communityUserStateActions.map((action) => (
                <CommunityUserStateMenuItem
                  action={action}
                  communitySlug={communitySlug}
                  disabled={completedUserActions.has(action.kind)}
                  key={action.kind}
                  onCompleted={(completedKind) => {
                    setCompletedUserActions((current) => {
                      const next = new Set(current);
                      next.add(completedKind);
                      return next;
                    });
                  }}
                  targetAuthorId={targetAuthorId}
                  targetLabel={targetLabel}
                />
              ))}
              <DropdownMenuSeparator />
            </>
          ) : null}
          {!canUseCommunityUserGovernance && userHref ? (
            <>
              <DropdownMenuLabel>作者处置</DropdownMenuLabel>
              <DropdownMenuItem disabled>
                <Ban className="size-4" aria-hidden="true" />
                封禁 / 禁言作者
                <DropdownMenuShortcut>去用户页</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuLabel>待后端接入</DropdownMenuLabel>
          {unsupportedActions.map((action) => (
            <DropdownMenuItem key={action.label} disabled>
              <action.icon className="size-4" aria-hidden="true" />
              {action.label}
              <DropdownMenuShortcut>{action.note}</DropdownMenuShortcut>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ModerationActionButton({
  action,
  communitySlug,
  disabled,
  onCompleted,
  targetId,
  targetLabel,
  targetType,
}: {
  action: QuickActionDefinition;
  communitySlug?: string | null;
  disabled: boolean;
  onCompleted: (action: ModerationActionType) => void;
  targetId: string;
  targetLabel: string;
  targetType: ModerationTargetType;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [flairText, setFlairText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const communityMutation = useApplyCommunityModQueueActionMutation();
  const adminMutation = useApplyAdminModQueueActionMutation();
  const mutation = communitySlug ? communityMutation : adminMutation;
  const Icon = action.icon;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const trimmedReason = reason.trim();
    const trimmedFlair = flairText.trim();

    if (action.reasonRequired && !trimmedReason) {
      setFormError("请填写处理原因。");
      return;
    }

    if (action.needsFlair && !trimmedFlair) {
      setFormError("请填写 flair 文本。");
      return;
    }

    const input: ModerationBulkActionInput = {
      action: action.action,
      confirm: !trimmedReason,
      flair_text: action.needsFlair ? trimmedFlair : undefined,
      reason: trimmedReason,
      target_ids: [targetId],
      target_type: targetType,
      value: action.value,
    };

    const result = communitySlug
      ? await communityMutation.mutateAsync({ input, slug: communitySlug })
      : await adminMutation.mutateAsync(input);
    const failed = result.results.find((item) => !item.ok);

    if (failed) {
      setFormError(failed.error_message || "操作失败。");
      return;
    }

    onCompleted(action.action);
  }

  const isPending = mutation.isPending;
  const submitError = formError ?? getErrorDescription(mutation.error);
  const isSubmitted = disabled && !mutation.error;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 shrink-0 whitespace-nowrap px-1 text-xs"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <Icon className="size-3.5" aria-hidden="true" />
        {disabled ? "已提交" : action.label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action.label}</DialogTitle>
            <DialogDescription>
              {targetLabel}。{action.description}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            {action.needsFlair ? (
              <Input
                value={flairText}
                onChange={(event) => setFlairText(event.target.value)}
                placeholder="flair 文本"
                maxLength={64}
                disabled={isPending || isSubmitted}
                aria-label="flair 文本"
              />
            ) : null}
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={
                action.reasonRequired
                  ? "填写处理原因"
                  : "可选：补充处理原因"
              }
              disabled={isPending || isSubmitted}
              aria-label="处理原因"
            />
            {submitError ? (
              <Alert variant="destructive">
                <AlertTitle>操作失败</AlertTitle>
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            ) : null}
            {isSubmitted ? (
              <Alert variant="success">
                <AlertTitle>操作已提交</AlertTitle>
                <AlertDescription>
                  列表和详情会在刷新后同步最新状态。
                </AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={isPending}
                onClick={() => setOpen(false)}
              >
                关闭
              </Button>
              <Button type="submit" disabled={isPending || isSubmitted}>
                {isPending ? "提交中..." : action.confirmLabel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ModerationActionMenuItem({
  action,
  communitySlug,
  disabled,
  onCompleted,
  targetId,
  targetLabel,
  targetType,
}: {
  action: QuickActionDefinition;
  communitySlug?: string | null;
  disabled: boolean;
  onCompleted: (action: ModerationActionType) => void;
  targetId: string;
  targetLabel: string;
  targetType: ModerationTargetType;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [flairText, setFlairText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const communityMutation = useApplyCommunityModQueueActionMutation();
  const adminMutation = useApplyAdminModQueueActionMutation();
  const mutation = communitySlug ? communityMutation : adminMutation;
  const Icon = action.icon;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const trimmedReason = reason.trim();
    const trimmedFlair = flairText.trim();

    if (action.reasonRequired && !trimmedReason) {
      setFormError("请填写处理原因。");
      return;
    }

    if (action.needsFlair && !trimmedFlair) {
      setFormError("请填写 flair 文本。");
      return;
    }

    const input: ModerationBulkActionInput = {
      action: action.action,
      confirm: !trimmedReason,
      flair_text: action.needsFlair ? trimmedFlair : undefined,
      reason: trimmedReason,
      target_ids: [targetId],
      target_type: targetType,
      value: action.value,
    };

    const result = communitySlug
      ? await communityMutation.mutateAsync({ input, slug: communitySlug })
      : await adminMutation.mutateAsync(input);
    const failed = result.results.find((item) => !item.ok);

    if (failed) {
      setFormError(failed.error_message || "操作失败。");
      return;
    }

    onCompleted(action.action);
  }

  const isPending = mutation.isPending;
  const submitError = formError ?? getErrorDescription(mutation.error);
  const isSubmitted = disabled && !mutation.error;

  return (
    <>
      <DropdownMenuItem
        disabled={disabled}
        onSelect={(event) => {
          event.preventDefault();
          if (!disabled) {
            setOpen(true);
          }
        }}
      >
        <Icon className="size-4" aria-hidden="true" />
        {action.label}
        {disabled ? <DropdownMenuShortcut>已提交</DropdownMenuShortcut> : null}
      </DropdownMenuItem>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action.label}</DialogTitle>
            <DialogDescription>
              {targetLabel}。{action.description}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            {action.needsFlair ? (
              <Input
                value={flairText}
                onChange={(event) => setFlairText(event.target.value)}
                placeholder="flair 文本"
                maxLength={64}
                disabled={isPending || isSubmitted}
                aria-label="flair 文本"
              />
            ) : null}
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={
                action.reasonRequired
                  ? "填写处理原因"
                  : "可选：补充处理原因"
              }
              disabled={isPending || isSubmitted}
              aria-label="处理原因"
            />
            {submitError ? (
              <Alert variant="destructive">
                <AlertTitle>操作失败</AlertTitle>
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            ) : null}
            {isSubmitted ? (
              <Alert variant="success">
                <AlertTitle>操作已提交</AlertTitle>
                <AlertDescription>
                  列表和详情会在刷新后同步最新状态。
                </AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={isPending}
                onClick={() => setOpen(false)}
              >
                关闭
              </Button>
              <Button type="submit" disabled={isPending || isSubmitted}>
                {isPending ? "提交中..." : action.confirmLabel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function isPrimaryQuickAction(action: QuickActionDefinition) {
  return (
    action.action === "approve" ||
    action.action === "spam" ||
    action.action === "ignore_reports"
  );
}

function CommunityUserStateMenuItem({
  action,
  communitySlug,
  disabled,
  onCompleted,
  targetAuthorId,
  targetLabel,
}: {
  action: QuickUserStateDefinition;
  communitySlug?: string | null;
  disabled: boolean;
  onCompleted: (kind: CommunityUserStateKind) => void;
  targetAuthorId?: string | null;
  targetLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const mutation = useUpsertCommunityUserStateMutation();
  const Icon = action.icon;
  const isSubmitted = disabled && !mutation.error;
  const isPending = mutation.isPending;
  const submitError = formError ?? getErrorDescription(mutation.error);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const slug = communitySlug?.trim();
    const userId = targetAuthorId?.trim();
    const trimmedReason = reason.trim();

    if (!slug || !userId) {
      setFormError("缺少社区或作者上下文，不能执行作者处置。");
      return;
    }

    if (!trimmedReason) {
      setFormError("请填写处置原因。");
      return;
    }

    await mutation.mutateAsync({
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      kind: action.kind,
      reason: trimmedReason,
      slug,
      user_id: userId,
    });
    onCompleted(action.kind);
  }

  return (
    <>
      <DropdownMenuItem
        disabled={disabled}
        onSelect={(event) => {
          event.preventDefault();
          if (!disabled) {
            setOpen(true);
          }
        }}
      >
        <Icon className="size-4" aria-hidden="true" />
        {action.label}
        {disabled ? <DropdownMenuShortcut>已提交</DropdownMenuShortcut> : null}
      </DropdownMenuItem>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action.label}</DialogTitle>
            <DialogDescription>
              {targetLabel}。{action.description}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              disabled={isPending || isSubmitted}
              aria-label="可选到期时间"
            />
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="填写处置原因"
              disabled={isPending || isSubmitted}
              aria-label="处置原因"
            />
            {submitError ? (
              <Alert variant="destructive">
                <AlertTitle>操作失败</AlertTitle>
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            ) : null}
            {isSubmitted ? (
              <Alert variant="success">
                <AlertTitle>操作已提交</AlertTitle>
                <AlertDescription>
                  社区用户列表和 Mod Log 会刷新到最新状态。
                </AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={isPending}
                onClick={() => setOpen(false)}
              >
                关闭
              </Button>
              <Button
                type="submit"
                variant={action.kind === "banned" ? "destructive" : "default"}
                disabled={isPending || isSubmitted}
              >
                {isPending ? "提交中..." : action.confirmLabel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CommunityUserProfileMenuItem({
  communitySlug,
  targetAuthorId,
  targetLabel,
}: {
  communitySlug?: string | null;
  targetAuthorId?: string | null;
  targetLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const slug = communitySlug?.trim() ?? "";
  const userId = targetAuthorId?.trim() ?? "";
  const canLoad = open && Boolean(slug && userId);
  const profileQuery = useCommunityModerationUserProfileQuery(
    { slug, user_id: userId },
    canLoad,
  );
  const notesQuery = useCommunityModeratorNotesQuery(
    { limit: 5, offset: 0, slug, user_id: userId },
    canLoad,
  );
  const createNoteMutation = useCreateCommunityModeratorNoteMutation();
  const profile = profileQuery.data ?? null;
  const notes = notesQuery.data?.notes ?? profile?.recent_notes ?? [];
  const submitError = formError ?? getErrorDescription(createNoteMutation.error);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const trimmedBody = noteBody.trim();
    if (!trimmedBody) {
      setFormError("请填写 Mod Note 内容。");
      return;
    }

    if (!slug || !userId) {
      setFormError("缺少社区或作者上下文，不能添加 Mod Note。");
      return;
    }

    await createNoteMutation.mutateAsync({
      body: trimmedBody,
      slug,
      user_id: userId,
    });
    setNoteBody("");
  }

  return (
    <>
      <DropdownMenuItem
        onSelect={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
      >
        <UserRound className="size-4" aria-hidden="true" />
        查看用户画像 / Mod Note
      </DropdownMenuItem>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>用户画像 / Mod Note</DialogTitle>
            <DialogDescription>
              {targetLabel}。查看该作者在本社区的审核画像，并添加团队可见的 Mod Note。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ModerationUserProfileSummary
              error={profileQuery.error}
              isError={profileQuery.isError}
              isLoading={profileQuery.isPending}
              profile={profile}
              onRetry={() => {
                void profileQuery.refetch();
              }}
            />
            <ModeratorNotesPreview
              error={notesQuery.error}
              isError={notesQuery.isError}
              isLoading={notesQuery.isPending}
              notes={notes}
              onRetry={() => {
                void notesQuery.refetch();
              }}
            />
            <form className="space-y-3" onSubmit={submit}>
              <Textarea
                value={noteBody}
                onChange={(event) => setNoteBody(event.target.value)}
                placeholder="添加 Mod Note，记录上下文、历史行为或处理建议。"
                maxLength={1000}
                disabled={createNoteMutation.isPending}
                aria-label="Mod Note 内容"
              />
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{noteBody.trim().length} / 1000</span>
                <span>提交后刷新用户画像和 Mod Log</span>
              </div>
              {submitError ? (
                <Alert variant="destructive">
                  <AlertTitle>保存失败</AlertTitle>
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              ) : null}
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={createNoteMutation.isPending}
                  onClick={() => setOpen(false)}
                >
                  关闭
                </Button>
                <Button type="submit" disabled={createNoteMutation.isPending}>
                  {createNoteMutation.isPending ? "保存中..." : "保存 Mod Note"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ModerationUserProfileSummary({
  error,
  isError,
  isLoading,
  onRetry,
  profile,
}: {
  error: Error | null;
  isError: boolean;
  isLoading: boolean;
  onRetry: () => void;
  profile: ModerationUserProfile | null;
}) {
  if (isLoading) {
    return (
      <div className="border border-border p-3 text-sm text-muted-foreground">
        正在加载用户画像...
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>无法加载用户画像</AlertTitle>
        <AlertDescription>{getErrorDescription(error)}</AlertDescription>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-3"
          onClick={onRetry}
        >
          重试
        </Button>
      </Alert>
    );
  }

  if (!profile) {
    return (
      <div className="border border-border p-3 text-sm text-muted-foreground">
        打开后会加载该作者在本社区的审核画像。
      </div>
    );
  }

  return (
    <div className="border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusToken tone={getUserStatusTone(profile.status)}>
          {formatUserStatus(profile.status)}
        </StatusToken>
        {profile.is_banned ? <StatusToken tone="danger">已封禁</StatusToken> : null}
        {profile.is_muted ? <StatusToken tone="warning">已禁言</StatusToken> : null}
        {profile.is_approved ? <StatusToken tone="success">批准用户</StatusToken> : null}
      </div>
      <h3 className="mt-3 text-sm font-semibold">
        {profile.display_name || profile.username}
      </h3>
      <p className="mt-1 font-mono text-xs text-muted-foreground">
        @{profile.username} · {profile.user_id.slice(0, 8)}
      </p>
      {profile.headline ? (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {profile.headline}
        </p>
      ) : null}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <ProfileMetric label="帖子" value={profile.post_count} />
        <ProfileMetric label="评论" value={profile.comment_count} />
        <ProfileMetric label="举报" value={profile.report_count} />
        <ProfileMetric label="移除" value={profile.removed_count} />
      </div>
    </div>
  );
}

function ModeratorNotesPreview({
  error,
  isError,
  isLoading,
  notes,
  onRetry,
}: {
  error: Error | null;
  isError: boolean;
  isLoading: boolean;
  notes: ModeratorNote[];
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <div className="border border-border p-3 text-sm text-muted-foreground">
        正在加载 Mod Notes...
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>无法加载 Mod Notes</AlertTitle>
        <AlertDescription>{getErrorDescription(error)}</AlertDescription>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-3"
          onClick={onRetry}
        >
          重试
        </Button>
      </Alert>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="border border-border p-3 text-sm text-muted-foreground">
        暂无 Mod Note。
      </div>
    );
  }

  return (
    <div className="divide-y divide-border border border-border">
      {notes.map((note) => (
        <div key={note.id} className="p-3">
          <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {note.body}
          </p>
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            {formatShortDateTime(note.created_at)} · {note.author_id.slice(0, 8)}
          </p>
        </div>
      ))}
    </div>
  );
}

function ProfileMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border px-2 py-2">
      <div className="font-mono text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold text-foreground">{value}</div>
    </div>
  );
}

function resolvePostQuickActions(
  actions: QuickActionDefinition[],
  state?: ModerationQuickActionsProps["targetState"],
) {
  return actions.map((action) => {
    if (action.action === "lock" && state?.isLocked) {
      return { ...action, label: "解除锁定", value: false };
    }

    if (action.action === "pin" && state?.isPinned) {
      return { ...action, label: "取消置顶", value: false };
    }

    if (action.action === "mark_nsfw" && state?.isNsfw) {
      return { ...action, label: "取消 NSFW", value: false };
    }

    if (action.action === "mark_spoiler" && state?.isSpoiler) {
      return { ...action, label: "取消剧透", value: false };
    }

    return action;
  });
}

function getErrorDescription(error: Error | null) {
  if (!error) {
    return null;
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}

function formatUserStatus(status: string) {
  switch (status) {
    case "active":
      return "正常";
    case "disabled":
      return "已禁用";
    case "deleted":
      return "已注销";
    default:
      return status || "未知";
  }
}

function getUserStatusTone(status: string): StatusTokenTone {
  switch (status) {
    case "active":
      return "success";
    case "disabled":
      return "warning";
    case "deleted":
      return "danger";
    default:
      return "default";
  }
}

function formatShortDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
