export type ApiErrorCode =
  | "invalid_argument"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "internal"
  | "network"
  | "timeout";

export type ApiErrorBody = {
  code: ApiErrorCode | string;
  message: string;
};

export type ApiErrorResponse = {
  error: ApiErrorBody;
};
