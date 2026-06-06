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

export const IMAGE_UPLOAD_LIMITS = {
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  altTextMaxLength: 200,
  maxBytes: 5 * 1024 * 1024,
  maxCountPerComment: 1,
  maxCountPerPost: 9,
} as const;

export const IMAGE_UPLOAD_ACCEPT =
  "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
