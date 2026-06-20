"use client";

import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Ban,
  BellOff,
  Check,
  ImageIcon,
  MessageCircle,
  MoreHorizontal,
  Pin,
  PinOff,
  Search,
  Send,
  Settings,
  ShieldAlert,
  Smile,
  Trash2,
  UserPlus,
} from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { TextAction } from "@/components/ui/text-action";
import { Textarea } from "@/components/ui/textarea";
import { useAuthSession } from "@/features/auth/auth-session";
import { useCurrentUserQuery } from "@/features/auth/queries";
import { useUploadImageMutation } from "@/features/media/queries";
import {
  IMAGE_UPLOAD_ACCEPT,
  IMAGE_UPLOAD_LIMITS,
  type MediaAttachment,
} from "@/features/media/types";
import { ApiError } from "@/lib/api/client";
import { getMessageReturnTarget } from "@/lib/navigation/route-memory";
import { cn } from "@/lib/utils";

import {
  useConversationMessagesQuery,
  useMessageActionMutation,
  useMessageBlockMutation,
  useMessageConversationActionMutation,
  useMessageConversationsQuery,
  useMessageRequestActionMutation,
  useMessageSummaryQuery,
  useStartConversationMutation,
  useSendMessageMutation,
} from "./queries";
import { useMessageRealtime } from "./realtime";
import {
  getMessageShareDraftFromParams,
  getShareMessageType,
} from "./share";
import type {
  Message,
  MessageConversation,
  MessageDraft,
  MessageShareSnapshot,
  MessageUserSummary,
} from "./types";

type MessageCenterPageProps = {
  activeConversationId?: string;
  fullscreen?: boolean;
  initialSearchParams?: MessageCenterSearchParams;
  showRequestInbox?: boolean;
};

type MessageCenterSearchParams = Record<string, string | string[] | undefined>;

function createUrlSearchParams(input: MessageCenterSearchParams = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string") {
      params.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
    }
  }

  return params;
}

const MESSAGE_EMOJI_OPTIONS = [
  "😀",
  "😆",
  "😂",
  "😊",
  "😍",
  "😘",
  "😎",
  "😭",
  "😡",
  "👍",
  "👏",
  "🙏",
  "🔥",
  "❤️",
  "🎉",
  "🥰",
  "😋",
  "😴",
  "🤔",
  "😳",
  "🥺",
  "😅",
  "😢",
  "👌",
] as const;

export function MessageCenterPage({
  activeConversationId,
  fullscreen = false,
  initialSearchParams,
  showRequestInbox = false,
}: MessageCenterPageProps) {
  const router = useRouter();
  const searchParams = useMemo(
    () => createUrlSearchParams(initialSearchParams),
    [initialSearchParams],
  );
  const { isReady, token } = useAuthSession();
  const canLoad = isReady && Boolean(token);
  const isThreadRoute = Boolean(activeConversationId);
  const isRequestInboxRoute = showRequestInbox;
  const targetUsername = searchParams.get("to") ?? "";
  const shareDraft = useMemo(
    () => getMessageShareDraftFromParams(searchParams),
    [searchParams],
  );
  const [query, setQuery] = useState("");

  const summaryQuery = useMessageSummaryQuery(canLoad);
  const conversationsQuery = useMessageConversationsQuery(
    { box: "all", limit: 50, offset: 0 },
    canLoad,
  );
  const requestsQuery = useMessageConversationsQuery(
    { box: "requests", limit: 20, offset: 0 },
    canLoad,
  );
  const archivedQuery = useMessageConversationsQuery(
    { box: "archived", limit: 20, offset: 0 },
    canLoad && Boolean(activeConversationId),
  );
  const currentUserQuery = useCurrentUserQuery();

  useMessageRealtime({ enabled: canLoad });

  const allConversations = useMemo(
    () => conversationsQuery.data?.conversations ?? [],
    [conversationsQuery.data?.conversations],
  );
  const incomingRequests = useMemo(
    () =>
      dedupeConversations([
        ...(requestsQuery.data?.conversations ?? []),
        ...allConversations.filter(isIncomingRequest),
      ]),
    [allConversations, requestsQuery.data?.conversations],
  );
  const visibleConversations = useMemo(
    () =>
      filterConversations(
        allConversations.filter((conversation) => !isIncomingRequest(conversation)),
        query,
      ),
    [allConversations, query],
  );
  const allKnownConversations = useMemo(
    () =>
      dedupeConversations([
        ...allConversations,
        ...incomingRequests,
        ...(archivedQuery.data?.conversations ?? []),
      ]),
    [allConversations, archivedQuery.data?.conversations, incomingRequests],
  );

  const selectedConversation =
    findConversation(activeConversationId, allKnownConversations) ??
    (!activeConversationId && !targetUsername && !isRequestInboxRoute
      ? visibleConversations[0]
      : undefined);
  const selectedConversationId = selectedConversation?.id ?? activeConversationId;
  const shouldShowStartPanel = Boolean(
    !isRequestInboxRoute && !selectedConversationId && (targetUsername || shareDraft),
  );
  const listError = conversationsQuery.error ?? requestsQuery.error;
  const listIsLoading =
    conversationsQuery.isPending || (requestsQuery.isPending && !requestsQuery.data);

  if (!isReady) {
    return (
      <div
        className={cn(
          "px-4 py-6",
          fullscreen && "min-h-screen bg-background text-foreground",
        )}
      >
        <LoadingState rows={6} />
      </div>
    );
  }

  if (!token) {
    const nextPath = activeConversationId
      ? `/messages/${encodeURIComponent(activeConversationId)}`
      : isRequestInboxRoute
        ? "/messages/requests"
      : "/messages";

    return (
      <div
        className={cn(
          "mx-auto w-full max-w-xl px-4 py-6",
          fullscreen &&
            "flex min-h-screen max-w-none items-center justify-center bg-background text-foreground",
        )}
      >
        <div
          className={
            fullscreen
              ? "w-full max-w-xl rounded-md bg-surface p-6 shadow-[inset_0_0_0_1px_var(--border)]"
              : ""
          }
        >
          <EmptyState
            title="登录后查看私信"
            description="私信会话、陌生人消息和在线状态需要登录后同步。"
            action={
              <TextAction href={`/login?next=${encodeURIComponent(nextPath)}`}>
                去登录
              </TextAction>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <section
      className={cn(
        "min-h-[620px] overflow-hidden bg-background text-foreground",
        fullscreen
          ? "h-screen"
          : "h-[calc(100vh-64px)] lg:h-[calc(100vh-72px)]",
      )}
    >
      <div className="grid size-full min-h-0 lg:grid-cols-[248px_minmax(0,1fr)]">
        <ConversationSidebar
          activeConversationId={selectedConversationId}
          className={cn(
            isThreadRoute || isRequestInboxRoute ? "hidden lg:flex" : "flex",
          )}
          conversations={visibleConversations}
          incomingRequests={incomingRequests}
          isLoading={listIsLoading}
          query={query}
          requestCount={summaryQuery.data?.request_count ?? incomingRequests.length}
          setQuery={setQuery}
          showBackButton={!isThreadRoute && !isRequestInboxRoute}
          showRequestInbox={isRequestInboxRoute}
        />

        <main
          className={cn(
            "min-h-0 min-w-0 flex-col bg-background",
            isThreadRoute ||
              isRequestInboxRoute ||
              selectedConversation ||
              shouldShowStartPanel
              ? "flex"
              : "hidden lg:flex",
          )}
        >
          {listError ? (
            <div className="bg-surface-raised px-5 py-3">
              <ErrorState
                title="私信暂时无法加载"
                description={getErrorMessage(listError)}
              />
            </div>
          ) : null}

          {isRequestInboxRoute ? (
            <RequestInboxPane
              isLoading={requestsQuery.isPending && !requestsQuery.data}
              requestCount={summaryQuery.data?.request_count ?? incomingRequests.length}
              requests={incomingRequests}
            />
          ) : shouldShowStartPanel ? (
            <StartConversationPane
              initialTargetUsername={targetUsername}
              shareDraft={shareDraft}
              onStarted={(conversationId) =>
                router.push(`/messages/${encodeURIComponent(conversationId)}`)
              }
            />
          ) : selectedConversation ? (
            <ConversationThread
              conversation={selectedConversation}
              conversationId={selectedConversation.id}
              currentUserId={currentUserQuery.data?.id}
              onShareDraftSent={() =>
                router.replace(
                  `/messages/${encodeURIComponent(selectedConversation.id)}`,
                  {
                    scroll: false,
                  },
                )
              }
              shareDraft={shareDraft}
              showBackButton={isThreadRoute}
            />
          ) : selectedConversationId ? (
            <MissingConversationPane
              conversationId={selectedConversationId}
              isLoading={
                conversationsQuery.isPending ||
                requestsQuery.isPending ||
                archivedQuery.isPending
              }
            />
          ) : (
            <EmptyThreadPane />
          )}
        </main>
      </div>
    </section>
  );
}

function ConversationSidebar({
  activeConversationId,
  className,
  conversations,
  incomingRequests,
  isLoading,
  query,
  requestCount,
  setQuery,
  showBackButton,
  showRequestInbox,
}: {
  activeConversationId?: string;
  className?: string;
  conversations: MessageConversation[];
  incomingRequests: MessageConversation[];
  isLoading: boolean;
  query: string;
  requestCount: number;
  setQuery: (query: string) => void;
  showBackButton: boolean;
  showRequestInbox: boolean;
}) {
  const filteredRequests = filterConversations(incomingRequests, query);
  const hasQuery = Boolean(query.trim());
  const shouldShowRequestEntry =
    !hasQuery ? requestCount > 0 || incomingRequests.length > 0 : filteredRequests.length > 0;

  return (
    <aside
      className={cn(
        "min-h-0 w-full flex-col bg-background-soft lg:w-[248px]",
        className,
      )}
    >
      <div className="flex items-center gap-2 px-3 py-3">
        {showBackButton ? <MessageBackButton /> : null}
        <label className="relative block min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索"
            className="h-8 rounded-md border-0 bg-surface pl-8 text-xs text-foreground placeholder:text-muted-foreground shadow-[inset_0_0_0_1px_var(--input)] focus-visible:ring-2 focus-visible:ring-primary/25"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="px-3 py-4">
            <LoadingState rows={8} />
          </div>
        ) : (
          <div className="space-y-1 px-2 pb-3">
            {shouldShowRequestEntry ? (
              <RequestInboxRow
                active={Boolean(
                  showRequestInbox ||
                    (activeConversationId &&
                      incomingRequests.some(
                      (conversation) => conversation.id === activeConversationId,
                    )),
                )}
                count={requestCount || incomingRequests.length}
                href="/messages/requests"
              />
            ) : null}

            {conversations.length === 0 && !shouldShowRequestEntry ? (
              <EmptyState
                className="px-4 py-14"
                title={hasQuery ? "没有找到相关私信" : "还没有私信"}
                description={hasQuery ? "换个关键词再试。" : "新的会话会显示在这里。"}
              />
            ) : (
              conversations.map((conversation) => (
                <ConversationListRow
                  key={conversation.id}
                  active={conversation.id === activeConversationId}
                  conversation={conversation}
                />
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function RequestInboxRow({
  active,
  count,
  href,
}: {
  active: boolean;
  count: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "grid min-h-[58px] grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2.5 py-2 text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        active
          ? "bg-surface-raised text-foreground ring-1 ring-primary/20"
          : "hover:bg-surface hover:text-foreground",
      )}
    >
      <span className="relative flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <UserPlus className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-foreground">
          陌生人消息
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {count > 0 ? `${count} 条待处理` : "查看陌生人请求"}
        </span>
      </span>
      {count > 0 ? (
        <span className="inline-flex min-w-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-3 text-primary-foreground">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

function ConversationListRow({
  active,
  conversation,
}: {
  active: boolean;
  conversation: MessageConversation;
}) {
  const displayName = getUserDisplayName(conversation.participant);
  const requestDirection = getRequestDirection(conversation);

  return (
    <Link
      href={`/messages/${encodeURIComponent(conversation.id)}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "grid min-h-[58px] grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2.5 py-2 text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        active
          ? "bg-surface-raised text-foreground ring-1 ring-primary/20"
          : "hover:bg-surface hover:text-foreground",
      )}
    >
      <MessageUserAvatar
        online={conversation.peer_online}
        onlineVisible={conversation.peer_online_status_visible}
        user={conversation.participant}
      />
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-foreground">
            {displayName}
          </span>
          {conversation.pinned ? (
            <Pin className="size-3 text-subtle-foreground" aria-hidden="true" />
          ) : null}
          {conversation.muted ? (
            <BellOff className="size-3 text-subtle-foreground" aria-hidden="true" />
          ) : null}
          {requestDirection === "outgoing" ? (
            <span className="shrink-0 text-[10px] text-subtle-foreground">等待</span>
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {formatConversationPreview(conversation)}
        </span>
      </span>
      <span className="flex min-w-0 flex-col items-end gap-1">
        <span className="text-[10px] text-subtle-foreground">
          {formatShortTime(conversation.updated_at)}
        </span>
        {conversation.unread_count > 0 ? (
          <span className="size-1.5 rounded-full bg-primary" />
        ) : null}
      </span>
    </Link>
  );
}

function ConversationThread({
  conversation,
  conversationId,
  currentUserId,
  onShareDraftSent,
  shareDraft,
  showBackButton,
}: {
  conversation: MessageConversation;
  conversationId: string;
  currentUserId?: string;
  onShareDraftSent: () => void;
  shareDraft: MessageShareSnapshot | null;
  showBackButton: boolean;
}) {
  const router = useRouter();
  const messagesQuery = useConversationMessagesQuery(
    { conversationId, limit: 50 },
    Boolean(conversationId),
  );
  const conversationActionMutation = useMessageConversationActionMutation();
  const requestActionMutation = useMessageRequestActionMutation();
  const blockMutation = useMessageBlockMutation();
  const requestDirection = getRequestDirection(conversation);

  useEffect(() => {
    if (conversation.unread_count <= 0) {
      return;
    }

    conversationActionMutation.mutate({
      conversationId,
      type: "read",
    });
    // Read cursor is intentionally invisible to users.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, conversation.unread_count, conversationId]);

  return (
    <>
      <ThreadHeader
        conversation={conversation}
        disabled={
          conversationActionMutation.isPending || blockMutation.isPending
        }
        onArchive={() =>
          conversationActionMutation.mutate({
            conversationId,
            type: conversation.archived ? "unarchive" : "archive",
          })
        }
        onDelete={() =>
          conversationActionMutation.mutate(
            {
              conversationId,
              type: "delete",
            },
            {
              onSuccess: () => router.replace("/messages"),
            },
          )
        }
        onMute={() =>
          conversationActionMutation.mutate({
            conversationId,
            type: conversation.muted ? "unmute" : "mute",
          })
        }
        onPin={() =>
          conversationActionMutation.mutate({
            conversationId,
            type: conversation.pinned ? "unpin" : "pin",
          })
        }
        onReport={() =>
          conversationActionMutation.mutate({
            conversationId,
            reason: "私信会话违规",
            type: "report",
          })
        }
        onBlock={() =>
          blockMutation.mutate({
            type: conversation.blocked ? "unblock" : "block",
            username: conversation.participant.username,
          })
        }
        showBackButton={showBackButton}
      />

      {requestDirection === "incoming" ? (
        <IncomingRequestNotice
          conversation={conversation}
          disabled={requestActionMutation.isPending}
          onAccept={() => {
            if (!conversation.request_id) {
              return;
            }
            requestActionMutation.mutate({
              requestId: conversation.request_id,
              type: "accept",
            });
          }}
          onReject={() => {
            if (!conversation.request_id) {
              return;
            }
            requestActionMutation.mutate({
              requestId: conversation.request_id,
              type: "reject",
            });
          }}
        />
      ) : null}

      {requestDirection === "outgoing" ? (
        <SystemLine>等待对方通过后可继续聊天</SystemLine>
      ) : null}

      <section className="min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-5">
        {messagesQuery.isPending ? (
          <LoadingState rows={7} />
        ) : messagesQuery.isError ? (
          <ErrorState
            title="消息暂时无法加载"
            description={getErrorMessage(messagesQuery.error)}
          />
        ) : messagesQuery.data.messages.length === 0 ? (
          <EmptyState
            className="py-20"
            title="暂无消息"
            description="发送第一条文字或分享卡片后，会出现在这里。"
          />
        ) : (
          <MessageList
            conversationId={conversationId}
            currentUserId={currentUserId}
            messages={messagesQuery.data.messages}
          />
        )}
      </section>

      <MessageComposer
        canSend={conversation.can_send && requestDirection === "none"}
        conversationId={conversationId}
        disabledReason={conversation.disable_reason}
        onShareDraftSent={onShareDraftSent}
        requestDirection={requestDirection}
        shareDraft={shareDraft}
      />
    </>
  );
}

function ThreadHeader({
  conversation,
  disabled,
  onArchive,
  onBlock,
  onDelete,
  onMute,
  onPin,
  onReport,
  showBackButton,
}: {
  conversation: MessageConversation;
  disabled: boolean;
  onArchive: () => void;
  onBlock: () => void;
  onDelete: () => void;
  onMute: () => void;
  onPin: () => void;
  onReport: () => void;
  showBackButton: boolean;
}) {
  const displayName = getUserDisplayName(conversation.participant);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 bg-background-soft px-3 lg:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        {showBackButton ? <MessageBackButton /> : null}
        <MessageUserAvatar
          online={conversation.peer_online}
          onlineVisible={conversation.peer_online_status_visible}
          size="sm"
          user={conversation.participant}
        />
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-foreground">
            {displayName}
          </h1>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {formatOnlineStatus(conversation)}
          </p>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            aria-label="更多会话操作"
          >
            <MoreHorizontal className="size-5" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={disabled} onSelect={onPin}>
            {conversation.pinned ? (
              <PinOff className="size-4" aria-hidden="true" />
            ) : (
              <Pin className="size-4" aria-hidden="true" />
            )}
            {conversation.pinned ? "取消置顶" : "置顶"}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={disabled} onSelect={onMute}>
            <BellOff className="size-4" aria-hidden="true" />
            {conversation.muted ? "取消免打扰" : "免打扰"}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={disabled} onSelect={onArchive}>
            {conversation.archived ? (
              <ArchiveRestore className="size-4" aria-hidden="true" />
            ) : (
              <Archive className="size-4" aria-hidden="true" />
            )}
            {conversation.archived ? "取消归档" : "归档"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={disabled} onSelect={onReport}>
            <ShieldAlert className="size-4" aria-hidden="true" />
            举报会话
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={disabled}
            variant="destructive"
            onSelect={onDelete}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            删除本地会话
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={disabled}
            variant="destructive"
            onSelect={onBlock}
          >
            <Ban className="size-4" aria-hidden="true" />
            {conversation.blocked ? "解除拉黑" : "拉黑用户"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

function IncomingRequestNotice({
  conversation,
  disabled,
  onAccept,
  onReject,
}: {
  conversation: MessageConversation;
  disabled: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <section className="bg-surface-raised px-5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">陌生人消息</p>
          <p className="mt-1 text-xs text-muted-foreground">
            接受后才能继续聊天；忽略后对方不能继续发送。
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={disabled || !canViewerAcceptRequest(conversation)}
            onClick={onAccept}
            className="h-8 rounded-md"
          >
            <Check className="size-3.5" aria-hidden="true" />
            接受
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled || !canViewerRejectRequest(conversation)}
            onClick={onReject}
            className="h-8 rounded-md"
          >
            忽略
          </Button>
        </div>
      </div>
    </section>
  );
}

function RequestInboxPane({
  isLoading,
  requestCount,
  requests,
}: {
  isLoading: boolean;
  requestCount: number;
  requests: MessageConversation[];
}) {
  const requestActionMutation = useMessageRequestActionMutation();

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 bg-background-soft px-3 lg:px-4">
        <MessageBackButton />
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-foreground">
            陌生人消息
          </h1>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {requestCount > 0 ? `${requestCount} 条待处理` : "没有待处理请求"}
          </p>
        </div>
      </header>
      <section className="min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-6">
        {isLoading ? (
          <LoadingState rows={6} />
        ) : requests.length === 0 ? (
          <EmptyState
            className="py-20"
            title="暂无陌生人消息"
            description="非互关用户发来的首条消息会显示在这里。"
          />
        ) : (
          <div className="mx-auto w-full max-w-3xl space-y-2">
            {requests.map((conversation) => (
              <RequestInboxListItem
                key={conversation.id}
                conversation={conversation}
                disabled={requestActionMutation.isPending}
                onAccept={() => {
                  if (!conversation.request_id) {
                    return;
                  }

                  requestActionMutation.mutate({
                    requestId: conversation.request_id,
                    type: "accept",
                  });
                }}
                onReject={() => {
                  if (!conversation.request_id) {
                    return;
                  }

                  requestActionMutation.mutate({
                    requestId: conversation.request_id,
                    type: "reject",
                  });
                }}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function RequestInboxListItem({
  conversation,
  disabled,
  onAccept,
  onReject,
}: {
  conversation: MessageConversation;
  disabled: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const displayName = getUserDisplayName(conversation.participant);

  return (
    <article className="grid gap-3 rounded-md bg-surface px-3 py-3 shadow-[inset_0_0_0_1px_var(--border)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <Link
        href={`/messages/${encodeURIComponent(conversation.id)}`}
        className="grid min-w-0 grid-cols-[40px_minmax(0,1fr)] gap-3 rounded-md py-1 pr-2 transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <MessageUserAvatar user={conversation.participant} />
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-semibold text-foreground">
              {displayName}
            </span>
            <span className="shrink-0 text-[10px] text-subtle-foreground">
              {formatShortTime(conversation.updated_at)}
            </span>
          </span>
          <span className="mt-1 block truncate text-xs text-muted-foreground">
            {conversation.last_message?.text || formatConversationPreview(conversation)}
          </span>
        </span>
      </Link>
      <div className="flex items-center justify-end gap-2 sm:justify-start">
        <Button
          type="button"
          size="sm"
          disabled={disabled || !canViewerAcceptRequest(conversation)}
          onClick={onAccept}
          className="h-8 rounded-md"
        >
          接受
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled || !canViewerRejectRequest(conversation)}
          onClick={onReject}
          className="h-8 rounded-md"
        >
          忽略
        </Button>
      </div>
    </article>
  );
}

function MessageBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label="返回上一级"
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      onClick={() => {
        router.push(getMessageReturnTarget());
      }}
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
    </button>
  );
}

function MessageList({
  conversationId,
  currentUserId,
  messages,
}: {
  conversationId: string;
  currentUserId?: string;
  messages: Message[];
}) {
  const sortedMessages = [...messages].reverse();

  return (
    <div className="flex w-full flex-col gap-4">
      {sortedMessages.map((message, index) => {
        const previousMessage = index > 0 ? sortedMessages[index - 1] : null;
        const shouldShowTime =
          !previousMessage ||
          Math.abs(
            new Date(message.created_at).getTime() -
              new Date(previousMessage.created_at).getTime(),
          ) >
            5 * 60 * 1000;

        return (
          <div key={message.id}>
            {shouldShowTime ? (
              <TimeDivider value={message.created_at} />
            ) : null}
            <MessageRow
              conversationId={conversationId}
              isOwn={Boolean(currentUserId && message.sender.id === currentUserId)}
              message={message}
            />
          </div>
        );
      })}
    </div>
  );
}

function MessageRow({
  conversationId,
  isOwn,
  message,
}: {
  conversationId: string;
  isOwn: boolean;
  message: Message;
}) {
  const actionMutation = useMessageActionMutation(conversationId);
  const isImage = message.type === "image";
  const isShare = message.type.startsWith("share_");
  const isRich = isImage || isShare;
  const canRecall = isOwn && !isRecalled(message);

  return (
    <article
      className={cn(
        "group flex items-start gap-2",
        isOwn ? "justify-end" : "justify-start",
      )}
    >
      {!isOwn ? <MessageUserAvatar size="sm" user={message.sender} /> : null}

      <div
        className={cn(
          "flex max-w-[72%] flex-col",
          isOwn ? "items-end" : "items-start",
        )}
      >
        <div
          className={cn(
            "max-w-full overflow-hidden rounded-md px-3 py-2 text-sm leading-6 shadow-sm",
            isOwn
              ? "rounded-br-sm bg-primary text-primary-foreground"
              : "rounded-bl-sm bg-surface-raised text-foreground shadow-[inset_0_0_0_1px_var(--border)]",
            isRich && "bg-transparent p-0",
          )}
        >
          <MessageBody isOwn={isOwn && !isRich} message={message} />
        </div>

        <MessageActions
          canRecall={canRecall}
          disabled={actionMutation.isPending}
          isOwn={isOwn}
          onDelete={() =>
            actionMutation.mutate({ messageId: message.id, type: "delete" })
          }
          onRecall={() =>
            actionMutation.mutate({ messageId: message.id, type: "recall" })
          }
          onReport={() =>
            actionMutation.mutate({
              messageId: message.id,
              reason: "私信内容违规",
              type: "report",
            })
          }
        />
      </div>

      {isOwn ? <MessageUserAvatar size="sm" user={message.sender} /> : null}
    </article>
  );
}

function MessageActions({
  canRecall,
  disabled,
  isOwn,
  onDelete,
  onRecall,
  onReport,
}: {
  canRecall: boolean;
  disabled: boolean;
  isOwn: boolean;
  onDelete: () => void;
  onRecall: () => void;
  onReport: () => void;
}) {
  return (
    <div className="mt-1 flex items-center gap-2 text-[11px] text-subtle-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
      {canRecall ? (
        <button
          type="button"
          disabled={disabled}
          className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          onClick={onRecall}
        >
          撤回
        </button>
      ) : null}
      <button
        type="button"
        disabled={disabled}
        className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        onClick={onDelete}
      >
        删除
      </button>
      {!isOwn ? (
        <button
          type="button"
          disabled={disabled}
          className="hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          onClick={onReport}
        >
          举报
        </button>
      ) : null}
    </div>
  );
}

function MessageBody({
  isOwn,
  message,
}: {
  isOwn: boolean;
  message: Message;
}) {
  if (isRecalled(message)) {
    return (
      <span className={isOwn ? "text-primary-foreground/75" : "text-muted-foreground"}>
        消息已撤回
      </span>
    );
  }

  if (message.viewer_deleted) {
    return (
      <span className={isOwn ? "text-primary-foreground/75" : "text-muted-foreground"}>
        这条消息已删除
      </span>
    );
  }

  if (message.status === "unavailable") {
    return (
      <span className={isOwn ? "text-primary-foreground/75" : "text-muted-foreground"}>
        内容暂不可查看
      </span>
    );
  }

  if (message.type.startsWith("share_")) {
    return message.share ? (
      <MessageSharePreview compact share={message.share} />
    ) : (
      <span className={isOwn ? "text-primary-foreground/75" : "text-muted-foreground"}>
        内容暂不可查看
      </span>
    );
  }

  if (message.type === "image") {
    if (message.status === "image_rejected") {
      return (
        <span className={isOwn ? "text-primary-foreground/75" : "text-muted-foreground"}>
          图片审核失败
        </span>
      );
    }

    return message.image_url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={message.image_url}
        alt="私信图片"
        className="max-h-80 max-w-[280px] rounded-[8px] object-contain lg:max-w-[360px]"
      />
    ) : (
      <span className={isOwn ? "text-primary-foreground/75" : "text-muted-foreground"}>
        图片暂不可查看
      </span>
    );
  }

  return (
    <p
      className={cn(
        "whitespace-pre-wrap break-words",
        isOwn ? "text-primary-foreground" : "text-foreground",
      )}
    >
      {message.body || "消息暂不可查看"}
    </p>
  );
}

function MessageComposer({
  canSend,
  conversationId,
  disabledReason,
  onShareDraftSent,
  requestDirection,
  shareDraft,
}: {
  canSend: boolean;
  conversationId: string;
  disabledReason?: string | null;
  onShareDraftSent: () => void;
  requestDirection: "incoming" | "none" | "outgoing";
  shareDraft: MessageShareSnapshot | null;
}) {
  const [body, setBody] = useState("");
  const [localError, setLocalError] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendMutation = useSendMessageMutation();
  const uploadImageMutation = useUploadImageMutation();
  const canEdit = canSend || requestDirection !== "none";
  const isSubmitting = sendMutation.isPending || uploadImageMutation.isPending;

  function clearComposerErrors() {
    if (localError) {
      setLocalError("");
    }

    if (sendMutation.isError) {
      sendMutation.reset();
    }

    if (uploadImageMutation.isError) {
      uploadImageMutation.reset();
    }
  }

  function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const draft = buildDraft(body, shareDraft);

    if (!draft) {
      return;
    }

    if (!canSend) {
      setLocalError(formatComposerSendFailure(requestDirection, disabledReason));
      return;
    }

    clearComposerErrors();
    sendMutation.mutate(
      {
        conversationId,
        message: draft,
      },
      {
        onSuccess: () => {
          setBody("");
          setLocalError("");

          if (shareDraft) {
            onShareDraftSent();
          }
        },
      },
    );
  }

  function insertEmoji(emoji: string) {
    if (shareDraft) {
      return;
    }

    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? body.length;
    const end = textarea?.selectionEnd ?? body.length;
    const nextBody = `${body.slice(0, start)}${emoji}${body.slice(end)}`;
    const nextCaret = start + emoji.length;

    setBody(nextBody);
    setEmojiOpen(false);
    clearComposerErrors();

    window.requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(nextCaret, nextCaret);
    });
  }

  function handleImageButtonClick() {
    if (shareDraft || isSubmitting) {
      return;
    }

    if (!canSend) {
      setLocalError(formatComposerSendFailure(requestDirection, disabledReason));
      return;
    }

    fileInputRef.current?.click();
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!canSend) {
      setLocalError(formatComposerSendFailure(requestDirection, disabledReason));
      return;
    }

    const validationError = validateMessageImageFile(file);

    if (validationError) {
      setLocalError(validationError);
      return;
    }

    clearComposerErrors();

    try {
      const result = await uploadImageMutation.mutateAsync({
        alt_text: "私信图片",
        file,
      });

      if (!isSendableMessageImage(result.attachment)) {
        setLocalError("图片上传失败，请换一张图片重试。");
        return;
      }

      await sendMutation.mutateAsync({
        conversationId,
        message: {
          image_url: result.attachment.url,
          type: "image",
        },
      });

      setEmojiOpen(false);
      setLocalError("");
    } catch (error) {
      setLocalError(getErrorMessage(error));
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    submit();
  }

  return (
    <footer className="shrink-0 bg-background-soft px-3 py-3">
      {!canEdit ? (
        <div className="flex min-h-9 items-center rounded-md bg-surface-raised px-3 text-sm text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]">
          {formatComposerDisabledReason(requestDirection, disabledReason)}
        </div>
      ) : (
        <form className="relative space-y-2" onSubmit={submit}>
          {shareDraft ? <MessageSharePreview compact share={shareDraft} /> : null}
          {emojiOpen ? (
            <div className="absolute bottom-14 left-1 z-10 grid w-[260px] grid-cols-8 gap-1 rounded-md border border-border bg-surface-raised p-2 shadow-2xl">
              {MESSAGE_EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="flex size-7 items-center justify-center rounded-sm text-base transition-colors hover:bg-surface-hover"
                  onClick={() => insertEmoji(emoji)}
                  aria-label={`输入表情 ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept={IMAGE_UPLOAD_ACCEPT}
            className="hidden"
            onChange={handleImageChange}
          />
          <div className="flex min-h-10 items-center gap-2 rounded-md bg-surface-raised px-2 py-1 shadow-[inset_0_0_0_1px_var(--input)] focus-within:ring-2 focus-within:ring-primary/20">
            <button
              type="button"
              disabled={Boolean(shareDraft)}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:text-subtle-foreground"
              aria-label="选择表情"
              aria-expanded={emojiOpen}
              onClick={() => {
                if (shareDraft) {
                  return;
                }

                setEmojiOpen((open) => !open);
              }}
            >
              <Smile className="size-4" aria-hidden="true" />
            </button>
            <Textarea
              ref={textareaRef}
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
                clearComposerErrors();
              }}
              onKeyDown={handleKeyDown}
              placeholder={shareDraft ? "发送这张分享卡片" : "发送消息"}
              disabled={Boolean(shareDraft)}
              className="h-8 min-h-8 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-0 py-1.5 text-sm leading-5 text-foreground placeholder:text-muted-foreground shadow-none hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 disabled:opacity-100"
            />
            <button
              type="button"
              disabled={Boolean(shareDraft) || isSubmitting}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:text-subtle-foreground"
              aria-label={uploadImageMutation.isPending ? "图片上传中" : "发送图片"}
              onClick={handleImageButtonClick}
            >
              <ImageIcon className="size-4" aria-hidden="true" />
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!shareDraft && !body.trim())}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-surface-hover disabled:text-subtle-foreground"
              aria-label={isSubmitting ? "发送中" : shareDraft ? "发送分享卡片" : "发送消息"}
            >
              <Send className="size-4" aria-hidden="true" />
            </button>
          </div>
          {localError || sendMutation.isError || uploadImageMutation.isError ? (
            <p className="px-3 text-xs text-destructive">
              {localError ||
                getErrorMessage(sendMutation.error ?? uploadImageMutation.error)}
            </p>
          ) : null}
        </form>
      )}
    </footer>
  );
}

function StartConversationPane({
  initialTargetUsername,
  onStarted,
  shareDraft,
}: {
  initialTargetUsername: string;
  onStarted: (conversationId: string) => void;
  shareDraft: MessageShareSnapshot | null;
}) {
  const [targetUsername, setTargetUsername] = useState(initialTargetUsername);
  const [body, setBody] = useState("");
  const startMutation = useStartConversationMutation();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const username = targetUsername.trim();
    const draft = buildDraft(body, shareDraft);

    if (!username || !draft) {
      return;
    }

    startMutation.mutate(
      {
        message: draft,
        target_username: username,
      },
      {
        onSuccess: (result) => {
          setBody("");
          onStarted(result.conversation.id);
        },
      },
    );
  }

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-4">
      <form
        className="w-full max-w-md rounded-md bg-surface p-5 shadow-[inset_0_0_0_1px_var(--border)]"
        onSubmit={submit}
      >
        <h1 className="text-base font-semibold text-foreground">
          {shareDraft ? "发送给好友" : "发起私信"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          非互关用户只会收到一条陌生人请求；对方接受前不能连续追发。
        </p>
        <Input
          value={targetUsername}
          onChange={(event) => setTargetUsername(event.target.value)}
          placeholder="输入 username"
          className="mt-4 h-9"
        />
        {shareDraft ? (
          <MessageSharePreview compact share={shareDraft} />
        ) : (
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="发送消息"
            className="mt-3 min-h-24 resize-none"
          />
        )}
        {startMutation.isError ? (
          <p className="mt-3 text-xs text-destructive">
            {getErrorMessage(startMutation.error)}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end">
          <Button
            type="submit"
            disabled={
              startMutation.isPending ||
              !targetUsername.trim() ||
              (!shareDraft && !body.trim())
            }
          >
            <Send className="size-4" aria-hidden="true" />
            发送
          </Button>
        </div>
      </form>
    </div>
  );
}

function MissingConversationPane({
  conversationId,
  isLoading,
}: {
  conversationId: string;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="px-5 py-6">
        <LoadingState rows={6} />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-4">
      <EmptyState
        title="没有找到这个会话"
        description={`会话 ${conversationId} 不存在、已归档或你没有访问权限。`}
        action={<TextAction href="/messages">返回私信</TextAction>}
      />
    </div>
  );
}

function EmptyThreadPane() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-4">
      <div className="text-center">
        <MessageCircle
          className="mx-auto size-10 text-subtle-foreground"
          aria-hidden="true"
        />
        <h1 className="mt-4 text-sm font-semibold text-foreground">选择一个会话</h1>
        <p className="mt-2 text-sm text-muted-foreground">私信内容会显示在这里。</p>
        <Link
          href="/settings/privacy"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <Settings className="size-4" aria-hidden="true" />
          私信设置
        </Link>
      </div>
    </div>
  );
}

function TimeDivider({ value }: { value: string }) {
  return (
    <div className="mb-4 mt-1 text-center text-xs text-subtle-foreground">
      {formatDateTime(value)}
    </div>
  );
}

function SystemLine({ children }: { children: ReactNode }) {
  return (
    <div className="mx-4 my-2 rounded-md bg-warning/10 py-2 text-center text-xs text-warning">
      {children}
    </div>
  );
}

export function MessageSharePreview({
  compact = false,
  share,
}: {
  compact?: boolean;
  share: MessageShareSnapshot;
}) {
  const hasThumbnail = Boolean(share.thumbnail_url);

  return (
    <Link
      href={share.target_url || "#"}
      className={cn(
        "mt-2 block overflow-hidden rounded-md bg-surface-raised text-left shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-surface-hover",
        compact ? "w-[260px] max-w-full" : "w-[300px] max-w-full",
      )}
    >
      <div className="grid grid-cols-[68px_minmax(0,1fr)] gap-2 p-2">
        {hasThumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={share.thumbnail_url}
            alt=""
            className="aspect-square rounded-[6px] object-cover"
          />
        ) : (
          <span className="flex aspect-square items-center justify-center rounded-sm bg-surface-hover text-muted-foreground">
            <MessageCircle className="size-4" aria-hidden="true" />
          </span>
        )}
        <span className="min-w-0">
          <span className="block text-[11px] text-muted-foreground">
            {formatShareType(share.share_type)}
          </span>
          <span className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-foreground">
            {share.title || "内容暂不可查看"}
          </span>
          {share.summary ? (
            <span className="mt-1 line-clamp-1 text-xs text-muted-foreground">
              {share.summary}
            </span>
          ) : null}
        </span>
      </div>
    </Link>
  );
}

export function MessageUserAvatar({
  online,
  onlineVisible,
  size = "md",
  user,
}: {
  online?: boolean;
  onlineVisible?: boolean;
  size?: "sm" | "md" | "lg";
  user: MessageUserSummary;
}) {
  const name = getUserDisplayName(user);
  const sizeClass =
    size === "sm" ? "size-8 text-xs" : size === "lg" ? "size-11 text-sm" : "size-10 text-sm";

  return (
    <span className={cn("relative inline-flex shrink-0", sizeClass)}>
      {user.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatar_url}
          alt={`${name} 的头像`}
          className="size-full rounded-full object-cover"
        />
      ) : (
        <span className="flex size-full items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
      {onlineVisible ? (
        <span
          className={cn(
            "absolute bottom-0 right-0 size-2.5 rounded-full border border-background-soft",
            online ? "bg-success" : "bg-muted-foreground",
          )}
        />
      ) : null}
    </span>
  );
}

function buildDraft(
  body: string,
  shareDraft: MessageShareSnapshot | null,
): MessageDraft | null {
  if (shareDraft) {
    return {
      share: shareDraft,
      type: getShareMessageType(shareDraft),
    };
  }

  const text = body.trim();

  if (!text) {
    return null;
  }

  return {
    body: text,
    type: "text",
  };
}

function validateMessageImageFile(file: File) {
  const isAllowedType = IMAGE_UPLOAD_LIMITS.allowedMimeTypes.some(
    (mimeType) => mimeType === file.type,
  );

  if (!isAllowedType) {
    return "仅支持 JPG、PNG 或 WebP 图片。";
  }

  if (file.size > IMAGE_UPLOAD_LIMITS.maxBytes) {
    return "图片不能超过 5MB。";
  }

  return "";
}

function isSendableMessageImage(attachment: MediaAttachment) {
  return (
    attachment.kind === "image" &&
    Boolean(attachment.url) &&
    attachment.status !== "blocked" &&
    attachment.status !== "failed"
  );
}

function dedupeConversations(conversations: MessageConversation[]) {
  const byId = new Map<string, MessageConversation>();

  for (const conversation of conversations) {
    byId.set(conversation.id, conversation);
  }

  return Array.from(byId.values()).sort(
    (left, right) =>
      new Date(right.updated_at).getTime() -
      new Date(left.updated_at).getTime(),
  );
}

function filterConversations(
  conversations: MessageConversation[],
  query: string,
) {
  const keyword = query.trim().toLowerCase();

  if (!keyword) {
    return conversations;
  }

  return conversations.filter((conversation) => {
    const name = getUserDisplayName(conversation.participant);

    return (
      name.toLowerCase().includes(keyword) ||
      conversation.participant.username.toLowerCase().includes(keyword) ||
      formatConversationPreview(conversation).toLowerCase().includes(keyword)
    );
  });
}

function findConversation(
  conversationId: string | undefined,
  conversations: MessageConversation[],
) {
  if (!conversationId) {
    return undefined;
  }

  return conversations.find((conversation) => conversation.id === conversationId);
}

function isIncomingRequest(conversation: MessageConversation) {
  return getRequestDirection(conversation) === "incoming";
}

function getRequestDirection(
  conversation: MessageConversation,
): "incoming" | "none" | "outgoing" {
  if (
    conversation.request_direction === "incoming" ||
    conversation.request_direction === "outgoing" ||
    conversation.request_direction === "none"
  ) {
    return conversation.request_direction;
  }

  if (conversation.conversation_state === "incoming_request") {
    return "incoming";
  }

  if (conversation.conversation_state === "outgoing_request") {
    return "outgoing";
  }

  if (conversation.request_status !== "pending" || !conversation.request_id) {
    return "none";
  }

  if (conversation.request_to_me) {
    return "incoming";
  }

  if (conversation.request_created_by_me) {
    return "outgoing";
  }

  return conversation.box === "requests" ? "incoming" : "outgoing";
}

function canViewerAcceptRequest(conversation: MessageConversation) {
  if (typeof conversation.viewer_can_accept_request === "boolean") {
    return conversation.viewer_can_accept_request;
  }

  return getRequestDirection(conversation) === "incoming";
}

function canViewerRejectRequest(conversation: MessageConversation) {
  if (typeof conversation.viewer_can_reject_request === "boolean") {
    return conversation.viewer_can_reject_request;
  }

  return getRequestDirection(conversation) === "incoming";
}

function formatConversationPreview(conversation: MessageConversation) {
  const requestDirection = getRequestDirection(conversation);

  if (conversation.blocked) {
    return "无法继续发送消息";
  }

  if (requestDirection === "incoming") {
    return "发来一条陌生人消息";
  }

  if (requestDirection === "outgoing") {
    return "等待对方通过";
  }

  const message = conversation.last_message;

  if (!message) {
    return "暂无消息";
  }

  if (message.status === "recalled") {
    return "撤回了一条消息";
  }

  if (message.status === "image_rejected") {
    return "图片审核失败";
  }

  if (message.type === "image") {
    return "[图片]";
  }

  if (message.type.startsWith("share_")) {
    return message.text || formatShareMessageText(message.type);
  }

  return message.text || "消息";
}

function formatComposerDisabledReason(
  requestDirection: "incoming" | "none" | "outgoing",
  reason?: string | null,
) {
  if (requestDirection === "incoming") {
    return "接受后可继续聊天";
  }

  if (requestDirection === "outgoing") {
    return "等待对方通过后可继续聊天";
  }

  switch (reason) {
    case "blocked":
      return "你已拉黑对方，无法发送消息";
    case "privacy":
      return "对方隐私设置不允许接收私信";
    case "request_pending":
      return "陌生人请求未接受前不能继续追发";
    case "inactive":
      return "会话当前不可发送";
    default:
      return "当前不能继续发送私信";
  }
}

function formatComposerSendFailure(
  requestDirection: "incoming" | "none" | "outgoing",
  reason?: string | null,
) {
  if (requestDirection === "incoming") {
    return "发送失败：接受陌生人消息后才能回复。";
  }

  if (requestDirection === "outgoing") {
    return "发送失败：对方通过前不能继续发送。";
  }

  return `发送失败：${formatComposerDisabledReason(requestDirection, reason)}`;
}

function formatOnlineStatus(conversation: MessageConversation) {
  if (!conversation.peer_online_status_visible) {
    return "";
  }

  return conversation.peer_online ? "在线" : "离线";
}

function formatShareType(type: MessageShareSnapshot["share_type"]) {
  switch (type) {
    case "comment":
      return "评论";
    case "community":
      return "社区";
    case "user":
      return "用户";
    case "post":
    default:
      return "帖子";
  }
}

function formatShareMessageText(type: string) {
  switch (type) {
    case "share_comment":
      return "分享[评论]";
    case "share_user":
      return "分享[用户]";
    case "share_community":
      return "分享[社区]";
    case "share_post":
    default:
      return "分享[帖子]";
  }
}

function isRecalled(message: Message) {
  return message.status === "recalled" || Boolean(message.recalled_at);
}

function getUserDisplayName(user: MessageUserSummary) {
  return user.display_name?.trim() || user.username;
}

function formatShortTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  if (sameDay) {
    return new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(date);
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}
