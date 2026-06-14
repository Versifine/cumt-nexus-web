import { ApiError } from "@/lib/api/client";

type AuthErrorOptions = {
  conflict?: string;
  forbidden?: string;
  invalidArgument?: string;
  rateLimited?: string;
  unauthenticated?: string;
};

export function getAuthSubmitError(error: Error | null, options: AuthErrorOptions = {}) {
  if (!error) {
    return null;
  }

  if (error instanceof ApiError) {
    switch (error.code) {
      case "conflict":
        return options.conflict ?? "当前内容已存在，请检查后重试。";
      case "forbidden":
        return options.forbidden ?? "当前账号或状态暂时不能执行这个操作。";
      case "invalid_argument":
        return options.invalidArgument ?? "提交内容不正确，请检查后重试。";
      case "rate_limited":
        return options.rateLimited ?? "操作过于频繁，请稍后再试。";
      case "unauthenticated":
        return options.unauthenticated ?? "验证失败，请检查后重试。";
      default:
        return error.message;
    }
  }

  return "请求失败，请稍后重试。";
}

