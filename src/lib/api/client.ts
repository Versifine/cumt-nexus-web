import { clearAccessToken, readAccessToken } from "@/lib/auth/token-storage";

import type { ApiErrorBody, ApiErrorResponse } from "./types";

const DEFAULT_API_BASE_URL = "http://localhost:8080";
const DEFAULT_API_TIMEOUT_MS = 15_000;
const TIMEOUT_ABORT_REASON = "api-request-timeout";

export const SERVER_PREFETCH_API_TIMEOUT_MS = 3_000;

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | unknown;
  timeoutMs?: number;
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
  const {
    body,
    headers,
    signal,
    timeoutMs = DEFAULT_API_TIMEOUT_MS,
    token = readAccessToken(),
    ...requestInit
  } = options;
  const requestHeaders = new Headers(headers);
  const abortHandle = createRequestAbortHandle(signal, timeoutMs);

  if (body !== undefined && !isFormDataBody(body) && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...requestInit,
      headers: requestHeaders,
      signal: abortHandle.signal,
      body: serializeRequestBody(body),
    });
  } catch (error) {
    throw createApiRequestError(error, abortHandle.signal);
  } finally {
    abortHandle.clear();
  }

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

function isFormDataBody(body: unknown): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

function serializeRequestBody(body: unknown): BodyInit | undefined {
  if (body === undefined) {
    return undefined;
  }

  if (isFormDataBody(body)) {
    return body;
  }

  return JSON.stringify(body);
}

function createRequestAbortHandle(
  callerSignal: AbortSignal | null | undefined,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeoutId =
    timeoutMs > 0
      ? globalThis.setTimeout(() => {
          controller.abort(TIMEOUT_ABORT_REASON);
        }, timeoutMs)
      : undefined;

  const abortFromCaller = () => {
    controller.abort(callerSignal?.reason);
  };

  if (callerSignal?.aborted) {
    abortFromCaller();
  } else {
    callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
  }

  return {
    clear: () => {
      if (timeoutId !== undefined) {
        globalThis.clearTimeout(timeoutId);
      }

      callerSignal?.removeEventListener("abort", abortFromCaller);
    },
    signal: controller.signal,
  };
}

function createApiRequestError(error: unknown, signal: AbortSignal) {
  if (signal.reason === TIMEOUT_ABORT_REASON) {
    return new ApiError(0, {
      code: "timeout",
      message: "请求等待时间过长，请稍后重试。",
    });
  }

  if (isAbortError(error)) {
    return new ApiError(0, {
      code: "network",
      message: "请求已中断，请稍后重试。",
    });
  }

  return new ApiError(0, {
    code: "network",
    message: "服务暂时无法连接，请稍后重试。",
  });
}

function isAbortError(error: unknown) {
  return (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    error.name === "AbortError"
  );
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
    case "network":
      return error.message || "服务暂时无法连接，请稍后重试。";
    case "timeout":
      return error.message || "请求等待时间过长，请稍后重试。";
    default:
      return error.message || "请求失败，请稍后重试。";
  }
}
