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
    getUserIdentityRoles(user).length > 0 ||
    user.badges.length > 0
  );
}

export function getUserIdentityRoles(user: PublicUser) {
  const roles = new Set(user.roles.filter(Boolean));
  const platformRole = user.platform_role?.trim();

  if (platformRole) {
    roles.add(platformRole);
  } else if (user.is_platform_staff === true) {
    roles.add("staff");
  }

  return [...roles];
}
