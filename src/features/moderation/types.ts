export type ModerationTargetType = "post" | "comment";
export type ContentReportStatus = "pending" | "resolved" | "dismissed" | string;
export type ModerationActionType =
  | "approve"
  | "ignore_reports"
  | "lock"
  | "mark_nsfw"
  | "mark_spoiler"
  | "pin"
  | "remove"
  | "set_flair"
  | "spam"
  | string;

export type ReportContentInput = {
  reason: string;
};

export type ModerationActionInput = {
  confirm?: boolean;
  flair_text?: string;
  notify_author?: boolean;
  reason?: string;
  removal_reason_id?: string;
  value?: boolean;
};

export type ModerationBulkActionInput = ModerationActionInput & {
  action: ModerationActionType;
  target_ids?: string[];
  target_type?: ModerationTargetType | string;
  targets?: Array<{
    target_id: string;
    target_type: ModerationTargetType | string;
  }>;
};

export type ReportTargetPreview = {
  target_type: ModerationTargetType | string;
  post_id?: string;
  comment_id?: string;
  author_id: string;
  status: string;
  title?: string;
  body_excerpt: string;
  created_at: string;
  updated_at: string;
};

export type ContentReport = {
  id: string;
  target_type: ModerationTargetType | string;
  post_id?: string;
  comment_id?: string;
  reporter_id: string;
  reason: string;
  status: ContentReportStatus;
  reviewed_by?: string;
  reviewed_at?: string | null;
  target_preview?: ReportTargetPreview | null;
  created_at: string;
  updated_at: string;
};

export type ContentReportResponse = {
  report: ContentReport;
};

export type ListReportsInput = {
  status?: "pending" | "resolved" | "dismissed";
  limit?: number;
  offset?: number;
};

export type ListReportsResponse = {
  reports: ContentReport[];
  limit: number;
  offset: number;
};

export type ModerationAction = {
  id: string;
  target_type: ModerationTargetType | string;
  post_id?: string;
  comment_id?: string;
  actor_id: string;
  action: ModerationActionType;
  reason: string;
  created_at: string;
};

export type RemoveContentResponse = {
  action: ModerationAction;
};

export type ModerationBulkActionItem = {
  action?: ModerationAction;
  error_code?: string;
  error_message?: string;
  ok: boolean;
  target_id: string;
  target_type: ModerationTargetType | string;
};

export type ModerationBulkActionResponse = {
  results: ModerationBulkActionItem[];
};

export type ModQueueKind =
  | "edited"
  | "needs_review"
  | "removed"
  | "reports"
  | "spam"
  | "unmoderated"
  | string;

export type ModQueueItem = {
  id: string;
  author_id: string;
  community_id: string;
  community_slug: string;
  created_at: string;
  post_id?: string;
  preview: string;
  queue: ModQueueKind;
  report_count: number;
  status: string;
  target_id: string;
  target_type: ModerationTargetType | string;
  updated_at: string;
};

export type ModQueueReport = {
  created_at: string;
  id: string;
  reason: string;
  reporter_id: string;
  status: ContentReportStatus | string;
};

export type ModQueueItemDetailResponse = {
  item: ModQueueItem;
  recent_actions: ModerationAction[];
  reports: ModQueueReport[];
  target_preview: ReportTargetPreview;
};

export type ModQueueCount = {
  count: number;
  queue: ModQueueKind;
};

export type ModQueueSummaryResponse = {
  priority_items: ModQueueItem[];
  queues: ModQueueCount[];
};

export type ListModQueueInput = {
  limit?: number;
  offset?: number;
  queue: ModQueueKind;
  slug?: string;
};

export type ListModQueueResponse = {
  has_more: boolean;
  items: ModQueueItem[];
  limit: number;
  next_offset: number;
  offset: number;
  queue: ModQueueKind;
};
