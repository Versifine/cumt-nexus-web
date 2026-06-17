import type { MessageShareSnapshot, MessageShareType } from "./types";

type MessageShareDraftInput = {
  shareId: string;
  shareType: MessageShareType;
  summary?: string | null;
  targetUrl: string;
  thumbnailUrl?: string | null;
  title: string;
};

export function createMessageShareSnapshot({
  shareId,
  shareType,
  summary,
  targetUrl,
  thumbnailUrl,
  title,
}: MessageShareDraftInput): MessageShareSnapshot {
  return {
    share_id: shareId,
    share_type: shareType,
    snapshot_created_at: new Date().toISOString(),
    summary: summary?.trim() ?? "",
    target_url: targetUrl,
    thumbnail_url: thumbnailUrl?.trim() ?? "",
    title: title.trim() || "内容暂不可查看",
  };
}

export function getMessageShareDraftFromParams(
  params: URLSearchParams,
): MessageShareSnapshot | null {
  const shareType = params.get("share_type");
  const shareId = params.get("share_id");

  if (!isMessageShareType(shareType) || !shareId) {
    return null;
  }

  return {
    share_id: shareId,
    share_type: shareType,
    snapshot_created_at:
      params.get("snapshot_created_at") || new Date().toISOString(),
    summary: params.get("summary") ?? "",
    target_url: params.get("target_url") || "/",
    thumbnail_url: params.get("thumbnail_url") ?? "",
    title: params.get("title") || "内容暂不可查看",
  };
}

export function getMessageShareHref(
  share: MessageShareSnapshot,
  pathname = "/messages",
) {
  const params = getMessageShareSearchParams(share);

  return `${pathname}?${params.toString()}`;
}

export function appendMessageShareParams(
  href: string,
  share: MessageShareSnapshot | null,
) {
  if (!share) {
    return href;
  }

  const [path, search = ""] = href.split("?");
  const params = new URLSearchParams(search);
  const shareParams = getMessageShareSearchParams(share);

  shareParams.forEach((value, key) => {
    params.set(key, value);
  });

  return `${path}?${params.toString()}`;
}

export function getMessageShareSearchParams(share: MessageShareSnapshot) {
  const params = new URLSearchParams({
    share_id: share.share_id,
    share_type: share.share_type,
    snapshot_created_at: share.snapshot_created_at,
    target_url: share.target_url,
    title: share.title,
  });

  if (share.summary) {
    params.set("summary", share.summary);
  }

  if (share.thumbnail_url) {
    params.set("thumbnail_url", share.thumbnail_url);
  }

  return params;
}

export function getShareMessageType(
  share: MessageShareSnapshot,
): `share_${MessageShareType}` {
  return `share_${share.share_type}`;
}

function isMessageShareType(value: string | null): value is MessageShareType {
  return (
    value === "post" ||
    value === "comment" ||
    value === "user" ||
    value === "community"
  );
}
