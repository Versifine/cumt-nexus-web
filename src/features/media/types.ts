export type MediaAttachment = {
  id: string;
  kind: "image" | string;
  url: string;
  width?: number | null;
  height?: number | null;
  size_bytes: number;
  mime_type: string;
  alt_text: string;
  status: "ready" | "processing" | "blocked" | "failed" | string;
  created_at: string;
};

export type UploadImageInput = {
  file: File;
  alt_text?: string;
};

export type UploadImageResponse = {
  attachment: MediaAttachment;
};
