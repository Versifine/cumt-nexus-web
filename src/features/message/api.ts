import { apiRequest, getApiBaseUrl } from "@/lib/api/client";

import type {
  ConversationMutationResponse,
  ListMessageConversationsInput,
  ListMessageConversationsResponse,
  ListMessagesInput,
  ListMessagesResponse,
  MessagePrivacySettings,
  MessageSummaryResponse,
  RealtimeTicketResponse,
  ReportMessageInput,
  ReportMessageResponse,
  ReportConversationInput,
  SendMessageInput,
  StartConversationInput,
  UpdateMessagePrivacyInput,
} from "./types";

export function getMessageSummary() {
  return apiRequest<MessageSummaryResponse>("/api/v1/messages/summary");
}

export function listMessageConversations({
  box = "all",
  limit = 20,
  offset = 0,
}: ListMessageConversationsInput = {}) {
  const params = new URLSearchParams({
    box,
    limit: String(limit),
    offset: String(offset),
  });

  return apiRequest<ListMessageConversationsResponse>(
    `/api/v1/messages/conversations?${params.toString()}`,
  );
}

export function startMessageConversation(input: StartConversationInput) {
  return apiRequest<ConversationMutationResponse>(
    "/api/v1/messages/conversations",
    {
      body: input,
      method: "POST",
    },
  );
}

export function listConversationMessages({
  before_message_id,
  conversationId,
  limit = 30,
}: ListMessagesInput) {
  const params = new URLSearchParams({
    limit: String(limit),
  });

  if (before_message_id) {
    params.set("before_message_id", before_message_id);
  }

  return apiRequest<ListMessagesResponse>(
    `/api/v1/messages/conversations/${encodeURIComponent(
      conversationId,
    )}/messages?${params.toString()}`,
  );
}

export function sendConversationMessage({
  conversationId,
  message,
}: SendMessageInput) {
  return apiRequest<ConversationMutationResponse>(
    `/api/v1/messages/conversations/${encodeURIComponent(
      conversationId,
    )}/messages`,
    {
      body: { message },
      method: "POST",
    },
  );
}

export function markConversationRead(conversationId: string) {
  return apiRequest<ConversationMutationResponse>(
    `/api/v1/messages/conversations/${encodeURIComponent(
      conversationId,
    )}/read`,
    { method: "POST" },
  );
}

export function archiveConversation(conversationId: string) {
  return apiRequest<ConversationMutationResponse>(
    `/api/v1/messages/conversations/${encodeURIComponent(
      conversationId,
    )}/archive`,
    { method: "POST" },
  );
}

export function unarchiveConversation(conversationId: string) {
  return apiRequest<ConversationMutationResponse>(
    `/api/v1/messages/conversations/${encodeURIComponent(
      conversationId,
    )}/archive`,
    { method: "DELETE" },
  );
}

export function pinConversation(conversationId: string) {
  return apiRequest<ConversationMutationResponse>(
    `/api/v1/messages/conversations/${encodeURIComponent(conversationId)}/pin`,
    { method: "POST" },
  );
}

export function unpinConversation(conversationId: string) {
  return apiRequest<ConversationMutationResponse>(
    `/api/v1/messages/conversations/${encodeURIComponent(conversationId)}/pin`,
    { method: "DELETE" },
  );
}

export function muteConversation(conversationId: string) {
  return apiRequest<ConversationMutationResponse>(
    `/api/v1/messages/conversations/${encodeURIComponent(conversationId)}/mute`,
    { method: "POST" },
  );
}

export function unmuteConversation(conversationId: string) {
  return apiRequest<ConversationMutationResponse>(
    `/api/v1/messages/conversations/${encodeURIComponent(conversationId)}/mute`,
    { method: "DELETE" },
  );
}

export function deleteConversation(conversationId: string) {
  return apiRequest<void>(
    `/api/v1/messages/conversations/${encodeURIComponent(conversationId)}`,
    { method: "DELETE" },
  );
}

export function reportConversation({
  conversationId,
  reason,
}: ReportConversationInput) {
  return apiRequest<ReportMessageResponse>(
    `/api/v1/messages/conversations/${encodeURIComponent(conversationId)}/report`,
    {
      body: { reason },
      method: "POST",
    },
  );
}

export function acceptMessageRequest(requestId: string) {
  return apiRequest<ConversationMutationResponse>(
    `/api/v1/messages/requests/${encodeURIComponent(requestId)}/accept`,
    { method: "POST" },
  );
}

export function rejectMessageRequest(requestId: string) {
  return apiRequest<ConversationMutationResponse>(
    `/api/v1/messages/requests/${encodeURIComponent(requestId)}/reject`,
    { method: "POST" },
  );
}

export function recallMessage(messageId: string) {
  return apiRequest<ConversationMutationResponse>(
    `/api/v1/messages/${encodeURIComponent(messageId)}/recall`,
    { method: "POST" },
  );
}

export function deleteMessage(messageId: string) {
  return apiRequest<void>(`/api/v1/messages/${encodeURIComponent(messageId)}`, {
    method: "DELETE",
  });
}

export function reportMessage({ messageId, reason }: ReportMessageInput) {
  return apiRequest<ReportMessageResponse>(
    `/api/v1/messages/${encodeURIComponent(messageId)}/report`,
    {
      body: { reason },
      method: "POST",
    },
  );
}

export function blockMessageUser(username: string) {
  return apiRequest<void>(`/api/v1/users/${encodeURIComponent(username)}/block`, {
    method: "POST",
  });
}

export function unblockMessageUser(username: string) {
  return apiRequest<void>(`/api/v1/users/${encodeURIComponent(username)}/block`, {
    method: "DELETE",
  });
}

export function getMessagePrivacy() {
  return apiRequest<MessagePrivacySettings>("/api/v1/me/privacy/messages");
}

export function updateMessagePrivacy(input: UpdateMessagePrivacyInput) {
  return apiRequest<MessagePrivacySettings>("/api/v1/me/privacy/messages", {
    body: input,
    method: "PATCH",
  });
}

export function createMessageRealtimeTicket(lastEventId?: string) {
  return apiRequest<RealtimeTicketResponse>("/api/v1/realtime/tickets", {
    body: lastEventId ? { last_event_id: lastEventId } : {},
    method: "POST",
  });
}

export function getMessageRealtimeUrl(ticket: string) {
  return `${getRealtimeBaseUrl()}/api/v1/realtime/messages?ticket=${encodeURIComponent(
    ticket,
  )}`;
}

function getRealtimeBaseUrl() {
  const baseUrl = getApiBaseUrl();

  if (baseUrl.startsWith("https://")) {
    return `wss://${baseUrl.slice("https://".length)}`;
  }

  if (baseUrl.startsWith("http://")) {
    return `ws://${baseUrl.slice("http://".length)}`;
  }

  return baseUrl;
}
