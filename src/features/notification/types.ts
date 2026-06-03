export type NotificationStatus = "unread" | "read" | "all";

export type Notification = {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  body: string;
  source_type: string;
  source_id: string;
  read_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type ListNotificationsInput = {
  status?: NotificationStatus;
  limit?: number;
  offset?: number;
};

export type ListNotificationsResponse = {
  notifications: Notification[];
  status: NotificationStatus | string;
  limit: number;
  offset: number;
};

export type MarkNotificationReadResponse = {
  notification: Notification;
};
