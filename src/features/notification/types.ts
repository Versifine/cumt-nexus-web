export type NotificationCategory =
  | "interactions"
  | "system";

export type Notification = {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  body: string;
  source_type: string;
  source_id: string;
  actor?: NotificationActor | null;
  aggregate_count?: number;
  last_actor?: NotificationActor | null;
  last_actor_id?: string;
  read_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationActor = {
  id: string;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
};

export type ListNotificationsInput = {
  category?: NotificationCategory;
  limit?: number;
  offset?: number;
};

export type ListNotificationsResponse = {
  notifications: Notification[];
  category: NotificationCategory | string;
  limit: number;
  offset: number;
  next_offset: number;
  has_more: boolean;
};
