import { z } from "zod";

const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/;
const EMAIL_CODE_PATTERN = /^\d{6}$/;
const MAX_PASSWORD_BYTES = 256;

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "用户名至少 3 位。")
  .max(32, "用户名最多 32 位。")
  .regex(USERNAME_PATTERN, "用户名只能使用字母、数字和下划线。")
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "密码至少 8 位。")
  .refine(
    (value) => new TextEncoder().encode(value).length <= MAX_PASSWORD_BYTES,
    "密码最多 256 bytes。",
  );

export const emailSchema = z
  .string()
  .trim()
  .email("请输入有效邮箱。")
  .max(254, "邮箱最多 254 个字符。")
  .transform((value) => value.toLowerCase());

export const emailCodeSchema = z
  .string()
  .trim()
  .regex(EMAIL_CODE_PATTERN, "请输入 6 位数字验证码。");

export const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const registerWithEmailSchema = z.object({
  email: emailSchema,
  code: emailCodeSchema,
  username: usernameSchema,
  password: passwordSchema,
  confirm_password: z.string().min(1, "请再次输入密码。"),
}).refine((value) => value.password === value.confirm_password, {
  message: "两次输入的密码不一致。",
  path: ["confirm_password"],
});

export const legacyLoginSchema = z.object({
  username: z.string().trim().min(1, "请输入用户名。"),
  password: z.string().min(1, "请输入密码。"),
});

export const passwordLoginSchema = z.object({
  identifier: z.string().trim().min(1, "请输入用户名或邮箱。"),
  password: z.string().min(1, "请输入密码。"),
});

export const emailCodeLoginSchema = z.object({
  email: emailSchema,
  code: emailCodeSchema,
});

export const passwordResetSchema = z.object({
  email: emailSchema,
  code: emailCodeSchema,
  new_password: passwordSchema,
});

export const changeEmailSchema = z.object({
  new_email: emailSchema,
  code: emailCodeSchema,
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, "请输入当前密码。"),
  new_password: passwordSchema,
});

export const deleteAccountSchema = z.object({
  email: emailSchema,
  code: z
    .string()
    .trim()
    .refine((value) => value === "" || EMAIL_CODE_PATTERN.test(value), {
      message: "请输入 6 位数字验证码。",
    }),
  current_password: z.string(),
  confirmation: z.literal("DELETE", {
    error: "请输入 DELETE 确认注销。",
  }),
}).refine((value) => value.code !== "" || value.current_password.trim() !== "", {
  message: "请输入当前密码或邮箱验证码。",
  path: ["current_password"],
});
