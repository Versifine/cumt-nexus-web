import type { PublicUser, UserLevelSummary } from "./types";

export function getUserProgression(user: PublicUser): UserLevelSummary | null {
  return user.progression ?? user.level ?? null;
}

export function getUserDisplayTitle(user: PublicUser): string | null {
  const activeTitle = getUserProgression(user)?.active_title?.name?.trim();

  return activeTitle || user.display_title?.trim() || null;
}

export function hasUserIdentityMarks(user: PublicUser) {
  return (
    Boolean(getUserDisplayTitle(user)) ||
    Boolean(getUserProgression(user)) ||
    user.roles.length > 0 ||
    user.badges.length > 0
  );
}
