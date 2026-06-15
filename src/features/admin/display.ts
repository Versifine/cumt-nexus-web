import type { StatusTokenTone } from "@/components/ui/data-display";

export { resolvePlatformRole } from "@/features/auth/platform-role";

export function formatPlatformRole(role?: string | null) {
  switch (role) {
    case "owner":
      return "站点负责人";
    case "admin":
      return "平台管理员";
    case "staff":
      return "平台审核员";
    case null:
    case undefined:
    case "":
      return "普通用户";
    default:
      return role;
  }
}

export function getPlatformRoleTone(role?: string | null): StatusTokenTone {
  switch (role) {
    case "owner":
      return "danger";
    case "admin":
      return "primary";
    case "staff":
      return "warning";
    default:
      return "default";
  }
}

export function formatAdminUserStatus(status: string) {
  switch (status) {
    case "active":
      return "正常";
    case "disabled":
      return "已禁用";
    case "deleted":
      return "已注销";
    case "all":
      return "全部";
    default:
      return status || "未知";
  }
}

export function getAdminUserStatusTone(status: string): StatusTokenTone {
  switch (status) {
    case "active":
      return "success";
    case "disabled":
      return "warning";
    case "deleted":
      return "danger";
    default:
      return "default";
  }
}

export function formatAdminCommunityStatus(status: string) {
  switch (status) {
    case "active":
      return "正常";
    case "suspended":
      return "已暂停";
    case "archived":
      return "已归档";
    case "all":
      return "全部";
    default:
      return status || "未知";
  }
}

export function getAdminCommunityStatusTone(status: string): StatusTokenTone {
  switch (status) {
    case "active":
      return "success";
    case "suspended":
      return "warning";
    case "archived":
      return "default";
    default:
      return "default";
  }
}

export function formatAdminSettingKey(key: string) {
  switch (key) {
    case "registration_enabled":
      return "注册";
    case "posting_enabled":
      return "发帖与评论";
    case "upload_enabled":
      return "图片上传";
    default:
      return key;
  }
}

export function describeAdminSetting(key: string) {
  switch (key) {
    case "registration_enabled":
      return "关闭后新用户不能注册，已有用户仍可登录。";
    case "posting_enabled":
      return "关闭后用户不能发布帖子或评论。";
    case "upload_enabled":
      return "关闭后用户不能上传图片附件。";
    default:
      return "平台运行开关。";
  }
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatShortId(value?: string) {
  if (!value) {
    return "--";
  }

  return value.length > 8 ? value.slice(0, 8) : value;
}
