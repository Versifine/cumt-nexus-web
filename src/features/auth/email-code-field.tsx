"use client";

import type * as React from "react";
import { useEffect, useState } from "react";
import { Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type EmailCodeFieldProps = {
  codeInputProps: React.ComponentProps<"input">;
  disabled?: boolean;
  email: string;
  error?: string;
  hint?: string;
  isSending?: boolean;
  onSend: () => void;
  resendAvailableAt?: number;
};

export function EmailCodeField({
  codeInputProps,
  disabled = false,
  email,
  error,
  hint = "验证码通常 10 分钟内有效。",
  isSending = false,
  onSend,
  resendAvailableAt,
}: EmailCodeFieldProps) {
  const [now, setNow] = useState(() => Date.now());
  const cooldown = resendAvailableAt
    ? Math.max(0, Math.ceil((resendAvailableAt - now) / 1000))
    : 0;

  useEffect(() => {
    if (!resendAvailableAt || resendAvailableAt <= now) {
      return;
    }

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [now, resendAvailableAt]);

  const canSend = !disabled && !isSending && cooldown <= 0 && Boolean(email.trim());

  return (
    <div className="border-b border-border py-4">
      <label className="text-sm font-semibold text-foreground" htmlFor={codeInputProps.id}>
        邮箱验证码
      </label>
      <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Input
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="输入 6 位验证码"
          className="h-11 rounded-none border-x-0 border-t-0 border-border bg-transparent px-0 text-base focus-visible:ring-0"
          disabled={disabled}
          {...codeInputProps}
        />
        <Button
          type="button"
          variant="secondary"
          className="h-11 justify-center"
          disabled={!canSend}
          onClick={onSend}
        >
          <Mail className="size-4" aria-hidden="true" />
          {isSending ? "发送中..." : cooldown > 0 ? `${cooldown} 秒后重发` : "发送验证码"}
        </Button>
      </div>
      <p className={cn("mt-2 text-xs", error ? "text-destructive" : "text-muted-foreground")}>
        {error ?? hint}
      </p>
    </div>
  );
}
