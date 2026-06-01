import { apiRequest } from "@/lib/api/client";

import type { AuthCredentials, AuthResult, CurrentUser } from "./types";

export async function register(input: AuthCredentials) {
  const result = await apiRequest<AuthResult>("/api/v1/auth/register", {
    method: "POST",
    body: input,
    token: null,
  });

  return result;
}

export async function login(input: AuthCredentials) {
  const result = await apiRequest<AuthResult>("/api/v1/auth/login", {
    method: "POST",
    body: input,
    token: null,
  });

  return result;
}

export function getCurrentUser() {
  return apiRequest<CurrentUser>("/api/v1/me");
}
