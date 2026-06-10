import { useMemo, useSyncExternalStore } from "react";

export type PostNavigationSource = {
  href: string;
  label: string;
  postId: string;
};

export type ResolvedPostBackSource = {
  href: string;
  label: string;
};

const POST_SOURCE_PREFIX = "cumt-nexus:post-source:";
const POST_SOURCE_CHANGE_EVENT = "cumt-nexus:post-source-change";

export function readPostNavigationSource(postId: string) {
  return parsePostNavigationSource(readRawPostNavigationSource(postId));
}

export function usePostNavigationSource(postId: string) {
  const rawValue = useSyncExternalStore(
    subscribePostNavigationSource,
    () => readRawPostNavigationSource(postId),
    () => null,
  );

  return useMemo(() => parsePostNavigationSource(rawValue), [rawValue]);
}

export function rememberPostNavigationSource(source: PostNavigationSource) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedSource = {
    href: normalizeSourceHref(source.href),
    label: source.label.trim(),
    postId: source.postId.trim(),
  };

  if (!normalizedSource.href || !normalizedSource.label || !normalizedSource.postId) {
    return;
  }

  window.sessionStorage.setItem(
    getPostSourceKey(normalizedSource.postId),
    JSON.stringify(normalizedSource),
  );
  window.dispatchEvent(new Event(POST_SOURCE_CHANGE_EVENT));
}

export function resolvePostBackSource({
  communitySlug,
  postId,
  source,
}: {
  communitySlug?: string | null;
  postId: string;
  source: PostNavigationSource | null;
}): ResolvedPostBackSource {
  const fallback = getPostBackFallback(communitySlug);

  if (!source || source.postId !== postId) {
    return fallback;
  }

  if (isCurrentPostHref(source.href, postId)) {
    return fallback;
  }

  if (source.href === "/communities" && fallback.href !== "/communities") {
    return fallback;
  }

  return {
    href: source.href,
    label: source.label,
  };
}

function getPostSourceKey(postId: string) {
  return `${POST_SOURCE_PREFIX}${postId}`;
}

function subscribePostNavigationSource(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  function handleStorageChange(event: StorageEvent) {
    if (!event.key || event.key.startsWith(POST_SOURCE_PREFIX)) {
      onStoreChange();
    }
  }

  window.addEventListener("storage", handleStorageChange);
  window.addEventListener(POST_SOURCE_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorageChange);
    window.removeEventListener(POST_SOURCE_CHANGE_EVENT, onStoreChange);
  };
}

function readRawPostNavigationSource(postId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage.getItem(getPostSourceKey(postId));
  } catch {
    return null;
  }
}

function parsePostNavigationSource(rawValue: string | null) {
  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (!isPostNavigationSource(parsedValue)) {
      return null;
    }

    return parsedValue;
  } catch {
    return null;
  }
}

function getPostBackFallback(communitySlug?: string | null): ResolvedPostBackSource {
  const slug = communitySlug?.trim();

  if (slug) {
    return {
      href: `/communities/${encodeURIComponent(slug)}`,
      label: `返回 /${slug}`,
    };
  }

  return {
    href: "/communities",
    label: "浏览社区",
  };
}

function isCurrentPostHref(href: string, postId: string) {
  const encodedPostId = encodeURIComponent(postId);

  return href === `/posts/${encodedPostId}` || href.startsWith(`/posts/${encodedPostId}?`);
}

function normalizeSourceHref(href: string) {
  const trimmedHref = href.trim();

  if (!trimmedHref.startsWith("/") || trimmedHref.startsWith("//")) {
    return "";
  }

  return trimmedHref;
}

function isPostNavigationSource(value: unknown): value is PostNavigationSource {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<PostNavigationSource>;

  return (
    typeof candidate.href === "string" &&
    typeof candidate.label === "string" &&
    typeof candidate.postId === "string" &&
    Boolean(normalizeSourceHref(candidate.href))
  );
}
