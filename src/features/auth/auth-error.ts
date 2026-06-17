import { ApiError } from "@/lib/api/client";

type AuthErrorOptions = {
  accountUnavailable?: string;
  conflict?: string;
  forbidden?: string;
  invalidArgument?: string;
  rateLimited?: string;
  tooManyAttempts?: string;
  unauthenticated?: string;
};

export const passwordLoginAuthErrorOptions = {
  accountUnavailable: "当前账号已被封禁、禁用或注销，暂时不能登录。",
  tooManyAttempts: "登录尝试过于频繁，请稍后再试。",
} satisfies AuthErrorOptions;

export const emailCodeLoginAuthErrorOptions = {
  accountUnavailable: "当前账号已被封禁、禁用或注销，暂时不能使用验证码登录。",
  tooManyAttempts: "登录尝试过于频繁，请稍后再试。",
} satisfies AuthErrorOptions;

export function getAuthSubmitError(error: Error | null, options: AuthErrorOptions = {}) {
  if (!error) {
    return null;
  }

  if (error instanceof ApiError) {
    switch (error.code) {
      case "conflict":
        return options.conflict ?? "当前内容已存在，请检查后重试。";
      case "forbidden":
        return getForbiddenAuthSubmitError(error, options);
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

function getForbiddenAuthSubmitError(error: ApiError, options: AuthErrorOptions) {
  const serverMessage = error.serverMessage.toLowerCase();

  if (serverMessage.includes("too many login attempts")) {
    return options.tooManyAttempts ?? "登录尝试过于频繁，请稍后再试。";
  }

  if (serverMessage.includes("user is forbidden")) {
    return (
      options.accountUnavailable ??
      options.forbidden ??
      "当前账号已被封禁、禁用或注销，暂时不能登录。"
    );
  }

  return options.forbidden ?? "当前账号没有权限执行这个操作。";
}
