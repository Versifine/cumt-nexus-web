import { ApiError } from "@/lib/api/client";

import { IMAGE_UPLOAD_LIMITS } from "./types";

export function validateImageUploadFile(
  file: Pick<File, "size" | "type">,
  {
    altText = "",
    currentCount,
    maxCount,
  }: {
    altText?: string;
    currentCount: number;
    maxCount: number;
  },
) {
  if (currentCount >= maxCount) {
    return `当前最多上传 ${maxCount} 张图片，先移除一张再继续。`;
  }

  if (!IMAGE_UPLOAD_LIMITS.allowedMimeTypes.some((mimeType) => mimeType === file.type)) {
    return "只能上传 JPEG、PNG 或 WebP 图片。";
  }

  if (file.size > IMAGE_UPLOAD_LIMITS.maxBytes) {
    return `单张图片不能超过 ${formatFileSize(IMAGE_UPLOAD_LIMITS.maxBytes)}。`;
  }

  if (altText.length > IMAGE_UPLOAD_LIMITS.altTextMaxLength) {
    return `图片说明不能超过 ${IMAGE_UPLOAD_LIMITS.altTextMaxLength} 个字符。`;
  }

  return null;
}

export function getUploadError(error: unknown) {
  if (!error) {
    return "请求失败，请稍后重试。";
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  return "请求失败，请稍后重试。";
}

export function formatFileSize(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return "--";
  }

  if (sizeBytes < 1024 * 1024) {
    return `${Math.ceil(sizeBytes / 1024)} KB`;
  }

  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}
