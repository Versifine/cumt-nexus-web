export type RecentCommunity = {
  name: string;
  slug: string;
};

const RECENT_COMMUNITIES_KEY = "cumt-nexus:recent-communities";
const RECENT_COMMUNITIES_LIMIT = 6;

export function readRecentCommunities() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(RECENT_COMMUNITIES_KEY);

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
    RECENT_COMMUNITIES_KEY,
    JSON.stringify(nextCommunities),
  );
  window.dispatchEvent(new Event("cumt-nexus:recent-communities-changed"));
}

function isRecentCommunity(value: unknown): value is RecentCommunity {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<RecentCommunity>;

  return typeof candidate.slug === "string" && typeof candidate.name === "string";
}
