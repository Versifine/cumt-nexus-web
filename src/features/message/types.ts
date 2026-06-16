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

export type MessageShareType = "post" | "comment" | "user" | "community";

export type MessageContentType =
  | "text"
  | "image"
  | "share_post"
  | "share_comment"
  | "share_user"
  | "share_community";

export type MessageDeliveryState =
  | "sent"
  | "sending"
  | "failed"
  | "reviewing"
  | "self_visible"
  | "recalled"
  | "unavailable"
  | "image_rejected";

export type MessageShareSnapshot = {
  share_type: MessageShareType;
  share_id: string;
  title: string;
  summary?: string | null;
  thumbnail_url?: string | null;
  target_url: string;
  is_available: boolean;
};

export type MessageAuthorSummary = {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
};

export type MessageItem = {
  id: string;
  conversation_id: string;
  sender: MessageAuthorSummary;
  content_type: MessageContentType;
  body?: string | null;
  image_url?: string | null;
  share?: MessageShareSnapshot | null;
  state: MessageDeliveryState;
  created_at: string;
  recalled_at?: string | null;
};

export type MessageConversationParticipant = {
  user: MessageAuthorSummary;
  relation: DmViewerRelation;
  is_blocked: boolean;
  can_show_online: boolean;
  is_online?: boolean;
};

export type MessageConversation = {
  id: string;
  box: MessageBox;
  participants: MessageConversationParticipant[];
  last_message?: MessageItem | null;
  unread_count: number;
  is_pinned: boolean;
  is_muted: boolean;
  is_archived: boolean;
  is_request: boolean;
  can_send: boolean;
  disabled_reason?: string | null;
  updated_at: string;
};

export type MessagePrivacySettings = {
  allow_mutual_direct: boolean;
  allow_requests_from_non_mutual: boolean;
  show_online_to_mutual: boolean;
};

export type MessageRealtimeEventType =
  | "message.created"
  | "message.recalled"
  | "conversation.updated"
  | "unread.updated"
  | "request.accepted"
  | "request.rejected"
  | "block.updated";

export type MessageRealtimeEvent = {
  id: string;
  type: MessageRealtimeEventType;
  conversation_id?: string;
  message_id?: string;
  created_at: string;
};
