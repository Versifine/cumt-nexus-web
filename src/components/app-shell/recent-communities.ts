import { readAccessToken } from "@/lib/auth/token-storage";

export type RecentCommunity = {
  name: string;
  slug: string;
};

const LEGACY_RECENT_COMMUNITIES_KEY = "cumt-nexus:recent-communities";
const RECENT_COMMUNITIES_KEY_PREFIX = "cumt-nexus:recent-communities";
const RECENT_COMMUNITIES_LIMIT = 6;
export const RECENT_COMMUNITIES_CHANGE_EVENT =
  "cumt-nexus:recent-communities-changed";

export function readRecentCommunities() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue =
      window.localStorage.getItem(getRecentCommunitiesStorageKey()) ??
      readLegacyGuestRecentCommunities();

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(isRecentCommunity).slice(0, RECENT_COMMUNITIES_LIMIT);
  } catch {
    return [];
  }
}

export function rememberRecentCommunity(community: RecentCommunity) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedCommunity = {
    name: community.name.trim() || community.slug,
    slug: community.slug.trim(),
  };

  if (!normalizedCommunity.slug) {
    return;
  }

  const nextCommunities = [
    normalizedCommunity,
    ...readRecentCommunities().filter(
      (recentCommunity) => recentCommunity.slug !== normalizedCommunity.slug,
    ),
  ].slice(0, RECENT_COMMUNITIES_LIMIT);

  window.localStorage.setItem(
    getRecentCommunitiesStorageKey(),
    JSON.stringify(nextCommunities),
  );
  dispatchRecentCommunitiesChanged();
}

export function dispatchRecentCommunitiesChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(RECENT_COMMUNITIES_CHANGE_EVENT));
}

function getRecentCommunitiesStorageKey() {
  return `${RECENT_COMMUNITIES_KEY_PREFIX}:${getRecentCommunitiesScope()}`;
}

function getRecentCommunitiesScope() {
  const token = readAccessToken();

  if (!token) {
    return "guest";
  }

  return `user:${extractUserScopeFromToken(token) ?? hashTokenScope(token)}`;
}

function extractUserScopeFromToken(token: string) {
  const [, payload] = token.split(".");

  if (!payload || typeof window === "undefined") {
    return null;
  }

  try {
    const normalizedPayload = payload.replaceAll("-", "+").replaceAll("_", "/");
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      "=",
    );
    const claims = JSON.parse(window.atob(paddedPayload)) as {
      sub?: unknown;
      user_id?: unknown;
      uid?: unknown;
    };
    const userID = claims.sub ?? claims.user_id ?? claims.uid;

    return typeof userID === "string" && userID.trim()
      ? encodeURIComponent(userID.trim())
      : null;
  } catch {
    return null;
  }
}

function hashTokenScope(token: string) {
  let hash = 0;

  for (let index = 0; index < token.length; index += 1) {
    hash = (hash * 31 + token.charCodeAt(index)) >>> 0;
  }

  return `token-${hash.toString(36)}`;
}

function readLegacyGuestRecentCommunities() {
  return getRecentCommunitiesScope() === "guest"
    ? window.localStorage.getItem(LEGACY_RECENT_COMMUNITIES_KEY)
    : null;
}

function isRecentCommunity(value: unknown): value is RecentCommunity {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<RecentCommunity>;

  return typeof candidate.slug === "string" && typeof candidate.name === "string";
}
