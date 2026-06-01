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
    super(error.message);
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
    message: "Request failed. Please try again.",
  };
}
