"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import {
  QuickEmailCodeLoginForm,
  QuickPasswordLoginForm,
  QuickRegisterForm,
} from "./quick-login-form";

export type AuthDialogMode = "login" | "register";

type AuthDialogProps = {
  mode: AuthDialogMode;
  nextPath: string;
  onModeChange: (mode: AuthDialogMode) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function AuthDialog({
  mode,
  nextPath,
  onModeChange,
  onOpenChange,
  open,
}: AuthDialogProps) {
  const router = useRouter();
  const isLogin = mode === "login";
  const [loginMethod, setLoginMethod] = useState<"password" | "email">("password");

  function handleLoginSuccess() {
    onOpenChange(false);
    router.push(nextPath);
  }

  function handleRegisterSuccess() {
    onOpenChange(false);
    router.push("/settings/profile");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(620px,calc(100vh-2rem))] max-w-[400px] gap-0 overflow-y-auto p-0">
        <DialogHeader className="border-b border-border px-5 pb-3 pt-5 pr-12">
          <DialogTitle>{isLogin ? "登录" : "创建账号"}</DialogTitle>
          <DialogDescription>
            {isLogin
              ? "选择密码或邮箱验证码，登录后继续刚才的操作。"
              : "两步完成邮箱验证和账号信息。"}
          </DialogDescription>
        </DialogHeader>

        {isLogin ? (
          <div className="px-5 py-4">
            <div className="mb-3 grid grid-cols-2 border border-border text-sm font-medium">
              <MethodButton
                active={loginMethod === "password"}
                onClick={() => setLoginMethod("password")}
              >
                密码
              </MethodButton>
              <MethodButton
                active={loginMethod === "email"}
                onClick={() => setLoginMethod("email")}
              >
                邮箱验证码
              </MethodButton>
            </div>
            {loginMethod === "password" ? (
              <QuickPasswordLoginForm onSuccess={handleLoginSuccess} />
            ) : (
              <QuickEmailCodeLoginForm onSuccess={handleLoginSuccess} />
            )}
          </div>
        ) : (
          <div className="px-5 py-4">
            <QuickRegisterForm onSuccess={handleRegisterSuccess} />
          </div>
        )}

        <div className="border-t border-border px-5 py-3 text-center text-sm text-muted-foreground">
          {isLogin ? "没有账号？" : "已有账号？"}
          <button
            type="button"
            className="ml-2 font-semibold text-primary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onModeChange(isLogin ? "register" : "login")}
          >
            {isLogin ? "创建账号" : "登录"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MethodButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "h-9 border-r border-border text-sm transition-colors last:border-r-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-background text-muted-foreground hover:text-foreground",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
