"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  acceptMessageRequest,
  archiveConversation,
  blockMessageUser,
  createMessageRealtimeTicket,
  deleteConversation,
  deleteMessage,
  getMessagePrivacy,
  getMessageSummary,
  listConversationMessages,
  listMessageConversations,
  markConversationRead,
  muteConversation,
  pinConversation,
  recallMessage,
  rejectMessageRequest,
  reportConversation,
  reportMessage,
  sendConversationMessage,
  startMessageConversation,
  unarchiveConversation,
  unblockMessageUser,
  unmuteConversation,
  unpinConversation,
  updateMessagePrivacy,
} from "./api";
import type {
  ListMessageConversationsInput,
  ListMessagesInput,
  SendMessageInput,
} from "./types";

export const messageQueryKeys = {
  all: ["messages"] as const,
  summary: () => ["messages", "summary"] as const,
  conversations: () => ["messages", "conversations"] as const,
  conversationList: ({
    box = "all",
    limit = 20,
    offset = 0,
  }: ListMessageConversationsInput = {}) =>
    ["messages", "conversations", { box, limit, offset }] as const,
  messages: (conversationId: string) =>
    ["messages", "conversation", conversationId, "messages"] as const,
  messageList: ({
    before_message_id = "",
    conversationId,
    limit = 30,
  }: ListMessagesInput) =>
    [
      "messages",
      "conversation",
      conversationId,
      "messages",
      { before_message_id, limit },
    ] as const,
  privacy: () => ["messages", "privacy"] as const,
};

export function useMessageSummaryQuery(enabled = true) {
  return useQuery({
    queryKey: messageQueryKeys.summary(),
    queryFn: getMessageSummary,
    enabled,
    staleTime: 20_000,
  });
}

export function useMessageConversationsQuery(
  input: ListMessageConversationsInput = {},
  enabled = true,
) {
  return useQuery({
    queryKey: messageQueryKeys.conversationList(input),
    queryFn: () => listMessageConversations(input),
    enabled,
    staleTime: 15_000,
  });
}

export function useConversationMessagesQuery(
  input: ListMessagesInput,
  enabled = true,
) {
  return useQuery({
    queryKey: messageQueryKeys.messageList(input),
    queryFn: () => listConversationMessages(input),
    enabled,
    staleTime: 10_000,
  });
}

export function useMessagePrivacyQuery(enabled = true) {
  return useQuery({
    queryKey: messageQueryKeys.privacy(),
    queryFn: getMessagePrivacy,
    enabled,
    staleTime: 60_000,
  });
}

export function useStartConversationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: startMessageConversation,
    onSuccess: (result) => {
      invalidateMessageLists(queryClient);

      if (result.conversation?.id) {
        void queryClient.invalidateQueries({
          queryKey: messageQueryKeys.messages(result.conversation.id),
        });
      }
    },
  });
}

export function useSendMessageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SendMessageInput) => sendConversationMessage(input),
    onSuccess: (_result, input) => {
      invalidateMessageLists(queryClient);
      void queryClient.invalidateQueries({
        queryKey: messageQueryKeys.messages(input.conversationId),
      });
    },
  });
}

export function useMessageConversationActionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      type,
      reason,
    }: {
      conversationId: string;
      reason?: string;
      type:
        | "archive"
        | "delete"
        | "mute"
        | "pin"
        | "read"
        | "report"
        | "unarchive"
        | "unmute"
        | "unpin";
    }) => {
      if (type === "archive") {
        return archiveConversation(conversationId);
      }

      if (type === "unarchive") {
        return unarchiveConversation(conversationId);
      }

      if (type === "pin") {
        return pinConversation(conversationId);
      }

      if (type === "unpin") {
        return unpinConversation(conversationId);
      }

      if (type === "mute") {
        return muteConversation(conversationId);
      }

      if (type === "unmute") {
        return unmuteConversation(conversationId);
      }

      if (type === "delete") {
        await deleteConversation(conversationId);
        return null;
      }

      if (type === "report") {
        return reportConversation({
          conversationId,
          reason: reason || "私信会话违规",
        });
      }

      return markConversationRead(conversationId);
    },
    onSuccess: (_result, input) => {
      invalidateMessageLists(queryClient);
      void queryClient.invalidateQueries({
        queryKey: messageQueryKeys.messages(input.conversationId),
      });
    },
  });
}

export function useMessageRequestActionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      type,
    }: {
      requestId: string;
      type: "accept" | "reject";
    }) =>
      type === "accept"
        ? acceptMessageRequest(requestId)
        : rejectMessageRequest(requestId),
    onSuccess: () => {
      invalidateMessageLists(queryClient);
    },
  });
}

export function useMessageActionMutation(conversationId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      reason,
      type,
    }: {
      messageId: string;
      reason?: string;
      type: "delete" | "recall" | "report";
    }) => {
      if (type === "delete") {
        await deleteMessage(messageId);
        return null;
      }

      if (type === "report") {
        return reportMessage({ messageId, reason: reason || "私信内容违规" });
      }

      return recallMessage(messageId);
    },
    onSuccess: () => {
      invalidateMessageLists(queryClient);
      if (conversationId) {
        void queryClient.invalidateQueries({
          queryKey: messageQueryKeys.messages(conversationId),
        });
      }
    },
  });
}

export function useMessageBlockMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      type,
      username,
    }: {
      type: "block" | "unblock";
      username: string;
    }) =>
      type === "block"
        ? blockMessageUser(username)
        : unblockMessageUser(username),
    onSuccess: () => {
      invalidateMessageLists(queryClient);
    },
  });
}

export function useMessagePrivacyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMessagePrivacy,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: messageQueryKeys.privacy(),
      });
      void queryClient.invalidateQueries({
        queryKey: messageQueryKeys.summary(),
      });
    },
  });
}

export function useMessageRealtimeTicketMutation() {
  return useMutation({
    mutationFn: createMessageRealtimeTicket,
  });
}

function invalidateMessageLists(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  void queryClient.invalidateQueries({ queryKey: messageQueryKeys.summary() });
  void queryClient.invalidateQueries({
    queryKey: messageQueryKeys.conversations(),
  });
}
