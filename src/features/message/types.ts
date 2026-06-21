export type DmViewerRelation =
  | "none"
  | "following"
  | "followed_by"
  | "mutual"
  | "self";

export type DmCapability = {
  can_start: boolean;
  requires_request: boolean;
  reason?: string | null;
  direct_conversation_id?: string | null;
  viewer_relation: DmViewerRelation;
};

export type MessageBox = "all" | "friends" | "requests" | "archived";

export type MessageType =
  | "text"
  | "image"
  | "share_post"
  | "share_comment"
  | "share_user"
  | "share_community";

export type MessageShareType = "post" | "comment" | "user" | "community";

export type MessageStatus =
  | "sent"
  | "recalled"
  | "failed"
  | "reviewing"
  | "self_visible"
  | "unavailable"
  | "image_rejected"
  | string;

export type MessagePrivacyAllow = "everyone" | "mutuals" | "none";

export type MessageUserSummary = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  status: string;
};

export type MessageShareSnapshot = {
  share_type: MessageShareType;
  share_id: string;
  title: string;
  summary: string;
  thumbnail_url: string;
  target_url: string;
  snapshot_created_at: string;
};

export type MessageDraft = {
  type?: MessageType;
  body?: string;
  image_url?: string;
  share?: MessageShareSnapshot;
};

export type MessageSummary = {
  id: string;
  type: MessageType;
  text: string;
  status: MessageStatus;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender: MessageUserSummary;
  type: MessageType;
  body: string;
  image_url: string;
  share: MessageShareSnapshot | null;
  status: MessageStatus;
  created_at: string;
  updated_at: string;
  recalled_at: string | null;
  viewer_deleted: boolean;
};

export type MessageConversation = {
  id: string;
  box: MessageBox;
  request_id: string | null;
  request_status: "accepted" | "pending" | "rejected" | string;
  request_direction?: "none" | "incoming" | "outgoing";
  viewer_can_accept_request?: boolean;
  viewer_can_reject_request?: boolean;
  request_created_by_me?: boolean;
  request_to_me?: boolean;
  viewer_can_reopen?: boolean;
  conversation_state?:
    | "normal"
    | "incoming_request"
    | "outgoing_request"
    | "blocked"
    | "disabled"
    | string;
  participant: MessageUserSummary;
  last_message: MessageSummary | null;
  unread_count: number;
  updated_at: string;
  pinned: boolean;
  muted: boolean;
  archived: boolean;
  blocked: boolean;
  can_send: boolean;
  disable_reason: string | null;
  peer_online_status_visible: boolean;
  peer_online: boolean;
};

export type MessageSummaryResponse = {
  unread_total: number;
  request_count: number;
  unread_conversations: number;
  online_status_enabled: boolean;
};

export type ListMessageConversationsInput = {
  box?: MessageBox;
  limit?: number;
  offset?: number;
};

export type ListMessageConversationsResponse = {
  conversations: MessageConversation[];
  box: MessageBox;
  limit: number;
  offset: number;
  next_offset: number;
  has_more: boolean;
};

export type ListMessagesInput = {
  before_message_id?: string;
  conversationId: string;
  limit?: number;
};

export type ListMessagesResponse = {
  messages: Message[];
  limit: number;
  has_more: boolean;
  next_before: string;
};

export type ConversationMutationResponse = {
  conversation: MessageConversation;
  message?: Message;
};

export type StartConversationInput = {
  target_username: string;
  message: MessageDraft;
};

export type SendMessageInput = {
  conversationId: string;
  message: MessageDraft;
};

export type MessagePrivacySettings = {
  allow_messages: MessagePrivacyAllow;
  online_status_enabled: boolean;
  updated_at: string;
};

export type UpdateMessagePrivacyInput = {
  allow_messages?: MessagePrivacyAllow;
  online_status_enabled?: boolean;
};

export type ReportMessageInput = {
  messageId: string;
  reason: string;
};

export type ReportConversationInput = {
  conversationId: string;
  reason: string;
};

export type MessageReport = {
  id: string;
  conversation_id: string;
  message_id: string;
  reported_user_id: string;
  reason: string;
  context_before: string;
  context_after: string;
  created_at: string;
};

export type ReportMessageResponse = {
  report: MessageReport;
};

export type RealtimeTicketResponse = {
  ticket: string;
  expires_at: string;
};

export type MessageRealtimeEvent = {
  id: string;
  type: string;
  conversation_id: string | null;
  payload: string;
  created_at: string;
};

export type RealtimeHelloResponse = {
  type: "connected" | string;
  events: MessageRealtimeEvent[];
};
