export type CurrentUser = {
  id: string;
  username: string;
  status: string;
  is_platform_staff: boolean;
  email?: string;
  email_verified?: boolean;
  email_verified_at?: string | null;
  created_at: string;
};

export type PointAccount = {
  user_id: string;
  balance: number;
  lifetime_earned: number;
  lifetime_spent: number;
  updated_at: string;
};

export type GetMyPointsResponse = {
  points: PointAccount;
};

export type AuthResult = {
  access_token: string;
  token_type: "Bearer" | string;
  expires_in: number;
  user: CurrentUser;
};

export type AuthCredentials = {
  username: string;
  password: string;
};

export type PasswordLoginCredentials = {
  identifier: string;
  password: string;
};

export type EmailCodePurpose =
  | "register"
  | "login"
  | "password_reset"
  | "change_email"
  | "delete_account";

export type EmailCodeRequest = {
  email: string;
};

export type ChangeEmailCodeRequest = {
  new_email: string;
};

export type EmailCodeResult = {
  email: string;
  purpose: EmailCodePurpose;
  expires_in: number;
  resend_after: number;
};

export type RegisterWithEmailInput = {
  email: string;
  code: string;
  username: string;
  password: string;
};

export type LoginWithEmailCodeInput = {
  email: string;
  code: string;
};

export type PasswordResetInput = {
  email: string;
  code: string;
  new_password: string;
};

export type AuthSecurity = {
  email: string;
  email_verified: boolean;
  email_verified_at: string | null;
  password_set: boolean;
  last_login_at: string | null;
  created_at: string;
};

export type ChangeEmailInput = {
  new_email: string;
  code: string;
};

export type ChangeEmailResult = {
  email: string;
  email_verified: boolean;
  email_verified_at: string;
};

export type ChangePasswordInput = {
  current_password: string;
  new_password: string;
};

export type DeleteAccountCodeRequest = {
  email: string;
};

export type DeleteAccountInput = {
  code?: string;
  current_password?: string;
  confirmation: "DELETE";
};

export type UpdateResult = {
  updated: boolean;
};
