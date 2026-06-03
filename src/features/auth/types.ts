export type CurrentUser = {
  id: string;
  username: string;
  status: string;
  is_platform_staff: boolean;
  created_at: string;
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
