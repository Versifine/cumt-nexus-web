import type { PlatformRole } from "@/features/auth/platform-role";

import type { CommunityViewerPermissions } from "./types";

type CommunityPermissionSource = {
  viewer_permissions?: CommunityViewerPermissions | null;
} | null | undefined;

export function canAccessCommunityManagement(
  source: CommunityPermissionSource,
  platformRole?: PlatformRole | null,
) {
  const permissions = source?.viewer_permissions;

  return (
    permissions?.can_manage === true ||
    permissions?.can_moderate === true ||
    permissions?.platform_owner_override === true ||
    platformRole === "owner"
  );
}

export function canEditCommunityConfiguration(
  source: CommunityPermissionSource,
  platformRole?: PlatformRole | null,
) {
  const permissions = source?.viewer_permissions;

  return (
    permissions?.can_manage === true ||
    permissions?.platform_owner_override === true ||
    platformRole === "owner"
  );
}

export function canModerateCommunityContent(
  source: CommunityPermissionSource,
  platformRole?: PlatformRole | null,
) {
  const permissions = source?.viewer_permissions;

  return (
    permissions?.can_moderate === true ||
    permissions?.platform_owner_override === true ||
    platformRole === "owner"
  );
}
