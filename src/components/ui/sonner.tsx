"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

import { useTheme } from "@/lib/theme/theme-provider";

function Toaster({ ...props }: ToasterProps) {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme}
      position="bottom-right"
      closeButton
      duration={4500}
      toastOptions={{
        classNames: {
          toast:
            "border border-border bg-card/95 text-card-foreground shadow-[0_16px_48px_rgb(0_0_0/0.38)] backdrop-blur",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-secondary text-secondary-foreground",
          error: "border-destructive/40",
          success: "border-emerald-400/40",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
