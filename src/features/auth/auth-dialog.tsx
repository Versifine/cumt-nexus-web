"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";

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
  const isLogin = mode === "login";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-5 sm:p-6">
        <DialogHeader className="border-b border-border pb-4 pr-8">
          <DialogTitle>{isLogin ? "登录" : "创建账号"}</DialogTitle>
          <DialogDescription>
            {isLogin
              ? "登录后继续当前操作。"
              : "注册后先完善公开资料，再进入社区参与讨论。"}
          </DialogDescription>
        </DialogHeader>

        {isLogin ? (
          <LoginForm
            className="pt-1"
            onSuccess={() => onOpenChange(false)}
            redirectTo={nextPath}
          />
        ) : (
          <RegisterForm
            className="pt-1"
            onSuccess={() => onOpenChange(false)}
          />
        )}

        <div className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
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
