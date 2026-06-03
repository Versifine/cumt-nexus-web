export type ModerationTargetType = "post" | "comment";
export type ContentReportStatus = "pending" | "resolved" | "dismissed" | string;
export type ModerationActionType = "remove" | string;

export type ReportContentInput = {
  reason: string;
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
