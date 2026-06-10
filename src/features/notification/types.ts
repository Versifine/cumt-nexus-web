export type NotificationStatus = "unread" | "read" | "all";
export type NotificationCategory =
  | "all"
  | "replies"
  | "mentions"
  | "likes"
  | "system";

export type Notification = {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  body: string;
  source_type: string;
  source_id: string;
  aggregate_count?: number;
  last_actor_id?: string;
  read_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type ListNotificationsInput = {
  category?: NotificationCategory;
  status?: NotificationStatus;
  limit?: number;
  offset?: number;
};

export type ListNotificationsResponse = {
  notifications: Notification[];
  category: NotificationCategory | string;
  status: NotificationStatus | string;
  limit: number;
  offset: number;
};

export type UnreadSummaryResponse = {
  total: number;
  replies: number;
  mentions: number;
  likes: number;
  system: number;
};

export type MarkNotificationReadResponse = {
  notification: Notification;
};

export type MarkAllNotificationsReadResponse = {
  updated_count: number;
  read_at: string;
};
