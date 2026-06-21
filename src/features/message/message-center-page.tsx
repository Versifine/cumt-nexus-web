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
  X,
} from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { LoadingState } from "@/components/feedback/loading-state";
import { NexusBrandMark } from "@/components/brand/nexus-brand-mark";
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
import { ContentBody } from "@/features/content/content-body";
import {
  createWhitelistedMediaEmbedFromResolvedContentEmbed,
  isBackendResolvableMediaEmbedUrl,
  resolveWhitelistedMediaEmbed,
  type WhitelistedMediaEmbed,
} from "@/features/content/media-embed";
import { MediaEmbedPlayer } from "@/features/content/media-embed-player";
import { useContentEmbedResolveQuery } from "@/features/content/queries";
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
  embedded?: boolean;
  fullscreen?: boolean;
  initialSearchParams?: MessageCenterSearchParams;
  showRequestInbox?: boolean;
};

export type MessageCenterSearchParams = Record<
  string,
  string | string[] | undefined
>;

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

const MESSAGE_RECALL_WINDOW_MS = 2 * 60 * 1000;

export function MessageCenterPage({
  activeConversationId,
  embedded = false,
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
  const usesLocalNavigation = embedded || !fullscreen;
  const [localConversationId, setLocalConversationId] = useState(activeConversationId);
  const [localRequestInboxOpen, setLocalRequestInboxOpen] =
    useState(showRequestInbox);
  const effectiveActiveConversationId = usesLocalNavigation
    ? localConversationId
    : activeConversationId;
  const isThreadRoute = Boolean(effectiveActiveConversationId);
  const isRequestInboxRoute = usesLocalNavigation
    ? localRequestInboxOpen
    : showRequestInbox;
  const targetUsername = searchParams.get("to") ?? "";
  const searchShareDraft = useMemo(
    () => getMessageShareDraftFromParams(searchParams),
    [searchParams],
  );
  const [clearedShareDraftKey, setClearedShareDraftKey] = useState("");
  const searchShareDraftKey = getMessageShareKey(searchShareDraft);
  const shareDraft =
    searchShareDraftKey && clearedShareDraftKey === searchShareDraftKey
      ? null
      : searchShareDraft;
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
    canLoad && Boolean(effectiveActiveConversationId),
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
  const normalizedTargetUsername = targetUsername.trim();
  const targetConversation = normalizedTargetUsername
    ? findConversationByParticipant(
        normalizedTargetUsername,
        allKnownConversations,
      )
    : undefined;

  const selectedConversation =
    findConversation(effectiveActiveConversationId, allKnownConversations) ??
    targetConversation ??
    (!effectiveActiveConversationId &&
    !normalizedTargetUsername &&
    !shareDraft &&
    !isRequestInboxRoute
      ? visibleConversations[0]
      : undefined);
  const selectedConversationId =
    selectedConversation?.id ?? effectiveActiveConversationId;
  const shouldShowPendingConversation = Boolean(
    !isRequestInboxRoute && !selectedConversationId && normalizedTargetUsername,
  );
  const shouldShowStartPanel = Boolean(
    !isRequestInboxRoute &&
      !selectedConversationId &&
      !normalizedTargetUsername &&
      shareDraft,
  );
  const listError = conversationsQuery.error ?? requestsQuery.error;
  const listIsLoading =
    conversationsQuery.isPending || (requestsQuery.isPending && !requestsQuery.data);

  function openConversation(conversationId: string) {
    if (usesLocalNavigation) {
      setLocalConversationId(conversationId);
      setLocalRequestInboxOpen(false);
      return;
    }

    router.push(`/messages/${encodeURIComponent(conversationId)}`);
  }

  function openRequestInbox() {
    if (usesLocalNavigation) {
      setLocalConversationId(undefined);
      setLocalRequestInboxOpen(true);
      return;
    }

    router.push("/messages/requests");
  }

  function closeLocalDetail() {
    if (!usesLocalNavigation) {
      return;
    }

    setLocalConversationId(undefined);
    setLocalRequestInboxOpen(false);
  }

  function handleShareDraftSettled(conversationId?: string) {
    if (searchShareDraftKey) {
      setClearedShareDraftKey(searchShareDraftKey);
    }

    if (!usesLocalNavigation && conversationId) {
      router.replace(`/messages/${encodeURIComponent(conversationId)}`, {
        scroll: false,
      });
    }
  }

  function handleConversationStarted(conversationId: string) {
    handleShareDraftSettled(conversationId);
    openConversation(conversationId);
  }

  if (!isReady) {
    if (fullscreen) {
      return (
        <MessageStandaloneShell>
          <div className="rounded-lg bg-surface px-4 py-5 sm:px-5">
            <LoadingState rows={6} />
          </div>
        </MessageStandaloneShell>
      );
    }

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
    const nextPath = effectiveActiveConversationId
      ? `/messages/${encodeURIComponent(effectiveActiveConversationId)}`
      : isRequestInboxRoute
        ? "/messages/requests"
      : "/messages";

    if (fullscreen) {
      return (
        <MessageStandaloneShell
          description="私信会话、陌生人消息和在线状态都需要登录后同步。"
          title="登录后查看私信"
        >
          <EmptyState
            className="bg-surface-raised"
            title="登录后查看私信"
            description="登录后可以继续处理会话、陌生人消息和分享内容。"
            action={
              <TextAction href={`/login?next=${encodeURIComponent(nextPath)}`}>
                去登录
              </TextAction>
            }
          />
        </MessageStandaloneShell>
      );
    }

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
              ? "w-full max-w-xl rounded-md bg-surface p-6"
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
        "overflow-hidden bg-background text-foreground",
        embedded ? "min-h-0" : "min-h-[620px]",
        fullscreen
          ? "h-screen"
          : embedded
            ? "h-full"
            : "h-[calc(100vh-64px)] lg:h-[calc(100vh-72px)]",
      )}
    >
      <div className="grid size-full min-h-0 lg:grid-cols-[248px_minmax(0,1fr)]">
        <ConversationSidebar
          activeConversationId={selectedConversationId}
          className={cn(
            isThreadRoute ||
              isRequestInboxRoute ||
              shouldShowPendingConversation ||
              shouldShowStartPanel
              ? "hidden lg:flex"
              : "flex",
          )}
          conversations={visibleConversations}
          incomingRequests={incomingRequests}
          isLoading={listIsLoading}
          query={query}
          requestCount={summaryQuery.data?.request_count ?? incomingRequests.length}
          setQuery={setQuery}
          onBack={usesLocalNavigation ? closeLocalDetail : undefined}
          onOpenConversation={
            usesLocalNavigation ? openConversation : undefined
          }
          onOpenRequestInbox={usesLocalNavigation ? openRequestInbox : undefined}
          showBackButton={!isThreadRoute && !isRequestInboxRoute}
          showRequestInbox={isRequestInboxRoute}
        />

        <main
          className={cn(
            "min-h-0 min-w-0 flex-col bg-background",
            isThreadRoute ||
              isRequestInboxRoute ||
              selectedConversation ||
              shouldShowPendingConversation ||
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
              onBack={usesLocalNavigation ? closeLocalDetail : undefined}
              onOpenConversation={
                usesLocalNavigation ? openConversation : undefined
              }
              requestCount={summaryQuery.data?.request_count ?? incomingRequests.length}
              requests={incomingRequests}
            />
          ) : shouldShowPendingConversation ? (
            <PendingConversationThread
              onBack={
                usesLocalNavigation
                  ? closeLocalDetail
                  : () => router.replace("/messages")
              }
              onShareDraftSent={() => handleShareDraftSettled()}
              onStarted={handleConversationStarted}
              shareDraft={shareDraft}
              targetUsername={normalizedTargetUsername}
            />
          ) : shouldShowStartPanel ? (
            <StartConversationPane
              conversations={visibleConversations.filter(isShareTargetConversation)}
              initialTargetUsername={targetUsername}
              shareDraft={shareDraft}
              onStarted={handleConversationStarted}
            />
          ) : selectedConversation ? (
            <ConversationThread
              conversation={selectedConversation}
              conversationId={selectedConversation.id}
              currentUserId={currentUserQuery.data?.id}
              onBack={usesLocalNavigation ? closeLocalDetail : undefined}
              onConversationDeleted={
                usesLocalNavigation
                  ? closeLocalDetail
                  : () => router.replace("/messages")
              }
              onConversationStarted={openConversation}
              onShareDraftSent={() =>
                handleShareDraftSettled(selectedConversation.id)
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

function MessageStandaloneShell({
  children,
  description = "同步私信前需要先确认当前账号。",
  title = "私信中心",
}: {
  children: ReactNode;
  description?: string;
  title?: string;
}) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between rounded-lg bg-surface px-4 py-3">
          <Link
            href="/"
            className="group flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <NexusBrandMark className="size-7 text-primary transition-colors group-hover:text-foreground" />
            <span>
              <span className="block text-sm font-semibold">CUMT Nexus</span>
              <span className="block text-xs text-muted-foreground">校园社区</span>
            </span>
          </Link>
          <TextAction href="/">信息流首页</TextAction>
        </header>

        <section className="grid flex-1 items-center py-8 lg:py-12">
          <div className="mx-auto w-full max-w-xl">
            <div className="mb-4">
              <p className="font-mono text-xs text-primary">私信 / 账号同步</p>
              <h1 className="mt-3 text-2xl font-semibold leading-8 tracking-normal">
                {title}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </div>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

function ConversationSidebar({
  activeConversationId,
  className,
  conversations,
  incomingRequests,
  isLoading,
  onBack,
  onOpenConversation,
  onOpenRequestInbox,
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
  onBack?: () => void;
  onOpenConversation?: (conversationId: string) => void;
  onOpenRequestInbox?: () => void;
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
        {showBackButton ? <MessageBackButton onBack={onBack} /> : null}
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
                onOpen={onOpenRequestInbox}
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
                  onOpen={onOpenConversation}
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
  onOpen,
}: {
  active: boolean;
  count: number;
  href: string;
  onOpen?: () => void;
}) {
  const className = cn(
    "grid min-h-[58px] w-full grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2.5 py-2 text-left text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
    active
      ? "bg-surface-raised text-foreground ring-1 ring-primary/20"
      : "hover:bg-surface hover:text-foreground",
  );
  const content = (
    <>
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
    </>
  );

  if (onOpen) {
    return (
      <button
        type="button"
        aria-current={active ? "page" : undefined}
        className={className}
        onClick={onOpen}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={className}
    >
      {content}
    </Link>
  );
}

function ConversationListRow({
  active,
  conversation,
  onOpen,
}: {
  active: boolean;
  conversation: MessageConversation;
  onOpen?: (conversationId: string) => void;
}) {
  const displayName = getUserDisplayName(conversation.participant);
  const requestDirection = getRequestDirection(conversation);

  const className = cn(
    "grid min-h-[58px] w-full grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2.5 py-2 text-left text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
    active
      ? "bg-surface-raised text-foreground ring-1 ring-primary/20"
      : "hover:bg-surface hover:text-foreground",
  );
  const content = (
    <>
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
    </>
  );

  if (onOpen) {
    return (
      <button
        type="button"
        aria-current={active ? "page" : undefined}
        className={className}
        onClick={() => onOpen(conversation.id)}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={`/messages/${encodeURIComponent(conversation.id)}`}
      aria-current={active ? "page" : undefined}
      className={className}
    >
      {content}
    </Link>
  );
}

function ConversationThread({
  conversation,
  conversationId,
  currentUserId,
  onBack,
  onConversationDeleted,
  onConversationStarted,
  onShareDraftSent,
  shareDraft,
  showBackButton,
}: {
  conversation: MessageConversation;
  conversationId: string;
  currentUserId?: string;
  onBack?: () => void;
  onConversationDeleted: () => void;
  onConversationStarted: (conversationId: string) => void;
  onShareDraftSent: () => void;
  shareDraft: MessageShareSnapshot | null;
  showBackButton: boolean;
}) {
  const messagesQuery = useConversationMessagesQuery(
    { conversationId, limit: 50 },
    Boolean(conversationId),
  );
  const conversationActionMutation = useMessageConversationActionMutation();
  const requestActionMutation = useMessageRequestActionMutation();
  const blockMutation = useMessageBlockMutation();
  const requestDirection = getRequestDirection(conversation);
  const isRejectedRequest = isRejectedRequestConversation(conversation);
  const canReopenRejectedRequest = canViewerReopenConversation(conversation);

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
              onSuccess: onConversationDeleted,
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
        onBack={onBack}
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

      {isRejectedRequest ? (
        <RejectedRequestNotice canReopen={canReopenRejectedRequest} />
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

      {canReopenRejectedRequest ? (
        <ReopenConversationComposer
          onConversationStarted={onConversationStarted}
          onShareDraftSent={onShareDraftSent}
          participant={conversation.participant}
          shareDraft={shareDraft}
        />
      ) : (
        <MessageComposer
          canSend={conversation.can_send && requestDirection === "none"}
          conversationId={conversationId}
          disabledReason={conversation.disable_reason}
          onShareDraftSent={onShareDraftSent}
          requestDirection={requestDirection}
          shareDraft={shareDraft}
        />
      )}
    </>
  );
}

function ThreadHeader({
  conversation,
  disabled,
  onBack,
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
  onBack?: () => void;
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
        {showBackButton ? <MessageBackButton onBack={onBack} /> : null}
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

function RejectedRequestNotice({ canReopen }: { canReopen: boolean }) {
  return (
    <section className="bg-surface-raised px-5 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">
          已忽略这条陌生人消息
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {canReopen
            ? "你可以主动发消息重新开启对话；发送成功后对方才能继续回复。"
            : "对方不能继续追发；如果需要重新开启对话，需要由接收方主动发起。"}
        </p>
      </div>
    </section>
  );
}

function RequestInboxPane({
  isLoading,
  onBack,
  onOpenConversation,
  requestCount,
  requests,
}: {
  isLoading: boolean;
  onBack?: () => void;
  onOpenConversation?: (conversationId: string) => void;
  requestCount: number;
  requests: MessageConversation[];
}) {
  const requestActionMutation = useMessageRequestActionMutation();

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 bg-background-soft px-3 lg:px-4">
        <MessageBackButton onBack={onBack} />
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
                onOpen={onOpenConversation}
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
  onOpen,
  onAccept,
  onReject,
}: {
  conversation: MessageConversation;
  disabled: boolean;
  onOpen?: (conversationId: string) => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  const displayName = getUserDisplayName(conversation.participant);
  const profileContent = (
    <>
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
    </>
  );
  const profileClassName =
    "grid min-w-0 grid-cols-[40px_minmax(0,1fr)] gap-3 rounded-md py-1 pr-2 text-left transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

  return (
    <article className="grid gap-3 rounded-md bg-surface-raised px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      {onOpen ? (
        <button
          type="button"
          className={profileClassName}
          onClick={() => onOpen(conversation.id)}
        >
          {profileContent}
        </button>
      ) : (
        <Link
          href={`/messages/${encodeURIComponent(conversation.id)}`}
          className={profileClassName}
        >
          {profileContent}
        </Link>
      )}
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

function MessageBackButton({ onBack }: { onBack?: () => void }) {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label="返回上一级"
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      onClick={() => {
        if (onBack) {
          onBack();
          return;
        }

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
  const hasEmbeddedBody = hasMessageBodyMediaEmbed(message.body);
  const isRich = isImage || isShare || hasEmbeddedBody;
  const [now, setNow] = useState(() => Date.now());
  const canRecall = isOwn && canRecallMessage(message, now);

  useEffect(() => {
    if (!isOwn || isRecalled(message)) {
      return;
    }

    const deadline = getMessageRecallDeadlineMs(message);

    if (deadline === null || deadline <= now) {
      return;
    }

    const timeout = window.setTimeout(
      () => setNow(Date.now()),
      deadline - now + 250,
    );

    return () => window.clearTimeout(timeout);
  }, [isOwn, message, now]);

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
            "flex flex-col",
            isRich ? "max-w-[92%] sm:max-w-[78%] lg:max-w-[620px]" : "max-w-[72%]",
            isOwn ? "items-end" : "items-start",
          )}
        >
        <div
          className={cn(
            "max-w-full overflow-hidden rounded-md px-3 py-2 text-sm leading-6",
            isOwn
              ? "rounded-br-sm bg-primary text-primary-foreground"
              : "rounded-bl-sm bg-surface-raised text-foreground",
            isRich && "bg-transparent p-0",
          )}
        >
          <MessageBody isOwn={isOwn} message={message} />
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
      <div className="space-y-2">
        {message.body ? (
          <MessageMarkdownBody
            isOwn={isOwn}
            mode={hasMessageBodyMediaEmbed(message.body) ? "rich" : "bubble"}
            value={message.body}
          />
        ) : null}
        <MessageSharePreview compact share={message.share} />
      </div>
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
    <MessageMarkdownBody
      isOwn={isOwn}
      mode={hasMessageBodyMediaEmbed(message.body) ? "rich" : "inline"}
      value={message.body || "消息暂不可查看"}
    />
  );
}

function MessageMarkdownBody({
  isOwn,
  mode,
  value,
}: {
  isOwn: boolean;
  mode: "bubble" | "inline" | "rich";
  value: string;
}) {
  const isRich = mode === "rich";
  const isBubble = mode === "bubble";

  return (
    <div
      className={cn(
        "max-w-full",
        isRich &&
          "w-fit rounded-md bg-surface-raised px-3 py-2 sm:max-w-[520px]",
        isBubble &&
          "block max-w-[260px] rounded-md px-3 py-2",
        isBubble && (isOwn ? "rounded-br-sm bg-primary" : "rounded-bl-sm bg-surface-raised"),
        !isRich && isOwn ? "text-primary-foreground" : "text-foreground",
      )}
    >
      <ContentBody
        value={value}
        className={cn(
          "max-w-full text-sm leading-6",
          "[&_p]:my-0 [&_p]:whitespace-pre-wrap [&_p]:leading-6",
          "[&_p+p]:mt-2 [&_ul]:my-2 [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:pl-5",
          "[&_blockquote]:my-2 [&_pre]:my-2 [&_hr]:my-3",
          "[&_.katex-display]:my-2 [&_[data-media-provider]]:my-2",
          !isRich && isOwn
            ? "text-primary-foreground [&_a]:text-primary-foreground [&_a]:decoration-primary-foreground/60 [&_strong]:text-primary-foreground"
            : "text-foreground",
        )}
      />
    </div>
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
  const [removedShareKey, setRemovedShareKey] = useState("");
  const [body, setBody] = useState("");
  const [localError, setLocalError] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendMutation = useSendMessageMutation();
  const uploadImageMutation = useUploadImageMutation();
  const canEdit = canSend || requestDirection !== "none";
  const isSubmitting = sendMutation.isPending || uploadImageMutation.isPending;
  const shareDraftKey = getMessageShareKey(shareDraft);
  const activeShareDraft =
    shareDraftKey && removedShareKey === shareDraftKey ? null : shareDraft;

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
    const draft = buildDraft(body, activeShareDraft);

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

          if (activeShareDraft) {
            onShareDraftSent();
          }
        },
      },
    );
  }

  function insertEmoji(emoji: string) {
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
    if (activeShareDraft || isSubmitting) {
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
        <div className="flex min-h-9 items-center rounded-md bg-surface-raised px-3 text-sm text-muted-foreground">
          {formatComposerDisabledReason(requestDirection, disabledReason)}
        </div>
      ) : (
        <form className="relative space-y-2" onSubmit={submit}>
          {activeShareDraft ? (
            <ComposerSharePreview
              share={activeShareDraft}
              onRemove={() => {
                setRemovedShareKey(shareDraftKey);
                onShareDraftSent();
              }}
            />
          ) : null}
          <MessageComposerEmbedPreview value={body} />
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
              disabled={false}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:text-subtle-foreground"
              aria-label="选择表情"
              aria-expanded={emojiOpen}
              onClick={() => {
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
              placeholder={activeShareDraft ? "添加留言" : "发送消息"}
              disabled={false}
              className="h-8 min-h-8 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-0 py-1.5 text-sm leading-5 text-foreground placeholder:text-muted-foreground shadow-none hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 disabled:opacity-100"
            />
            <button
              type="button"
              disabled={Boolean(activeShareDraft) || isSubmitting}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:text-subtle-foreground"
              aria-label={uploadImageMutation.isPending ? "图片上传中" : "发送图片"}
              onClick={handleImageButtonClick}
            >
              <ImageIcon className="size-4" aria-hidden="true" />
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!activeShareDraft && !body.trim())}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-surface-hover disabled:text-subtle-foreground"
              aria-label={isSubmitting ? "发送中" : activeShareDraft ? "发送分享卡片" : "发送消息"}
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

function MessageComposerEmbedPreview({ value }: { value: string }) {
  const resolvedEmbed = useResolvedMessageMediaEmbed(value);

  if (!resolvedEmbed.embed && !resolvedEmbed.isResolving) {
    return null;
  }

  return (
    <div className="w-fit max-w-full overflow-hidden rounded-md bg-surface-raised p-2">
      <div className="mb-1 flex items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
        <span>嵌入预览</span>
        <span className="font-mono text-[10px] text-subtle-foreground">
          发送后保留播放器
        </span>
      </div>
      {resolvedEmbed.embed ? (
        <MediaEmbedPlayer embed={resolvedEmbed.embed} />
      ) : (
        <div className="rounded-md bg-surface px-3 py-4 text-sm text-muted-foreground">
          正在解析抖音链接...
        </div>
      )}
    </div>
  );
}

function ComposerSharePreview({
  className,
  onRemove,
  share,
}: {
  className?: string;
  onRemove: () => void;
  share: MessageShareSnapshot;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-surface-raised",
        className,
      )}
    >
      <MessageSharePreview compact share={share} className="mt-0 w-full bg-transparent" />
      <button
        type="button"
        className="absolute right-2 top-2 inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-background/80 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        aria-label="移除分享卡片"
        onClick={onRemove}
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function ReopenConversationComposer({
  onConversationStarted,
  onShareDraftSent,
  participant,
  shareDraft,
}: {
  onConversationStarted: (conversationId: string) => void;
  onShareDraftSent: () => void;
  participant: MessageUserSummary;
  shareDraft: MessageShareSnapshot | null;
}) {
  const [removedShareKey, setRemovedShareKey] = useState("");
  const [body, setBody] = useState("");
  const [localError, setLocalError] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const startMutation = useStartConversationMutation();
  const uploadImageMutation = useUploadImageMutation();
  const isSubmitting = startMutation.isPending || uploadImageMutation.isPending;
  const shareDraftKey = getMessageShareKey(shareDraft);
  const activeShareDraft =
    shareDraftKey && removedShareKey === shareDraftKey ? null : shareDraft;

  function clearComposerErrors() {
    if (localError) {
      setLocalError("");
    }

    if (startMutation.isError) {
      startMutation.reset();
    }

    if (uploadImageMutation.isError) {
      uploadImageMutation.reset();
    }
  }

  function handleStarted(result: Awaited<ReturnType<typeof startMutation.mutateAsync>>) {
    if (!result.message || !canUseReopenedConversation(result.conversation)) {
      setLocalError("暂时无法重新开启这段私信，请稍后再试。");
      return;
    }

    setBody("");
    setEmojiOpen(false);
    onConversationStarted(result.conversation.id);

    if (activeShareDraft) {
      onShareDraftSent();
    }
  }

  function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const draft = buildDraft(body, activeShareDraft);

    if (!draft) {
      return;
    }

    clearComposerErrors();
    startMutation.mutate(
      {
        message: draft,
        target_username: participant.username,
      },
      {
        onSuccess: handleStarted,
      },
    );
  }

  function insertEmoji(emoji: string) {
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
    if (activeShareDraft || isSubmitting) {
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

      const started = await startMutation.mutateAsync({
        message: {
          image_url: result.attachment.url,
          type: "image",
        },
        target_username: participant.username,
      });

      handleStarted(started);
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
      <form className="relative space-y-2" onSubmit={submit}>
        {activeShareDraft ? (
          <ComposerSharePreview
            share={activeShareDraft}
            onRemove={() => {
              setRemovedShareKey(shareDraftKey);
              onShareDraftSent();
            }}
          />
        ) : null}
        <MessageComposerEmbedPreview value={body} />
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
            disabled={false}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:text-subtle-foreground"
            aria-label="选择表情"
            aria-expanded={emojiOpen}
            onClick={() => {
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
            placeholder={activeShareDraft ? "添加留言" : "发送消息"}
            disabled={false}
            className="h-8 min-h-8 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-0 py-1.5 text-sm leading-5 text-foreground placeholder:text-muted-foreground shadow-none hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 disabled:opacity-100"
          />
          <button
            type="button"
            disabled={Boolean(activeShareDraft) || isSubmitting}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:text-subtle-foreground"
            aria-label={uploadImageMutation.isPending ? "图片上传中" : "发送图片"}
            onClick={handleImageButtonClick}
          >
            <ImageIcon className="size-4" aria-hidden="true" />
          </button>
          <button
            type="submit"
            disabled={isSubmitting || (!activeShareDraft && !body.trim())}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-surface-hover disabled:text-subtle-foreground"
            aria-label={isSubmitting ? "发送中" : activeShareDraft ? "发送分享卡片" : "发送消息"}
          >
            <Send className="size-4" aria-hidden="true" />
          </button>
        </div>
        {localError || startMutation.isError || uploadImageMutation.isError ? (
          <p className="px-3 text-xs text-destructive">
            {localError ||
              getErrorMessage(startMutation.error ?? uploadImageMutation.error)}
          </p>
        ) : null}
      </form>
    </footer>
  );
}

function PendingConversationThread({
  onBack,
  onShareDraftSent,
  onStarted,
  shareDraft,
  targetUsername,
}: {
  onBack?: () => void;
  onShareDraftSent: () => void;
  onStarted: (conversationId: string) => void;
  shareDraft: MessageShareSnapshot | null;
  targetUsername: string;
}) {
  const participant = useMemo(
    () => createPendingMessageUser(targetUsername),
    [targetUsername],
  );

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 bg-background-soft px-3 lg:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <MessageBackButton onBack={onBack} />
          <MessageUserAvatar size="sm" user={participant} />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-foreground">
              {getUserDisplayName(participant)}
            </h1>
          </div>
        </div>
      </header>

      <section className="min-h-0 flex-1 overflow-y-auto px-4 py-5 lg:px-5" />

      <PendingConversationComposer
        onShareDraftSent={onShareDraftSent}
        onStarted={onStarted}
        shareDraft={shareDraft}
        targetUsername={targetUsername}
      />
    </>
  );
}

function PendingConversationComposer({
  onShareDraftSent,
  onStarted,
  shareDraft,
  targetUsername,
}: {
  onShareDraftSent: () => void;
  onStarted: (conversationId: string) => void;
  shareDraft: MessageShareSnapshot | null;
  targetUsername: string;
}) {
  const [removedShareKey, setRemovedShareKey] = useState("");
  const [body, setBody] = useState("");
  const [localError, setLocalError] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const startMutation = useStartConversationMutation();
  const uploadImageMutation = useUploadImageMutation();
  const isSubmitting = startMutation.isPending || uploadImageMutation.isPending;
  const shareDraftKey = getMessageShareKey(shareDraft);
  const activeShareDraft =
    shareDraftKey && removedShareKey === shareDraftKey ? null : shareDraft;

  function clearComposerErrors() {
    if (localError) {
      setLocalError("");
    }

    if (startMutation.isError) {
      startMutation.reset();
    }

    if (uploadImageMutation.isError) {
      uploadImageMutation.reset();
    }
  }

  function handleStarted(result: Awaited<ReturnType<typeof startMutation.mutateAsync>>) {
    if (!result.message) {
      setLocalError("暂时无法发送这条私信，请稍后再试。");
      return;
    }

    setBody("");
    setEmojiOpen(false);
    setLocalError("");
    onStarted(result.conversation.id);
  }

  function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const draft = buildDraft(body, activeShareDraft);

    if (!draft) {
      return;
    }

    clearComposerErrors();
    startMutation.mutate(
      {
        message: draft,
        target_username: targetUsername,
      },
      {
        onSuccess: handleStarted,
      },
    );
  }

  function insertEmoji(emoji: string) {
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
    if (activeShareDraft || isSubmitting) {
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

      const started = await startMutation.mutateAsync({
        message: {
          image_url: result.attachment.url,
          type: "image",
        },
        target_username: targetUsername,
      });

      handleStarted(started);
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
      <form className="relative space-y-2" onSubmit={submit}>
        {activeShareDraft ? (
          <ComposerSharePreview
            share={activeShareDraft}
            onRemove={() => {
              setRemovedShareKey(shareDraftKey);
              onShareDraftSent();
            }}
          />
        ) : null}
        <MessageComposerEmbedPreview value={body} />
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
            disabled={false}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:text-subtle-foreground"
            aria-label="选择表情"
            aria-expanded={emojiOpen}
            onClick={() => {
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
            placeholder={activeShareDraft ? "添加留言" : "发送消息"}
            disabled={false}
            className="h-8 min-h-8 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-0 py-1.5 text-sm leading-5 text-foreground placeholder:text-muted-foreground shadow-none hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 disabled:opacity-100"
          />
          <button
            type="button"
            disabled={Boolean(activeShareDraft) || isSubmitting}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground disabled:cursor-not-allowed disabled:text-subtle-foreground"
            aria-label={uploadImageMutation.isPending ? "图片上传中" : "发送图片"}
            onClick={handleImageButtonClick}
          >
            <ImageIcon className="size-4" aria-hidden="true" />
          </button>
          <button
            type="submit"
            disabled={isSubmitting || (!activeShareDraft && !body.trim())}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-surface-hover disabled:text-subtle-foreground"
            aria-label={isSubmitting ? "发送中" : activeShareDraft ? "发送分享卡片" : "发送消息"}
          >
            <Send className="size-4" aria-hidden="true" />
          </button>
        </div>
        {localError || startMutation.isError || uploadImageMutation.isError ? (
          <p className="px-3 text-xs text-destructive">
            {localError ||
              getErrorMessage(startMutation.error ?? uploadImageMutation.error)}
          </p>
        ) : null}
      </form>
    </footer>
  );
}

function StartConversationPane({
  conversations,
  initialTargetUsername,
  onStarted,
  shareDraft,
}: {
  conversations: MessageConversation[];
  initialTargetUsername: string;
  onStarted: (conversationId: string) => void;
  shareDraft: MessageShareSnapshot | null;
}) {
  const [removedShareKey, setRemovedShareKey] = useState("");
  const [targetUsername, setTargetUsername] = useState(initialTargetUsername);
  const [body, setBody] = useState("");
  const [localError, setLocalError] = useState("");
  const startMutation = useStartConversationMutation();
  const sendMutation = useSendMessageMutation();
  const shareDraftKey = getMessageShareKey(shareDraft);
  const activeShareDraft =
    shareDraftKey && removedShareKey === shareDraftKey ? null : shareDraft;
  const selectedTargetConversation = findConversationByParticipant(
    targetUsername,
    conversations,
  );
  const isSubmitting = startMutation.isPending || sendMutation.isPending;

  function clearSubmitErrors() {
    setLocalError("");

    if (startMutation.isError) {
      startMutation.reset();
    }

    if (sendMutation.isError) {
      sendMutation.reset();
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const username = targetUsername.trim();
    const draft = buildDraft(body, activeShareDraft);

    if (!username || !draft) {
      return;
    }

    clearSubmitErrors();

    if (selectedTargetConversation) {
      sendMutation.mutate(
        {
          conversationId: selectedTargetConversation.id,
          message: draft,
        },
        {
          onSuccess: (result) => {
            if (!result.message) {
              setLocalError("暂时无法发送这条私信，请稍后再试。");
              return;
            }

            setBody("");
            onStarted(selectedTargetConversation.id);
          },
        },
      );
      return;
    }

    startMutation.mutate(
      {
        message: draft,
        target_username: username,
      },
      {
        onSuccess: (result) => {
          if (!result.message) {
            setLocalError("暂时无法重新开启这段私信，请稍后再试。");
            return;
          }

          setBody("");
          onStarted(result.conversation.id);
        },
      },
    );
  }

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-5 lg:px-6">
      <form
        className="grid w-full max-w-5xl overflow-hidden rounded-lg bg-surface lg:min-h-[590px] lg:grid-cols-[minmax(0,0.96fr)_minmax(360px,1.04fr)]"
        onSubmit={submit}
      >
        <section className="flex min-h-0 flex-col bg-background-soft px-4 py-4 sm:px-5 lg:px-6">
          <div className="shrink-0">
            <p className="font-mono text-xs font-semibold text-primary">
              {activeShareDraft ? "分享 / 私信" : "私信 / 新会话"}
            </p>
            <h1 className="mt-2 text-xl font-semibold leading-7 text-foreground">
              {activeShareDraft ? "发送给好友" : "发起私信"}
            </h1>
          </div>

          <label className="mt-5 block shrink-0">
            <span className="mb-2 block text-xs font-semibold text-muted-foreground">
              收件人
            </span>
            <Input
              value={targetUsername}
              onChange={(event) => {
                setTargetUsername(event.target.value);
                clearSubmitErrors();
              }}
              placeholder="输入对方用户名"
              className="h-10 bg-surface"
            />
          </label>

          {selectedTargetConversation ? (
            <div className="mt-3 flex items-center gap-2 text-xs text-primary">
              <Check className="size-3.5" aria-hidden="true" />
              <span className="truncate">
                已选 @{selectedTargetConversation.participant.username}
              </span>
            </div>
          ) : null}

          {conversations.length > 0 ? (
            <div className="mt-6 min-h-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-muted-foreground">
                  最近会话
                </p>
              </div>
              <div className="mt-2 grid max-h-[300px] gap-1 overflow-y-auto pr-1 lg:max-h-none">
                {conversations.map((conversation) => {
                  const isSelected =
                    targetUsername.trim().toLowerCase() ===
                    conversation.participant.username.toLowerCase();

                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      className={cn(
                        "grid min-h-14 grid-cols-[36px_minmax(0,1fr)_24px] items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                        isSelected
                          ? "bg-surface-raised text-foreground shadow-[inset_2px_0_0_var(--primary)]"
                          : "text-muted-foreground",
                      )}
                      onClick={() => {
                        setTargetUsername(conversation.participant.username);
                        clearSubmitErrors();
                      }}
                    >
                      <MessageUserAvatar
                        online={conversation.peer_online}
                        onlineVisible={conversation.peer_online_status_visible}
                        size="sm"
                        user={conversation.participant}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {getUserDisplayName(conversation.participant)}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {formatConversationPreview(conversation)}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "inline-flex size-5 items-center justify-center rounded-full text-subtle-foreground",
                          isSelected && "bg-primary text-primary-foreground",
                        )}
                        aria-hidden="true"
                      >
                        {isSelected ? (
                          <Check className="size-3" />
                        ) : (
                          <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-md bg-surface px-3 py-4 text-sm text-muted-foreground">
              暂无可直接发送的会话。
            </div>
          )}
        </section>

        <section className="flex min-h-0 flex-col px-4 py-4 sm:px-5 lg:px-6">
          <div className="min-h-0 flex-1 space-y-4">
            {activeShareDraft ? (
              <div>
                <p className="mb-2 text-xs font-semibold text-muted-foreground">
                  分享内容
                </p>
                <ComposerSharePreview
                  className="max-w-full"
                  share={activeShareDraft}
                  onRemove={() => setRemovedShareKey(shareDraftKey)}
                />
              </div>
            ) : null}

            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-muted-foreground">
                可选留言
              </span>
              <Textarea
                value={body}
                onChange={(event) => {
                  setBody(event.target.value);
                  clearSubmitErrors();
                }}
                placeholder={activeShareDraft ? "添加留言" : "发送消息"}
                className="min-h-[168px] resize-none bg-surface-raised"
              />
            </label>
            <MessageComposerEmbedPreview value={body} />
          </div>

          {localError || startMutation.isError || sendMutation.isError ? (
            <p className="mt-3 text-xs text-destructive">
              {localError ||
                getErrorMessage(startMutation.error ?? sendMutation.error)}
            </p>
          ) : null}

          <div className="mt-4 flex shrink-0 items-center justify-between gap-3 rounded-md bg-surface-raised px-3 py-3">
            <div className="min-w-0 text-xs text-muted-foreground">
              {targetUsername.trim() ? (
                <span className="truncate">发送给 @{targetUsername.trim()}</span>
              ) : (
                <span>请选择或输入收件人</span>
              )}
            </div>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !targetUsername.trim() ||
                (!activeShareDraft && !body.trim())
              }
            >
              <Send className="size-4" aria-hidden="true" />
              发送
            </Button>
          </div>
        </section>
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
  className,
  compact = false,
  share,
}: {
  className?: string;
  compact?: boolean;
  share: MessageShareSnapshot;
}) {
  const hasThumbnail = Boolean(share.thumbnail_url);

  return (
    <Link
      href={share.target_url || "#"}
      className={cn(
        "mt-2 block overflow-hidden rounded-md bg-surface-raised text-left transition-colors hover:bg-surface-hover",
        compact ? "w-[260px] max-w-full" : "w-[300px] max-w-full",
        className,
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
  const text = body.trim();

  if (shareDraft) {
    return {
      body: text || undefined,
      share: shareDraft,
      type: getShareMessageType(shareDraft),
    };
  }

  if (!text) {
    return null;
  }

  return {
    body: text,
    type: "text",
  };
}

function getMessageShareKey(share: MessageShareSnapshot | null) {
  if (!share) {
    return "";
  }

  return [
    share.share_type,
    share.share_id,
    share.snapshot_created_at,
    share.target_url,
  ].join(":");
}

function hasMessageBodyMediaEmbed(value?: string | null) {
  return Boolean(
    value &&
      (resolveFirstMessageMediaEmbed(value) ||
        getFirstBackendResolvableMessageUrl(value)),
  );
}

function resolveFirstMessageMediaEmbed(value: string): WhitelistedMediaEmbed | null {
  for (const candidate of getMessageUrlCandidates(value)) {
    const embed = resolveWhitelistedMediaEmbed(candidate);

    if (embed) {
      return embed;
    }
  }

  return null;
}

function useResolvedMessageMediaEmbed(value: string): {
  embed: WhitelistedMediaEmbed | null;
  isResolving: boolean;
  source: "backend" | "local" | null;
} {
  const localEmbed = useMemo(() => resolveFirstMessageMediaEmbed(value), [value]);
  const backendUrl = useMemo(
    () => (localEmbed ? "" : getFirstBackendResolvableMessageUrl(value)),
    [localEmbed, value],
  );
  const backendQuery = useContentEmbedResolveQuery(backendUrl, Boolean(backendUrl));
  const backendEmbed = useMemo(
    () =>
      createWhitelistedMediaEmbedFromResolvedContentEmbed(
        backendQuery.data?.embed,
      ),
    [backendQuery.data?.embed],
  );

  if (localEmbed) {
    return {
      embed: localEmbed,
      isResolving: false,
      source: "local",
    };
  }

  if (backendEmbed) {
    return {
      embed: backendEmbed,
      isResolving: false,
      source: "backend",
    };
  }

  return {
    embed: null,
    isResolving: Boolean(backendUrl && backendQuery.isPending),
    source: null,
  };
}

function getFirstBackendResolvableMessageUrl(value: string) {
  for (const candidate of getMessageUrlCandidates(value)) {
    if (isBackendResolvableMediaEmbedUrl(candidate)) {
      return candidate;
    }
  }

  return "";
}

function getMessageUrlCandidates(value: string) {
  const candidates: string[] = [];
  const seen = new Set<string>();
  const markdownLinkPattern = /\[[^\]]*]\((https?:\/\/[^)\s]+)\)/gi;
  const bareUrlPattern = /https?:\/\/[^\s<>"']+/gi;

  for (const match of value.matchAll(markdownLinkPattern)) {
    addMessageUrlCandidate(candidates, seen, match[1]);
  }

  for (const match of value.matchAll(bareUrlPattern)) {
    addMessageUrlCandidate(candidates, seen, match[0]);
  }

  return candidates;
}

function addMessageUrlCandidate(
  candidates: string[],
  seen: Set<string>,
  rawValue: string,
) {
  const candidate = normalizeMessageUrlCandidate(rawValue);

  if (!candidate || seen.has(candidate)) {
    return;
  }

  seen.add(candidate);
  candidates.push(candidate);
}

function normalizeMessageUrlCandidate(value: string) {
  return value
    .trim()
    .replace(/[),.;:!?，。！？；：、]+$/u, "");
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

function findConversationByParticipant(
  username: string,
  conversations: MessageConversation[],
) {
  const normalizedUsername = username.trim().toLowerCase();

  if (!normalizedUsername) {
    return undefined;
  }

  return conversations.find(
    (conversation) =>
      conversation.participant.username.toLowerCase() === normalizedUsername,
  );
}

function isIncomingRequest(conversation: MessageConversation) {
  return getRequestDirection(conversation) === "incoming";
}

function isShareTargetConversation(conversation: MessageConversation) {
  return (
    getRequestDirection(conversation) === "none" &&
    conversation.can_send &&
    !conversation.blocked &&
    !isRejectedRequestConversation(conversation)
  );
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

function isRejectedRequestConversation(conversation: MessageConversation) {
  return (
    conversation.request_status === "rejected" ||
    (conversation.conversation_state === "disabled" &&
      conversation.disable_reason === "inactive" &&
      Boolean(conversation.request_id))
  );
}

function canViewerReopenConversation(conversation: MessageConversation) {
  return (
    isRejectedRequestConversation(conversation) &&
    conversation.viewer_can_reopen === true
  );
}

function canUseReopenedConversation(conversation: MessageConversation) {
  return (
    conversation.request_status === "accepted" ||
    conversation.conversation_state === "normal" ||
    conversation.can_send
  );
}

function formatConversationPreview(conversation: MessageConversation) {
  const requestDirection = getRequestDirection(conversation);

  if (conversation.blocked) {
    return "无法继续发送消息";
  }

  if (isRejectedRequestConversation(conversation)) {
    return "已忽略这条陌生人消息";
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
      return "这条私信请求已忽略";
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

function canRecallMessage(message: Message, now = Date.now()) {
  if (isRecalled(message)) {
    return false;
  }

  const deadline = getMessageRecallDeadlineMs(message);

  return deadline !== null && now <= deadline;
}

function getMessageRecallDeadlineMs(message: Message) {
  const createdAt = new Date(message.created_at).getTime();

  if (Number.isNaN(createdAt)) {
    return null;
  }

  return createdAt + MESSAGE_RECALL_WINDOW_MS;
}

function createPendingMessageUser(username: string): MessageUserSummary {
  return {
    avatar_url: "",
    display_name: username,
    id: `pending:${username}`,
    status: "active",
    username,
  };
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
