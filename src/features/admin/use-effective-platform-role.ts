"use client";

import {
  hasExplicitPlatformRole,
  resolvePlatformRole,
  type PlatformRole,
  type PlatformRoleSource,
} from "@/features/auth/platform-role";

import { useAdminUsersQuery } from "./queries";

type EffectivePlatformRoleSource = PlatformRoleSource & {
  id?: string;
  username?: string;
};

export function useEffectiveAdminPlatformRole(
  currentUser?: EffectivePlatformRoleSource | null,
) {
  const explicitRole = hasExplicitPlatformRole(currentUser)
    ? currentUser.platform_role
    : null;
  const shouldProbeAdminUser =
    !explicitRole &&
    currentUser?.is_platform_staff === true &&
    Boolean(currentUser.id || currentUser.username);
  const selfRoleQuery = useAdminUsersQuery(
    {
      limit: 5,
      offset: 0,
      q: currentUser?.username ?? currentUser?.id ?? "",
      status: "all",
    },
    shouldProbeAdminUser,
  );
  const selfAdminUser = selfRoleQuery.data?.users.find((user) => {
    if (currentUser?.id && user.id === currentUser.id) {
      return true;
    }

    return Boolean(
      currentUser?.username &&
        user.username.toLowerCase() === currentUser.username.toLowerCase(),
    );
  });
  const probedRole = hasExplicitPlatformRole(selfAdminUser)
    ? selfAdminUser.platform_role
    : null;
  const fallbackRole = resolvePlatformRole(currentUser);
  const role: PlatformRole | null = explicitRole ?? probedRole ?? fallbackRole;

  return {
    isResolving:
      shouldProbeAdminUser &&
      selfRoleQuery.isPending &&
      !explicitRole &&
      !probedRole,
    role,
    source: explicitRole ? "me" : probedRole ? "admin-users" : "fallback",
  } as const;
}
