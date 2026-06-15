export type PlatformRole = "owner" | "admin" | "staff";
export type EditablePlatformRole = Exclude<PlatformRole, "owner">;

export type PlatformRoleSource = {
  is_platform_staff?: boolean;
  platform_role?: string | null;
};

export function resolvePlatformRole(
  user?: PlatformRoleSource | null,
): PlatformRole | null {
  if (!user) {
    return null;
  }

  if (isPlatformRole(user.platform_role)) {
    return user.platform_role;
  }

  return user.is_platform_staff ? "staff" : null;
}

export function hasPlatformRole(
  user?: PlatformRoleSource | null,
  allowedRoles?: readonly PlatformRole[],
) {
  const role = resolvePlatformRole(user);

  if (!role) {
    return false;
  }

  return allowedRoles ? allowedRoles.includes(role) : true;
}

export function hasExplicitPlatformRole(
  user?: PlatformRoleSource | null,
): user is PlatformRoleSource & { platform_role: PlatformRole } {
  return isPlatformRole(user?.platform_role);
}

export function hasLegacyPlatformStaffOnly(user?: PlatformRoleSource | null) {
  return user?.is_platform_staff === true && !hasExplicitPlatformRole(user);
}

function isPlatformRole(role?: string | null): role is PlatformRole {
  return role === "owner" || role === "admin" || role === "staff";
}
