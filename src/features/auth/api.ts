import { apiRequest } from "@/lib/api/client";

import type {
  AuthCredentials,
  AuthResult,
  AuthSecurity,
  ChangeEmailCodeRequest,
  ChangeEmailInput,
  ChangeEmailResult,
  ChangePasswordInput,
  DeleteAccountCodeRequest,
  DeleteAccountInput,
  EmailCodeRequest,
  EmailCodeResult,
  GetMyPointsResponse,
  LoginWithEmailCodeInput,
  PasswordLoginCredentials,
  PasswordResetInput,
  RegisterWithEmailInput,
  UpdateResult,
  CurrentUser,
} from "./types";

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

export async function loginWithIdentifier(input: PasswordLoginCredentials) {
  const result = await apiRequest<AuthResult>("/api/v1/auth/login", {
    method: "POST",
    body: input,
    token: null,
  });

  return result;
}

export async function sendRegisterEmailCode(input: EmailCodeRequest) {
  return apiRequest<EmailCodeResult>("/api/v1/auth/email-codes/register", {
    method: "POST",
    body: input,
    token: null,
  });
}

export async function registerWithEmail(input: RegisterWithEmailInput) {
  return apiRequest<AuthResult>("/api/v1/auth/register-with-email", {
    method: "POST",
    body: input,
    token: null,
  });
}

export async function sendLoginEmailCode(input: EmailCodeRequest) {
  return apiRequest<EmailCodeResult>("/api/v1/auth/email-codes/login", {
    method: "POST",
    body: input,
    token: null,
  });
}

export async function loginWithEmailCode(input: LoginWithEmailCodeInput) {
  return apiRequest<AuthResult>("/api/v1/auth/login-with-email-code", {
    method: "POST",
    body: input,
    token: null,
  });
}

export async function sendPasswordResetCode(input: EmailCodeRequest) {
  return apiRequest<EmailCodeResult>("/api/v1/auth/email-codes/password-reset", {
    method: "POST",
    body: input,
    token: null,
  });
}

export async function resetPassword(input: PasswordResetInput) {
  return apiRequest<UpdateResult>("/api/v1/auth/password-reset", {
    method: "POST",
    body: input,
    token: null,
  });
}

export function getCurrentUser() {
  return apiRequest<CurrentUser>("/api/v1/me");
}

export function getMyPoints() {
  return apiRequest<GetMyPointsResponse>("/api/v1/me/points");
}

export function getAuthSecurity() {
  return apiRequest<AuthSecurity>("/api/v1/me/security");
}

export async function sendChangeEmailCode(input: ChangeEmailCodeRequest) {
  return apiRequest<EmailCodeResult>("/api/v1/me/security/email-codes/change-email", {
    method: "POST",
    body: input,
  });
}

export async function changeEmail(input: ChangeEmailInput) {
  return apiRequest<ChangeEmailResult>("/api/v1/me/security/email", {
    method: "PATCH",
    body: input,
  });
}

export async function changePassword(input: ChangePasswordInput) {
  return apiRequest<UpdateResult>("/api/v1/me/security/password", {
    method: "PATCH",
    body: input,
  });
}

export async function logoutAll() {
  return apiRequest<void>("/api/v1/auth/logout-all", {
    method: "POST",
  });
}

export async function sendDeleteAccountCode(input: DeleteAccountCodeRequest) {
  return apiRequest<EmailCodeResult>("/api/v1/me/security/email-codes/delete-account", {
    method: "POST",
    body: input,
  });
}

export async function deleteAccount(input: DeleteAccountInput) {
  return apiRequest<void>("/api/v1/me/account", {
    method: "DELETE",
    body: input,
  });
}
