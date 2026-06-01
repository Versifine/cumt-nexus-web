import { clearAccessToken, readAccessToken } from "@/lib/auth/token-storage";

import type { ApiErrorBody, ApiErrorResponse } from "./types";

const DEFAULT_API_BASE_URL = "http://localhost:8080";

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  token?: string | null;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, error: ApiErrorBody) {
    super(getClientErrorMessage(error));
    this.name = "ApiError";
    this.status = status;
    this.code = error.code;
  }
}

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}

export async function apiRequest<TResponse>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const { body, headers, token = readAccessToken(), ...requestInit } = options;
  const requestHeaders = new Headers(headers);

  if (body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...requestInit,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await readApiError(response);

    if (error.code === "unauthenticated") {
      clearAccessToken();
    }

    throw new ApiError(response.status, error);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

async function readApiError(response: Response): Promise<ApiErrorBody> {
  try {
    const payload = (await response.json()) as Partial<ApiErrorResponse>;

    if (payload.error?.code && payload.error.message) {
      return payload.error;
    }
  } catch {
    // Fall through to the generic client-safe error.
  }

  return {
    code: "internal",
    message: "请求失败，请稍后重试。",
  };
}

function getClientErrorMessage(error: ApiErrorBody) {
  switch (error.code) {
    case "invalid_argument":
      return "提交内容不正确，请检查后重试。";
    case "unauthenticated":
      return "请先登录后再继续。";
    case "forbidden":
      return "当前账号没有权限执行此操作。";
    case "not_found":
      return "没有找到对应内容。";
    case "conflict":
      return "当前内容已存在或状态冲突。";
    case "internal":
      return "服务暂时不可用，请稍后重试。";
    default:
      return error.message || "请求失败，请稍后重试。";
  }
}
